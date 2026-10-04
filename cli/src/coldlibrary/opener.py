"""``coldlibrary open``: combine shares, check the box, decrypt into a new folder.

Everything is decrypted and checked in memory first. The output folder is
written only when every file has decrypted.
"""

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Optional, Sequence, Tuple

from . import crypto
from .errors import ColdLibraryError
from .manifest import MANIFEST_NAME, ManifestCheck, check_manifest, load_manifest
from .shares import ParsedShare, ShareError, combine_shares, parse_share
from .tarball import read_core_tar
from .util import is_empty_or_missing, is_within, make_private_dir, today, write_new_file

Echo = Callable[[str], None]
PromptFn = Callable[[str], str]

_LETTER_RE = re.compile(r"^letters/([A-Za-z0-9._-]+)\.age$")


@dataclass
class OpenResult:
    out: Path
    written: List[str]
    used_shares: List[ParsedShare]
    check: Optional[ManifestCheck]
    letters: List[str] = field(default_factory=list)
    manifest: Optional[dict] = None


def default_out_dir() -> Path:
    return Path.cwd() / f"opened-{today().isoformat()}"


def _gather_shares(
    sources: Sequence[Tuple[str, str]], prompt: Optional[PromptFn], echo: Echo
) -> List[ParsedShare]:
    parsed = [parse_share(text, source) for source, text in sources]
    if prompt is None:
        return parsed
    needed = parsed[0].share.member_threshold if parsed else None
    number = len(parsed)
    while needed is None or len({p.share.index for p in parsed}) < needed:
        number += 1
        text = prompt(f"Share {number} (input hidden, press Enter when done): ")
        if not text.strip():
            raise ShareError("No share entered. Stopped.")
        try:
            item = parse_share(text, f"share {number}")
        except ShareError as exc:
            echo(f"{exc} Try again.")
            number -= 1
            continue
        parsed.append(item)
        if needed is None:
            needed = item.share.member_threshold
            echo(f"This box needs {needed} shares.")
    return parsed


def open_box(
    sealed: Path,
    share_sources: Sequence[Tuple[str, str]],
    *,
    out: Optional[Path] = None,
    ignore_manifest: bool = False,
    prompt: Optional[PromptFn] = None,
    echo: Echo = lambda message: None,
) -> OpenResult:
    if not sealed.is_dir():
        raise ColdLibraryError(f"No sealed folder at {sealed}.")
    if out is None:
        out = default_out_dir()
    if not is_empty_or_missing(out):
        raise ColdLibraryError(f"{out} exists and is not empty. Choose a new folder with --out.")
    if is_within(out, sealed):
        raise ColdLibraryError("The output folder must not be inside the sealed folder.")

    # 1. Check the box before touching any share.
    manifest: Optional[dict] = None
    check: Optional[ManifestCheck] = None
    if ignore_manifest:
        echo("Warning: not checking MANIFEST.json (--ignore-manifest).")
        letter_paths = sorted(
            f"letters/{p.name}" for p in (sealed / "letters").glob("*.age") if p.is_file()
        ) if (sealed / "letters").is_dir() else []
    else:
        manifest = load_manifest(sealed)
        check = check_manifest(sealed, manifest)
        for rel in check.extra:
            echo(f"Warning: {rel} is not in {MANIFEST_NAME} and will not be opened.")
        if check.missing or check.mismatched or check.invalid:
            details = (
                [f"missing: {rel}" for rel in check.missing]
                + [f"changed: {rel}" for rel in check.mismatched]
                + [f"manifest: {text}" for text in check.invalid]
            )
            raise ColdLibraryError(
                "The box does not match MANIFEST.json, so it was not opened.\n  "
                + "\n  ".join(details)
                + "\nRun 'coldlibrary verify' for details. Use --ignore-manifest only if you understand why."
            )
        letter_paths = [rel for rel in check.ok if rel.startswith("letters/")]

    core_path = sealed / "core.age"
    if not core_path.is_file():
        raise ColdLibraryError(f"No core.age in {sealed}.")

    # 2. Shares.
    parsed = _gather_shares(share_sources, prompt, echo)
    master, used = combine_shares(parsed)
    if manifest is not None and manifest.get("master_secret_bits") not in (None, len(master) * 8):
        echo(
            f"Warning: the shares hold a {len(master) * 8}-bit secret; "
            f"MANIFEST.json says {manifest.get('master_secret_bits')}."
        )

    # 3. Decrypt everything in memory.
    try:
        tar_bytes = crypto.decrypt(core_path.read_bytes(), master)
    except crypto.DecryptionFailed:
        raise ColdLibraryError(
            "These shares do not open this box: core.age did not decrypt. They may belong "
            "to a different seal or version, or core.age is damaged."
        ) from None
    entries = read_core_tar(tar_bytes)
    letters: List[Tuple[str, bytes]] = []
    for rel in letter_paths:
        match = _LETTER_RE.match(rel)
        if not match:
            raise ColdLibraryError(f"Unexpected letter path {rel!r}.")
        try:
            plain = crypto.decrypt(sealed.joinpath(*rel.split("/")).read_bytes(), master)
        except crypto.DecryptionFailed:
            raise ColdLibraryError(f"{rel} did not decrypt with these shares.") from None
        letters.append((f"letters/{match.group(1)}.md", plain))

    # 4. Write the output folder.
    make_private_dir(out)
    written: List[str] = []
    cover = sealed / "COVER.md"
    if cover.is_file():
        write_new_file(out / "COVER.md", cover.read_bytes())
        written.append("COVER.md")
    for entry in entries:
        target = out.joinpath(*entry.name.split("/"))
        if not is_within(target, out):
            raise ColdLibraryError(f"Refusing to write outside the output folder: {entry.name!r}.")
        if entry.is_dir:
            make_private_dir(target)
        else:
            make_private_dir(target.parent)
            write_new_file(target, entry.data or b"")
            written.append(entry.name)
    for rel, data in letters:
        target = out.joinpath(*rel.split("/"))
        make_private_dir(target.parent)
        write_new_file(target, data)
        written.append(rel)

    return OpenResult(
        out=out,
        written=written,
        used_shares=used,
        check=check,
        letters=[rel for rel, _ in letters],
        manifest=manifest,
    )
