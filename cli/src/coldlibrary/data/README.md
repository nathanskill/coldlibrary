# Data files

- `bip39-english.txt`: the official BIP-39 English word list, 2048 words, one
  per line, unchanged. Source:
  https://raw.githubusercontent.com/bitcoin/bips/master/bip-0039/english.txt
  SHA-256 `2f5eed53a4727b4bf8880d8f3f199efc90e58503646d9ff8eff3a2ed3b24dbda`.
  BIP-39 (Palatinus, Rusnak, Voisine, Bowe) is published under the MIT License.
  Cold Library uses it only to detect recovery phrases that should not be in a
  workspace. It never generates BIP-39 phrases.
- `core.schema.json`: a byte-for-byte copy of `spec/v0.1/core.schema.json`
  (CC0-1.0), shipped so the installed tool can validate without the repository.
  A test checks that the two files stay identical.

The SLIP-39 word list comes from the `shamir-mnemonic` package (MIT License).
