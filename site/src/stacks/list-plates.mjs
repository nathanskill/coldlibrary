// Plates (spec §5.4): /open-stacks/plates (masonry, filter by kind) and one page per plate (8/4).
import { esc, t, go, sep, act, sec, ph, serif, glue, addGlyphs, SITE } from '../lib.mjs';
import { plateHref, shortPlate } from '../stacks.mjs';
import { wcard, plateImg, plateCaption, plateTile, plateRights, adaptive } from '../components.mjs';
import { osHref, crumbs, count, num, plateKind, plateOrigLang, plateTitle, plateArtist, plateYear } from './list-common.mjs';

// The image notes in the plate records are English; these are the ones in use, in Chinese.
const EDIT_ZH = {
  'Resized only.': '只调整了尺寸。',
  'Trimmed the dark photographic background around the object, then resized.': '裁去了器物周围的深色摄影背景，然后调整尺寸。',
  "Trimmed the tape and the museum's colour bar from the edges of the photograph, then resized.": '裁去了照片边缘的胶带和博物馆的色卡，然后调整尺寸。',
};

const KINDS = ['artwork', 'photograph', 'object'];
const KIND_LABEL = { artwork: ['Artworks', '艺术品'], photograph: ['Photographs', '照片'], object: ['Objects', '实物'] };

export function platePages(ctx) {
  const stacks = ctx.open;
  const plates = stacks.plates;
  const index = {
    slug: 'open-stacks/plates',
    title: { en: 'Plates · The Open Stacks', zh: '图版 · 开架书库' },
    description: (lang) => t(lang)(`${plates.length} public-domain paintings, prints and photographs in the Open Stacks, uncropped, each with its institution and rights.`, `开架书库的 ${plates.length} 幅公有领域绘画、版画和照片，不裁切，每一幅都写明收藏机构和权利。`),
    bodyClass: () => 'stacks os-page-plates',
    scripts: ['shelf', 'search'],
    render: (lang) => renderIndex(lang, stacks),
  };
  return [index, ...plates.map((p) => ({
    slug: 'open-stacks/plates/' + p.slug,
    title: (lang) => `${plateTitle(lang, p)} · ${plateArtist(lang, p)}`,
    description: (lang) => (p.alt && (p.alt[lang] || p.alt.en)) || plateTitle(lang, p),
    image: `/assets/plates/${p.id}-sm.jpg`,
    bodyClass: () => 'stacks os-page-plate',
    scripts: ['shelf', 'search'],
    render: (lang) => renderPlate(lang, stacks, p),
  }))];
}

function renderIndex(lang, stacks) {
  const T = t(lang);
  const plates = stacks.plates;
  const n = Object.fromEntries(KINDS.map((k) => [k, plates.filter((p) => plateKind(p) === k).length]));
  const head = ph({
    lang,
    crumbs: crumbs(lang, [[T('Plates', '图版')]]),
    h1: T('Plates', '图版'),
    lede: T('Public-domain paintings, prints and photographs from open collections. Each hangs uncropped, at its own shape, with its institution and its rights.', '来自开放馆藏的公有领域绘画、版画和照片。每一幅都按原来的比例完整挂出，写明收藏机构和权利。'),
    facts: [count(plates.length, 'plate', lang), ...KINDS.filter((k) => n[k]).map((k) => count(n[k], k, lang))].join(sep),
    cls: 'os-ph',
  });
  // The kind filter is a set of radios read by CSS (works without JS); shelf.js keeps ?kind= in the URL.
  const radios = `<input type="radio" name="kind" id="k-all" value="" checked><label for="k-all">${T('All', '全部')} <span class="id">${plates.length}</span></label>${KINDS.map((k) => `<input type="radio" name="kind" id="k-${k}" value="${k}"${n[k] ? '' : ' disabled'}><label for="k-${k}"${n[k] ? '' : ` title="${T('None yet', '暂无')}"`}>${T(...KIND_LABEL[k])} <span class="id">${n[k]}</span></label>`).join('')}`;
  const items = plates.map((p) => {
    const title = plateTitle(lang, p);
    return `<li class="os-pm k-${plateKind(p)}">
  <a class="os-pm-a" href="${plateHref(lang, p)}"><span class="mat os-pm-mat">${plateImg(p, { lang, sizes: '(min-width: 1200px) 265px, (min-width: 600px) 33vw, 50vw' })}</span>
  <span class="os-pm-t serif">${serif(title)}</span></a>
  <span class="os-pm-by">${esc(plateArtist(lang, p))}${sep}${esc(plateYear(lang, p))}</span>
  <span class="id">${esc(p.id)}${sep}${esc(plateRights(lang, p))}</span>
</li>`;
  }).join('');
  const body = `<div class="wrap os-plates" data-kinds>
  <div class="os-kinds" role="radiogroup" aria-label="${T('Kind of plate', '图版类别')}">${radios}</div>
  <ul class="os-masonry">${items}</ul>
</div>`;
  return `${head}\n${act(body, { cls: 'tight' })}`;
}

// The credit line a reader can paste: artist, title, year, institution, rights, and the short link.
export function creditLine(lang, p) {
  const T = t(lang);
  const rights = p.rights && p.rights.license ? (p.rights.license === 'CC0-1.0' ? T('public domain (CC0)', '公有领域（CC0）') : p.rights.license) : T('public domain', '公有领域');
  const inst = (p.institution && p.institution.name) || '';
  return lang === 'zh'
    ? `${plateArtist(lang, p)}，《${plateTitle(lang, p)}》，${plateYear(lang, p)}。${inst ? inst + '，' : ''}${rights}。经冷冻图书馆：${SITE}${shortPlate(p)}`
    : `${plateArtist(lang, p)}, ${plateTitle(lang, p)}, ${plateYear(lang, p)}. ${inst ? inst + ', ' : ''}${rights}. Via Cold Library: ${SITE}${shortPlate(p)}`;
}

function renderPlate(lang, stacks, p) {
  const T = t(lang);
  const title = plateTitle(lang, p);
  const origLang = plateOrigLang(p);
  const orig = p.title.orig && p.title.orig !== title && p.title.orig !== p.title.en ? p.title.orig : '';
  if (orig && origLang !== 'ja' && origLang !== 'ko') addGlyphs(orig);
  addGlyphs(title);
  const artist = p.artist || {};
  const artistLine = [esc(plateArtist(lang, p)) + (artist.orig && artist.orig !== plateArtist(lang, p) && artist.orig !== artist.en ? ` <span${plateOrigLang(p) ? ` lang="${esc(plateOrigLang(p))}"` : ''}>${esc(artist.orig)}</span>` : ''), artist.dates ? `<span class="tabular">${esc(artist.dates)}</span>` : ''].filter(Boolean).join(sep);
  const facts = [esc(plateYear(lang, p)), p.medium ? esc(p.medium[lang] || p.medium.en) : ''].filter(Boolean).join(sep);
  const inst = p.institution || {};
  const rightsBasis = p.rights && p.rights.basis ? esc(p.rights.basis[lang] || p.rights.basis.en) : '';
  const licence = p.rights && p.rights.license ? (p.rights.license_url ? `<a href="${esc(p.rights.license_url)}" rel="noopener">${esc(p.rights.license)}</a>` : esc(p.rights.license)) : '';
  const img = p.image || {};
  const rows = [
    [T('Institution', '收藏机构'), inst.object_url ? `<a href="${esc(inst.object_url)}" rel="noopener">${esc(inst.name)}<span class="nw">&nbsp;↗</span></a>` : esc(inst.name || '')],
    inst.accession ? [T('Accession', '馆藏编号'), `<span class="tabular">${esc(inst.accession)}</span>`] : null,
    inst.credit_line ? [T('Credit', '入藏信息'), esc(inst.credit_line)] : null,
    [T('Rights', '权利'), `<p>${rightsBasis}</p>${licence ? `<p>${licence}</p>` : ''}<p class="meta">${T('Guidance, not legal advice.', '仅供参考，不是法律意见。')}</p>`],
    p.alt ? [T('Description', '画面描述'), esc(p.alt[lang] || p.alt.en)] : null,
    [T('Image', '图像'), `${img.width && img.height ? `<span class="tabular">${img.width} × ${img.height}</span>${sep}` : ''}${img.source_url ? `<a href="${esc(img.source_url)}" rel="noopener">${T('source file', '原始文件')}</a>` : ''}${img.retrieved ? `${sep}${T('retrieved', '取得于')} <span class="tabular">${esc(img.retrieved)}</span>` : ''}${img.edit ? `<p class="meta">${esc(lang === 'zh' ? (EDIT_ZH[img.edit] || img.edit) : img.edit)}</p>` : ''}`],
    [T('Catalogue no.', '馆藏号'), `<span class="id">${esc(p.id)}</span>${sep}<a class="id" href="${shortPlate(p)}">coldlibrary.com${shortPlate(p)}</a>`],
    [T('Credit line', '引用'), `<span data-credit>${esc(creditLine(lang, p))}</span>`],
  ].filter(Boolean);
  const note = p.note && (p.note[lang] || p.note.en);
  const pick = p.pick && (p.pick[lang] || p.pick.en);
  const tone = p.tone ? ` tone-${esc(p.tone)} os-toned` : '';
  const top = `<article class="os-plate" aria-labelledby="h-plate">
  <div class="wrap grid">
    <div class="c-aside os-pinfo">
      <p class="idline"><a class="id" href="${shortPlate(p)}" title="${T('Short link · cite this', '短链接 · 引用用这个')}"><span class="vh">${T('Catalogue number ', '馆藏号 ')}</span>${esc(p.id)}</a><span class="meta"><span class="sep" aria-hidden="true">·</span><wbr><a href="${osHref(lang, 'plates')}">${T('Plates', '图版')}</a></span></p>
      <h1 id="h-plate" class="serif${[...title].length > 32 ? ' os-long' : ''}" lang="${lang === 'zh' ? 'zh-CN' : 'en'}">${glue(title)}</h1>
      ${orig ? `<p class="os-porig">${T('Original title', '原题')}<span class="sep" aria-hidden="true">·</span><wbr><span class="serif"${origLang ? ` lang="${esc(origLang)}"` : ''}>${esc(orig)}</span></p>` : ''}
      <p class="os-pby">${artistLine}</p>
      <p class="meta">${facts}</p>
      <dl class="tomb os-ptomb">${rows.map(([k, v]) => `<dt>${k}</dt><dd>${v}</dd>`).join('')}</dl>
      <p class="actions os-pact"><button class="btn small secondary" type="button" data-copy-from="[data-credit]" data-done="${T('Copied', '已复制')}" hidden>${T('Copy credit line', '复制引用')}</button><a class="go" href="/assets/plates/${esc(p.id)}.jpg">${T('Open full size', '查看原尺寸')}<span class="nw">&nbsp;↗</span></a><span class="vh" data-copy-status aria-live="polite"></span></p>
      ${note ? `<div class="os-cnote"><p class="meta">${T('Curator’s note · Claude (an AI), Librarian No. 2', '馆员注 · Claude（AI），二号馆员')}</p><p>${esc(note)}</p>${pick ? `<p class="meta brass">${T('Why I hung it', '我为什么挂它')}</p><p class="os-why">${esc(pick)}</p>` : ''}</div>` : ''}
    </div>
    <figure class="c-main os-pfig">
      <div class="mat${tone}">${plateImg(p, { lang, large: true, eager: true, sizes: '(min-width: 1200px) 747px, (min-width: 900px) 66vw, 100vw' })}</div>
      <figcaption>${plateCaption(lang, p)}</figcaption>
    </figure>
  </div>
</article>`;

  // The works this plate hangs beside, then more plates.
  const beside = stacks.works.filter((w) => w.plate === p.id);
  const besideSec = beside.length ? sec({ id: 'beside', h: T('Hangs beside', '挂在这些作品旁边'), body: adaptive(beside.map((w) => wcard(lang, w, stacks))) }) : '';
  const more = morePlates(stacks, p, 8);
  const moreSec = more.length ? sec({ id: 'more-plates', h: T('More plates', '更多图版'), cls: 'os-more', body: `<div class="sideways">${more.map((x) => plateTile(lang, x)).join('')}</div>`, foot: go(osHref(lang, 'plates'), T(`All ${count(stacks.plates.length, 'plate', lang)}`, `全部 ${num(stacks.plates.length, lang)} 幅图版`)) }) : '';
  return `${top}
${act(`${besideSec}${moreSec}`, { alt: true })}`;
}

// Neighbours: shared tags first, then the same artist, the same kind, and the nearest catalogue numbers.
function morePlates(stacks, p, n) {
  const tags = new Set(p.tags || []);
  const kind = plateKind(p);
  return stacks.plates.filter((x) => x !== p).map((x) => {
    const shared = (x.tags || []).filter((g) => tags.has(g)).length;
    const score = shared * 3 + (x.artist && p.artist && x.artist.en === p.artist.en ? 2 : 0) + (plateKind(x) === kind ? 1 : 0);
    return [x, score];
  }).sort((a, b) => b[1] - a[1] || Math.abs(+a[0].id.slice(2) - +p.id.slice(2)) - Math.abs(+b[0].id.slice(2) - +p.id.slice(2))).slice(0, n).map(([x]) => x);
}
