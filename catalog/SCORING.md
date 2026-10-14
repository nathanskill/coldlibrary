# Scores · 评分

Since 2026-10-15 Cold Library is a library that **rates** what it keeps and **remembers** the people who made it.
Every work, book entry and album carries two scores:

- **The librarian's score** (馆员评分): given by Claude, an AI, Librarian No. 2. One decimal on a ten-point
  scale, with a reason. It is written into the catalogue and never changes silently: a change is a new
  value with a dated note.
- **Readers' score** (读者评分): anonymous one-to-five stars from visitors, one rating per device per entry,
  shown on the ten-point scale (stars × 2) once at least five people have rated.

## What the librarian's score measures

Lasting worth within its kind: craft, depth, originality, and what it gave to the people who came after.
Not popularity, not sales, not how agreeable its views are. A short lyric can score as high as an epic.

| Score | Meaning | 含义 |
|---|---|---|
| 9.5–9.9 | One of the summits of human making; few in any tradition | 人类创作的高峰，任何传统里都寥寥无几 |
| 9.0–9.4 | Essential; defines or crowns its tradition | 必读必听，定义或成就了一个传统 |
| 8.5–8.9 | Excellent; belongs on any serious shelf | 出色，任何认真的书架都该有 |
| 8.0–8.4 | Very good; rewarding, with clear strengths | 很好，有明确的长处，值得花时间 |
| 7.0–7.9 | Good, or of real historical interest | 不错，或有真实的历史意义 |
| 6.0–6.9 | Uneven, or mostly of historical interest | 参差不齐，主要是历史意义 |

Rules:

- One decimal. Never 10.0. Use the whole range honestly: in any batch the median should be near 8.5,
  no more than one entry in seven at 9.3 or above, and at least one in seven at 8.0 or below.
- Score against the work's own kind (an RFC against other technical prose, a pop album against pop).
- **Scripture of a living faith is collected, not scored**: the Bible, the Qur'an, the Tanakh, the Vedas
  and Upanishads, the Bhagavad Gita, Buddhist sutras, the Guru Granth Sahib, the Avesta and the like.
  Set `"score": null` and `"unscored": "scripture"`. Readers cannot rate them either. Writings *about*
  faith, devotional poetry, mystics, theology and myths of no living cult are scored like any book.
- **Albums**: Claude cannot hear recordings. An album's score and review come from what is documented
  about it (its making, structure, reception, influence) and must never claim listening ("when I heard",
  "the sound washes over me"). Say what is there and why it matters; the readers' stars are the ears.

## Reviews

Two to four sentences in each language (English 40–90 words; Chinese 60–150 characters), written fresh
by Claude. Facts must be checkable; no claims you cannot source. No quotations of lyrics, no copied
blurbs, no sentences adapted from Wikipedia, publishers, Douban, RYM, AllMusic or any critic. No
exclamation marks. Plain, warm, exact. The Chinese is written, not translated word for word.

Never put anything about Cold Library's founder, or any private person, into a review.
