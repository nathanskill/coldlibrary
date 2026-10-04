# Cold Library Protocol

**Technical whitepaper · v0.1 · 2026-10-05**
Status: draft. Contracts tested locally, not audited, not deployed to any public network.

## 1. Abstract

Cold Library is an open protocol for keeping what a person or a project leaves behind, and for carrying their will on. It has three parts:

- **Perpetual Exhibits** for projects and **Perpetual Plaques** for people. Each shows the public only what its owner chooses.
- **Wardens**: agents that stand at each exhibit or plaque, run a trial set by the owner, and hand what was left to the people who pass it.
- **Cold Vaults**: non-custodial smart contracts in which an owner keeps crypto assets and decides, alone, who receives what share and when.

The protocol never holds keys, plaintext or funds. There is no token, no fee, no admin key and no upgrade path.

## 2. Problem

What people leave is scattered: projects with one maintainer, letters nobody knows exist, wallets that vanish with their keys. Existing answers either hold everything for you (a custodian, which must be trusted, licensed and kept solvent), or nothing at all (a note in a drawer). Neither lets a person say, precisely and in advance: *show this to everyone, show that only to the people who can prove they are the right people, and pay out these assets in these shares if I go silent*.

## 3. Principles

1. **The owner decides.** Shares, recipients, keepers, timings and wording are the owner's, and can be changed at any time while the owner is active.
2. **Non-custodial.** Plaintext is locked in the owner's browser; funds sit in the owner's own contract. Operators of coldlibrary.com cannot read, move or freeze either.
3. **Quote, never impersonate.** A warden cites the owner's words with a date. It never speaks as the owner.
4. **No rent.** No token, no fee, no percentage of assets, no sponsorship from brokers, exchanges, funeral homes or insurers.
5. **Open and portable.** Formats are CC0, code is Apache-2.0, every item can be exported and printed. "Perpetual" means: as long as someone cares, it stays, here or elsewhere.

## 4. Architecture

```
            ┌──────────────── coldlibrary.com (static site + tiny API) ────────────────┐
 owner ──►  │ Front desk: public layer + recognised layer (encrypted in browser)       │
            │ Exhibit / Plaque page: public layer, warden, lamps                       │
            └──────────────────────────────────────────────────────────────────────────┘
                  │ ciphertext only                         │ itemRef
                  ▼                                         ▼
            API store (public layer,             Cold Vault (owner's own contract,
            ciphertext, lamps)                   EVM chain): funds, heirs, keepers
                  ▲                                         ▲
 visitor ──► Warden trial → key derived in visitor's browser → letters, badge,
             directions, lamp right, and (for heirs) how to claim from the vault
```

Every item has three layers:

| Layer | Who can read | Where it lives | How it is protected |
|---|---|---|---|
| Public | anyone | site | chosen by the owner |
| Recognised | people who pass the warden's trial | site, as ciphertext | AES-256-GCM, key from the trial answers |
| Sealed | keepers together, or after a date | offline, held by a custodian | `age` + SLIP-39 shares (Ice Core spec v0.1) |
| Assets | the owner's heirs | Cold Vault contract | contract rules, heir's own wallet |

## 5. Exhibits and plaques

An item is a JSON document (`catalog/items/*.json`): `id` (`E-` exhibit, `M-` plaque), `title`, `subtitle`, a public `story`, `facts`, `links`, a `warden` block (name, greeting, questions, KDF parameters) and a `locked` block (IV and ciphertext). Answers are never published. A plaque for someone else requires their consent, or their close family's if they have died. Every application is reviewed by a librarian, who can see only the public layer.

## 6. Wardens and the trial

**Locking** (owner's browser, or `tools/seal-item.mjs`):

```
norm(a)   = NFKC(a) → lowercase → remove whitespace, punctuation and symbols
material  = norm(a1) ‖ U+241E ‖ norm(a2) ‖ …
key       = PBKDF2-HMAC-SHA256(material, salt[16], 210 000 iterations) → 256 bits
locked    = AES-256-GCM(key, iv[12], JSON(payload))
payload   = { letter, pointer?, badge?, badge_code?, lamp_token }
```

**Unlocking** happens only in the visitor's browser with WebCrypto. A wrong answer fails the GCM tag; the warden does not say which answer was wrong. The server never receives answers, keys or plaintext.

**Limits, stated plainly.** Short answers have little entropy. Anyone holding the ciphertext can try guesses offline; PBKDF2 slows this down but cannot stop it for answers like "302". The trial therefore protects letters, stories and directions, and it never protects money directly. Money is protected by the vault (section 8), where only the heir's own wallet can claim.

**Kinds of trial.** Questions (live). A named list verified by email code (next). Proof of contribution, such as merged changes to a repository (planned). A warden backed by a language model, which can hold a conversation while keeping the same rules, is in development; it will never decide anything the owner did not write down.

## 7. Lamps

The payload contains a random `lamp_token`; the site knows only `SHA-256(lamp_token)`. A visitor who passed the trial can light a lamp (and leave up to 140 characters) by presenting the token. Lamps therefore mean "someone recognised came by", not "someone clicked".

## 8. Cold Vault

A Cold Vault (`contracts/src/ColdVault.sol`) is deployed by its owner through `ColdVaultFactory`. The factory has no owner and keeps only a public index.

### 8.1 Parameters (set and changed by the owner)

| Parameter | Meaning | Bounds |
|---|---|---|
| `heirs[]` | `(address, bps)`; shares sum to exactly 10 000 | 1–20 heirs |
| `keepers[]` | people who may confirm silence or veto | 0–10, owner excluded |
| `threshold` | confirmations needed | 1…keepers (0 if no keepers) |
| `heartbeat` | silence before keepers may confirm | 7 days – 10 years |
| `vetoWindow` | time to stop a release after quorum | 1 – 365 days |
| `releaseAfter` | optional date release, like a time capsule | 0 or a future time |
| `itemRef` | link to an exhibit or plaque, e.g. `coldlibrary:M-000001` | — |

A vault with no keepers must set `releaseAfter`.

### 8.2 States

```
          owner: deposit / withdraw / configure / checkIn  (each is a check-in)
              ┌──────────────┐
              ▼              │
 ┌────────── Active ─────────┘
 │   silence ≥ heartbeat, threshold keepers confirm
 │              ▼
 │         Confirming ── owner checks in, or a keeper vetoes ──► Active
 │              │ vetoWindow passes                (one veto per keeper per check-in)
 │              ▼
 └ date ≥ releaseAfter ─► Released ── heirs claim their shares (pull)
```

- Every owner action is a check-in and cancels any pending confirmation.
- Each keeper may veto at most once between two owner check-ins, so no single keeper can block a release forever.
- Old confirmations do not count after a reset (`round` increments).
- After `Released`, the owner can no longer withdraw or reconfigure.

### 8.3 Claims

For each asset `t` (address 0 is the native coin):

```
received(t)   = balance(t) + totalClaimed(t)
due(t, h)     = received(t) × bps(h) / 10 000
claimable(t,h)= due(t, h) − claimed(t, h)
```

Claims are pulled by the heir's own address. Assets that arrive after release are split by the same shares. Rounding leaves at most a few wei of dust. Fee-on-transfer and rebasing tokens are not supported.

### 8.4 What the protocol cannot do

Nobody can move funds except by these rules: no admin, no pause, no upgrade, no fee switch. If an heir loses their key, their share stays in the vault; the owner should keep heir addresses current. If the owner loses their key, the keepers or the date still release the vault to the heirs, which is the intended fallback.

## 9. Linking items and vaults

An exhibit or plaque can name a vault through `itemRef`. For heirs, the recognised layer may contain the vault address, the chain, their slot, and plain instructions. Passing the trial reveals *how* to claim; only the registered wallet *can* claim. Guessing the answers gains nothing financial.

## 10. Security

| Threat | Mitigation |
|---|---|
| Server compromise | Server holds no keys, plaintext or funds; worst case is defacement or deleted public layers (restored from the repository). |
| Offline guessing of trial answers | Only non-monetary content behind trials; long, personal answers recommended; money behind wallet-gated claims. |
| Keepers collude early | Requires `threshold` keepers plus silence plus the veto window; the owner's check-in cancels. Choose keepers who do not know each other well. |
| One keeper blocks forever | One veto per keeper per owner check-in; `releaseAfter` as fallback. |
| Owner coerced | Out of scope for software; the owner can always withdraw, which is also the attacker's path. Keep amounts proportionate. |
| Reentrancy, token quirks | Reentrancy guard, checks-effects-interactions, tolerant ERC-20 transfer; tested. |
| Phishing ("send us your key") | No notice from Cold Library ever contains a link or asks for a key, share, password, recovery phrase or money. |

27 unit and fuzz tests cover configuration rules, silence, quorum, veto limits, release, claims for native coins and ERC-20s, late deposits, date release and reentrancy. The full path was also run on a local chain. **The contracts have not been audited.** No real funds should be used before an independent audit.

## 11. Legal

A Cold Vault is a tool its owner uses with their own assets. It is not a legal will and does not override inheritance law; owners should make their legal arrangements agree with their vault. Cold Library gives no investment, legal or tax advice. Crypto-asset services are restricted or prohibited in some jurisdictions, including mainland China; the vault interface is not offered where it is not lawful.

## 12. Economics and governance

No token. No fee. No investors. Hosting is paid by the founding librarian, with a published annual cap. Contracts are immutable once deployed; improvements ship as new versions that owners may choose to move to. Librarians maintain the site and the catalogue; no rank can open anyone's layers or move anyone's funds.

## 13. Roadmap

1. v0.1 — exhibits, plaques, question trials, lamps, Cold Vault tested locally (done).
2. Public testnet deployment; a vault page on the site using the visitor's own wallet, with no third-party scripts.
3. Independent audit; mainnet on Ethereum and one low-fee layer 2.
4. Named-list and contribution trials; a language-model warden under the same rules.
5. Bitcoin: timelocked descriptor wallets (Miniscript) documented as pointers.

## Appendix A — Contract interface

```solidity
// ColdVaultFactory
function create(string itemRef, Heir[] heirs, address[] keepers, uint8 threshold,
                uint64 heartbeat, uint64 vetoWindow, uint64 releaseAfter) returns (address);
function vaultsOf(address owner) view returns (address[]);

// ColdVault — owner
receive() payable;                       // deposits
function checkIn();
function configure(Heir[], address[], uint8, uint64, uint64, uint64);
function withdraw(address token, address to, uint256 amount);
// keepers
function confirmSilence();
function veto();
// anyone / heirs
function release();
function claim(address token);
function claimable(address token, address heir) view returns (uint256);
```

Source, tests and this paper: https://github.com/nathanskill/coldlibrary
