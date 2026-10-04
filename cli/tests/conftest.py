import contextlib
import hashlib
import io
import shutil
import sys
from dataclasses import dataclass
from pathlib import Path
from types import SimpleNamespace
from typing import Dict

import pytest

from coldlibrary import cli

CLI_DIR = Path(__file__).resolve().parents[1]
REPO = CLI_DIR.parent
EXAMPLES = REPO / "spec" / "v0.1" / "examples"
EN_EXAMPLE = EXAMPLES / "fictional-indie-dev"
ZH_EXAMPLE = EXAMPLES / "fictional-indie-dev-zh"
SCHEMA = REPO / "spec" / "v0.1" / "core.schema.json"

# Public test vectors, not secrets.
# BIP-39: the all-zero entropy phrase from the BIP-39 test vectors.
BIP39_TEST_PHRASE = " ".join(["abandon"] * 11 + ["about"])
# BIP-32 test vector 1, master extended private key.
XPRV_TEST_VECTOR = (
    "xprv9s21ZrQH143K3QTDL4LXw2F7HEK3wJUD2nW2nRk4stbPy6cq3jPPqjiChkVvvNKmPGJxWUtg6LnF5kejMRNNU3TGtRBeJgk33yuGBxrMPHi"
)


@dataclass
class Result:
    code: int
    out: str
    err: str

    @property
    def text(self) -> str:
        return self.out + self.err


def invoke(*args, stdin=None) -> Result:
    """Run the command line in-process and capture its output."""
    out, err = io.StringIO(), io.StringIO()
    old_stdin = sys.stdin
    if stdin is not None:
        sys.stdin = io.StringIO(stdin)
    try:
        with contextlib.redirect_stdout(out), contextlib.redirect_stderr(err):
            code = cli.main([str(a) for a in args])
    finally:
        sys.stdin = old_stdin
    return Result(code, out.getvalue(), err.getvalue())


def snapshot(root: Path) -> Dict[str, str]:
    """Relative path -> sha256 of every file under root (hidden files included)."""
    return {
        p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest()
        for p in sorted(root.rglob("*"))
        if p.is_file()
    }


def expected_opened(workspace: Path) -> Dict[str, bytes]:
    """What `open` should reproduce from a workspace: COVER.md, core/**, letters/*.md."""
    files = {"COVER.md": (workspace / "COVER.md").read_bytes()}
    for p in sorted((workspace / "core").rglob("*")):
        if p.is_file() and not p.name.startswith("."):
            files[p.relative_to(workspace).as_posix()] = p.read_bytes()
    for p in sorted((workspace / "letters").glob("*.md")):
        if p.name.lower() != "readme.md":
            files[f"letters/{p.name}"] = p.read_bytes()
    return files


def tree(root: Path) -> Dict[str, bytes]:
    return {
        p.relative_to(root).as_posix(): p.read_bytes() for p in sorted(root.rglob("*")) if p.is_file()
    }


def copy_workspace(src: Path, dest: Path) -> Path:
    shutil.copytree(src, dest)
    return dest


@pytest.fixture(scope="session")
def sealed_en(tmp_path_factory):
    """The English example sealed once (2 of 3, --skip-cooling) for the whole session."""
    base = tmp_path_factory.mktemp("sealed-en")
    before = snapshot(EN_EXAMPLE)
    result = invoke(
        "seal", EN_EXAMPLE, "--skip-cooling",
        "--out", base / "sealed", "--shares-out", base / "shares",
    )
    assert result.code == 0, result.text
    return SimpleNamespace(
        base=base,
        sealed=base / "sealed",
        shares=[base / "shares" / f"share-{i}.txt" for i in (1, 2, 3)],
        result=result,
        before=before,
    )
