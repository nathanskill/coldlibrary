"""``coldlibrary validate``: check a plaintext workspace before it is sealed.

Errors (spec §17.2, plus the MUST rules of §6) stop a seal. Warnings (the
SHOULD rules of §17.3) are shown but do not. Validation changes nothing.
"""

import datetime
import json
import os
import re
from dataclasses import dataclass, field
from functools import lru_cache
from pathlib import Path
from typing import Any, Dict, Iterator, List, Optional, Tuple

from jsonschema import Draft202012Validator

from .errors import ColdLibraryError
from .scan import Finding, scan_text
from .util import COOLING_DAYS, is_hidden_or_junk, read_created_date, today
from .wordlists import data_bytes

CORE = "core/core.json"
LIBRARY = "core/COLDLIBRARY.md"
SCANNED_SUFFIXES = {".md", ".markdown", ".json", ".txt"}
MAX_SCAN_BYTES = 5 * 1024 * 1024
LETTER_NAME_RE = re.compile(r"^[A-Za-z0-9._-]+\.md$")
PLACEHOLDER_RE = re.compile(r"\[to fill|【待填")
AI_MARKER_RE = re.compile(r"^\s*[\[【［]\s*AI(?![A-Za-z])", re.MULTILINE)
TEXT_REF_RE = re.compile(r"^COLDLIBRARY\.md#([A-Za-z0-9_-]+)$")
KEEPERS_MODE = (
    "box.custodian is keepers. In this mode any quorum of keepers can open the box at "
    "any time; the silence period and the veto window are only social agreements. "
    "Record in custodian_note that you understand this."
)
_EXPLICIT_ANCHOR_RES = (
    re.compile(r"<a\s[^>]*?(?:id|name)\s*=\s*[\"']?([A-Za-z0-9_-]+)", re.IGNORECASE),
    re.compile(r"\{#([A-Za-z0-9_-]+)\}"),
)
_HEADING_ANCHOR_RE = re.compile(r"^#{1,6}\s+([A-Za-z][A-Za-z0-9_-]*)\b", re.MULTILINE)
_SECTION_RE = re.compile(r"^#{1,3}\s*([0-9])\s*(?:[.、:：·]|\s)", re.MULTILINE)
_COVER_QUORUM_RES = (
    (re.compile(r"\b(\d+)\s+of\s+(?:the\s+)?(\d+)\b", re.IGNORECASE), False),
    (re.compile(r"(\d+)\s*(?:位|份)(?:开启人|份额)?中的\s*(\d+)\s*(?:位|份)"), True),
)
_COVER_VERSION_RES = (
    re.compile(r"\bVersion:?\s+(\d+)\b"),
    re.compile(r"第\s*(\d+)\s*版"),
)
_URL_RE = re.compile(r"https?://[^\s<>()\[\]\"'`]+", re.IGNORECASE)
_ALLOWED_LINK_RE = re.compile(
    r"^https?://(?:[a-z0-9-]+\.)*coldlibrary\.com(?:[/?#]|$)"
    r"|^https?://github\.com/nathanskill/coldlibrary(?:[/?#.]|$)",
    re.IGNORECASE,
)
_PAREN_RE = re.compile(r"\s*[(（][^()（）]*[)）]\s*")
_COMMON_WORDS = {"the", "and", "for", "our", "all", "dear"}


def walk_files(root: Path) -> Iterator[Tuple[str, Path]]:
    """(relative posix path, path) for every file under root, sorted.

    Hidden folders and files, editor backups and OS clutter are skipped, as in
    seal. Links are reported so callers can refuse them; folders that are
    links are not entered.
    """
    for folder, dirs, files in os.walk(root):
        dirs[:] = sorted(d for d in dirs if not is_hidden_or_junk(d))
        base = Path(folder)
        for name in sorted(files):
            if not is_hidden_or_junk(name):
                yield (base / name).relative_to(root).as_posix(), base / name
        for name in dirs:
            if (base / name).is_symlink():
                yield (base / name).relative_to(root).as_posix(), base / name


@lru_cache(maxsize=None)
def core_schema() -> Dict[str, Any]:
    return json.loads(data_bytes("core.schema.json").decode("utf-8"))


@dataclass
class Report:
    root: Path
    display: str
    findings: List[Finding] = field(default_factory=list)
    core: Optional[Dict[str, Any]] = None
    schema_ok: bool = False

    @property
    def errors(self) -> List[Finding]:
        return [f for f in self.findings if f.severity == "error"]

    @property
    def warnings(self) -> List[Finding]:
        return [f for f in self.findings if f.severity == "warning"]

    def error(self, path: str, line: Optional[int], message: str) -> None:
        self.findings.append(Finding(path, line, "error", message))

    def warn(self, path: str, line: Optional[int], message: str) -> None:
        self.findings.append(Finding(path, line, "warning", message))

    def render(self) -> List[str]:
        return [finding.render(self.display) for finding in self.findings]

    def summary(self) -> str:
        e, w = len(self.errors), len(self.warnings)
        if not e and not w:
            return "OK: no problems found."
        return f"{e} error{'s' if e != 1 else ''}, {w} warning{'s' if w != 1 else ''}."


# ------------------------------------------------------------------ helpers


def _load_json(path: Path, rel: str, report: Report) -> Optional[Any]:
    duplicates: List[str] = []

    def hook(pairs: List[Tuple[str, Any]]) -> Dict[str, Any]:
        result: Dict[str, Any] = {}
        for key, value in pairs:
            if key in result:
                duplicates.append(key)
            result[key] = value
        return result

    try:
        text = path.read_text(encoding="utf-8-sig")
    except UnicodeDecodeError:
        report.error(rel, None, "Not valid UTF-8 text.")
        return None
    try:
        data = json.loads(text, object_pairs_hook=hook)
    except json.JSONDecodeError as exc:
        report.error(rel, exc.lineno, f"Not valid JSON: {exc.msg} (column {exc.colno}).")
        return None
    for key in sorted(set(duplicates)):
        report.warn(rel, None, f"The key {key!r} appears twice in one object; only the last one counts.")
    return data


def _json_pointer(parts: Any) -> str:
    items = [str(part) for part in parts]
    return "/" + "/".join(items) if items else "(top level)"


def _check_schema(data: Any, report: Report) -> bool:
    validator = Draft202012Validator(core_schema(), format_checker=Draft202012Validator.FORMAT_CHECKER)
    errors = sorted(validator.iter_errors(data), key=lambda e: [str(p) for p in e.absolute_path])
    for err in errors:
        report.error(CORE, None, f"{_json_pointer(err.absolute_path)}: {err.message}")
    return not errors


def _relative_days(value: str) -> int:
    number, unit = int(value[1:-1]), value[-1]
    return number * {"d": 1, "m": 30, "y": 365}[unit]


def _bare_name(value: Any) -> str:
    """A name without notes in brackets: 'Sam (k1)' -> 'Sam'."""
    if not isinstance(value, str) or PLACEHOLDER_RE.search(value):
        return ""
    return _PAREN_RE.sub(" ", value).strip()


def _find_line(text: str, value: str, whole_word: bool) -> Optional[int]:
    """1-based line where value occurs (case-insensitive), or None."""
    if not value:
        return None
    if whole_word and value.isascii():
        pattern = re.compile(r"(?<![A-Za-z0-9])" + re.escape(value) + r"(?![A-Za-z0-9])", re.IGNORECASE)
    else:
        pattern = re.compile(re.escape(value), re.IGNORECASE)
    for number, line in enumerate(text.splitlines(), 1):
        if pattern.search(line):
            return number
    return None


def _anchor_index(text: str) -> Tuple[set, List[str]]:
    """All anchors in a Markdown file, and explicit anchors that appear more than once."""
    explicit: List[str] = []
    for pattern in _EXPLICIT_ANCHOR_RES:
        explicit.extend(match.group(1) for match in pattern.finditer(text))
    headings = {match.group(1) for match in _HEADING_ANCHOR_RE.finditer(text)}
    duplicates = sorted({a for a in explicit if explicit.count(a) > 1})
    return set(explicit) | headings, duplicates


def _read_text(path: Path) -> Optional[str]:
    try:
        return path.read_text(encoding="utf-8")
    except (OSError, UnicodeDecodeError):
        return None


# ------------------------------------------------------------ core.json


def _check_core_semantics(core: Dict[str, Any], root: Path, report: Report) -> None:
    def err(message: str) -> None:
        report.error(CORE, None, message)

    def warn(message: str) -> None:
        report.warn(CORE, None, message)

    crypto = core["crypto"]
    threshold, shares = crypto["threshold"], crypto["shares"]
    if threshold > shares:
        err(f"/crypto: threshold {threshold} is larger than shares {shares}.")

    keepers = core["keepers"]
    wishes = core["wishes"]
    letters = core.get("letters", [])
    for items, where in ((keepers, "keepers"), (wishes, "wishes"), (letters, "letters")):
        seen = set()
        for item in items:
            if item["id"] in seen:
                err(f"/{where}: the id {item['id']!r} is used twice.")
            seen.add(item["id"])
    keeper_ids = {keeper["id"] for keeper in keepers}

    for section in ("assets", "projects"):
        for i, item in enumerate(core.get(section, [])):
            ref = item.get("contact_ref")
            if ref is not None and ref not in keeper_ids:
                err(f"/{section}/{i}/contact_ref: no keeper has the id {ref!r}.")

    version = core["version"]
    if version.get("cosigned_by") is not None and version["cosigned_by"] not in keeper_ids:
        err(f"/version/cosigned_by: no keeper has the id {version['cosigned_by']!r}.")
    if version.get("supersedes") is not None and version["supersedes"] >= version["seq"]:
        err("/version: supersedes must be lower than seq.")

    # Keepers.
    if len(keepers) != shares:
        warn(f"There are {len(keepers)} keepers but crypto.shares is {shares}. Each keeper should hold exactly one share.")
    waiting = [k["id"] for k in keepers if k.get("consented_at") is None]
    if waiting:
        warn(f"{', '.join(waiting)} {'has' if len(waiting) == 1 else 'have'} not agreed yet "
             "(consented_at is null). Never hand a share to someone who has not agreed.")
    if not any(k["can_veto"] for k in keepers):
        warn("No keeper has can_veto: true, so no keeper can stop a release.")

    # Liveness.
    liveness = core["liveness"]
    q_t, q_n = (int(x) for x in liveness["quorum"].split("-of-"))
    if q_t < 2 or q_t > q_n:
        err(f"/liveness/quorum: {liveness['quorum']} must have M of at least 2 and at most N.")
    if q_n != len(keepers):
        warn(f"/liveness/quorum counts {q_n} keepers but {len(keepers)} are listed.")
    if (q_t, q_n) != (threshold, shares):
        warn(f"/liveness/quorum is {liveness['quorum']} but crypto is {threshold}-of-{shares}.")
    if liveness.get("checkin", "signed") == "signed" and not core["owner"].get("signing_pubkey"):
        warn("Check-ins are signed but owner.signing_pubkey is not set. Add the public key, or use in-person check-ins.")

    # Box.
    box = core["box"]
    if box["custodian"] == "timelock" and not (isinstance(box.get("timelock"), str) and box["timelock"].strip()):
        err("/box/timelock: the custodian is a time-lock, so timelock must describe it.")
    if box["custodian"] == "keepers":
        warn(KEEPERS_MODE)

    # Wishes.
    library = _read_text(root / "core" / "COLDLIBRARY.md")
    anchors, duplicates = _anchor_index(library) if library is not None else (set(), [])
    for anchor in duplicates:
        report.warn(LIBRARY, None, f"The anchor #{anchor} appears more than once.")
    for i, wish in enumerate(wishes):
        match = TEXT_REF_RE.match(wish["text_ref"])
        if not match:
            err(f"/wishes/{i}/text_ref: must have the form COLDLIBRARY.md#<anchor>.")
        elif library is not None and match.group(1) not in anchors:
            err(f"/wishes/{i}/text_ref: no anchor #{match.group(1)} in core/COLDLIBRARY.md.")
        elif match.group(1) != wish["id"]:
            warn(f"/wishes/{i}/text_ref: the anchor should equal the id {wish['id']}.")
        kind, stage = wish["kind"], wish["stage"]
        if kind in ("publish", "irreversible") and stage != "public":
            err(f"/wishes/{i}: a wish of kind {kind} must use stage public.")
        if kind == "destroy-private" and stage != "after_death":
            err(f"/wishes/{i}: a wish of kind destroy-private must use stage after_death.")
        if stage == "unreachable":
            warn(f"/wishes/{i}: nothing is read from the box at stage unreachable.")
        half = wish["half_life"]
        if _relative_days(half["advisory_until"]) < _relative_days(half["binding_until"]):
            err(f"/wishes/{i}/half_life: advisory_until is shorter than binding_until.")

    # Projects.
    for i, project in enumerate(core.get("projects", [])):
        doc = project.get("handoff_doc")
        if isinstance(doc, str) and doc.startswith("core/") and not (root / doc).is_file():
            err(f"/projects/{i}/handoff_doc: {doc} does not exist.")
        if project["stage"] == "unreachable":
            warn(f"/projects/{i}: nothing is read from the box at stage unreachable.")

    # Letters.
    name_tokens = set()
    for value in [k.get("name") for k in keepers] + [letter["to"] for letter in letters]:
        name_tokens.update(
            t for t in re.split(r"[^a-z0-9]+", _bare_name(value).lower())
            if len(t) >= 3 and t not in _COMMON_WORDS
        )
    listed: Dict[str, int] = {}
    for i, letter in enumerate(letters):
        name = letter["file"]
        if name in listed:
            err(f"/letters/{i}/file: {name} is already listed in /letters/{listed[name]}.")
        listed.setdefault(name, i)
        path = root / name
        if name.lower() == "letters/readme.md" or is_hidden_or_junk(name.split("/")[-1]):
            err(f"/letters/{i}/file: {name} is never sealed. Rename the letter.")
        elif not path.is_file():
            err(f"/letters/{i}/file: {name} does not exist.")
        elif letter["ai_assisted"]:
            text = _read_text(path) or ""
            if not AI_MARKER_RE.search(text):
                report.warn(
                    name, None,
                    "Marked ai_assisted. Put the line [AI-assisted passage, confirmed by the owner] "
                    "before each passage drafted with AI help.",
                )
        if letter["stage"] not in ("after_death", "public"):
            err(f"/letters/{i}/stage: letters are released only at after_death or public.")
        stem_tokens = set(re.split(r"[^a-z0-9]+", name.split("/")[-1][:-3].lower()))
        if name_tokens & stem_tokens:
            report.warn(name, None, "The file name contains a name. File names show on the sealed box.")

    commons = core.get("commons")
    if commons is not None and commons["stage"] != "public":
        err("/commons/stage: Open Stacks must use stage public.")


def _check_letters_folder(root: Path, core: Optional[Dict[str, Any]], report: Report) -> None:
    folder = root / "letters"
    if not folder.is_dir():
        return
    listed = {letter["file"] for letter in core.get("letters", [])} if core else set()
    for child in sorted(folder.iterdir(), key=lambda p: p.name):
        rel = f"letters/{child.name}"
        if is_hidden_or_junk(child.name) or child.name.lower() == "readme.md":
            continue
        if child.is_symlink():
            report.error(rel, None, "Letters must be real files, not links.")
        elif child.is_dir():
            report.warn(rel, None, "Folders inside letters/ are not sealed.")
        elif not child.is_file():
            report.error(rel, None, "Only regular files can be sealed.")
        elif child.suffix.lower() != ".md":
            report.warn(rel, None, "Only .md files in letters/ are sealed.")
        elif not LETTER_NAME_RE.match(child.name):
            report.error(
                rel, None,
                "Letter file names may use only A-Z a-z 0-9 . _ - and end in .md (names show on the sealed box).",
            )
        elif core is not None and rel not in listed:
            report.error(rel, None, "This letter is not listed in core.json, so it has no stage. List it under letters.")


def _check_core_folder(root: Path, report: Report) -> None:
    for rel, path in walk_files(root / "core"):
        rel = f"core/{rel}"
        if path.is_symlink():
            report.error(rel, None, "Links cannot be sealed. Replace it with the real file.")
        elif not path.is_file():
            report.error(rel, None, "Only regular files can be sealed.")
        elif path.suffix.lower() not in SCANNED_SUFFIXES:
            report.warn(rel, None, "This file is sealed but cannot be checked for secrets. Check it yourself.")


def _check_sections(root: Path, report: Report) -> None:
    text = _read_text(root / "core" / "COLDLIBRARY.md")
    if text is None:
        return
    found = {int(match.group(1)) for match in _SECTION_RE.finditer(text)}
    missing = [str(n) for n in range(10) if n not in found]
    if missing:
        report.warn(LIBRARY, None, f"Sections not found: {', '.join(missing)} (expected sections 0 to 9).")


# ---------------------------------------------------------------- cover


def _check_cover(text: str, core: Dict[str, Any], report: Report) -> None:
    threshold, shares = core["crypto"]["threshold"], core["crypto"]["shares"]
    seq = core["version"]["seq"]
    for number, line in enumerate(text.splitlines(), 1):
        for pattern, reverse in _COVER_QUORUM_RES:
            for match in pattern.finditer(line):
                a, b = int(match.group(1)), int(match.group(2))
                pair = (b, a) if reverse else (a, b)
                if pair != (threshold, shares) and pair[0] <= pair[1] <= 16:
                    report.warn("COVER.md", number,
                                f"The cover says {pair[0]} of {pair[1]}; core.json says {threshold} of {shares}.")
        for pattern in _COVER_VERSION_RES:
            for match in pattern.finditer(line):
                if int(match.group(1)) != seq:
                    report.warn("COVER.md", number,
                                f"The cover says version {match.group(1)}; core.json says {seq}.")
        for match in _URL_RE.finditer(line):
            if not _ALLOWED_LINK_RE.match(match.group(0).rstrip(".,;:")):
                report.warn("COVER.md", number,
                            "A link on the cover. Link only to where the spec and tools are published.")

    def leak(value: Any, label: str, severity: str, whole_word: bool = True) -> None:
        bare = _bare_name(value)
        if len(bare) < 2:
            return
        number = _find_line(text, bare, whole_word)
        if number is not None:
            message = f"{label} appears on the cover. The cover is public: no names or contact details."
            if severity == "error":
                report.error("COVER.md", number, message)
            else:
                report.warn("COVER.md", number, message)

    leak(core["owner"]["display_name"], "The owner's name", "error")
    for keeper in core["keepers"]:
        leak(keeper.get("name"), f"The name of keeper {keeper['id']}", "error")
        leak(keeper.get("contact"), f"The contact of keeper {keeper['id']}", "error", whole_word=False)
    for letter in core.get("letters", []):
        leak(letter["to"], f"The recipient of letter {letter['id']}", "warning")


# ---------------------------------------------------------------- scan


def _scan_files(root: Path, report: Report, allow: List[str]) -> Dict[str, str]:
    texts: Dict[str, str] = {}
    for rel, path in walk_files(root):
        if path.is_symlink() or not path.is_file():
            continue
        if path.suffix.lower() not in SCANNED_SUFFIXES:
            continue
        if path.stat().st_size > MAX_SCAN_BYTES:
            report.warn(rel, None, "File too large to check for secrets. Check it yourself.")
            continue
        raw = path.read_bytes()
        try:
            text = raw.decode("utf-8")
        except UnicodeDecodeError:
            report.warn(rel, None, "Not valid UTF-8. Checked as far as possible.")
            text = raw.decode("utf-8", errors="replace")
        texts[rel] = text
        report.findings.extend(
            scan_text(
                rel,
                text,
                cover=(rel == "COVER.md"),
                markdown=path.suffix.lower() != ".json",
                allow=allow if rel == CORE else (),
            )
        )
    return texts


def _check_cooling(root: Path, report: Report) -> None:
    created = read_created_date(root)
    if created is None:
        return
    ready = created + datetime.timedelta(days=COOLING_DAYS)
    if today() < ready:
        report.warn(
            ".coldlibrary-created", None,
            f"Created on {created.isoformat()}. seal will refuse until {ready.isoformat()} "
            f"({COOLING_DAYS}-day cooling period).",
        )


def validate_workspace(root: Path, display: Optional[str] = None) -> Report:
    """Run every check on a workspace folder and return the findings."""
    if not root.is_dir():
        raise ColdLibraryError(f"No workspace folder at {root}.")
    report = Report(root=root, display=display if display is not None else str(root))

    for rel in ("COVER.md", "core", "letters", LIBRARY, CORE):
        if (root / rel).is_symlink():
            report.error(rel, None, "Must be a real file or folder, not a link.")
    for rel in ("COVER.md", LIBRARY, CORE):
        if not (root / rel).is_file():
            report.error(rel, None, "Missing. Every workspace has COVER.md, core/COLDLIBRARY.md and core/core.json.")

    core: Optional[Dict[str, Any]] = None
    if (root / CORE).is_file():
        data = _load_json(root / CORE, CORE, report)
        if data is not None:
            report.schema_ok = _check_schema(data, report)
            if report.schema_ok:
                core = data
                report.core = data
                _check_core_semantics(core, root, report)

    if (root / "core").is_dir():
        _check_core_folder(root, report)
        _check_sections(root, report)
    _check_letters_folder(root, core, report)

    allow: List[str] = []
    if core is not None and isinstance(core["owner"].get("signing_pubkey"), str):
        allow.append(core["owner"]["signing_pubkey"])
    texts = _scan_files(root, report, allow)

    if core is not None and "COVER.md" in texts:
        _check_cover(texts["COVER.md"], core, report)
    for rel, text in texts.items():
        count = len(PLACEHOLDER_RE.findall(text))
        if count:
            report.warn(rel, None, f"{count} placeholder{'s' if count != 1 else ''} still to fill.")
    _check_cooling(root, report)

    order = {"COVER.md": 0, CORE: 1, LIBRARY: 2}
    report.findings.sort(
        key=lambda f: (order.get(f.path, 3), f.path, f.line if f.line is not None else -1)
    )
    return report
