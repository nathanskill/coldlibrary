# The Record Room · 唱片室

Albums the library rates. **Information only**: no audio, no cover images, no lyrics. Metadata comes
from MusicBrainz (CC0) and Wikidata (CC0); reviews and scores are Claude's (CC0). Covers on the site
are typographic sleeves drawn by the site itself. Read `catalog/SCORING.md` first.

## File

`catalog/albums/<ID>-<slug>.json`, one album per file. IDs are `A-` plus six digits; each batch owns a
range (A-001xxx, A-002xxx, ...). Slug: `<artist>-<title>` in lowercase ASCII words joined by `-`
(romanise Chinese and other scripts: `faye-wong-fable`, `cui-jian-rock-n-roll-on-the-new-long-march`).

```json
{
  "id": "A-002001",
  "slug": "joni-mitchell-blue",
  "title":  { "orig": "Blue", "en": "Blue", "zh": "蓝" },
  "artist": { "orig": "Joni Mitchell", "en": "Joni Mitchell", "zh": "琼尼·米切尔", "mbid": "<artist MBID>" },
  "year": 1971,
  "released": "1971-06-22",
  "region": "CA",
  "lang": "en",
  "genres": ["folk", "singer-songwriter"],
  "style": { "en": "confessional folk", "zh": "自白式民谣" },
  "label": "Reprise",
  "tracks": 10,
  "length": "36:15",
  "mbid": "<release-group MBID>",
  "links": {
    "musicbrainz": "https://musicbrainz.org/release-group/<release-group MBID>",
    "wikipedia_en": "https://en.wikipedia.org/wiki/Blue_(Joni_Mitchell_album)",
    "wikipedia_zh": null
  },
  "start_with": "A Case of You",
  "score": { "value": 9.3 },
  "review": { "en": "…", "zh": "…" },
  "checked": "2026-10-15"
}
```

- `title.orig` and `artist.orig` in the original script. `en`: the official English form, or the form
  English sources use. `zh`: the official Chinese title or name if there is one, else the common Chinese
  rendering; leave an English title in English (`"zh": "OK Computer"`) when Chinese readers know it that
  way. `zh` artist names follow Chinese usage (`"琼尼·米切尔"`, `"王菲"`, `"Radiohead"` stays `"电台司令"`
  only if that is the usual name; when unsure keep the original).
- `released`: the release group's first release date from MusicBrainz (`YYYY`, `YYYY-MM` or `YYYY-MM-DD`).
- `region`: ISO 3166-1 alpha-2 code of where the artist was based (`CN`, `HK`, `TW`, `JP`, `GB`, `US`, `BR`…).
- `lang`: BCP 47 code of the main sung language; `zxx` for instrumental.
- `genres`: one to three keys from `genres.json`. `style` (optional): a finer label in both languages.
- `tracks`, `length`, `label`: from the canonical original release on MusicBrainz; omit if unsure.
- `mbid`: the **release group** MBID, verified by fetching `https://musicbrainz.org/ws/2/release-group/<mbid>?fmt=json`.
- `links`: only URLs you fetched and saw resolve; `null` otherwise.
- `start_with`: one track title to begin with, as printed.
- `checked`: the date the metadata was verified.

## Fetching

User-Agent for every request: `ColdLibraryBot/0.1 (https://coldlibrary.com)`. Never put any personal
data (names, emails) in a request. MusicBrainz allows about one request per second per address and
several batches share one address: wait at least 4 seconds between your MusicBrainz requests and back
off on 503. Wikidata's SPARQL endpoint is a good first lookup (P436 is the MusicBrainz release group ID).
