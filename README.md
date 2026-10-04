# Cold Library

**A cold library for ordinary lives.** [coldlibrary.com](https://coldlibrary.com) · [中文](README.zh.md)

Cold Library is an open format and a set of offline tools for writing down what should happen if you can no longer be reached: where things are, who to call, what to stop, letters to leave, and how long each wish should bind the living. You write it and seal it on your own machine, split the key among people you trust, and hand the sealed box to someone else to hold.

Cold Library never holds your keys, shares, files or plaintext, and executes nothing. The only data it stores is the librarian register (email, pen name, number).

| | |
|---|---|
| `spec/v0.1/` | The Ice Core format: `COVER.md`, `COLDLIBRARY.md`, `core.json` and its JSON Schema (CC0-1.0) |
| `cli/` | `coldlibrary` command-line tool: init, validate, seal, check-share, open, verify (Apache-2.0) |
| `skills/exit-interview/` | An interview skill for any AI assistant, plus printable questionnaires |
| `docs/` | Threat model |
| `catalog/` | The Project Wing and the Open Stacks, as plain files |
| `site/` | The static website, zero dependencies (`node site/build.mjs`) |
| `api/` | The small librarian registration service (email, pen name, number — nothing else) |

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
