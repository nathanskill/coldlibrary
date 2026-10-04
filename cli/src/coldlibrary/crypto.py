"""The exact cryptography of spec v0.1.

- Master secret: 32 random bytes from ``secrets.token_bytes`` (16 with ``--bits 128``).
- age passphrase: ``"coldlibrary/0.1:" + base32(master)`` without ``=`` padding,
  used with age's passphrase (scrypt) recipient through pyrage.
- Shares: SLIP-39, one group, member threshold T of N, empty SLIP-39
  passphrase, extendable backup flag set, iteration exponent 1.
"""

import base64
import inspect
import re
import secrets
from typing import List, Optional

import pyrage
import shamir_mnemonic

from .errors import ColdLibraryError

PASSPHRASE_PREFIX = "coldlibrary/0.1:"
ITERATION_EXPONENT = 1
ALLOWED_BITS = (128, 256)
MAX_SHARES = 16
#: The highest scrypt work factor (log2 N) that the reference age tools accept by default.
PORTABLE_WORK_FACTOR = 22

_SCRYPT_STANZA_RE = re.compile(rb"^-> scrypt (\S+) (\d+)$", re.MULTILINE)


class DecryptionFailed(ColdLibraryError):
    """age could not decrypt a file with the given master secret."""


def new_master_secret(bits: int = 256) -> bytes:
    if bits not in ALLOWED_BITS:
        raise ColdLibraryError("The master secret must be 128 or 256 bits.")
    return secrets.token_bytes(bits // 8)


def age_passphrase(master: bytes) -> str:
    """The age passphrase derived from the master secret (spec v0.1)."""
    return PASSPHRASE_PREFIX + base64.b32encode(master).decode("ascii").rstrip("=")


def encrypt(plaintext: bytes, master: bytes) -> bytes:
    """Encrypt with age in passphrase (scrypt) mode. Binary output, not armored."""
    return pyrage.passphrase.encrypt(plaintext, age_passphrase(master))


def scrypt_work_factor(ciphertext: bytes) -> Optional[int]:
    """The scrypt work factor in an age header, or None if there is not exactly one scrypt stanza."""
    header = ciphertext.split(b"\n---", 1)[0]
    stanzas = _SCRYPT_STANZA_RE.findall(header)
    if len(stanzas) != 1 or header.count(b"\n-> ") != 1:
        return None
    return int(stanzas[0][1])


def decrypt(ciphertext: bytes, master: bytes) -> bytes:
    try:
        return pyrage.passphrase.decrypt(ciphertext, age_passphrase(master))
    except Exception as exc:  # pyrage raises DecryptError, and others for malformed input
        raise DecryptionFailed(str(exc) or exc.__class__.__name__) from None


def supports_extendable() -> bool:
    try:
        params = inspect.signature(shamir_mnemonic.generate_mnemonics).parameters
    except (TypeError, ValueError):
        return False
    return "extendable" in params


def split_master_secret(master: bytes, threshold: int, shares: int) -> List[str]:
    """Split into N SLIP-39 mnemonics, any T of which recover the master secret."""
    if not 2 <= threshold <= shares <= MAX_SHARES:
        raise ColdLibraryError(
            "Threshold and shares must satisfy 2 <= threshold <= shares <= 16."
        )
    kwargs = {"passphrase": b"", "iteration_exponent": ITERATION_EXPONENT}
    if supports_extendable():
        kwargs["extendable"] = True
    groups = shamir_mnemonic.generate_mnemonics(1, [(threshold, shares)], master, **kwargs)
    if len(groups) != 1 or len(groups[0]) != shares:
        raise ColdLibraryError("SLIP-39 returned an unexpected number of shares.")
    return list(groups[0])
