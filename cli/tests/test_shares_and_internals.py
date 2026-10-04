import base64
import hashlib
import io
import os
import subprocess
import sys
import tarfile
from itertools import combinations

import pyrage
import pytest
from shamir_mnemonic.share import Share

from coldlibrary import crypto
from coldlibrary.errors import ColdLibraryError
from coldlibrary.tarball import build_core_tar, read_core_tar
from coldlibrary.wordlists import BIP39_SHA256, bip39_words, data_bytes, slip39_words
from conftest import CLI_DIR, SCHEMA, invoke

# ------------------------------------------------------------- check-share


def read_words(path):
    from coldlibrary.shares import share_words

    return share_words(path.read_text())[0]


def test_check_share_reports_a_real_share(sealed_en):
    result = invoke("check-share", "--file", sealed_en.shares[0])
    assert result.code == 0, result.text
    for expected in (
        "Share: valid",
        "Words: 33",
        "Secret size: 256 bits",
        "Member index: 0 (Keeper 1)",
        "Member threshold: 2",
        "Group: 1 of 1 (group threshold 1)",
        "Extendable: yes",
        "Iteration exponent: 1",
    ):
        assert expected in result.out
    assert " ".join(read_words(sealed_en.shares[0])) not in result.text


def test_check_share_reads_stdin(sealed_en):
    result = invoke("check-share", stdin=sealed_en.shares[1].read_text())
    assert result.code == 0, result.text
    assert "Member index: 1 (Keeper 2)" in result.out


def test_check_share_fails_after_one_word_changes(sealed_en, tmp_path):
    words = read_words(sealed_en.shares[0])
    replacement = next(w for w in slip39_words() if w != words[9])
    words[9] = replacement
    bad = tmp_path / "bad.txt"
    bad.write_text(" ".join(words) + "\n")
    result = invoke("check-share", "--file", bad)
    assert result.code == 1
    assert "Share: invalid" in result.out
    assert "checksum does not match" in result.out


def test_check_share_rejects_unknown_words_and_wrong_length(sealed_en, tmp_path):
    words = read_words(sealed_en.shares[0])
    unknown = tmp_path / "unknown.txt"
    unknown.write_text(" ".join(words[:5] + ["zzzz"] + words[6:]))
    result = invoke("check-share", "--file", unknown)
    assert result.code == 1
    assert "Word 6 is not in the SLIP-39 word list." in result.out
    short = tmp_path / "short.txt"
    short.write_text(" ".join(words[:-1]))
    result = invoke("check-share", "--file", short)
    assert result.code == 1
    assert "32 words is not a valid share length" in result.out


def test_check_share_accepts_four_letter_abbreviations(sealed_en, tmp_path):
    words = read_words(sealed_en.shares[2])
    short = tmp_path / "steel.txt"
    short.write_text("\n".join(f"{i}. {w[:4].upper()}" for i, w in enumerate(words, 1)))
    result = invoke("check-share", "--file", short)
    assert result.code == 0, result.text
    assert "shortened words were read as full words" in result.out


# ------------------------------------------------------------------ crypto


def test_age_passphrase_matches_the_spec_test_vectors():
    # SPEC.md §7.4
    assert crypto.age_passphrase(bytes(range(32))) == (
        "coldlibrary/0.1:AAAQEAYEAUDAOCAJBIFQYDIOB4IBCEQTCQKRMFYYDENBWHA5DYPQ"
    )
    assert crypto.age_passphrase(bytes(range(16))) == "coldlibrary/0.1:AAAQEAYEAUDAOCAJBIFQYDIOB4"
    assert len(crypto.age_passphrase(bytes(32))) == 68
    assert len(crypto.age_passphrase(bytes(16))) == 42


def test_age_passphrase_format_is_pinned():
    assert crypto.age_passphrase(bytes(32)) == "coldlibrary/0.1:" + "A" * 52
    assert crypto.age_passphrase(bytes(16)) == "coldlibrary/0.1:" + "A" * 26
    master = bytes(range(32))
    expected = "coldlibrary/0.1:" + base64.b32encode(master).decode().rstrip("=")
    assert crypto.age_passphrase(master) == expected
    assert "=" not in expected


def test_ciphertext_is_plain_age_passphrase_mode():
    master = os.urandom(32)
    ciphertext = crypto.encrypt(b"hello", master)
    assert ciphertext.startswith(b"age-encryption.org/v1\n-> scrypt ")
    work_factor = crypto.scrypt_work_factor(ciphertext)
    assert work_factor is not None and 10 <= work_factor <= crypto.PORTABLE_WORK_FACTOR
    passphrase = "coldlibrary/0.1:" + base64.b32encode(master).decode().rstrip("=")
    assert pyrage.passphrase.decrypt(ciphertext, passphrase) == b"hello"
    with pytest.raises(crypto.DecryptionFailed):
        crypto.decrypt(ciphertext, os.urandom(32))


@pytest.mark.parametrize("threshold,count", [(2, 3), (3, 5)])
def test_slip39_parameters(threshold, count):
    master = os.urandom(32)
    mnemonics = crypto.split_master_secret(master, threshold, count)
    shares = [Share.from_mnemonic(m) for m in mnemonics]
    assert [s.index for s in shares] == list(range(count))
    for share in shares:
        assert (share.group_count, share.group_threshold) == (1, 1)
        assert share.member_threshold == threshold
        assert share.iteration_exponent == 1
        assert share.extendable is True
    import shamir_mnemonic

    for combo in combinations(mnemonics, threshold):
        assert shamir_mnemonic.combine_mnemonics(list(combo), b"") == master


def test_split_refuses_bad_settings():
    with pytest.raises(ColdLibraryError):
        crypto.split_master_secret(os.urandom(32), 1, 3)
    with pytest.raises(ColdLibraryError):
        crypto.split_master_secret(os.urandom(32), 4, 3)
    with pytest.raises(ColdLibraryError):
        crypto.new_master_secret(192)


# --------------------------------------------------------------------- tar


def make_core(root):
    core = root / "core"
    (core / "notes").mkdir(parents=True)
    (core / "core.json").write_text("{}\n")
    (core / "COLDLIBRARY.md").write_text("# Test\n")
    (core / "notes" / "笔记.md").write_text("中文\n", encoding="utf-8")
    (core / ".DS_Store").write_bytes(b"junk")
    return core


def test_core_tar_is_deterministic(tmp_path):
    core = make_core(tmp_path)
    first, files, skipped = build_core_tar(core)
    os.utime(core / "core.json", (1, 1))
    os.chmod(core / "COLDLIBRARY.md", 0o600)
    second, _, _ = build_core_tar(core)
    assert first == second
    assert files == ["core/COLDLIBRARY.md", "core/core.json", "core/notes/笔记.md"]
    assert skipped == ["core/.DS_Store"]
    with tarfile.open(fileobj=io.BytesIO(first)) as archive:
        members = archive.getmembers()
    assert [m.name for m in members] == ["core", "core/COLDLIBRARY.md", "core/core.json", "core/notes", "core/notes/笔记.md"]
    for member in members:
        assert (member.mtime, member.uid, member.gid, member.uname, member.gname) == (0, 0, 0, "", "")
        assert member.mode == (0o755 if member.isdir() else 0o644)
    entries = read_core_tar(first)
    assert {e.name: e.data for e in entries if not e.is_dir}["core/notes/笔记.md"] == "中文\n".encode()


def test_core_tar_refuses_links(tmp_path):
    core = make_core(tmp_path)
    (core / "link.md").symlink_to(core / "core.json")
    with pytest.raises(ColdLibraryError, match="is a link"):
        build_core_tar(core)


def evil_tar(name, kind=tarfile.REGTYPE, linkname=""):
    buffer = io.BytesIO()
    with tarfile.open(fileobj=buffer, mode="w", format=tarfile.PAX_FORMAT) as archive:
        info = tarfile.TarInfo(name)
        info.type = kind
        info.linkname = linkname
        data = b"x" if kind == tarfile.REGTYPE else b""
        info.size = len(data)
        archive.addfile(info, io.BytesIO(data))
    return buffer.getvalue()


@pytest.mark.parametrize(
    "name,kind,linkname",
    [
        ("../evil.md", tarfile.REGTYPE, ""),
        ("/etc/evil", tarfile.REGTYPE, ""),
        ("core/../../evil.md", tarfile.REGTYPE, ""),
        ("core/./x.md", tarfile.REGTYPE, ""),
        ("other/x.md", tarfile.REGTYPE, ""),
        ("C:/evil.md", tarfile.REGTYPE, ""),
        ("core\\..\\evil.md", tarfile.REGTYPE, ""),
        ("core/link", tarfile.SYMTYPE, "/etc/passwd"),
        ("core/hard", tarfile.LNKTYPE, "core/core.json"),
    ],
)
def test_reading_the_core_tar_refuses_unsafe_entries(name, kind, linkname):
    with pytest.raises(ColdLibraryError):
        read_core_tar(evil_tar(name, kind, linkname))


# ------------------------------------------------------------ data files


def test_bundled_bip39_list_is_the_official_one():
    raw = data_bytes("bip39-english.txt")
    assert hashlib.sha256(raw).hexdigest() == BIP39_SHA256
    words = bip39_words()
    assert len(words) == 2048 and words[0] == "abandon" and words[-1] == "zoo"
    assert len(slip39_words()) == 1024


def test_bundled_schema_matches_the_spec():
    assert data_bytes("core.schema.json") == SCHEMA.read_bytes()


def test_python_m_coldlibrary_version():
    result = subprocess.run(
        [sys.executable, "-m", "coldlibrary", "--version"],
        cwd=CLI_DIR,
        env={**os.environ, "PYTHONPATH": str(CLI_DIR / "src")},
        capture_output=True,
        text=True,
        check=False,
    )
    assert result.returncode == 0
    assert result.stdout.strip() == "coldlibrary 0.1.0 (spec coldlibrary/0.1)"
