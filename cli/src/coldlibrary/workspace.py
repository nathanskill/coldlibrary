"""``coldlibrary init``: create a new plaintext workspace from templates."""

import datetime
from pathlib import Path
from typing import List

from .errors import ColdLibraryError
from .templates import workspace_files
from .util import COOLING_DAYS, CREATED_FILE, make_private_dir, today, write_new_file


def init_workspace(path: Path, lang: str = "en") -> List[str]:
    """Create the workspace. Refuses a folder that exists and is not empty.

    Folders are created readable only by you (0700), files 0600.
    Returns the relative paths written.
    """
    if path.exists():
        if not path.is_dir():
            raise ColdLibraryError(f"{path} exists and is not a folder.")
        if any(path.iterdir()):
            raise ColdLibraryError(f"{path} is not empty. Choose a new folder.")
    created_on = today().isoformat()
    files = workspace_files(lang, created_on)
    make_private_dir(path)
    written = []
    for rel, text in files.items():
        target = path.joinpath(*rel.split("/"))
        make_private_dir(target.parent)
        write_new_file(target, text.encode("utf-8"))
        written.append(rel)
    write_new_file(path / CREATED_FILE, (created_on + "\n").encode("ascii"))
    written.append(CREATED_FILE)
    return written


def first_seal_date(created: datetime.date) -> datetime.date:
    return created + datetime.timedelta(days=COOLING_DAYS)
