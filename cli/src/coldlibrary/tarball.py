"""Deterministic tar of ``core/`` and safe reading of it.

Writing: sorted paths, every entry under ``core/``, mtime 0, uid/gid 0, empty
owner names, mode 0755 for folders and 0644 for files, PAX format, no
compression, no links. The same folder always gives the same bytes.

Reading: only regular files and folders under ``core/``. Absolute paths, ``..``,
empty or ``.`` parts, backslashes, links and devices are refused.
"""

import io
import re
import tarfile
from dataclasses import dataclass
from pathlib import Path
from typing import List, Optional, Tuple

from .errors import ColdLibraryError
from .util import is_hidden_or_junk

ROOT = "core"
_DRIVE_RE = re.compile(r"^[A-Za-z]:")


@dataclass(frozen=True)
class CoreEntry:
    name: str  # path inside the archive, e.g. "core/core.json"
    data: Optional[bytes]  # None for a folder

    @property
    def is_dir(self) -> bool:
        return self.data is None


def collect_core(core_dir: Path) -> Tuple[List[Tuple[str, Path, bool]], List[str]]:
    """List what goes into the archive. Returns (entries, skipped names).

    Hidden files and operating-system clutter (.DS_Store and similar) are skipped.
    Links and special files stop the seal.
    """
    if not core_dir.is_dir():
        raise ColdLibraryError(f"{core_dir} is not a folder.")
    entries: List[Tuple[str, Path, bool]] = [(ROOT, core_dir, True)]
    skipped: List[str] = []

    def walk(folder: Path, prefix: str) -> None:
        for child in sorted(folder.iterdir(), key=lambda p: p.name):
            name = f"{prefix}/{child.name}"
            if is_hidden_or_junk(child.name):
                skipped.append(name)
                continue
            if child.is_symlink():
                raise ColdLibraryError(f"{name} is a link. Replace it with the real file.")
            if child.is_dir():
                entries.append((name, child, True))
                walk(child, name)
            elif child.is_file():
                entries.append((name, child, False))
            else:
                raise ColdLibraryError(f"{name} is not a regular file.")

    walk(core_dir, ROOT)
    entries.sort(key=lambda entry: entry[0].split("/"))
    return entries, skipped


def build_core_tar(core_dir: Path) -> Tuple[bytes, List[str], List[str]]:
    """Return (tar bytes, file names in the archive, skipped names)."""
    entries, skipped = collect_core(core_dir)
    buffer = io.BytesIO()
    with tarfile.open(
        fileobj=buffer, mode="w", format=tarfile.PAX_FORMAT, encoding="utf-8"
    ) as archive:
        for name, path, is_dir in entries:
            info = tarfile.TarInfo(name)
            info.mtime = 0
            info.uid = 0
            info.gid = 0
            info.uname = ""
            info.gname = ""
            if is_dir:
                info.type = tarfile.DIRTYPE
                info.mode = 0o755
                info.size = 0
                archive.addfile(info)
            else:
                data = path.read_bytes()
                info.type = tarfile.REGTYPE
                info.mode = 0o644
                info.size = len(data)
                archive.addfile(info, io.BytesIO(data))
    files = [name for name, _path, is_dir in entries if not is_dir]
    return buffer.getvalue(), files, skipped


def check_member_name(name: str) -> str:
    """Return the normalized member name, or raise if it is unsafe."""
    if not name or "\x00" in name or "\\" in name:
        raise ColdLibraryError(f"Unsafe path in core archive: {name!r}.")
    if name.startswith("/") or _DRIVE_RE.match(name):
        raise ColdLibraryError(f"Absolute path in core archive: {name!r}.")
    stripped = name.rstrip("/")
    parts = stripped.split("/")
    if any(part in ("", ".", "..") for part in parts):
        raise ColdLibraryError(f"Unsafe path in core archive: {name!r}.")
    if parts[0] != ROOT:
        raise ColdLibraryError(f"Path outside core/ in core archive: {name!r}.")
    return stripped


def read_core_tar(data: bytes) -> List[CoreEntry]:
    """Parse the decrypted archive in memory, refusing anything unsafe."""
    entries: List[CoreEntry] = []
    seen = set()
    try:
        archive = tarfile.open(fileobj=io.BytesIO(data), mode="r:")
    except tarfile.TarError:
        raise ColdLibraryError("core.age does not contain a valid tar archive.") from None
    with archive:
        try:
            members = archive.getmembers()
        except tarfile.TarError:
            raise ColdLibraryError("core.age does not contain a valid tar archive.") from None
        for member in members:
            name = check_member_name(member.name)
            if name in seen:
                raise ColdLibraryError(f"Duplicate path in core archive: {name!r}.")
            seen.add(name)
            if member.isdir():
                entries.append(CoreEntry(name, None))
            elif member.isreg():
                handle = archive.extractfile(member)
                if handle is None:
                    raise ColdLibraryError(f"Cannot read {name!r} from core archive.")
                entries.append(CoreEntry(name, handle.read()))
            else:
                raise ColdLibraryError(
                    f"Refusing {name!r} in core archive: only files and folders are allowed."
                )
    return entries
