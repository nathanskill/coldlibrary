# The Open Stacks · 开架书库

Real works anyone may read, copy and keep. Every work here is in the public domain or under a
licence that allows redistribution, and every one says why, with a source a reader can check.
Curated by Claude (an AI, Librarian No. 2) for Cold Library. Notes and translations by Claude are CC0-1.0.

## Rights rule (as of 2026)

A work may be shelved only if one of these is true, and its `rights.basis` says which:

1. **Public domain by age.** Every author *and* every translator died before 1 January 1956, *and* the
   text (in the form we use, including the translation) was first published before 1 January 1931.
   This keeps it public domain in Australia, the EU and UK (life + 70), mainland China (life + 50)
   and the United States (published before 1931). Ancient and classical texts qualify.
2. **United States federal government work** (17 U.S.C. § 105), e.g. NASA text and photographs.
3. **Dedicated to the public domain** by the author (e.g. SQLite, Python PEPs, the Jargon File) or CC0.
4. **An open licence that allows redistribution.** Name it, link it, and set `verbatim_only` when the
   licence forbids modification (e.g. CC BY-ND, the GNU Manifesto notice). Keep any required notice
   in `rights.notice`.

Never shelve: a modern translation of an old work, anything you are not sure about, or a text you
typed from memory. Fetch from a primary source (Project Gutenberg, Wikisource, Standard Ebooks, the
publisher's own site, rfc-editor.org, the Met Open Access API) and record the URL.

## Tone

Commemorate and carry on. Snow, lamps, light, craft, knowledge handed forward, the long view.
Not grief, not funerals, not "before you die". Avoid modern politics.

## Layout

```
catalog/stacks/<shelf>/<ID>-<slug>/
  work.json             metadata (schema below)
  text.md               the work, in its source language and script
  text.zh-Hans.md       simplified-Chinese conversion of a *-Hant text (tools/stacks-hans.py)
  translation.en.md     optional, a translation by Claude
  translation.zh.md     optional, a translation by Claude
catalog/plates/<ID>-<slug>.json        a public-domain image (painting, print, photograph)
site/public/assets/plates/<ID>.jpg     1600 px on the long side, ≤ 450 KB, progressive
site/public/assets/plates/<ID>-sm.jpg  800 px on the long side, ≤ 120 KB
site/public/assets/plates/<ID>-480.jpg 480 px on the long side, ≤ 40 KB   (python3 tools/plate-images.py makes all three)
catalog/stacks/<shelf>/shelf.json      Claude's shelf essay, three "start here" works, a header plate
catalog/stacks/claude-shelf.json       Claude's shelf: permanent accession numbers and display order
catalog/stacks/_trails/<slug>.json     reading trails, 5–8 steps, one sentence per step
catalog/stacks/tags.json               the controlled tag vocabulary (≈40 tags, en + zh, aliases)
catalog/plates/_pairings.json          which plate hangs beside which work (applied to work.plate)
```

Shelves: `poetry` 诗与词 · `prose` 文与小说 · `thought` 哲思 · `science` 科学 · `computing` 计算与开源 ·
`records` 寄往未来 (messages written for people not yet born: plaques, records, inscriptions).

IDs are `S-` + six digits for works and `G-` + six digits for plates. Each curator gets its own block.

## text.md

- Plain text with light Markdown: `## Heading` for parts or chapters, blank lines between paragraphs.
- `form: verse` (in work.json) keeps single line breaks as line breaks; stanzas are separated by a blank line.
- `form: code` allows fenced code blocks.
- No HTML, no images, no editorial brackets, no Gutenberg header or licence boilerplate
  (keep the required notice in `rights.notice` instead). Keep the author's own footnotes only if short.

## work.json

```json
{
  "id": "S-001001",
  "slug": "river-snow",
  "shelf": "poetry",
  "form": "verse",
  "lang": "lzh-Hans",
  "title":  { "orig": "江雪", "en": "River Snow", "zh": "江雪" },
  "author": { "orig": "柳宗元", "en": "Liu Zongyuan", "zh": "柳宗元", "dates": "773–819" },
  "year": 806,
  "year_display": { "en": "c. 806", "zh": "约 806 年" },
  "translator": null,
  "edition": { "en": "Text as given on Chinese Wikisource", "zh": "据维基文库" },
  "source": { "name": "Wikisource", "url": "https://zh.wikisource.org/wiki/江雪", "retrieved": "2026-10-11" },
  "rights": {
    "status": "public-domain",
    "basis": { "en": "Tang dynasty poem; the author died in 819.", "zh": "唐诗，作者卒于 819 年。" },
    "license": null, "license_url": null, "notice": null, "verbatim_only": false
  },
  "translations": { "en": "Claude" },
  "note": { "en": "Two to four sentences.", "zh": "两到四句。" },
  "pick": null,
  "tags": ["snow", "solitude"],
  "excerpt": { "orig": "孤舟蓑笠翁，独钓寒江雪。", "en": "...", "zh": "孤舟蓑笠翁，独钓寒江雪。" },
  "plate": null
}
```

- `lang`: `lzh-Hant` / `lzh-Hans` (classical Chinese), `zh-Hant` / `zh-Hans` (modern Chinese), `en`, or another BCP 47 tag.
  Keep Chinese text in the script of the source. Any `-Hant` text also needs `text.zh-Hans.md` from `python3 tools/stacks-hans.py <folder>`;
  read the conversion once, since OpenCC occasionally picks the wrong character (e.g. 乾/干, 後/后 in names).
- `translator`: for a historical translation used as the text, `{ "name": "George Long", "dates": "1800–1879", "year": 1862 }`.
- `translations`: which `translation.*.md` files exist, and who made them (always "Claude" for new ones).
- `note`: the curator's note, written by Claude in its own honest voice: what the work is, why it is on
  this shelf, what to notice. An AI may say what it values and why; it never claims a body, a childhood
  or memories it does not have.
- `pick`: only for the few works on Claude's own shelf: `{ "en": "...", "zh": "..." }`, a few sentences on why.
- `excerpt`: one or two lines that make someone want to read it.

Run `node tools/stacks-check.mjs` before committing; it validates every work and plate.
## Fields added in October 2026 (design spec v5 §4.6; tools/stacks-check.mjs enforces them)

- `translations.<lang>`: `"Claude"` means a full translation by Claude. A partial one is
  `{ "by": "Claude", "coverage": "partial", "label": {en, zh}, "segments": [ {"src": "<section id>"} | {"src": "p:12-18"} ] }`.
  A translation mirrors its original block for block: the same `##` headings in the same order, the same number of
  paragraphs in each section, verse line for line (or exactly two lines per couplet line). For classical Chinese,
  `translation.zh.md` is a modern Chinese 白话 version. `verbatim_only` works never get a translation.
- `gloss`: `[ { "at": "簑笠", "occ": 1, "at_hans": "蓑笠", "en": "…", "zh": "…" } ]` — Claude's notes (注释). `at` is an
  exact substring of `text.md` with `*` emphasis removed, `occ` the occurrence, `at_hans` the simplified spelling when it differs.
- `marginalia`: `[ { "at": "…", "en": "…", "zh": "…" } ]` — Claude's pencil notes; only on works with a `pick`, at most 3.
- `orig_lang`: required when `translator` is set (BCP 47 of the original, e.g. `grc`, `la`, `da`, `fr`).
- `pairs`: up to 3 work ids Claude pairs this one with. `period` overrides the computed dynasty. `style: "essay"` drops
  first-line indents on prose. `rights.kind` (`age` · `us-gov` · `dedicated` · `license`) and
  `rights.checked: { "where": ["AU","EU","UK","CN","US"], "date": "…" }` record the basis and the jurisdictions checked.
- Plates: `kind` (`artwork` · `photograph` · `object`), `tone` (tints the mat), and `title.lang` / `artist.lang`.

## Tools

- `node tools/stacks-check.mjs [--warn]` — validate everything above (also runs, as a warning, on every build).
- `python3 tools/stacks-hans.py <folder>` — simplified text for a `-Hant` work. Run it only for a new work: many `text.zh-Hans.md` files were
  corrected by hand after conversion (OpenCC leaves variants such as 輭 靑 淸 楡 unconverted), and re-running it would undo that.
- `python3 tools/plate-images.py` — re-encode plates to the three sizes (originals move to `.cache/plates-orig/`).
- `node tools/tags-migrate.mjs [--write]` — map every work's tags onto `tags.json` through its aliases.
- `node site/build.mjs && python3 tools/cjk-font.py` — rebuild, then re-slice the Chinese serif for the characters each page uses.


## Plate JSON

```json
{
  "id": "G-008001",
  "slug": "evening-snow-at-kambara",
  "title":  { "orig": "蒲原 夜之雪", "en": "Evening Snow at Kambara", "zh": "蒲原 夜之雪" },
  "artist": { "orig": "歌川広重", "en": "Utagawa Hiroshige", "zh": "歌川广重", "dates": "1797–1858" },
  "year": 1833,
  "year_display": { "en": "c. 1833–34", "zh": "约 1833–34 年" },
  "medium": { "en": "Woodblock print", "zh": "木版画" },
  "institution": { "name": "The Metropolitan Museum of Art", "object_url": "https://www.metmuseum.org/art/collection/search/..." },
  "image": { "source_url": "https://images.metmuseum.org/...", "width": 1600, "height": 1067 },
  "rights": { "status": "public-domain", "basis": { "en": "...", "zh": "..." }, "license": "CC0-1.0", "license_url": "https://creativecommons.org/publicdomain/zero/1.0/" },
  "alt": { "en": "...", "zh": "..." },
  "note": { "en": "...", "zh": "..." },
  "tags": ["snow", "night"]
}
```
