"""Scan plaintext for things that must never be written into a workspace.

Rules (all errors):

- 12 or more BIP-39 words in a row (a recovery phrase), 20 or more SLIP-39
  words in a row (a share). Words may be numbered, split across lines, or
  shortened to four letters. Fenced code blocks marked ``example-not-a-secret``
  are exempt from these two rules only.
- 64 or more hex characters, optionally ``0x``-prefixed (a raw private key).
  A value labelled as a hash (``sha256:`` and similar) is not flagged.
- Extended private keys (xprv, yprv, zprv, tprv and the SLIP-132 variants).
- WIF private keys (checksum-valid, or shaped like one).
- PEM private key blocks, age secret keys, a Cold Library box passphrase
  (``coldlibrary/0.1:`` followed by base32) and a few well-known API token shapes.
- Lines that record a secret after a label: ``password: ...``,
  ``passphrase = ...``, ``seed phrase: ...``, ``mnemonic: ...``,
  ``private key: ...``, ``PIN 1234``, ``密码：...``, ``助记词：...``,
  ``私钥是 ...`` and similar (see ``records_secret``). Pointers are fine:
  "Seed phrase: in the safe", "the recovery words are with the notary",
  "助记词在保险柜里".

COVER.md is public, so it is also checked for currency amounts, email
addresses and phone numbers.

Findings never repeat the matched text.
"""

import hashlib
import re
from dataclasses import dataclass
from typing import List, Optional, Sequence, Set, Tuple

from .wordlists import bip39_index, prefix_map, word_set

EXEMPT_FENCE = "example-not-a-secret"
BIP39_MIN_RUN = 12
SLIP39_MIN_RUN = 20


@dataclass(frozen=True)
class Finding:
    path: str  # relative to the workspace, with forward slashes
    line: Optional[int]
    severity: str  # "error" or "warning"
    message: str

    def render(self, root: str = "") -> str:
        location = f"{root.rstrip('/')}/{self.path}" if root else self.path
        if self.line is not None:
            location = f"{location}:{self.line}"
        return f"{location}: {self.severity}: {self.message}"


# ---------------------------------------------------------------- word runs

_TOKEN_RE = re.compile(r"[A-Za-z]+|[^\x00-\x7F]+")
_FENCE_OPEN_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})(.*)$")
_FENCE_CLOSE_RE = re.compile(r"^ {0,3}(`{3,}|~{3,})\s*$")


def exempt_fence_lines(lines: Sequence[str]) -> Set[int]:
    """Line numbers inside (and on the markers of) ``example-not-a-secret`` fences."""
    exempt: Set[int] = set()
    fence: Optional[Tuple[str, int, bool]] = None
    for number, line in enumerate(lines, 1):
        if fence is None:
            match = _FENCE_OPEN_RE.match(line)
            if not match:
                continue
            marker, info = match.group(1), match.group(2).strip()
            if marker[0] == "`" and "`" in info:
                continue  # not a fence opener in CommonMark
            marked = EXEMPT_FENCE in info
            fence = (marker[0], len(marker), marked)
            if marked:
                exempt.add(number)
        else:
            close = _FENCE_CLOSE_RE.match(line)
            if close and close.group(1)[0] == fence[0] and len(close.group(1)) >= fence[1]:
                if fence[2]:
                    exempt.add(number)
                fence = None
            elif fence[2]:
                exempt.add(number)
    return exempt


def _tokens(lines: Sequence[str], skip: Set[int]) -> List[Tuple[Optional[str], int]]:
    """ASCII words (lowercased) with line numbers. None marks a break."""
    tokens: List[Tuple[Optional[str], int]] = []
    for number, line in enumerate(lines, 1):
        if number in skip:
            tokens.append((None, number))
            continue
        for match in _TOKEN_RE.finditer(line):
            text = match.group(0)
            tokens.append((text.lower() if text.isascii() else None, number))
    return tokens


def _runs(
    tokens: Sequence[Tuple[Optional[str], int]], list_name: str, minimum: int
) -> List[List[Tuple[str, int]]]:
    words = word_set(list_name)
    prefixes = prefix_map(list_name)
    runs: List[List[Tuple[str, int]]] = []
    current: List[Tuple[str, int]] = []

    def close() -> None:
        run = current[:]
        # A run with full words does not start or end on a four-letter
        # abbreviation: that is ordinary prose ("test", "note") next to it.
        if any(word in words for word, _ in run):
            while run and run[0][0] not in words:
                run.pop(0)
            while run and run[-1][0] not in words:
                run.pop()
        if len(run) >= minimum:
            runs.append(run)

    for token, number in tokens:
        if token is not None and (token in words or (len(token) == 4 and token in prefixes)):
            current.append((token, number))
            continue
        close()
        current = []
    close()
    return runs


def bip39_checksum_ok(words: Sequence[str]) -> bool:
    """True if the words (full or four-letter) form a valid BIP-39 mnemonic."""
    index = bip39_index()
    prefixes = prefix_map("bip39")
    full = [word if word in index else prefixes.get(word, "") for word in words]
    if len(full) not in (12, 15, 18, 21, 24) or any(word not in index for word in full):
        return False
    value = 0
    for word in full:
        value = (value << 11) | index[word]
    total_bits = len(full) * 11
    checksum_bits = total_bits // 33
    entropy_bits = total_bits - checksum_bits
    entropy = (value >> checksum_bits).to_bytes(entropy_bits // 8, "big")
    checksum = value & ((1 << checksum_bits) - 1)
    return hashlib.sha256(entropy).digest()[0] >> (8 - checksum_bits) == checksum


# ---------------------------------------------------------------- line rules

_HEX_RE = re.compile(r"(?<![0-9A-Za-z])(?:0[xX])?[0-9A-Fa-f]{64,}(?![0-9A-Za-z])")
_HASH_LABEL_RE = re.compile(
    r"(?:sha-?(?:256|384|512)|blake2[bs]?|blake3|hash|digest)[\"'`*_]*\s*[:=]?\s*[\"'`]?\s*$",
    re.IGNORECASE,
)
_XPRV_RE = re.compile(r"(?<![0-9A-Za-z])[xyztuvYZUV]prv[1-9A-HJ-NP-Za-km-z]{50,}")
_B58_ALPHABET = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz"
_B58_RUN_RE = re.compile(r"(?<![0-9A-Za-z])[1-9A-HJ-NP-Za-km-z]{50,53}(?![0-9A-Za-z])")
_PEM_RE = re.compile(r"-----BEGIN (?:[A-Z0-9]+ )*PRIVATE KEY(?: BLOCK)?-----")
_AGE_SECRET_RE = re.compile(r"AGE-SECRET-KEY-1[0-9A-Z]{20,}")
_TOKEN_SHAPES_RE = re.compile(
    r"\bgh[pousr]_[A-Za-z0-9]{36,}\b"
    r"|\bgithub_pat_[A-Za-z0-9_]{40,}\b"
    r"|\bAKIA[0-9A-Z]{16}\b"
    r"|\b[sr]k_live_[0-9A-Za-z]{16,}\b"
    r"|\bxox[abprs]-[0-9A-Za-z-]{10,}\b"
)
_EN_LABELS = (
    r"(?:pass(?:word|phrase|code)s?|pwd"
    r"|seed[\s_-]*(?:phrase|words?)|recovery[\s_-]*(?:phrase|words?|codes?)"
    r"|backup[\s_-]*codes?|mnemonic(?:[\s_-]*phrase)?"
    r"|private[\s_-]*keys?|secret[\s_-]*keys?|api[\s_-]*keys?|access[\s_-]*tokens?)"
)
_ZH_LABELS = r"(?:密码|口令|助记词|私钥|密钥|恢复码|备用码)"
_CLOSE = r"[\"'`*_”’」』]*"
_LABEL_COLON_RES = (
    re.compile(r"(?<![A-Za-z])" + _EN_LABELS + _CLOSE + r"\s*[:=：]", re.IGNORECASE),
    re.compile(_ZH_LABELS + _CLOSE + r"\s*[:=：]"),
)
_LABEL_IS_ZH_RE = re.compile(_ZH_LABELS + r"\s*(?:是(?!否)|为)")
_QUOTE_CHARS = "\"'`“”‘’「」『』*_ \t"
_LINE_START_RE = re.compile(r"[\s>*_#|-]*(?:\d+[.)、]\s*)?")
_POINTER_RE = re.compile(
    r"(?:none|n/?a|not|never|no|nothing|see|in|on|at|with|ask|kept|stored|held|written|where)\b"
    r"|无|没有|不|在|见|问|放在|存在|存放|保存|由",
    re.IGNORECASE,
)
_SECRETISH_RE = re.compile(r"[\x21-\x7e]{4,}")
_PASSPHRASE_RE = re.compile(r"coldlibrary/0\.1:[A-Z2-7]{26,}")
_PIN_RE = re.compile(r"\bPIN(?:[\s_-]*code)?\b[\"'`*_]*\s*[:=：]?\s*\d{4,}", re.IGNORECASE)


def records_secret(line: str) -> bool:
    """True if a line looks like it records a secret after a label.

    ``Password: hunter2``, ``密码：123456`` and ``密码是 123456`` count. Pointers do
    not: ``Seed phrase: in the safe``, ``助记词：在保险柜里``, ``Passwords: none``.
    Nor does the published passphrase format (``口令是 "coldlibrary/0.1:" ...``),
    or a label quoted on its own, such as ``"password:"``.
    """
    for regex in _LABEL_COLON_RES:
        for match in regex.finditer(line):
            before, after = line[: match.start()], line[match.end():]
            if before and after and before[-1] in "\"'`“「" and after[0] in "\"'`”」":
                continue  # the label itself, quoted
            value = after.lstrip(_QUOTE_CHARS)
            if not value:
                if _LINE_START_RE.fullmatch(before):
                    return True  # a label alone on its line, like a form field
                continue
            if value.lower().startswith("coldlibrary/") or _POINTER_RE.match(value):
                continue
            return True
    for match in _LABEL_IS_ZH_RE.finditer(line):
        value = line[match.end():].lstrip(_QUOTE_CHARS)
        token = _SECRETISH_RE.match(value)
        if token and not value.lower().startswith("coldlibrary/"):
            if len(token.group(0)) >= 6 or any(ch.isdigit() for ch in token.group(0)):
                return True
    return False

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}")
_DATE_LIKE_RE = re.compile(
    r"\d{4}[-./]\d{1,2}[-./]\d{1,2}|\d{1,2}[-./]\d{1,2}[-./]\d{4}"
    r"|\d{4}\s*[-–]\s*\d{4}|\d{1,2}:\d{2}(?::\d{2})?"
)
_PHONE_RE = re.compile(r"(?<![\w])\+?\(?\d[\d \t().\-]{5,}\d(?![\w])")
_CURRENCY_CODES = "USD|EUR|GBP|CNY|RMB|JPY|HKD|SGD|AUD|CAD|CHF|BTC|ETH|USDT|USDC"
_CURRENCY_RE = re.compile(
    r"[$€£¥￥₩₹₽₿]\s?\d"
    rf"|\b(?:{_CURRENCY_CODES})\s?\d"
    rf"|\d[\d,.]*\s?(?:{_CURRENCY_CODES}|(?i:dollars?|euros?|pounds?))\b"
    r"|\d[\d,.]*\s?(?:万元|亿元|元|块钱|美元|欧元|英镑|日元|港币|港元|人民币|万|亿)"
)


def _b58decode(text: str) -> Optional[bytes]:
    value = 0
    for char in text:
        digit = _B58_ALPHABET.find(char)
        if digit < 0:
            return None
        value = value * 58 + digit
    body = value.to_bytes((value.bit_length() + 7) // 8, "big") if value else b""
    return b"\x00" * (len(text) - len(text.lstrip("1"))) + body


def wif_kind(token: str) -> Optional[str]:
    """'valid' for a checksum-valid WIF key, 'shaped' for a WIF look-alike, else None."""
    raw = _b58decode(token)
    if raw is not None and len(raw) > 4:
        payload, check = raw[:-4], raw[-4:]
        if hashlib.sha256(hashlib.sha256(payload).digest()).digest()[:4] == check:
            if len(payload) == 33 or (len(payload) == 34 and payload[-1] == 1):
                return "valid"
    if len(token) == 51 and (token[0] == "9" or (token[0] == "5" and token[1] in "HJK")):
        return "shaped"
    if len(token) == 52 and token[0] in "KLc":
        return "shaped"
    return None


def _phone_like(line: str) -> bool:
    masked = _DATE_LIKE_RE.sub(lambda m: " " * len(m.group(0)), line)
    for match in _PHONE_RE.finditer(masked):
        candidate = match.group(0)
        digits = sum(ch.isdigit() for ch in candidate)
        if digits > 15:
            continue
        if digits >= 9 or (candidate.startswith("+") and digits >= 8):
            return True
    return False


_MSG = {
    "bip39": "{n} words in a row from the BIP-39 list.{extra} This looks like a recovery "
    "phrase. Write where it is kept, never the words.",
    "slip39": "{n} words in a row from the SLIP-39 list. This looks like a share. "
    "Shares never go in the workspace or the sealed box.",
    "hex": "A string of {n} hex characters. This may be a private key. "
    "Write where the key is kept, never the key.",
    "xprv": "An extended private key (xprv and similar). Never put private keys in the workspace.",
    "wif_valid": "A WIF private key (checksum valid). Never put private keys in the workspace.",
    "wif_shaped": "A string shaped like a WIF private key. Never put private keys in the workspace.",
    "pem": "A private key block. Never put private keys in the workspace.",
    "age": "An age secret key. Never put private keys in the workspace.",
    "token": "A string shaped like an API token. Never put credentials in the workspace.",
    "label": "This line looks like it records a secret. Write where it is kept and who to ask. "
    "If there is no secret here, rephrase it without the colon.",
    "passphrase": "A Cold Library box passphrase. Anyone who has it can open the box. Never write it down.",
    "pin": "This line looks like it records a PIN.",
    "email": "An email address on the cover. The cover is public: no names or contact details.",
    "phone": "A phone number on the cover. The cover is public: no names or contact details.",
    "amount": "A currency amount on the cover. The cover is public: no assets or amounts.",
}


def scan_text(
    path: str,
    text: str,
    *,
    cover: bool = False,
    markdown: bool = True,
    allow: Sequence[str] = (),
) -> List[Finding]:
    """Scan one file's text. ``allow`` lists exact values to ignore (e.g. a public key)."""
    findings: List[Finding] = []
    lines = text.splitlines()

    def add(number: Optional[int], key: str, **fmt: object) -> None:
        findings.append(Finding(path, number, "error", _MSG[key].format(**fmt)))

    exempt = exempt_fence_lines(lines) if markdown else set()
    tokens = _tokens(lines, exempt)
    for run in _runs(tokens, "bip39", BIP39_MIN_RUN):
        words = [word for word, _ in run]
        extra = " The words form a valid BIP-39 checksum." if bip39_checksum_ok(words) else ""
        add(run[0][1], "bip39", n=len(run), extra=extra)
    for run in _runs(tokens, "slip39", SLIP39_MIN_RUN):
        add(run[0][1], "slip39", n=len(run))

    allowed = [value for value in allow if value]

    def is_allowed(value: str) -> bool:
        return any(value in item for item in allowed)

    for number, line in enumerate(lines, 1):
        for match in _HEX_RE.finditer(line):
            if is_allowed(match.group(0)) or _HASH_LABEL_RE.search(line[: match.start()]):
                continue
            digits = len(match.group(0)) - (2 if match.group(0)[:2].lower() == "0x" else 0)
            add(number, "hex", n=digits)
            break
        if _XPRV_RE.search(line):
            add(number, "xprv")
        for match in _B58_RUN_RE.finditer(line):
            if is_allowed(match.group(0)):
                continue
            kind = wif_kind(match.group(0))
            if kind:
                add(number, "wif_valid" if kind == "valid" else "wif_shaped")
                break
        if _PEM_RE.search(line):
            add(number, "pem")
        if _AGE_SECRET_RE.search(line):
            add(number, "age")
        if _TOKEN_SHAPES_RE.search(line):
            add(number, "token")
        if _PASSPHRASE_RE.search(line):
            add(number, "passphrase")
        elif records_secret(line):
            add(number, "label")
        elif _PIN_RE.search(line):
            add(number, "pin")
        if cover:
            if _EMAIL_RE.search(line):
                add(number, "email")
            if _phone_like(line):
                add(number, "phone")
            if _CURRENCY_RE.search(line):
                add(number, "amount")

    findings.sort(key=lambda f: (f.line or 0))
    return findings
