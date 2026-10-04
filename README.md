# Cold Library

**Keep what is yours. Carry on what you meant.** [coldlibrary.com](https://coldlibrary.com) · [中文](README.zh.md)

Cold Library gives a project a **Perpetual Exhibit** and a person a **Perpetual Plaque**. Each shows the world only what its owner chooses. The deeper layer is guarded by an AI **Warden**: visitors who pass its trial unlock what was left for them (letters, know-how, a successor badge, directions to things set aside) and may light a lamp. For things that must wait, the offline **Ice Core** tools seal a file and split its key among people you trust.

The recognised layer is encrypted in the owner's browser with a key derived from the warden's answers, and decrypted in the visitor's browser. The server never sees answers or plaintext, holds no keys and no money, and executes nothing.

| | |
|---|---|
| `spec/v0.1/` | The sealed-layer (Ice Core) format: `COVER.md`, `COLDLIBRARY.md`, `core.json` and its JSON Schema (CC0-1.0) |
| `cli/` | `coldlibrary` command-line tool: init, validate, seal, check-share, open, verify (Apache-2.0) |
| `skills/exit-interview/` | An interview skill for any AI assistant, plus printable questionnaires |
| `docs/` | Threat model |
| `catalog/` | Exhibits and plaques (`items/`), project cards and the Open Stacks, as plain files |
| `tools/` | `seal-item.mjs` locks an item; `publish-item.mjs` hangs an approved application |
| `site/` | The static website, zero dependencies (`node site/build.mjs`) |
| `api/` | Librarian register, applications (ciphertext only) and lamps |

## House rules

1. We never hold keys, shares, plaintext, boxes, assets or money.
2. An Ice Core is not a legal will. Property follows the legal will or the law.
3. We quote people. We never impersonate them.
4. Our notices never contain links and never ask for money.
5. Every wish has a half-life: binding, then advisory, then archive.
6. Not a memorial. Not a farewell tool. If you are not okay, see [the Warm Room](https://coldlibrary.com/warm-room).

The tools are **not audited yet**. Use them for drills before trusting them with anything real.

Start with [`AGENTS.md`](AGENTS.md) if you are taking over maintenance — it is this project's own handover file.

## Licenses

Code: Apache-2.0 ([LICENSE](LICENSE)). Specification and catalog texts: CC0-1.0 ([spec/LICENSE](spec/LICENSE)). Fonts: IBM Plex, SIL Open Font License. Site photographs were generated for this project.
