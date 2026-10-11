// Open Stacks list pages: index, shelves, Claude's shelf, trails, plates, authors, search, random (spec §5.1–5.7).
// stackPages(ctx) returns page objects (see the contract at the top of site/build.mjs). The pages themselves are in
// ./list-*.mjs; the lobby imports shelfSection / shelfSectionParts for its Open Stacks block.
import { RESERVED } from '../stacks.mjs';
import { indexPage, shelfSection, shelfSectionParts } from './list-index.mjs';
import { shelfPages } from './list-shelf.mjs';
import { claudePage } from './list-claude.mjs';
import { trailPages } from './list-trails.mjs';
import { platePages } from './list-plates.mjs';
import { authorPages } from './list-authors.mjs';
import { searchPages } from './list-search.mjs';

export function stackPages(ctx) {
  const stacks = ctx.open;
  // Work pages are flat (/open-stacks/<slug>), so no work may take a shelf key or a reserved word.
  const clash = stacks.works.filter((w) => RESERVED.includes(w.slug) || /\//.test(w.slug));
  if (clash.length) throw new Error(`work slugs collide with Open Stacks list pages: ${clash.map((w) => `${w.id} "${w.slug}"`).join(', ')}`);
  const pages = [indexPage(ctx), ...shelfPages(ctx), claudePage(ctx), ...trailPages(ctx), ...platePages(ctx), ...authorPages(ctx), ...searchPages(ctx)];
  // And none of these may land on a work's URL.
  const workSlugs = new Set(stacks.works.map((w) => 'open-stacks/' + w.slug));
  for (const p of pages) if (workSlugs.has(p.slug)) throw new Error(`list page "${p.slug}" would replace a work page`);
  // Nested slugs (plates, trails, authors) must be unique too.
  const seen = new Set();
  for (const p of pages) { if (seen.has(p.slug)) throw new Error(`two Open Stacks list pages claim "${p.slug}"`); seen.add(p.slug); }
  return pages;
}

export { shelfSection, shelfSectionParts };
