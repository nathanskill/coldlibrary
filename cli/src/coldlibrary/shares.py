"""Reading, checking, formatting and combining SLIP-39 shares.

Nothing here prints a master secret or a whole share back to the screen,
except ``format_share_block``, which ``seal`` uses to show each keeper's share once.
"""

import itertools
import re
from dataclasses import dataclass
from typing import List, Sequence, Tuple

import shamir_mnemonic
from shamir_mnemonic import MnemonicError
from shamir_mnemonic.share import Share

from .errors import ColdLibraryError
from .wordlists import prefix_map, word_set

WARNING_LINE = (
    "Write this down on paper or steel. Do not photograph it. Do not send it in any chat app."
)

_WORD_RE = re.compile(r"[A-Za-z]+")
_MAX_SHARE_TEXT = 64 * 1024
_MAX_COMBINATIONS = 64


class ShareError(ColdLibraryError):
    """A share could not be read or does not fit with the others."""


@dataclass(frozen=True)
class ParsedShare:
    source: str
    mnemonic: str
    share: Share
    word_count: int
    expanded: int  # words written as a four-letter abbreviation and expanded

    @property
    def secret_bits(self) -> int:
        return len(self.share.value) * 8


def share_words(text: str) -> Tuple[List[str], int]:
    """Extract SLIP-39 words from free text.

    Lines starting with ``#`` are comments. Numbers and punctuation are ignored,
    so numbered word grids work. A word may be shortened to its first four or more
    letters, as on steel plates.
    """
    if len(text) > _MAX_SHARE_TEXT:
        raise ShareError("The share text is too long to be one share.")
    kept = [line for line in text.splitlines() if not line.lstrip().startswith("#")]
    tokens = _WORD_RE.findall("\n".join(kept))
    words: List[str] = []
    expanded = 0
    known = word_set("slip39")
    prefixes = prefix_map("slip39")
    for position, token in enumerate(tokens, 1):
        lower = token.lower()
        if lower in known:
            words.append(lower)
            continue
        candidate = prefixes.get(lower[:4]) if len(lower) >= 4 else None
        if candidate is not None and candidate.startswith(lower):
            words.append(candidate)
            expanded += 1
            continue
        raise ShareError(f"Word {position} is not in the SLIP-39 word list.")
    return words, expanded


def _explain(error: MnemonicError, word_count: int) -> str:
    text = str(error)
    if "checksum" in text:
        return "The checksum does not match. A word may be wrong, missing or out of order."
    if "length" in text:
        return (
            f"{word_count} words is not a valid share length. "
            "Shares from this tool have 20 words (128-bit) or 33 words (256-bit)."
        )
    if "padding" in text:
        return "The share is malformed (padding bits)."
    if "Group threshold" in text:
        return "The share is malformed (group settings)."
    return "The share is not valid."


def parse_share(text: str, source: str) -> ParsedShare:
    try:
        words, expanded = share_words(text)
    except ShareError as exc:
        raise ShareError(f"{source}: {exc}") from None
    if not words:
        raise ShareError(f"{source}: no share words found.")
    mnemonic = " ".join(words)
    try:
        share = Share.from_mnemonic(mnemonic)
    except MnemonicError as exc:
        raise ShareError(f"{source}: {_explain(exc, len(words))}") from None
    return ParsedShare(source, mnemonic, share, len(words), expanded)


def describe_share(parsed: ParsedShare) -> List[str]:
    """Human-readable facts about one share. Never includes share words or secrets."""
    s = parsed.share
    lines = [
        "Share: valid (SLIP-39 checksum OK)",
        f"Words: {parsed.word_count}",
        f"Secret size: {parsed.secret_bits} bits",
        f"Set id: {s.identifier} (all shares of one seal have the same set id)",
        f"Member index: {s.index} (Keeper {s.index + 1})",
        f"Member threshold: {s.member_threshold} (shares needed to open)",
        f"Group: {s.group_index + 1} of {s.group_count} (group threshold {s.group_threshold})",
        f"Extendable: {'yes' if s.extendable else 'no'}",
        f"Iteration exponent: {s.iteration_exponent}",
    ]
    if parsed.expanded:
        lines.append(f"Note: {parsed.expanded} shortened words were read as full words.")
    if parsed.secret_bits not in (128, 256):
        lines.append("Note: this tool seals with 128-bit or 256-bit secrets only.")
    if s.group_count != 1:
        lines.append("Note: Cold Library boxes use a single SLIP-39 group.")
    return lines


def format_share_block(
    number: int, total: int, threshold: int, mnemonic: str, sealed_on: str, seq: int
) -> str:
    """One keeper's share as a numbered word grid with comment headers."""
    words = mnemonic.split()
    lines = [
        f"# Keeper {number} of {total}",
        f"# {WARNING_LINE}",
        f"# Any {threshold} of the {total} shares open the box sealed on {sealed_on} (version {seq}).",
        f"# {len(words)} words. Lines starting with # are not part of the share.",
    ]
    per_row = 3
    for start in range(0, len(words), per_row):
        cells = [
            f"{i + 1:>2} {words[i]:<9}" for i in range(start, min(start + per_row, len(words)))
        ]
        lines.append("   ".join(cells).rstrip())
    return "\n".join(lines) + "\n"


def combine_shares(parsed: Sequence[ParsedShare]) -> Tuple[bytes, List[ParsedShare]]:
    """Recover the master secret. Returns the secret and the shares that were used."""
    if not parsed:
        raise ShareError("No shares were given.")
    first = parsed[0]
    for other in parsed[1:]:
        if other.share.identifier != first.share.identifier:
            raise ShareError(f"{other.source} belongs to a different seal than {first.source}.")
        if other.share.group_parameters() != first.share.group_parameters():
            raise ShareError(f"{other.source} and {first.source} have different share settings.")
    if first.share.group_count != 1:
        raise ShareError("These shares use several SLIP-39 groups. Cold Library boxes use one.")

    by_index = {}
    for item in parsed:
        seen = by_index.get(item.share.index)
        if seen is None:
            by_index[item.share.index] = item
        elif seen.mnemonic != item.mnemonic:
            raise ShareError(
                f"{item.source} and {seen.source} claim the same keeper number but differ."
            )
    unique = list(by_index.values())
    needed = first.share.member_threshold
    if len(unique) < needed:
        got = len(unique)
        raise ShareError(
            f"This box needs {needed} different shares. "
            f"Only {got} {'was' if got == 1 else 'were'} given."
        )

    for attempt, combo in enumerate(itertools.combinations(unique, needed)):
        if attempt >= _MAX_COMBINATIONS:
            break
        try:
            secret = shamir_mnemonic.combine_mnemonics([item.mnemonic for item in combo])
        except MnemonicError:
            continue
        return secret, list(combo)
    raise ShareError("The shares do not fit together. At least one of them is wrong.")
