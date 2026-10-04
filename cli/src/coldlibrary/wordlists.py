"""Word lists used to detect recovery phrases and shares.

BIP-39 English ships with this package (``data/bip39-english.txt``, MIT
License, see ``data/README.md``). SLIP-39 comes from ``shamir-mnemonic``.
"""

import hashlib
from functools import lru_cache
from importlib import resources
from typing import Dict, FrozenSet, Tuple

BIP39_SHA256 = "2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda"


def data_bytes(name: str) -> bytes:
    """Read a file shipped in ``coldlibrary/data``."""
    return resources.files("coldlibrary").joinpath("data").joinpath(name).read_bytes()


@lru_cache(maxsize=None)
def bip39_words() -> Tuple[str, ...]:
    raw = data_bytes("bip39-english.txt")
    if hashlib.sha256(raw).hexdigest() != BIP39_SHA256:
        raise RuntimeError("The bundled BIP-39 word list does not match the official list.")
    words = tuple(raw.decode("ascii").split())
    if len(words) != 2048:
        raise RuntimeError("The bundled BIP-39 word list must have 2048 words.")
    return words


@lru_cache(maxsize=None)
def slip39_words() -> Tuple[str, ...]:
    from shamir_mnemonic.wordlist import WORDLIST

    words = tuple(WORDLIST)
    if len(words) != 1024:
        raise RuntimeError("The SLIP-39 word list must have 1024 words.")
    return words


@lru_cache(maxsize=None)
def word_set(name: str) -> FrozenSet[str]:
    return frozenset(bip39_words() if name == "bip39" else slip39_words())


@lru_cache(maxsize=None)
def prefix_map(name: str) -> Dict[str, str]:
    """Map the first four letters of each word to the word.

    Both lists are designed so that four letters identify a word, which is how
    people often stamp words into steel.
    """
    words = bip39_words() if name == "bip39" else slip39_words()
    result: Dict[str, str] = {}
    for word in words:
        result.setdefault(word[:4], word)
    return result


@lru_cache(maxsize=None)
def bip39_index() -> Dict[str, int]:
    return {word: i for i, word in enumerate(bip39_words())}
