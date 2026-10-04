import datetime
import json
import shutil

import pytest

from conftest import (
    EN_EXAMPLE,
    XPRV_TEST_VECTOR,
    copy_workspace,
    expected_opened,
    invoke,
    snapshot,
    tree,
)

SEALED_FILES = [
    "COVER.md",
    "MANIFEST.json",
    "core.age",
    "letters/001-family.age",
    "letters/002-project.age",
]


def share_mnemonic(path):
    from coldlibrary.shares import share_words

    words, _ = share_words(path.read_text())
    return " ".join(words)


# ------------------------------------------------------------- seal output


def test_seal_writes_the_sealed_layout(sealed_en):
    files = sorted(p.relative_to(sealed_en.sealed).as_posix() for p in sealed_en.sealed.rglob("*") if p.is_file())
    assert files == SEALED_FILES
    assert (sealed_en.sealed / "COVER.md").read_bytes() == (EN_EXAMPLE / "COVER.md").read_bytes()
    for rel in ("core.age", "letters/001-family.age", "letters/002-project.age"):
        data = (sealed_en.sealed / rel).read_bytes()
        assert data.startswith(b"age-encryption.org/v1\n-> scrypt "), rel
        assert b"Wren" not in data and b"Halloway" not in data


def test_manifest_has_exact_fields_and_no_personal_data(sealed_en):
    text = (sealed_en.sealed / "MANIFEST.json").read_text()
    manifest = json.loads(text)
    assert list(manifest) == [
        "spec", "seq", "created_at", "threshold", "shares", "master_secret_bits", "files",
    ]
    assert manifest["spec"] == "coldlibrary/0.1"
    assert manifest["seq"] == 3
    assert manifest["created_at"] == datetime.date.today().isoformat()
    assert (manifest["threshold"], manifest["shares"], manifest["master_secret_bits"]) == (2, 3, 256)
    assert [f["path"] for f in manifest["files"]] == [
        "COVER.md", "core.age", "letters/001-family.age", "letters/002-project.age",
    ]
    for entry in manifest["files"]:
        assert set(entry) == {"path", "sha256", "bytes"}
        assert entry["bytes"] == (sealed_en.sealed / entry["path"]).stat().st_size
    for personal in ("Wren", "Halloway", "Sam", "Ines", "example.org"):
        assert personal not in text


def test_seal_never_changes_the_workspace(sealed_en):
    assert snapshot(EN_EXAMPLE) == sealed_en.before


def test_share_files_have_headers_and_33_words(sealed_en):
    for number, path in enumerate(sealed_en.shares, 1):
        text = path.read_text()
        assert text.startswith(f"# Keeper {number} of 3\n")
        assert "Write this down on paper or steel. Do not photograph it. Do not send it in any chat app." in text
        assert len(share_mnemonic(path).split()) == 33
        assert path.stat().st_mode & 0o077 == 0  # readable only by the owner


def test_seal_prints_shares_to_stdout_by_default(tmp_path):
    result = invoke("seal", EN_EXAMPLE, "--skip-cooling", "--out", tmp_path / "sealed")
    assert result.code == 0, result.text
    for number in (1, 2, 3):
        assert f"# Keeper {number} of 3" in result.out
    assert result.out.count("Do not photograph it.") == 3
    assert "skipping the 7-day cooling period" in result.err
    assert "remove the plaintext yourself" in result.err
    assert "never be stored together" in result.err
    assert not any(p.name.startswith("share-") for p in tmp_path.rglob("*"))


# ------------------------------------------------------------------ open


@pytest.mark.parametrize("pair", [(1, 2), (1, 3), (2, 3)], ids=["1+2", "1+3", "2+3"])
def test_every_pair_of_shares_opens_the_box_byte_for_byte(sealed_en, tmp_path, pair):
    out = tmp_path / "opened"
    a, b = (sealed_en.shares[i - 1] for i in pair)
    result = invoke("open", sealed_en.sealed, "--share-file", a, "--share-file", b, "--out", out)
    assert result.code == 0, result.text
    assert f"keepers {pair[0]}, {pair[1]}" in result.out
    assert tree(out) == expected_opened(EN_EXAMPLE)


def test_one_share_is_not_enough(sealed_en, tmp_path):
    out = tmp_path / "opened"
    result = invoke("open", sealed_en.sealed, "--share-file", sealed_en.shares[0], "--out", out)
    assert result.code == 1
    assert "needs 2 different shares" in result.err
    assert "Traceback" not in result.text
    assert not out.exists()


def test_the_same_share_twice_is_not_enough(sealed_en, tmp_path):
    out = tmp_path / "opened"
    share = sealed_en.shares[1]
    result = invoke("open", sealed_en.sealed, "--share-file", share, "--share-file", share, "--out", out)
    assert result.code == 1
    assert "needs 2 different shares" in result.err
    assert not out.exists()


def test_open_refuses_a_non_empty_output_folder(sealed_en, tmp_path):
    out = tmp_path / "opened"
    out.mkdir()
    (out / "keep.txt").write_text("keep")
    result = invoke(
        "open", sealed_en.sealed, "--share-file", sealed_en.shares[0],
        "--share-file", sealed_en.shares[1], "--out", out,
    )
    assert result.code == 1
    assert "not empty" in result.err
    assert (out / "keep.txt").read_text() == "keep"


def test_open_with_prompt(sealed_en, tmp_path, monkeypatch):
    typed = iter([share_mnemonic(sealed_en.shares[2])])
    monkeypatch.setattr("getpass.getpass", lambda prompt="": next(typed))
    out = tmp_path / "opened"
    result = invoke("open", sealed_en.sealed, "--share-file", sealed_en.shares[0], "--prompt", "--out", out)
    assert result.code == 0, result.text
    assert tree(out) == expected_opened(EN_EXAMPLE)


def test_shares_from_another_seal_are_refused(sealed_en, tmp_path):
    other = tmp_path / "other"
    result = invoke("seal", EN_EXAMPLE, "--skip-cooling", "--out", other / "sealed", "--shares-out", other / "shares")
    assert result.code == 0, result.text
    out = tmp_path / "opened"
    mixed = invoke(
        "open", sealed_en.sealed, "--share-file", sealed_en.shares[0],
        "--share-file", other / "shares" / "share-2.txt", "--out", out,
    )
    assert mixed.code == 1
    assert "different seal" in mixed.err
    wrong = invoke(
        "open", sealed_en.sealed, "--share-file", other / "shares" / "share-1.txt",
        "--share-file", other / "shares" / "share-2.txt", "--out", out,
    )
    assert wrong.code == 1
    assert "do not open this box" in wrong.err
    assert not out.exists()


# ----------------------------------------------------------- 128-bit seal


def test_128_bit_round_trip_after_the_cooling_period(tmp_path):
    ws = copy_workspace(EN_EXAMPLE, tmp_path / "ws")
    core_path = ws / "core" / "core.json"
    core = json.loads(core_path.read_text(encoding="utf-8"))
    core["crypto"]["master_secret_bits"] = 128
    core_path.write_text(json.dumps(core, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    created = datetime.date.today() - datetime.timedelta(days=8)
    (ws / ".coldlibrary-created").write_text(created.isoformat() + "\n")

    result = invoke("seal", ws, "--bits", "128", "--out", tmp_path / "sealed", "--shares-out", tmp_path / "shares")
    assert result.code == 0, result.text
    assert "cooling" not in result.err
    manifest = json.loads((tmp_path / "sealed" / "MANIFEST.json").read_text())
    assert manifest["master_secret_bits"] == 128

    check = invoke("check-share", "--file", tmp_path / "shares" / "share-1.txt")
    assert check.code == 0, check.text
    assert "Words: 20" in check.out
    assert "Secret size: 128 bits" in check.out

    out = tmp_path / "opened"
    opened = invoke(
        "open", tmp_path / "sealed",
        "--share-file", tmp_path / "shares" / "share-3.txt",
        "--share-file", tmp_path / "shares" / "share-2.txt",
        "--out", out,
    )
    assert opened.code == 0, opened.text
    assert tree(out) == expected_opened(ws)


# --------------------------------------------------------------- refusals


def test_seal_refuses_when_validate_fails(tmp_path):
    ws = copy_workspace(EN_EXAMPLE, tmp_path / "ws")
    with open(ws / "core" / "COLDLIBRARY.md", "a", encoding="utf-8") as handle:
        handle.write(f"\n{XPRV_TEST_VECTOR}\n")
    result = invoke("seal", ws, "--skip-cooling", "--out", tmp_path / "sealed", "--shares-out", tmp_path / "shares")
    assert result.code == 1
    assert "An extended private key" in result.err
    assert "Seal refused" in result.err
    assert not (tmp_path / "sealed").exists()
    assert not (tmp_path / "shares").exists()


def test_seal_refuses_shares_out_inside_the_workspace(tmp_path):
    ws = copy_workspace(EN_EXAMPLE, tmp_path / "ws")
    before = snapshot(ws)
    result = invoke("seal", ws, "--skip-cooling", "--out", tmp_path / "sealed", "--shares-out", ws / "shares")
    assert result.code == 1
    assert "--shares-out must not be inside the workspace" in result.err
    assert not (tmp_path / "sealed").exists()
    assert snapshot(ws) == before


def test_seal_refuses_shares_out_inside_the_sealed_folder(tmp_path):
    result = invoke(
        "seal", EN_EXAMPLE, "--skip-cooling",
        "--out", tmp_path / "sealed", "--shares-out", tmp_path / "sealed" / "shares",
    )
    assert result.code == 1
    assert "--shares-out must not be inside the sealed folder" in result.err
    assert not (tmp_path / "sealed").exists()


def test_seal_refuses_out_inside_the_workspace(tmp_path):
    ws = copy_workspace(EN_EXAMPLE, tmp_path / "ws")
    result = invoke("seal", ws, "--skip-cooling", "--out", ws / "sealed")
    assert result.code == 1
    assert "must not be inside the workspace" in result.err
    assert not (ws / "sealed").exists()


def test_seal_refuses_a_non_empty_out_folder(tmp_path):
    out = tmp_path / "sealed"
    out.mkdir()
    (out / "old.txt").write_text("old")
    result = invoke("seal", EN_EXAMPLE, "--skip-cooling", "--out", out)
    assert result.code == 1
    assert "not empty" in result.err
    assert sorted(p.name for p in out.iterdir()) == ["old.txt"]


def test_seal_refuses_a_fresh_workspace_without_skip_cooling(tmp_path):
    ws = tmp_path / "ws"
    assert invoke("init", ws).code == 0
    result = invoke("seal", ws, "--out", tmp_path / "sealed")
    assert result.code == 1
    ready = datetime.date.today() + datetime.timedelta(days=7)
    assert "7-day cooling period ends on " + ready.isoformat() in result.err
    assert not (tmp_path / "sealed").exists()


def test_seal_refuses_without_a_creation_date(tmp_path):
    result = invoke("seal", EN_EXAMPLE, "--out", tmp_path / "sealed")
    assert result.code == 1
    assert "No creation date found" in result.err
    assert not (tmp_path / "sealed").exists()


def test_seal_refuses_settings_that_disagree_with_core_json(tmp_path):
    result = invoke("seal", EN_EXAMPLE, "--skip-cooling", "--threshold", "3", "--shares", "5", "--out", tmp_path / "sealed")
    assert result.code == 1
    assert "does not match core.json" in result.err
    assert not (tmp_path / "sealed").exists()


# ------------------------------------------------------------------ verify


def test_verify_passes_then_fails_after_one_flipped_byte(sealed_en, tmp_path):
    ok = invoke("verify", sealed_en.sealed)
    assert ok.code == 0, ok.text
    assert "OK: every file matches MANIFEST.json." in ok.out

    copy = tmp_path / "copy"
    shutil.copytree(sealed_en.sealed, copy)
    core_age = copy / "core.age"
    data = bytearray(core_age.read_bytes())
    data[len(data) // 2] ^= 0x01
    core_age.write_bytes(bytes(data))
    bad = invoke("verify", copy)
    assert bad.code == 1
    assert "CHANGED   core.age" in bad.out


def test_verify_reports_missing_and_extra_files(sealed_en, tmp_path):
    copy = tmp_path / "copy"
    shutil.copytree(sealed_en.sealed, copy)
    (copy / "letters" / "002-project.age").unlink()
    (copy / "letters" / "003-new.age").write_bytes(b"not from the owner")
    (copy / ".DS_Store").write_bytes(b"")
    result = invoke("verify", copy)
    assert result.code == 1
    assert "MISSING   letters/002-project.age" in result.out
    assert "EXTRA     letters/003-new.age" in result.out
    assert "ignored   .DS_Store" in result.out


def test_open_refuses_a_changed_box(sealed_en, tmp_path):
    copy = tmp_path / "copy"
    shutil.copytree(sealed_en.sealed, copy)
    letter = copy / "letters" / "001-family.age"
    data = bytearray(letter.read_bytes())
    data[-1] ^= 0x01
    letter.write_bytes(bytes(data))
    out = tmp_path / "opened"
    args = ["open", copy, "--share-file", sealed_en.shares[0], "--share-file", sealed_en.shares[1], "--out", out]
    refused = invoke(*args)
    assert refused.code == 1
    assert "does not match MANIFEST.json" in refused.err
    assert not out.exists()
    forced = invoke(*args, "--ignore-manifest")
    assert forced.code == 1  # age authentication still catches the change
    assert "001-family.age did not decrypt" in forced.err
    assert "Traceback" not in forced.text
    assert not out.exists()


# ------------------------------------------------------- open by hand (spec Appendix A)


def test_box_opens_by_hand_without_coldlibrary_code(sealed_en):
    """Spec Appendix A: any SLIP-39 tool, the passphrase formula, any age tool, tar."""
    import base64
    import hashlib
    import io
    import tarfile

    import pyrage
    import shamir_mnemonic

    manifest = json.loads((sealed_en.sealed / "MANIFEST.json").read_text())
    for entry in manifest["files"]:
        data = (sealed_en.sealed / entry["path"]).read_bytes()
        assert hashlib.sha256(data).hexdigest() == entry["sha256"]

    def words(path):
        lines = [l for l in path.read_text().splitlines() if not l.startswith("#")]
        return " ".join(t for t in " ".join(lines).split() if t.isalpha())

    master = shamir_mnemonic.combine_mnemonics([words(sealed_en.shares[0]), words(sealed_en.shares[2])])
    passphrase = "coldlibrary/0.1:" + base64.b32encode(master).decode().rstrip("=")
    tar_bytes = pyrage.passphrase.decrypt((sealed_en.sealed / "core.age").read_bytes(), passphrase)
    with tarfile.open(fileobj=io.BytesIO(tar_bytes)) as archive:
        names = archive.getnames()
        assert all(name == "core" or name.startswith("core/") for name in names)
        core_json = archive.extractfile("core/core.json").read()
    assert core_json == (EN_EXAMPLE / "core" / "core.json").read_bytes()
    letter = pyrage.passphrase.decrypt((sealed_en.sealed / "letters" / "001-family.age").read_bytes(), passphrase)
    assert letter == (EN_EXAMPLE / "letters" / "001-family.md").read_bytes()
