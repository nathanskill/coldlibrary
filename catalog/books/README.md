# The Catalogue · 书目

Books and texts the library rates without holding their full text: scripture, history, aesthetics,
world and Chinese literature, old and new. An in-copyright book gets information, a score and a
review only. A public-domain one also gets links to free full texts, and to the Open Stacks when we
hold a selection. Metadata is checked against Wikidata (CC0). Read `catalog/SCORING.md` first.

## File

`catalog/books/<ID>-<slug>.json`, one book per file. IDs are `B-` plus six digits; each batch owns a
range (B-001xxx faith, B-002xxx history, B-003xxx aesthetics, B-004xxx world literature,
B-005xxx Chinese literature). Slug: lowercase ASCII words joined by `-`, romanised (`dream-of-the-red-chamber`).

```json
{
  "id": "B-002001",
  "slug": "herodotus-histories",
  "category": "history",
  "title":  { "orig": "Ἱστορίαι", "en": "The Histories", "zh": "历史" },
  "author": { "orig": "Ἡρόδοτος", "en": "Herodotus", "zh": "希罗多德", "dates": "c. 484 – c. 425 BCE", "dates_zh": "约前 484 – 约前 425" },
  "year": -430,
  "year_display": { "en": "c. 430 BCE", "zh": "约公元前 430 年" },
  "lang": "grc",
  "origin": { "en": "Greece", "zh": "希腊" },
  "tradition": null,
  "full_text": "free",
  "read": [
    { "name": "Project Gutenberg", "url": "https://www.gutenberg.org/ebooks/2707", "note": { "en": "G. C. Macaulay's translation (1890)", "zh": "麦考利英译本（1890）" } }
  ],
  "stacks": ["S-008xxx"],
  "wikidata": "Q…",
  "score": { "value": 9.3 },
  "review": { "en": "…", "zh": "…" },
  "checked": "2026-10-15"
}
```

- `category`: `faith`, `history`, `aesthetics`, `literature`, `thought` or `science` (see `../categories.json`).
- `author`: `null` for scripture and anonymous traditional works; then fill `tradition` for faith texts
  (`{ "en": "Islam", "zh": "伊斯兰教" }`) and say "traditional" in `year_display` where dates are uncertain.
- `year`: a single number for sorting (negative for BCE); `year_display` says it properly.
- `lang`: BCP 47 code of the original language. `origin`: where it was written, in both languages.
- `full_text`: `"library"` if the Open Stacks holds the whole work (then do not make a book entry at all:
  the work page is the entry), `"free"` if a public-domain text can be read free online (give `read`),
  `"none"` if the book is in copyright (no `read` links; never link to pirated copies).
  For `"free"`, link only texts that are public domain in the United States and in life + 70 countries:
  Project Gutenberg (.org), Wikisource, Standard Ebooks, ctext.org, sacred-texts.com, the Internet Archive
  for pre-1931 scans.
- `stacks`: IDs of Open Stacks works that are selections from this book (grep `catalog/stacks/*/*/work.json`).
- `wikidata`: the item's Q-id, verified by fetching it.
- `score`: see SCORING.md; scripture of a living faith gets `"score": null, "unscored": "scripture"`.

## Fetching

User-Agent for every request: `ColdLibraryBot/0.1 (https://coldlibrary.com)`. Never put any personal
data (names, emails) in a request.
