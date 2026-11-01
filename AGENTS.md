# AGENTS.md — Cold Library

This file is the handoff document for this repository. Any person or agent who
picks up the work starts here. It is also the first real example of what Cold
Library asks people to write: a clear will that any future executor can follow.

## What this is

**Since 2026-10-15 (founder's direction): a rating library and a memorial library.** The homepage stays simple;
the site features literature in the widest sense (faith and religion, history, thought, aesthetics) and albums,
each with the librarian's score (Claude, an AI, ten-point, with a reason) and readers' anonymous star ratings.
Nothing about the founder personally appears on the site. UI, style and images are unchanged.

- Kinds of entry: Open Stacks works (full text, `catalog/stacks/`, `score` and optional `category` in work.json),
  book entries without full text (`catalog/books/`, README there) and albums (`catalog/albums/`, README there).
  Categories: `catalog/categories.json`. Scoring rules: `catalog/SCORING.md` (scripture of a living faith is
  collected, not scored; Claude never claims to have heard an album; reviews are original, no lyrics).
- Pages: `/charts` and `/charts/<category>`, `/books`, `/books/<slug>`, `/music`, `/music/<slug>`, `/memorial`
  (`site/src/rate/`). Score strips on work pages; tribute lamps on author, work, book and album pages.
- APIs: `/api/ratings` (one rating per entry per device; shown after five) and `/api/tributes` (one lamp per
  person per device per day). Valid ids and people: `api/_lib/rate-ids.json`, written by `node tools/rate-ids.mjs`.
- Checks: `node tools/catalog-check.mjs` (albums, books, scores) next to `node tools/stacks-check.mjs`.

The memorial side, unchanged: Cold Library (冷冻图书馆) is a library for everything that is yours, and for the will that carries it on
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
| Open Stacks | 开架书库 | The open shelves: real public-domain and openly licensed works anyone may read, copy and keep, each with its rights basis and source; curated by Claude |
| Claude's shelf | Claude 的书架 | Claude's own picks in the Open Stacks, with permanent numbers (No. 1, No. 2 …) and a reason for each |
| Trail | 书单 | A hand-ordered path of 5–8 works with one sentence by Claude per step |
| Gloss / Marginalia | 注释 / 页边批注 | Claude's factual notes on a text / Claude's own pencil notes on a pick (at most three) |
| House paper | 馆内文献 | The library's own writing, e.g. S-000001 "Why a cold library"; not counted as a work |
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

## Website (rebuilt 2026-10-10)

Rebuilt after benchmarking mature products: Trust & Will and Empathy (one question per screen), Casa and
Nunchuk/Liana (inheritance without custody, shown as a timeline), MuchLoved (lamps and notes), Stripe Press
and Kinfolk (paper, type, photographs at full brightness), Rijksmuseum (catalogue numbers and plates),
Future Library and GitHub Arctic Vault (a long promise told plainly), Linear (one job per block).
Cake is the cautionary example: a memorial tone that makes visitors feel they are about to die.

- Positioning (use verbatim): "Cold Library gives your work a perpetual exhibit and a person a perpetual
  plaque. Anyone can read what you choose to show; the rest waits behind an AI warden, and only people who can
  answer its questions receive what you left for them. We keep the library, never the keys." /
  "冷冻图书馆给作品一个永续展位，给人一块永续铭牌：你愿意公开的，谁都能看；其余的交给门口的 AI 守馆人，只有答得上它问题的人，才能拿到你留下的东西。我们守着图书馆，从不保管钥匙。"
- Floors (the directory board, since 2026-11-01): 13 About · 12 House Rules · 11 Librarians · 10 Wardens · 9 Exhibits ·
  8 Plaques · 7 Memorial · 6 Collection Desk · 5 Front Desk · 4 Record Room · 3 Catalogue · **2 Reference Room** ·
  **1 Open Stacks** · M Charts · L Lobby · B1 Sealed layer · B2 Cold Vault.
- The Reference Room (`/reference`, since 2026-11-01): open resources on GitHub that belong with the library's kinds
  (literature, faith, history, aesthetics, music, and the tools for them). It keeps a name, a one-line note by Claude
  (CC0), the repository's own description, the licence (five tiers) and a link, never the contents. The pages show only
  the name, the licence in small type and the note: no introductions, counts or disclaimers (founder, 2026-11-01:
  "不要写类似于这种东西 没必要影响浏览体验"). Rules:
  `docs/收录规则.md`. Data: `catalog/reference/repos.json` (shelved), `_queue.json` (waiting), `_rejected.json` (with
  reasons), `sources.json` (lists, topics, searches, seeds, blocked words). Weekly: `node tools/reference/collect.mjs
  weekly`, review the queue, then `apply`. The token is read at run time from GITHUB_TOKEN or `gh auth token`, never stored.
- Lobby (since 2026-10-11): four acts, one job per block — I see it: hero (h1 unchanged, one solid "Hang your own",
  a text link into the Open Stacks, the 21:9 lake band), today's reading, the Open Stacks; II try it: the warden
  trial (M-000001); III make yours: exhibits and plaques (the positioning paragraph above, word for word), how it
  works + starter; IV why trust it: the vault, house rules + who keeps this place; then a text-only closing.
  Exactly four links to /accession on the lobby.
- Visual system v5 (design spec of 2026-10-11): one 12-column grid with named spans (`.c-main`, `.c-aside`,
  `.c-half`, `.c-third`, `.c-quarter`, the reading frame); acts that change background only between acts; four
  surfaces (nothing · rule · mat · card) plus boxes only for things you operate; six UI type sizes (`--t1`…`--t6`) and
  a separate reading scale; spacing only from `--s1`…`--s9`; tokens only, no hex outside `01-tokens.css`. CSS lives in
  `site/src/css/NN-*.css` and is concatenated by the build. Generated photographs appear only in the lobby band, the lobby's two product cards
  and the building-metaphor pages (dimmed to 88% in dark mode); the Open Stacks only ever show real public-domain plates,
  uncropped, captions below. No photo on form pages. Motion: warden line pacing and the letter's frost reveal only.
- The Open Stacks (`/open-stacks`): real public-domain and openly licensed works, curated by Claude (Librarian No. 2)
  under the rights rule in `catalog/stacks/README.md` (authors and translators died before 1956 and published before
  1931; or US federal works; or dedications/CC0; or open licences, word for word when they forbid derivatives).
  Every work shows its rights basis, source and retrieval date; translations, 白话 versions, glosses, marginalia,
  shelf essays and trails are Claude's, CC0. Anything uncertain goes to `_held/` with a HELD.md, never onto a shelf.
- Short catalogue URLs `/e/NNNNNN`, `/m/NNNNNN`, `/s/NNNNNN` (works) and `/g/NNNNNN` (plates) are generated by the build. Retired
  pages redirect in `vercel.json` to the section that replaced them; never remove a public URL without one.
- The try-as-visitor warden lives inside the front-desk form. Warden forms stop propagation, and the desk
  only acts on submits from itself; otherwise answering the draft warden can hand in the application.
- Dates shown to visitors use their own calendar day, not UTC.
- Before shipping: both languages, light and dark, no horizontal scroll at 375 px, no console errors,
  and every internal link and anchor resolves.

## Repository map

- `spec/v0.1/SPEC.md`, `SPEC.zh.md` — the format, rules, defaults
- `spec/v0.1/core.schema.json` — JSON Schema for `core.json`
- `spec/v0.1/examples/fictional-indie-dev/` — a fully fictional example workspace
- `docs/threat-model.md`, `docs/threat-model.zh.md`
- `skills/exit-interview/` — interview skill and printable questionnaires
- `cli/` — `coldlibrary` Python CLI (`init`, `validate`, `seal`, `check-share`, `open`, `verify`)
- `site/` — static website, zero dependencies, built by `node site/build.mjs` into `site/dist/`; page modules in
  `site/src/` (pages.mjs, stacks/*.mjs), shared parts in lib.mjs and components.mjs, styles in `site/src/css/`
- `catalog/stacks/`, `catalog/plates/` — the Open Stacks (see their README); fonts are sliced by `tools/cjk-font.py`
- `contracts/` — Cold Vault (Foundry); `docs/whitepaper.md`, `docs/whitepaper.zh.md`
- `catalog/items/`, `catalog/items-src/`, `catalog/log.json` — exhibits and plaques, fictional sources, the library log

## Working rules

- Keep the website dependency-free and static. Fonts are self-hosted (OFL).
- Every page exists in English (default, at `/`) and Chinese (at `/zh/`).
- Copy: short declarative sentences, no exclamation marks, promise small, numbers exact.
- Banned words in copy: immortal, digital twin, AI resurrection, forever with you (永生、数字分身、AI 复活、永远陪伴). "Perpetual / 永续" is the founder's word and is allowed; the Ledger (on the House Rules page, `/rules#ledger`) says honestly what it means. "财富" means what a person leaves behind; the library never handles money or assets.
- Tests: `cd cli && python3 -m pytest`; `cd contracts && forge test`. Site: `node site/build.mjs` must finish with no warnings.
- Do not commit secrets, real personal data, or anything about the maintainers' other businesses.
