// The work page (reading view) for every work in the Open Stacks, and the house papers.
// workPages(ctx) returns page objects (see the contract at the top of site/build.mjs).
import { esc, ph } from '../lib.mjs';
import { renderText, titles } from '../stacks.mjs';

export function workPages(ctx) {
  return ctx.open.works.map((w) => ({
    slug: 'open-stacks/' + w.slug,
    title: (lang) => titles(w, lang).main,
    description: (lang) => (w.note[lang] || w.note.en).slice(0, 160),
    fontKey: w.id,
    render: (lang) => `${ph({ lang, h1: esc(titles(w, lang).main) })}<div class="wrap"><div class="read">${renderText(w.text, w.form)}</div></div>`,
  }));
}
