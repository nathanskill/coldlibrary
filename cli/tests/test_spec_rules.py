"""Checks from spec v0.1 §6 and §17 beyond the basic secret scan."""

import datetime
import json

import pytest

from conftest import EN_EXAMPLE, ZH_EXAMPLE, copy_workspace, invoke


@pytest.fixture
def ws(tmp_path):
    return copy_workspace(EN_EXAMPLE, tmp_path / "ws")


def edit_core(ws, change):
    path = ws / "core" / "core.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    change(data)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def append(path, text):
    with open(path, "a", encoding="utf-8") as handle:
        handle.write(text)


def run(ws):
    return invoke("validate", ws)


# ------------------------------------------------------------------ errors


@pytest.mark.parametrize(
    "change,message",
    [
        (lambda d: d["wishes"][2].update(stage="after_death"), "kind publish must use stage public"),
        (lambda d: d["wishes"][1].update(stage="incapacity"), "kind irreversible must use stage public"),
        (lambda d: d["wishes"][4].update(stage="public"), "destroy-private must use stage after_death"),
        (lambda d: d["letters"][0].update(stage="incapacity"), "letters are released only at after_death or public"),
        (lambda d: d["commons"].update(stage="after_death"), "Open Stacks must use stage public"),
        (lambda d: d["box"].update(custodian="timelock", timelock=None), "the custodian is a time-lock"),
        (lambda d: d["projects"][0].update(handoff_doc="core/handoff/missing.md"), "core/handoff/missing.md does not exist"),
        (lambda d: d["version"].update(cosigned_by="k7"), "/version/cosigned_by: no keeper has the id 'k7'"),
        (lambda d: d["version"].update(supersedes=3), "supersedes must be lower than seq"),
        (lambda d: d["wishes"][0]["half_life"].update(advisory_until="+1y"), "advisory_until is shorter than binding_until"),
        (lambda d: d["wishes"][0].update(text_ref="notes.md#w1"), "must have the form COLDLIBRARY.md#<anchor>"),
        (lambda d: d["keepers"].append(dict(d["keepers"][0])), "the id 'k1' is used twice"),
        (lambda d: d["liveness"].update(quorum="1-of-3"), "must have M of at least 2"),
        (lambda d: d["letters"].append(dict(d["letters"][0], id="l3")), "is already listed"),
    ],
)
def test_rule_errors(ws, change, message):
    edit_core(ws, change)
    result = run(ws)
    assert result.code == 1, result.out
    assert message in result.out


def test_owner_name_on_the_cover_is_an_error(ws):
    append(ws / "COVER.md", "\nWritten by Wren Halloway.\n")
    result = run(ws)
    assert result.code == 1
    assert "The owner's name appears on the cover" in result.out


def test_keeper_contact_on_the_cover_is_an_error(ws):
    append(ws / "COVER.md", "\nAsk ines@example.org\n")
    result = run(ws)
    assert result.code == 1
    assert "The contact of keeper k2 appears on the cover" in result.out


def test_chinese_owner_name_on_the_cover_is_an_error(tmp_path):
    ws = copy_workspace(ZH_EXAMPLE, tmp_path / "ws")
    append(ws / "COVER.md", "\n主人：林小舟\n")
    result = run(ws)
    assert result.code == 1
    assert "The owner's name appears on the cover" in result.out


def test_symlink_in_core_is_an_error(ws):
    (ws / "core" / "link.md").symlink_to(ws / "core" / "COLDLIBRARY.md")
    result = run(ws)
    assert result.code == 1
    assert "core/link.md: error: Links cannot be sealed" in result.out


def test_letter_name_with_other_characters_is_an_error(ws):
    (ws / "letters" / "003 to me.md").write_text("Fictional.\n", encoding="utf-8")
    result = run(ws)
    assert result.code == 1
    assert "letters/003 to me.md: error: Letter file names may use only" in result.out


def test_readme_listed_as_a_letter_is_an_error(ws):
    (ws / "letters" / "README.md").write_text("Fictional instructions.\n", encoding="utf-8")
    edit_core(ws, lambda d: d["letters"][0].update(file="letters/README.md"))
    result = run(ws)
    assert result.code == 1
    assert "letters/README.md is never sealed" in result.out


# ---------------------------------------------------------------- warnings


@pytest.mark.parametrize(
    "change,message",
    [
        (lambda d: d["keepers"][2].update(consented_at=None), "k3 has not agreed yet"),
        (lambda d: [k.update(can_veto=False) for k in d["keepers"]], "No keeper has can_veto: true"),
        (lambda d: d["owner"].update(signing_pubkey=None), "Check-ins are signed but owner.signing_pubkey is not set"),
        (lambda d: d["box"].update(custodian="keepers"), "any quorum of keepers can open the box at any time"),
        (lambda d: d["liveness"].update(quorum="2-of-4"), "/liveness/quorum counts 4 keepers but 3 are listed"),
        (lambda d: d["wishes"][0].update(stage="unreachable"), "nothing is read from the box at stage unreachable"),
        (lambda d: d["letters"][0].update(to="Family"), "The file name contains a name"),
    ],
)
def test_rule_warnings(ws, change, message):
    edit_core(ws, change)
    result = run(ws)
    assert result.code == 0, result.out
    assert message in result.out


def test_ai_assisted_letter_without_marker_is_a_warning(ws):
    letter = ws / "letters" / "002-project.md"
    letter.write_text(letter.read_text(encoding="utf-8").replace("[AI-assisted passage, confirmed by the owner]\n", ""), encoding="utf-8")
    result = run(ws)
    assert result.code == 0
    assert "letters/002-project.md: warning: Marked ai_assisted" in result.out


def test_cover_link_and_version_mismatch_are_warnings(ws):
    cover = ws / "COVER.md"
    text = cover.read_text(encoding="utf-8").replace("Version 3,", "Version 2,")
    cover.write_text(text + "\nMore at https://example.com/elsewhere\n", encoding="utf-8")
    result = run(ws)
    assert result.code == 0
    assert "The cover says version 2; core.json says 3." in result.out
    assert "A link on the cover" in result.out


def test_recent_workspace_warns_about_the_cooling_period(ws):
    (ws / ".coldlibrary-created").write_text(datetime.date.today().isoformat() + "\n")
    result = run(ws)
    assert result.code == 0
    assert "seal will refuse until" in result.out


def test_duplicate_json_key_is_a_warning(ws):
    path = ws / "core" / "core.json"
    text = path.read_text(encoding="utf-8")
    path.write_text(text.replace('"spec": "coldlibrary/0.1",', '"spec": "coldlibrary/0.1",\n  "spec": "coldlibrary/0.1",', 1), encoding="utf-8")
    result = run(ws)
    assert result.code == 0
    assert "The key 'spec' appears twice" in result.out


def test_missing_section_is_a_warning(ws):
    path = ws / "core" / "COLDLIBRARY.md"
    path.write_text(path.read_text(encoding="utf-8").replace("## 8. What I do not want", "## What I do not want"), encoding="utf-8")
    result = run(ws)
    assert result.code == 0
    assert "Sections not found: 8" in result.out


def test_file_in_core_that_cannot_be_scanned_is_a_warning(ws):
    (ws / "core" / "scan.pdf").write_bytes(b"%PDF-1.4 fictional")
    (ws / "core" / ".hidden.md").write_text("not sealed\n")
    result = run(ws)
    assert result.code == 0
    assert "core/scan.pdf: warning: This file is sealed but cannot be checked" in result.out
    assert ".hidden.md" not in result.out


def test_special_file_in_letters_is_an_error(ws):
    import os

    os.mkfifo(ws / "letters" / "003.md")
    result = run(ws)
    assert result.code == 1
    assert "letters/003.md: error: Only regular files can be sealed." in result.out
