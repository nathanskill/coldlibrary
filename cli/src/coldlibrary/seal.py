"""``coldlibrary seal``: encrypt a workspace into a sealed box and split the key.

The plaintext workspace is never changed or deleted.
"""

import itertools
from dataclasses import dataclass, field
from pathlib import Path
from typing import Callable, List, Optional, Tuple

import shamir_mnemonic

from . import crypto
from .errors import ColdLibraryError
from .manifest import MANIFEST_NAME, build_manifest, dump_manifest
from .shares import format_share_block
from .tarball import build_core_tar
from .util import (
    COOLING_DAYS,
    CREATED_FILE,
    is_empty_or_missing,
    is_within,
    make_private_dir,
    read_created_date,
    sha256_bytes,
    sha256_file,
    today,
    write_new_file,
)
from .validate import Report, validate_workspace
from .workspace import first_seal_date

Echo = Callable[[str], None]


@dataclass
class SealResult:
    out: Path
    shares: List[str]
    share_blocks: List[str]
    share_files: List[Path]
    manifest: dict
    sealed_files: List[str]
    core_files: List[str] = field(default_factory=list)
    skipped: List[str] = field(default_factory=list)
    work_factor: Optional[int] = None
    report: Optional[Report] = None


def _resolve_setting(name: str, given: Optional[int], in_core: int, field_name: str) -> int:
    if given is None:
        return in_core
    if given != in_core:
        raise ColdLibraryError(
            f"{name} {given} does not match core.json ({field_name} is {in_core}). "
            "Edit core.json so the sealed core describes this seal, or drop the option."
        )
    return given


def _letters(workspace: Path) -> List[Path]:
    folder = workspace / "letters"
    if not folder.is_dir():
        return []
    return sorted(
        (
            child
            for child in folder.iterdir()
            if child.is_file()
            and not child.is_symlink()
            and child.suffix == ".md"
            and not child.name.startswith(".")
            and child.name.lower() != "readme.md"
        ),
        key=lambda p: p.name,
    )


def check_cooling(workspace: Path, skip: bool, echo: Echo) -> None:
    if skip:
        echo(
            f"Warning: skipping the {COOLING_DAYS}-day cooling period. "
            "Use this only for drills and tests."
        )
        return
    created = read_created_date(workspace)
    if created is None:
        raise ColdLibraryError(
            f"No creation date found ({CREATED_FILE} is missing or unreadable). "
            f"The first seal waits {COOLING_DAYS} days after 'coldlibrary init'. "
            "For a drill, add --skip-cooling."
        )
    ready = first_seal_date(created)
    if today() < ready:
        raise ColdLibraryError(
            f"This workspace was created on {created.isoformat()}. "
            f"The {COOLING_DAYS}-day cooling period ends on {ready.isoformat()}. "
            "Read it again before then. For a drill, add --skip-cooling."
        )


def _self_check_shares(shares: List[str], threshold: int, master: bytes) -> None:
    combos = list(itertools.combinations(range(len(shares)), threshold))
    picks = combos if len(combos) <= 8 else [combos[0], combos[-1]]
    for combo in picks:
        if shamir_mnemonic.combine_mnemonics([shares[i] for i in combo]) != master:
            raise ColdLibraryError("Self-check failed: shares do not recombine. Nothing was written.")


def seal_workspace(
    workspace: Path,
    *,
    threshold: Optional[int] = None,
    shares: Optional[int] = None,
    bits: Optional[int] = None,
    out: Optional[Path] = None,
    shares_out: Optional[Path] = None,
    skip_cooling: bool = False,
    echo: Echo = lambda message: None,
    display: Optional[str] = None,
) -> SealResult:
    # 1. Validate. Any error stops the seal before anything is written.
    report = validate_workspace(workspace, display)
    for line in report.render():
        echo(line)
    if report.errors or report.core is None:
        raise ColdLibraryError("Seal refused. Fix the errors above, then run seal again.")
    core = report.core

    # 2. Settings must agree with core.json, which travels inside the box.
    c = core["crypto"]
    threshold = _resolve_setting("--threshold", threshold, c["threshold"], "crypto.threshold")
    shares = _resolve_setting("--shares", shares, c["shares"], "crypto.shares")
    bits = _resolve_setting("--bits", bits, c["master_secret_bits"], "crypto.master_secret_bits")
    if not 2 <= threshold <= shares <= crypto.MAX_SHARES:
        raise ColdLibraryError("Threshold and shares must satisfy 2 <= threshold <= shares <= 16.")
    if bits not in crypto.ALLOWED_BITS:
        raise ColdLibraryError("--bits must be 128 or 256.")

    # 3. Cooling period.
    check_cooling(workspace, skip_cooling, echo)

    # 4. Output locations.
    if out is None:
        out = workspace.resolve().parent / "sealed"
    if is_within(out, workspace):
        raise ColdLibraryError("The sealed folder must not be inside the workspace.")
    if is_within(workspace, out):
        raise ColdLibraryError("The workspace must not be inside the sealed folder.")
    if not is_empty_or_missing(out):
        raise ColdLibraryError(f"{out} exists and is not empty. Choose a new folder with --out.")
    if shares_out is not None:
        if is_within(shares_out, workspace):
            raise ColdLibraryError("--shares-out must not be inside the workspace.")
        if is_within(shares_out, out):
            raise ColdLibraryError("--shares-out must not be inside the sealed folder.")
        if shares_out.exists() and not shares_out.is_dir():
            raise ColdLibraryError(f"{shares_out} exists and is not a folder.")
        clash = sorted(shares_out.glob("share-*.txt")) if shares_out.is_dir() else []
        if clash:
            raise ColdLibraryError(f"{shares_out} already holds share files. Choose another folder.")

    # 5. Build everything in memory first.
    tar_bytes, core_files, skipped = build_core_tar(workspace / "core")
    letters = _letters(workspace)
    cover_bytes = (workspace / "COVER.md").read_bytes()
    master = crypto.new_master_secret(bits)
    mnemonics = crypto.split_master_secret(master, threshold, shares)
    _self_check_shares(mnemonics, threshold, master)

    core_age = crypto.encrypt(tar_bytes, master)
    if crypto.decrypt(core_age, master) != tar_bytes:
        raise ColdLibraryError("Self-check failed: core.age does not decrypt. Nothing was written.")
    work_factor = crypto.scrypt_work_factor(core_age)
    if work_factor is None:
        raise ColdLibraryError("Self-check failed: core.age is not a single-stanza scrypt age file.")
    if work_factor > crypto.PORTABLE_WORK_FACTOR:
        echo(
            f"Warning: age chose scrypt work factor {work_factor} on this computer. Some age tools "
            f"refuse more than {crypto.PORTABLE_WORK_FACTOR} by default. Test-open the box with the "
            "tool your keepers will use."
        )
    sealed: List[Tuple[str, bytes]] = [("COVER.md", cover_bytes), ("core.age", core_age)]
    for letter in letters:
        sealed.append((f"letters/{letter.stem}.age", crypto.encrypt(letter.read_bytes(), master)))

    sealed_on = today().isoformat()
    seq = core["version"]["seq"]
    manifest = build_manifest(
        seq=seq,
        created_at=sealed_on,
        threshold=threshold,
        shares=shares,
        bits=bits,
        files=sealed,
    )

    # 6. Write the sealed folder. Never overwrite anything.
    try:
        out.mkdir(parents=True, exist_ok=True)
        for rel, data in sealed:
            target = out.joinpath(*rel.split("/"))
            target.parent.mkdir(parents=True, exist_ok=True)
            write_new_file(target, data, 0o644)
        write_new_file(out / MANIFEST_NAME, dump_manifest(manifest), 0o644)
    except OSError as exc:
        raise ColdLibraryError(
            f"Could not write the sealed folder ({exc}). It may be incomplete: "
            f"remove {out} yourself and seal again."
        ) from None
    for rel, data in sealed:
        if sha256_file(out.joinpath(*rel.split("/"))) != sha256_bytes(data):
            raise ColdLibraryError(f"{rel} did not write correctly. Remove {out} and seal again.")

    # 7. Shares.
    blocks = [
        format_share_block(i + 1, shares, threshold, mnemonic, sealed_on, seq)
        for i, mnemonic in enumerate(mnemonics)
    ]
    share_files: List[Path] = []
    if shares_out is not None:
        try:
            make_private_dir(shares_out)
            for i, block in enumerate(blocks):
                target = shares_out / f"share-{i + 1}.txt"
                write_new_file(target, block.encode("ascii"), 0o600)
                share_files.append(target)
        except OSError as exc:
            raise ColdLibraryError(
                f"Could not write the share files ({exc}). The box in {out} cannot be opened "
                f"without them: remove {out} and {shares_out} yourself, then seal again."
            ) from None

    return SealResult(
        out=out,
        shares=mnemonics,
        share_blocks=blocks,
        share_files=share_files,
        manifest=manifest,
        sealed_files=[rel for rel, _ in sealed] + [MANIFEST_NAME],
        core_files=core_files,
        skipped=skipped,
        work_factor=work_factor,
        report=report,
    )
