"""Small helpers shared by the commands."""

import datetime
import hashlib
import os
import sys
from pathlib import Path
from typing import Optional, Union

PathLike = Union[str, "os.PathLike[str]"]

#: Name of the hidden file that records when a workspace was created.
CREATED_FILE = ".coldlibrary-created"

#: Days between creating a workspace and its first seal.
COOLING_DAYS = 7

#: File names that operating systems drop into folders. Never sealed.
OS_JUNK = frozenset({".DS_Store", "Thumbs.db", "desktop.ini", "Desktop.ini"})


def today() -> datetime.date:
    """Today's local date. Tests may monkeypatch this."""
    return datetime.date.today()


def eprint(*args: object) -> None:
    print(*args, file=sys.stderr)


def real(path: PathLike) -> Path:
    """Absolute path with symbolic links resolved (works for paths that do not exist yet)."""
    return Path(os.path.realpath(os.path.abspath(os.fspath(path))))


def is_within(path: PathLike, parent: PathLike) -> bool:
    """True if ``path`` is ``parent`` or lies inside it, after resolving links."""
    p = real(path)
    q = real(parent)
    return p == q or q in p.parents


def is_empty_or_missing(path: Path) -> bool:
    if not path.exists():
        return True
    if not path.is_dir():
        return False
    return not any(path.iterdir())


def is_hidden_or_junk(name: str) -> bool:
    return name.startswith(".") or name in OS_JUNK or name.endswith("~")


def write_new_file(path: Path, data: bytes, mode: int = 0o600) -> None:
    """Write a file that must not exist yet. Never overwrites."""
    flags = os.O_WRONLY | os.O_CREAT | os.O_EXCL | getattr(os, "O_BINARY", 0)
    fd = os.open(os.fspath(path), flags, mode)
    with os.fdopen(fd, "wb") as handle:
        handle.write(data)


def make_private_dir(path: Path) -> None:
    """Create a folder (and parents) readable only by the current user."""
    path.mkdir(mode=0o700, parents=True, exist_ok=True)


def sha256_bytes(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def sha256_file(path: Path) -> str:
    digest = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(1 << 16), b""):
            digest.update(chunk)
    return digest.hexdigest()


def parse_iso_date(text: str) -> Optional[datetime.date]:
    text = text.strip()
    try:
        if len(text) != 10:
            return None
        return datetime.date.fromisoformat(text)
    except ValueError:
        return None


def read_created_date(workspace: Path) -> Optional[datetime.date]:
    """The creation date written by ``init``, or None if missing or unreadable."""
    marker = workspace / CREATED_FILE
    try:
        first_line = marker.read_text(encoding="utf-8").splitlines()[0]
    except (OSError, IndexError, UnicodeDecodeError):
        return None
    return parse_iso_date(first_line)
