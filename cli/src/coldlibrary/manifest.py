"""MANIFEST.json: build it when sealing, check it when verifying or opening.

MANIFEST.json lists the sha256 and size of every sealed file. It holds no
names and no contact data. It is not signed: it detects damage, not a
deliberate swap by someone who can also rewrite the manifest.
"""

import json
import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any, Dict, List, Sequence, Tuple

from . import SPEC_ID
from .errors import ColdLibraryError
from .util import OS_JUNK, sha256_bytes, sha256_file

MANIFEST_NAME = "MANIFEST.json"
_SAFE_PATH_RE = re.compile(r"^(?:COVER\.md|core\.age|letters/[A-Za-z0-9._-]+\.age)$")


def build_manifest(
    *,
    seq: int,
    created_at: str,
    threshold: int,
    shares: int,
    bits: int,
    files: Sequence[Tuple[str, bytes]],
) -> Dict[str, Any]:
    return {
        "spec": SPEC_ID,
        "seq": seq,
        "created_at": created_at,
        "threshold": threshold,
        "shares": shares,
        "master_secret_bits": bits,
        "files": [
            {"path": path, "sha256": sha256_bytes(data), "bytes": len(data)} for path, data in files
        ],
    }


def dump_manifest(manifest: Dict[str, Any]) -> bytes:
    return (json.dumps(manifest, indent=2, ensure_ascii=True) + "\n").encode("ascii")


def load_manifest(sealed: Path) -> Dict[str, Any]:
    path = sealed / MANIFEST_NAME
    if not path.is_file():
        raise ColdLibraryError(f"No {MANIFEST_NAME} in {sealed}.")
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as exc:
        raise ColdLibraryError(f"{MANIFEST_NAME} is not valid JSON ({exc}).") from None
    if not isinstance(data, dict) or not isinstance(data.get("files"), list):
        raise ColdLibraryError(f"{MANIFEST_NAME} has no file list.")
    return data


@dataclass
class ManifestCheck:
    ok: List[str] = field(default_factory=list)
    missing: List[str] = field(default_factory=list)
    mismatched: List[str] = field(default_factory=list)
    extra: List[str] = field(default_factory=list)
    ignored: List[str] = field(default_factory=list)
    invalid: List[str] = field(default_factory=list)  # problems with the manifest itself

    @property
    def problems(self) -> int:
        return len(self.missing) + len(self.mismatched) + len(self.extra) + len(self.invalid)


def check_manifest(sealed: Path, manifest: Dict[str, Any]) -> ManifestCheck:
    result = ManifestCheck()
    if manifest.get("spec") != SPEC_ID:
        result.invalid.append(f"spec is {manifest.get('spec')!r}, expected {SPEC_ID!r}")
    for key in ("seq", "threshold", "shares", "master_secret_bits"):
        if not isinstance(manifest.get(key), int) or isinstance(manifest.get(key), bool):
            result.invalid.append(f"{key} is missing or not a number")
    if not isinstance(manifest.get("created_at"), str):
        result.invalid.append("created_at is missing")

    listed = set()
    for entry in manifest["files"]:
        if not isinstance(entry, dict):
            result.invalid.append("a file entry is not an object")
            continue
        rel = entry.get("path")
        expected = entry.get("sha256")
        size = entry.get("bytes")
        if not isinstance(rel, str) or not _SAFE_PATH_RE.match(rel):
            result.invalid.append(f"unexpected file path {rel!r}")
            continue
        if rel in listed:
            result.invalid.append(f"{rel} is listed twice")
            continue
        listed.add(rel)
        path = sealed.joinpath(*rel.split("/"))
        if not path.is_file() or path.is_symlink():
            result.missing.append(rel)
            continue
        actual_size = path.stat().st_size
        if not isinstance(expected, str) or actual_size != size or sha256_file(path) != expected.lower():
            result.mismatched.append(rel)
        else:
            result.ok.append(rel)
    if "core.age" not in listed:
        result.invalid.append("core.age is not listed")

    for path in sorted(sealed.rglob("*")):
        if path.is_dir() and not path.is_symlink():
            continue
        rel = path.relative_to(sealed).as_posix()
        if rel == MANIFEST_NAME or rel in listed:
            continue
        if path.name in OS_JUNK or path.name.startswith("._"):
            result.ignored.append(rel)
        else:
            result.extra.append(rel)
    return result
