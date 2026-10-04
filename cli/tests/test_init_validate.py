import datetime
import json

import pytest

from coldlibrary import crypto
from conftest import (
    BIP39_TEST_PHRASE,
    EN_EXAMPLE,
    XPRV_TEST_VECTOR,
    ZH_EXAMPLE,
    copy_workspace,
    invoke,
)


def append(path, text):
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(text)


def line_count(path):
    return len(path.read_text(encoding="utf-8").splitlines())


@pytest.fixture
def workspace(tmp_path):
    ws = tmp_path / "ws"
    assert invoke("init", ws).code == 0
    return ws


# ------------------------------------------------------------------ init


@pytest.mark.parametrize("lang", ["en", "zh"])
def test_init_creates_a_valid_workspace(tmp_path, lang):
    ws = tmp_path / f"ws-{lang}"
    result = invoke("init", ws, "--lang", lang)
    assert result.code == 0, result.text
    for rel in ("COVER.md", "core/COLDLIBRARY.md", "core/core.json", "letters/README.md"):
        assert (ws / rel).is_file(), rel
    created = (ws / ".coldlibrary-created").read_text().strip()
    assert created == datetime.date.today().isoformat()
    core = json.loads((ws / "core" / "core.json").read_text(encoding="utf-8"))
    assert core["version"]["signed_at"] == created
    assert core["owner"]["languages"] == [lang]

    check = invoke("validate", ws)
    assert check.code == 0, check.text
    assert ": error:" not in check.out
    assert "placeholder" in check.out  # templates still need filling in


def test_init_refuses_a_non_empty_folder(tmp_path):
    ws = tmp_path / "ws"
    ws.mkdir()
    (ws / "notes.txt").write_text("keep me")
    result = invoke("init", ws)
    assert result.code == 1
    assert "not empty" in result.err
    assert (ws / "notes.txt").read_text() == "keep me"
    assert not (ws / "COVER.md").exists()


def test_init_accepts_an_empty_folder(tmp_path):
    ws = tmp_path / "empty"
    ws.mkdir()
    assert invoke("init", ws).code == 0


# ------------------------------------------------------- examples pass


@pytest.mark.parametrize("example", [EN_EXAMPLE, ZH_EXAMPLE], ids=["en", "zh"])
def test_fictional_examples_pass(example):
    result = invoke("validate", example)
    assert result.code == 0, result.text
    assert "OK: no problems found." in result.out


@pytest.mark.parametrize("example", [EN_EXAMPLE, ZH_EXAMPLE], ids=["en", "zh"])
def test_every_example_file_says_it_is_fictional(example):
    for path in sorted(example.rglob("*")):
        if path.is_file():
            text = path.read_text(encoding="utf-8")
            assert "fictional" in text.lower() or "虚构" in text, path


# ------------------------------------------------------ secret findings


def test_bip39_phrase_in_cover_is_flagged(workspace):
    cover = workspace / "COVER.md"
    append(cover, f"\n{BIP39_TEST_PHRASE}\n")
    line = line_count(cover)
    result = invoke("validate", workspace)
    assert result.code == 1
    assert f"COVER.md:{line}: error:" in result.out
    assert "BIP-39" in result.out
    assert "abandon" not in result.out  # findings never repeat the secret


def test_bip39_phrase_numbered_one_word_per_line_is_flagged(workspace):
    words = BIP39_TEST_PHRASE.split()
    append(workspace / "core" / "COLDLIBRARY.md", "\n" + "".join(f"{i}. {w}\n" for i, w in enumerate(words, 1)))
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "BIP-39" in result.out


def test_bip39_phrase_as_four_letter_abbreviations_is_flagged(workspace):
    abbreviated = " ".join(word[:4] for word in BIP39_TEST_PHRASE.split())
    append(workspace / "letters" / "README.md", f"\n{abbreviated}\n")
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "letters/README.md" in result.out


def test_xprv_is_flagged(workspace):
    target = workspace / "core" / "COLDLIBRARY.md"
    append(target, f"\nBackup key {XPRV_TEST_VECTOR}\n")
    line = line_count(target)
    result = invoke("validate", workspace)
    assert result.code == 1
    assert f"core/COLDLIBRARY.md:{line}: error: An extended private key" in result.out
    assert XPRV_TEST_VECTOR not in result.out


def test_chinese_password_line_is_flagged(workspace):
    target = workspace / "core" / "COLDLIBRARY.md"
    append(target, "\n银行卡密码：123456\n")
    line = line_count(target)
    result = invoke("validate", workspace)
    assert result.code == 1
    assert f"core/COLDLIBRARY.md:{line}: error:" in result.out
    assert "123456" not in result.out


@pytest.mark.parametrize(
    "line",
    [
        "Password: correct horse",
        "passphrase = hunter2",
        "Seed phrase: abandon ability able",
        "mnemonic: zoo zoo zoo",
        "Private key: 0x...",
        "**Password:** hunter2",
        '"password": "hunter2"',
        "Password:",
        "PIN 4821",
        "助记词：abandon ability",
        "私钥是 5Kb8kLf9zgWQnogidDA76Mz",
        "密码是123456",
        "Box passphrase coldlibrary/0.1:AAAQEAYEAUDAOCAJBIFQYDIOB4",
    ],
)
def test_secret_label_lines_are_flagged(workspace, line):
    append(workspace / "core" / "COLDLIBRARY.md", f"\n{line}\n")
    assert invoke("validate", workspace).code == 1


@pytest.mark.parametrize(
    "line",
    [
        "The recovery words are with the notary. Ask Sam.",
        "Password manager: emergency access is set up for k1.",
        "助记词在保险柜里，问哥哥。",
        "密码管理器：已设置紧急访问。",
        "No passwords and no recovery words in this file.",
        "Release 2026-10-04, 12:30, version 0.1.0.",
        "Seed phrase: in the safe deposit box. Ask Sam.",
        "Passwords: none in this file.",
        "助记词：在保险柜里，问哥哥。",
        "按提示输入口令：",
        "SLIP-39 口令为空。口令是 ASCII，没有换行。",
        "口令是“coldlibrary/0.1:”加上主秘密的 base32 形式。",
        'The passphrase is "coldlibrary/0.1:" followed by the base32 form of the master secret.',
    ],
)
def test_pointer_sentences_are_not_flagged(workspace, line):
    append(workspace / "core" / "COLDLIBRARY.md", f"\n{line}\n")
    result = invoke("validate", workspace)
    assert result.code == 0, result.text


def test_hex_private_key_is_flagged_but_a_labelled_hash_is_not(workspace):
    key = "4c0883a69102937d6231471b5dbb6204fe5129617082792ae468d01a3f362318"
    target = workspace / "core" / "COLDLIBRARY.md"
    append(target, f"\nThe will scan has sha256: {key}\n")
    assert invoke("validate", workspace).code == 0
    append(target, f"\nWallet 0x{key}\n")
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "64 hex characters" in result.out


def test_wif_key_is_flagged(workspace):
    # The uncompressed WIF example from the Bitcoin wiki (a public test key).
    append(workspace / "letters" / "README.md", "\n5HueCGU8rMjxEXxiPuD5BDku4MkFqeZyd4dZ1jvhTVqvbTLvyTJ\n")
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "WIF" in result.out


def test_slip39_share_in_a_letter_is_flagged(workspace):
    share = crypto.split_master_secret(bytes(32), 2, 3)[0]
    letter = workspace / "letters" / "001-test.md"
    letter.write_text(f"# Test\n\n{share}\n", encoding="utf-8")
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "letters/001-test.md:3: error:" in result.out
    assert "SLIP-39" in result.out


def test_example_not_a_secret_fence_is_exempt_but_plain_fence_is_not(workspace):
    target = workspace / "core" / "COLDLIBRARY.md"
    append(target, f"\n```example-not-a-secret\n{BIP39_TEST_PHRASE}\n```\n")
    assert invoke("validate", workspace).code == 0
    append(target, f"\n```\n{BIP39_TEST_PHRASE}\n```\n")
    assert invoke("validate", workspace).code == 1


def test_cover_contact_details_and_amounts_are_flagged(workspace):
    cover = workspace / "COVER.md"
    append(cover, "\nWrite to someone@example.org\nCall +1 555 0100\nWorth $12,000\n价值 5万元\n")
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "email address" in result.out
    assert "phone number" in result.out
    assert result.out.count("currency amount") == 2


def test_dates_on_the_cover_are_not_phone_numbers(workspace):
    append(workspace / "COVER.md", "\nSealed on 2026-10-04 at 12:30. Version 3. Reviewed 2026-2027.\n")
    result = invoke("validate", workspace)
    assert result.code == 0, result.text


# --------------------------------------------------------- structure


def edit_core(ws, change):
    path = ws / "core" / "core.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    change(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def test_schema_errors_are_reported(workspace):
    edit_core(workspace, lambda d: d.update(property_follows_legal_will=False))
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "core/core.json: error: /property_follows_legal_will" in result.out


def test_date_format_is_checked(workspace):
    edit_core(workspace, lambda d: d["version"].update(signed_at="yesterday"))
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "is not a 'date'" in result.out


def test_invalid_json_reports_a_line(workspace):
    (workspace / "core" / "core.json").write_text('{\n  "spec": "coldlibrary/0.1",\n  oops\n}\n')
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "core/core.json:3: error: Not valid JSON" in result.out


def test_missing_letter_file_is_an_error(tmp_path):
    ws = copy_workspace(EN_EXAMPLE, tmp_path / "ws")
    (ws / "letters" / "002-project.md").unlink()
    result = invoke("validate", ws)
    assert result.code == 1
    assert "letters/002-project.md does not exist" in result.out


def test_unlisted_letter_is_an_error(tmp_path):
    ws = copy_workspace(EN_EXAMPLE, tmp_path / "ws")
    (ws / "letters" / "003-extra.md").write_text("# Fictional extra letter\n", encoding="utf-8")
    result = invoke("validate", ws)
    assert result.code == 1
    assert "letters/003-extra.md: error: This letter is not listed" in result.out


def test_threshold_larger_than_shares_is_an_error(workspace):
    edit_core(workspace, lambda d: d["crypto"].update(threshold=4))
    result = invoke("validate", workspace)
    assert result.code == 1
    assert "threshold 4 is larger than shares 3" in result.out


def test_unknown_contact_ref_is_an_error(tmp_path):
    ws = copy_workspace(EN_EXAMPLE, tmp_path / "ws")
    edit_core(ws, lambda d: d["assets"][0].update(contact_ref="k9"))
    result = invoke("validate", ws)
    assert result.code == 1
    assert "no keeper has the id 'k9'" in result.out


def test_missing_wish_anchor_is_an_error(tmp_path):
    ws = copy_workspace(EN_EXAMPLE, tmp_path / "ws")
    edit_core(ws, lambda d: d["wishes"][0].update(text_ref="COLDLIBRARY.md#w99"))
    result = invoke("validate", ws)
    assert result.code == 1
    assert "no anchor #w99" in result.out


def test_cover_quorum_that_disagrees_with_core_is_a_warning(tmp_path):
    ws = copy_workspace(ZH_EXAMPLE, tmp_path / "ws")
    cover = ws / "COVER.md"
    text = cover.read_text(encoding="utf-8")
    assert "3 份份额中的 2 份" in text
    cover.write_text(text.replace("3 份份额中的 2 份", "5 份份额中的 3 份"), encoding="utf-8")
    result = invoke("validate", ws)
    assert result.code == 0
    assert "The cover says 3 of 5; core.json says 2 of 3." in result.out


def test_validate_missing_folder(tmp_path):
    result = invoke("validate", tmp_path / "nope")
    assert result.code == 1
    assert "No workspace folder" in result.err
