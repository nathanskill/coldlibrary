# AGENTS.md — Cold Library

This file is the handoff document for this repository. Any person or agent who
picks up the work starts here. It is also the first real example of what Cold
Library asks people to write: a clear will that any future executor can follow.

## What this is

Cold Library (冷图书馆) is an open format and a set of offline tools for writing
down what should happen if you become unreachable, incapacitated, or die:
where things are, who to contact, letters to leave, and how long each wish
should bind the living. You write it, encrypt it, split the key among people
you trust, and hand the sealed box to a separate custodian.

Cold Library itself keeps nothing and executes nothing.

- Website: https://coldlibrary.com (static, bilingual, English default)
- Spec: `spec/v0.1/` (CC0-1.0)
- CLI: `cli/` (Python, Apache-2.0)
- Interview: `skills/exit-interview/` (CC0-1.0)

## Red lines (never cross)

1. Never hold keys, shares, plaintext, boxes, assets, or money. No custody of anything.
2. Never act as executor, estate administrator, trustee, or agent. No irreversible action on anyone's behalf.
3. Never claim a Cold Library file is a legal will. Property follows the legal will or statutory inheritance.
4. Never impersonate the dead: no first person, no voice or face cloning, no open-ended chat with family.
5. Never show an input field for seed phrases, private keys, or passwords. Never put login links in notices. Never ask anyone for money in a notice.
6. Never run online cryptography on the website. The site is static explanation plus signed downloads.
7. No tracking, no analytics, no third-party scripts, no external fonts or CDNs on the website.
8. No tokens, no VC, no commissions, no "per asset" fees, no broker/exchange/funeral/insurance sponsorship.
9. Asset entries say *where* and *who to ask*, never amounts, passwords, or recovery phrases.
10. Do not name any exchange or broker in Chinese-language materials.
11. Safety: 18+ only. Stop the interview on any sign of self-harm and show crisis resources. 7-day cooling period before the first seal.
12. Never delete user files. Tools may write new files; they never remove plaintext. They remind the user instead.

## Glossary (use these exact terms)

| English | 中文（对外） | Meaning |
|---|---|---|
| Cold Library | 冷图书馆 | The project and brand |
| Ice Core | 交接清单 | One person's file: cover + sealed core + letters |
| Cover | 封面 | `COVER.md`, public and printable. No names, assets, accounts |
| Exit Interview | 整理谈话 | Guided questions (questionnaire, local model, or your own AI) that draft the first version |
| Sealed Letters | 留下的信 | Encrypted letters released by stage |
| Keepers | 开启人 | Living people who each hold one share, confirm silence, open, and may veto |
| Shares | 份额 | SLIP-39 shares of the master secret |
| Custodian | 保管方 | Whoever holds the sealed box: notary, the owner's own account with platform after-death tools, a time-lock layer, or the keepers themselves |
| Half-life | 时效 | Each wish moves from Binding (照办) to Advisory (参考) to Archive (存档) |
| Open Stacks | 公开文集 | What the owner chose, item by item, to make public. A library, not a memorial |
| Silence period | 静默期 | No signed check-in for N months |
| Veto window | 否决期 | Days after quorum during which the owner or a keeper can stop the release |

## Defaults (spec v0.1, user-adjustable)

- Silence period: 6 months (3–18). Reminders start 30 days before, in neutral wording.
- Check-in: a signed check-in, not a clicked link.
- Quorum: 2 of 3 keepers, confirmed independently, after phoning the owner and an emergency contact.
- Veto window: 28 days.
- Release stages:
  - `unreachable` — only the sentence "they cannot be reached right now". No content.
  - `incapacity` — project handover and bills only. No letters.
  - `after_death` — asset map to the executor/administrator, and letters.
  - `public` and irreversible instructions that affect the living — per-item consent while alive, 180-day cooling, 2 keeper signatures; keepers may decline.
  - `destroy-private` (diaries, drafts) — lowest threshold; keepers may not refuse. Best done by never sealing it.
- Half-life: binding until +2 years, advisory until +10 years, archive after.
- First seal: 7-day cooling period after creating a workspace.
- Crypto: 256-bit master secret, SLIP-39 split (2-of-3 default), age passphrase (scrypt) encryption keyed by the master secret.
- "Confirmed unreachable" is not legal death.

## File layout (workspace → sealed)

```
my-core/                      # plaintext workspace — never share this folder
  COVER.md                    # public cover, printable
  core/
    COLDLIBRARY.md            # for humans and agents (sections defined in the spec)
    core.json                 # machine-checkable, JSON Schema 2020-12
  letters/
    001-to-<someone>.md       # one file per letter
sealed/                       # output of `coldlibrary seal`
  COVER.md
  core.age                    # tar of core/ encrypted with age (passphrase mode)
  letters/001.age
  MANIFEST.json               # sha256 of every sealed file, spec version, seq
```

Shares are never written inside the workspace or the sealed folder.

## Repository map

- `spec/v0.1/SPEC.md`, `SPEC.zh.md` — the format, rules, defaults
- `spec/v0.1/core.schema.json` — JSON Schema for `core.json`
- `spec/v0.1/examples/fictional-indie-dev/` — a fully fictional example workspace
- `docs/threat-model.md`, `docs/threat-model.zh.md`
- `skills/exit-interview/` — interview skill and printable questionnaires
- `cli/` — `coldlibrary` Python CLI (`init`, `validate`, `seal`, `check-share`, `open`, `verify`)
- `site/` — static website, zero dependencies, built by `node site/build.mjs` into `site/dist/`

## Working rules

- Keep the website dependency-free and static. Fonts are self-hosted (OFL).
- Every page exists in English (default, at `/`) and Chinese (at `/zh/`).
- Copy: short declarative sentences, no exclamation marks, promise small, numbers exact.
- Banned words in copy: immortal, eternal, digital twin, AI resurrection, forever with you, wealth transfer (永生、永恒、数字分身、AI 复活、永远陪伴、财富传承).
- Tests: `cd cli && python3 -m pytest`. Site: `node site/build.mjs` must finish with no warnings.
- Do not commit secrets, real personal data, or anything about the maintainers' other businesses.
