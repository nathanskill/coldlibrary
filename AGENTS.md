# AGENTS.md — Cold Library

This file is the handoff document for this repository. Any person or agent who
picks up the work starts here. It is also the first real example of what Cold
Library asks people to write: a clear will that any future executor can follow.

## What this is

Cold Library (冷冻图书馆) is a library for everything that is yours, and for the will that carries it on
(收藏属于你的一切，把意志传下去). Since 2026-10-05 the product has three parts:

- **Perpetual Exhibit (永续展位)** for a project or a life of work.
- **Perpetual Plaque (永续铭牌)** for a person, living or not. Not an obituary.
- **Warden (守馆人)**: the AI agent at the door of each exhibit and plaque. Visitors pass its trial
  (完成考验) to unlock what was left for them: letters, know-how, a successor badge, directions to
  things set aside, and the right to light a lamp and leave a word.

Every exhibit and plaque has three layers: **Public** (only what the owner chooses), **Recognised**
(encrypted in the owner's browser; the key is derived from the warden's answers, in the visitor's
browser), and **Sealed** (the offline Ice Core tooling below, opened on a date or by keepers).

Tone: commemorate and carry on, never "you are about to die". Founder's wording (2026-10-05):
"用来纪念属于你的一切东西 并把意志传递下去", "完成AI考验 解锁前辈留下的财富".

Cold Library never holds keys, shares, plaintext of locked layers, warden answers, files or money,
and executes nothing. It stores: the librarian register; exhibit and plaque public layers; the
recognised layer as ciphertext it cannot read; the warden questions; lamps and their notes.

- Website: https://coldlibrary.com (bilingual, English default)
- Items: `catalog/items/*.json` (published), `catalog/items-src/` (fictional examples only, with answers)
- Tools: `tools/seal-item.mjs` (lock an item), `tools/publish-item.mjs` (hang an approved application)
- Contracts: `contracts/` (Foundry; `forge install foundry-rs/forge-std` then `forge test`) · Whitepaper: `docs/whitepaper.md`, `docs/whitepaper.zh.md`
- Spec: `spec/v0.1/` (CC0-1.0) · CLI: `cli/` (Python, Apache-2.0) · Interview: `skills/exit-interview/`

## Red lines (never cross)

1. The operators never hold keys, shares, plaintext, boxes or funds. Crypto assets may only sit in the owner's own Cold Vault contract (`contracts/`): no admin, no pause, no upgrade, no fee. The owner alone decides heirs and shares (founder, 2026-10-05: 由发起人决定怎么分配，他自己掌控，我们不直接托管钱，我们是一个 web3 协议).
2. Never act as executor, estate administrator, trustee, or agent. No irreversible action on anyone's behalf.
3. Never claim a Cold Library file is a legal will. Property follows the legal will or statutory inheritance.
4. Never impersonate anyone: wardens quote with a date and say "they wrote", never "I". No voice or face cloning.
5. Never show an input field for seed phrases, private keys, or passwords. Never put login links in notices. Never ask anyone for money in a notice.
6. The server never decrypts anything and never sees warden answers. Locking happens in the owner's browser (or tools/seal-item.mjs), unlocking in the visitor's browser. Real answers are never committed.
7. No tracking, no analytics, no third-party scripts, no external fonts or CDNs on the website.
8. No tokens, no VC, no commissions, no "per asset" fees, no broker/exchange/funeral/insurance sponsorship.
9. In files and items, asset entries say *where* and *who to ask*, never amounts, passwords, or recovery phrases. A trial never guards money directly: only a vault's registered heir wallet can claim. No real funds before an independent audit.
10. Do not name any exchange or broker in Chinese-language materials.
11. Safety: 18+ only. Stop the interview on any sign of self-harm and show crisis resources. 7-day cooling period before the first seal. A plaque for someone else needs their consent, or their close family's if they have died; every application is reviewed.
12. Never delete user files. Tools may write new files; they never remove plaintext. They remind the user instead.

## Glossary (use these exact terms)

| English | 中文（对外） | Meaning |
|---|---|---|
| Cold Library | 冷冻图书馆 | The project and brand |
| Perpetual Exhibit | 永续展位 | A standing exhibit for a project or a life of work |
| Perpetual Plaque | 永续铭牌 | A plaque for a person (not 牌位, which reads as a memorial tablet for the dead) |
| Warden | 守馆人 | The AI agent at an exhibit or plaque; runs the trial, quotes, hands over |
| Trial | 考验 | The warden's questions; passing derives the key in the visitor's browser |
| Public / Recognised / Sealed | 公开层 / 认可层 / 封存层 | The three layers of every item |
| Lamp | 灯 | Lit only by recognised visitors, with an optional short note |
| Carried on | 传承 | Third stage of a wish (was "Archive") |
| Ice Core | 冰芯 | The sealed layer: cover + sealed core + letters, made with the CLI |
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
- Banned words in copy: immortal, digital twin, AI resurrection, forever with you (永生、数字分身、AI 复活、永远陪伴). "Perpetual / 永续" is the founder's word and is allowed; the Ledger page says honestly what it means. "财富" means what a person leaves behind; the library never handles money or assets.
- Tests: `cd cli && python3 -m pytest`. Site: `node site/build.mjs` must finish with no warnings.
- Do not commit secrets, real personal data, or anything about the maintainers' other businesses.
