// Etapa 2 din §1.3: analyze. Citește doar snapshot-ul (fără rețea) și scrie rapoarte JSON în reference/analysis/,
// pe care se discută deciziile despre entități înainte să ajungă ceva în bază.
import {readFile, writeFile, mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('../reference/', import.meta.url));
const SNAP = join(ROOT, 'snapshot');
const OUT = join(ROOT, 'analysis');
const ORIGIN = 'https://yachtkid.ro';

const manifest = JSON.parse(await readFile(join(SNAP, 'manifest.json'), 'utf8'));
const api = async t => JSON.parse(await readFile(join(SNAP, 'api', `${t}.json`), 'utf8').catch(() => '[]'));
const [wpPages, wpPosts, wpTestimonials, wpMedia, wpCategories, wpUsers] =
  await Promise.all(['pages', 'posts', 'testimonial', 'media', 'categories', 'users'].map(api));

const sha1 = s => createHash('sha1').update(s).digest('hex').slice(0, 12);
const decode = s => s
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&rsquo;|&lsquo;/g, "'");
const text = html => decode(html.replace(/<(script|style|svg|form|noscript)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<br\s*\/?>/gi, '\n')
  .replace(/<\/(p|div|li|h[1-6]|section|tr|blockquote)>/gi, '\n').replace(/<[^>]+>/g, ' ')).replace(/[ \t]+/g, ' ').replace(/\s*\n\s*/g, '\n').trim();
const fold = s => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const pathOf = href => { try { const u = new URL(decode(href), ORIGIN); return u.origin === ORIGIN ? u.pathname : null; } catch { return null; } };
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
const between = (html, open, close) => { const i = html.indexOf(open); if (i < 0) return ''; const j = html.indexOf(close, i); return html.slice(i, j < 0 ? undefined : j + close.length); };
const inc = (o, k, n = 1) => (o[k] = (o[k] ?? 0) + n, o);
const write = (name, data) => writeFile(join(OUT, `${name}.json`), JSON.stringify(data, null, 1));

const navLinks = html => [...html.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)]
  .map(([, a, t]) => ({label: text(t).replace(/\s+/g, ' '), href: pathOf(attr(a, 'href') ?? '') ?? attr(a, 'href')})).filter(l => l.label || l.href);

// ---------- 1. Paginile ----------
const byWpId = new Map([...wpPages, ...wpPosts, ...wpTestimonials].map(x => [x.id, x]));
const pages = {};
for (const [path, m] of Object.entries(manifest.pages)) {
  if (m.status !== 200 || !m.file) { pages[path] = {path, status: m.status ?? null, redirect: m.redirect ?? null}; continue; }
  const html = await readFile(join(SNAP, m.file), 'utf8');
  const body = html.match(/<body[^>]*class="([^"]*)"/)?.[1] ?? '';
  const header = between(html, '<header id="brx-header"', '</header>');
  const footer = between(html, '<footer id="brx-footer"', '</footer>');
  const main = html.match(/<main\b[\s\S]*<\/main>/)?.[0] ?? html.slice(html.indexOf('</header>') + 9, html.indexOf('<footer id="brx-footer"'));
  const wpId = +(body.match(/\b(?:page-id|postid)-(\d+)/)?.[1] ?? 0) || null;
  const kind = /\bsingle-post\b/.test(body) ? 'post' : /\bsingle-testimonial\b/.test(body) ? 'testimonial' : /\bsingle-bricks_template\b/.test(body) || path.includes('/template/') ? 'template'
    : /\bcategory\b/.test(body) ? 'category' : /\bauthor\b/.test(body) ? 'author' : /\bpage\b/.test(body) ? 'page' : 'other';
  const head = html.slice(0, html.indexOf('</head>'));
  const alternates = Object.fromEntries([...head.matchAll(/<link rel="alternate" href="([^"]+)" hreflang="([^"]+)"/g)].map(([, h, l]) => [l, pathOf(h)]));
  const links = [...main.matchAll(/<a\b[^>]*>/gi)].map(([t]) => attr(t, 'href')).filter(Boolean);
  const media = [...new Set([...html.matchAll(/\/wp-content\/uploads\/([^"'\s)?,&]+)/g)].map(([, f]) => f.replace(/-\d+x\d+(?=\.\w+$)/, '').replace(/-scaled(?=\.\w+$)/, '')))];
  const mainText = text(main);
  pages[path] = {
    path, status: 200, kind, wp_id: wpId, lang: path.startsWith('/en/') || path === '/en/' ? 'en' : 'ro',
    title: decode(head.match(/<title>([^<]*)/)?.[1] ?? ''),
    description: decode(head.match(/<meta name="description" content="([^"]*)"/)?.[1] ?? ''),
    canonical: pathOf(head.match(/<link rel="canonical" href="([^"]+)"/)?.[1] ?? ''),
    alternates,
    h1: [...main.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(([, h]) => text(h)),
    outline: [...main.matchAll(/<h([2-4])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map(([, l, h]) => `${'  '.repeat(l - 2)}${text(h)}`).filter(s => s.trim()),
    sections: [...main.matchAll(/<section\b([^>]*)>/gi)].map(([, a]) => attr(a, 'id') ?? '(fără id)'),
    // Comutatorul de limbă trimite spre traducerea paginii curente, deci comparăm doar linkurile cu etichetă
    header_hash: sha1(JSON.stringify(navLinks(header).filter(l => l.label))),
    footer_hash: sha1(JSON.stringify(navLinks(footer).filter(l => l.label))),
    words: mainText.split(/\s+/).filter(Boolean).length,
    links: [...new Set(links)], media,
    forms: [...main.matchAll(/<form\b[^>]*id="([^"]+)"[\s\S]*?<\/form>/gi)].map(([f, id]) => ({
      id, hash: sha1(f.replace(/form-field-\w+/g, '')),
      fields: [...f.matchAll(/<(input|select|textarea)\b[^>]*>/gi)].map(([t, tag]) => ({tag, name: attr(t, 'name'), type: attr(t, 'type')})).filter(x => x.name && x.type !== 'hidden'),
      options: Object.fromEntries([...f.matchAll(/<select\b[^>]*name="([^"]+)"[^>]*>([\s\S]*?)<\/select>/gi)].map(([, n, o]) => [n, [...o.matchAll(/<option[^>]*>([^<]*)/g)].map(([, v]) => decode(v).trim()).filter(Boolean)]))
    })),
    _main: main, _text: mainText, _header: header, _footer: footer
  };
}
const live = Object.values(pages).filter(p => p.status === 200);
const publicPages = live.filter(p => p.kind !== 'template');

// ---------- 2. Traducerile (perechi prin hreflang) ----------
const translations = {pairs: [], ro_only: [], en_only: [], asymmetric: []};
for (const p of publicPages) {
  const other = p.lang === 'ro' ? p.alternates.en : p.alternates.ro;
  if (!other) { translations[`${p.lang}_only`].push(p.path); continue; }
  if (p.lang === 'ro') translations.pairs.push({ro: p.path, en: other, ro_title: p.h1[0] ?? p.title, en_title: pages[other]?.h1?.[0] ?? pages[other]?.title ?? null});
  const back = pages[other]?.alternates?.[p.lang];
  if (back && back !== p.path) translations.asymmetric.push({from: p.path, to: other, back});
}

// Bilingv (§1.10): cifrele nu se traduc, deci o pereche RO↔EN trebuie să aibă aceleași valori.
// Normalizăm separatorii (1.495.000 = 1,495,000) și comparăm mulțimile de numere de cel puțin 2 cifre.
const numbers = s => new Set([...s.matchAll(/\d[\d.,]*\d|\d{2,}/g)].map(([n]) => n.replace(/[.,](?=\d{3}\b)/g, '').replace(',', '.')).filter(n => n.length >= 2));
const bilingual = {value_mismatches: [], unlinked_candidates: [], missing_en: translations.ro_only.filter(p => !p.startsWith('/testimonial/') && !/\/page\/\d+\/$/.test(p)), missing_ro: translations.en_only.filter(p => !/\/page\/\d+\/$/.test(p))};
for (const {ro, en} of translations.pairs) {
  const a = numbers(pages[ro]._text), b = numbers(pages[en]?._text ?? '');
  const onlyRo = [...a].filter(n => !b.has(n)), onlyEn = [...b].filter(n => !a.has(n));
  if (onlyRo.length || onlyEn.length) bilingual.value_mismatches.push({ro, en, only_ro: onlyRo.slice(0, 20), only_en: onlyEn.slice(0, 20)});
}
// Text românesc rămas netradus pe paginile EN (rânduri cu diacritice românești)
bilingual.untranslated_on_en = publicPages.filter(p => p.lang === 'en').map(p => ({path: p.path, lines: [...new Set(p._text.split('\n').filter(l => /[ăâîșțĂÂÎȘȚ]/.test(l) && !/Fabrica de Glucoz|Ghiță|Văcărescu|Aviației/.test(l)))]}))
  .filter(x => x.lines.length).map(x => ({...x, count: x.lines.length, lines: x.lines.slice(0, 6).map(l => l.slice(0, 140))}));

// Perechi probabile fără hreflang: aceeași secțiune Bricks pe o pagină RO și pe una EN
for (const ro of bilingual.missing_en) for (const en of bilingual.missing_ro) {
  const shared = pages[ro].sections.filter(s => s !== '(fără id)' && pages[en].sections.includes(s));
  if (shared.length) bilingual.unlinked_candidates.push({ro, en, shared_sections: shared.length});
}

// ---------- 3. Componentele comune: antet, subsol, meniuri ----------
const variants = (key, src) => {
  const out = {};
  for (const p of live) { const v = out[p[key]] ??= {pages: 0, langs: new Set(), example: p.path, links: navLinks(p[src])}; v.pages++; v.langs.add(p.lang); }
  return Object.entries(out).map(([hash, v]) => ({hash, ...v, langs: [...v.langs]})).sort((a, b) => b.pages - a.pages);
};
const layout = {header: variants('header_hash', '_header'), footer: variants('footer_hash', '_footer')};

// ---------- 4. Linkurile interne, cu stare (§1.8) ----------
const mediaByFile = new Map(wpMedia.map(m => [decodeURIComponent(new URL(m.source_url).pathname.replace('/wp-content/uploads/', '')), m]));
// WordPress păstrează originalele mari ca „-scaled”, iar variantele redimensionate pornesc de la numele fără sufix
const inLibrary = f => mediaByFile.has(f) || mediaByFile.has(f.replace(/(\.\w+)$/, '-scaled$1'));
const linkReport = {summary: {}, broken: [], redirects: [], external_hosts: {}, special: {}};
for (const p of publicPages) for (const href of p.links) {
  if (/^(mailto|tel|https?:\/\/(wa\.me|api\.whatsapp))/i.test(href)) { inc(linkReport.special, href.replace(/\?.*/, '')); continue; }
  if (href.startsWith('#')) continue;
  const path = pathOf(href);
  if (!path) { try { inc(linkReport.external_hosts, new URL(href).host); } catch {} continue; }
  let state;
  if (path.startsWith('/wp-content/uploads/')) state = inLibrary(decodeURIComponent(path.slice(20)).replace(/-\d+x\d+(?=\.\w+$)/, '')) ? 'ok' : 'fișier lipsă';
  else { const t = pages[path]; state = !t ? 'nedescărcat' : t.status === 200 ? 'ok' : t.redirect ? 'redirecționează' : 'rupt'; }
  inc(linkReport.summary, state);
  if (state === 'redirecționează') linkReport.redirects.push({on: p.path, href, to: pages[path].redirect});
  else if (state !== 'ok') linkReport.broken.push({on: p.path, href, state});
}

// ---------- 5. Media: utilizare, alt, dubluri (amprenta din snapshot) ----------
const usage = new Map();
for (const p of live) for (const f of p.media) { const s = usage.get(f) ?? new Set(); s.add(p.path); usage.set(f, s); }
const bySha = {};
const mediaReport = wpMedia.map(m => {
  const file = decodeURIComponent(new URL(m.source_url).pathname.replace('/wp-content/uploads/', ''));
  const base = file.replace(/-scaled(?=\.\w+$)/, '');
  const snap = manifest.media?.[m.id];
  if (snap?.sha1) (bySha[snap.sha1] ??= []).push(m.id);
  const usedOn = [...(usage.get(base) ?? usage.get(file) ?? [])];
  return {id: m.id, file, mime: m.mime_type, alt: m.alt_text || null, title: decode(m.title.rendered), attached_to: m.post || null,
    bytes: snap?.bytes ?? m.media_details?.filesize ?? null, used_on: usedOn.filter(p => !pages[p]?.path.includes('/template/')), used_in_templates: usedOn.some(p => p.includes('/template/'))};
});
const mediaSummary = {
  in_api: wpMedia.length, api_total_header: 591, note: '15 elemente apar în X-WP-Total, dar nu sunt listate public (probabil atașate la conținut privat)',
  used: mediaReport.filter(m => m.used_on.length || m.used_in_templates).length,
  unused: mediaReport.filter(m => !m.used_on.length && !m.used_in_templates).length,
  images_without_alt: mediaReport.filter(m => m.mime.startsWith('image/') && !m.alt && (m.used_on.length || m.used_in_templates)).length,
  identical_files: Object.values(bySha).filter(ids => ids.length > 1),
  total_mb: Math.round(mediaReport.reduce((a, m) => a + (m.bytes ?? 0), 0) / 1e6),
  referenced_but_not_in_library: [...usage.keys()].filter(f => !inLibrary(f) && /\.(jpe?g|png|webp|gif|svg|mp4|pdf)$/i.test(f)).slice(0, 100)
};

// ---------- 6. Valorile scrise de mână (candidați pentru jetoane, §1.6 a) ----------
const VALUE_RX = {
  telefon: /(?:\+40|0040|\b0)[\s.\-]?7\d{2}[\s.\-]?\d{3}[\s.\-]?\d{3}\b/g,
  email: /[\w.+-]+@[\w-]+\.[\w.]+/g,
  adresă: /Str(?:\.|ada)\s+[A-ZĂÂÎȘȚ][\wăâîșțĂÂÎȘȚ.\s-]+?\d+[^\n,]*(?:,\s*[^\n,]+){0,2}/g,
  preț_eur: /\d{1,3}(?:[.\s]\d{3})+\s*(?:€|EUR|euro)(?:\s*\+\s*TVA)?/gi,
  cost_ron_mp: /\d+(?:[.,]\d+)?\s*(?:RON|lei)\s*\/\s*m(?:p|²|2)\b/gi,
  suprafață_mp: /\d{1,3}(?:[.,]\d{3})*(?:[.,]\d+)?\s*(?:mp|m²|m2|sqm|sq\.?\s?m)\b/gi,
  premii_număr: /\b(?:cinci|5|five)\s+(?:competiții|international competitions|competitions)/gi
};
const values = {};
for (const p of publicPages) for (const [k, rx] of Object.entries(VALUE_RX)) for (const [v] of p._text.matchAll(rx)) {
  const norm = k === 'telefon' ? v.replace(/\D/g, '').replace(/^(0040|40)?0?/, '0') : v.replace(/\s+/g, ' ').trim();
  const e = (values[k] ??= {})[norm] ??= {variants: {}, pages: new Set()};
  inc(e.variants, v.trim()); e.pages.add(p.path);
}
// Telefoanele și emailurile din linkuri (tel:, mailto:), inclusiv din antet și subsol
for (const p of live) for (const [, href] of (p._header + p._main + p._footer).matchAll(/href="((?:tel|mailto):[^"]+)"/g)) {
  const k = href.startsWith('tel') ? 'telefon' : 'email';
  const norm = k === 'telefon' ? href.slice(4).replace(/\D/g, '').replace(/^(0040|40)?0?/, '0') : decode(href.slice(7)).replace(/\?.*/, '');
  const e = (values[k] ??= {})[norm] ??= {variants: {}, pages: new Set()};
  inc(e.variants, href); e.pages.add(p.path);
}
for (const k in values) values[k] = Object.entries(values[k]).map(([value, e]) => ({value, pages: e.pages.size, variants: e.variants, example: [...e.pages].slice(0, 5)})).sort((a, b) => b.pages - a.pages);

// ---------- 7. Tipurile de apartamente: fișa tehnică ----------
const SPEC_LABELS = ['Suprafață', 'Etaj', 'Nr. băi', 'Terasă', 'Balcon', 'Preț', 'Grădină', 'Piscină', 'Nr. camere', 'Surface', 'Floor', 'Bathrooms', 'No. of bathrooms', 'Terrace', 'Balcony', 'Price', 'Garden', 'Pool', 'Area', 'Rooms'];
const apartments = publicPages.filter(p => p.kind === 'page' && /apartament|bedroom|duplex|spatii-comerciale|commercial-spaces/.test(p.path)).map(p => {
  const lines = p._text.split('\n').map(s => s.trim()).filter(Boolean);
  const spec = {};
  lines.forEach((l, i) => { if (SPEC_LABELS.includes(l) && lines[i + 1] && !SPEC_LABELS.includes(lines[i + 1])) spec[l] = lines[i + 1]; });
  return {path: p.path, lang: p.lang, h1: p.h1[0], pair: p.alternates[p.lang === 'ro' ? 'en' : 'ro'] ?? null, spec, outline: p.outline};
});

// ---------- 8. Numele care pot deveni entități (mențiuni, cu granițe de cuvânt, §1.6 b) ----------
const CANDIDATES = {
  'afacere-comunitate': ['Fabriq', 'MOB Ministry of Beauty', 'Ministry of Beauty', 'Froo', 'Florit', 'Amcor', 'AMCOR Complete Dentistry', 'Aura Pavel', 'hot pilates'],
  premiu: ['German Design Awards', 'Iconic Awards', 'Built Design Awards', 'SHARE Architecture Awards', 'Saint-Gobain Trophy', 'Trofeul Saint-Gobain'],
  'furnizor-tehnologie': ['Saint-Gobain', 'ISO CHEMIE', 'INCERC', 'Barrisol', 'Barisol', 'Schüco', 'Daikin', 'Velux'],
  persoană: ['Bogdan Ghiță', 'Bogdan Ghita'],
  loc: ['Lacul Tei', 'Floreasca', 'Pipera', 'Fabrica de Glucoză', 'Fabrica de Glucoza', 'Muzeul Aviației', 'Anton Holban', 'Sector 2', 'Sectorul 2', 'Barbu Văcărescu']
};
const mentions = {};
for (const [cat, names] of Object.entries(CANDIDATES)) for (const name of names) {
  const rx = new RegExp(`(?<![\\p{L}\\p{N}])${fold(name).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'giu');
  const hits = publicPages.map(p => ({path: p.path, n: (fold(p._text).match(rx) ?? []).length})).filter(h => h.n);
  if (hits.length) mentions[name] = {category: cat, pages: hits.length, total: hits.reduce((a, h) => a + h.n, 0), on: hits.map(h => h.path)};
}

// ---------- 9. Testimonialele ----------
const testimonialCards = [];
for (const p of publicPages.filter(p => /^\/(en\/)?testimoni/.test(p.path) && p.kind === 'page')) {
  const parts = p._main.split(/<h[2-4]\b[^>]*>/i).slice(1);
  for (const part of parts) {
    const name = text(part.slice(0, part.search(/<\/h[2-4]>/i))).trim();
    const body = text(part.slice(part.search(/<\/h[2-4]>/i))).trim();
    if (name && body && !/^testimonial/i.test(name)) testimonialCards.push({on: p.path, lang: p.lang, name, text: body.slice(0, 2000), chars: body.length});
  }
}
const testimonials = wpTestimonials.map(t => {
  const name = decode(t.title.rendered).trim();
  const cards = testimonialCards.filter(c => fold(c.name) === fold(name));
  return {wp_id: t.id, slug: t.slug, name, date: t.date, featured_media: t.featured_media || null, single_page: `/testimonial/${t.slug}/`, shown_on: cards.map(c => c.on), text: cards[0]?.text ?? null};
});
const orphanCards = testimonialCards.filter(c => !wpTestimonials.some(t => fold(decode(t.title.rendered).trim()) === fold(c.name)));
// Citatele scrise direct în pagini (de exemplu pe /comunitate/), care sunt copii, nu trimiteri
const inlineQuotes = publicPages.flatMap(p => [...p._text.matchAll(/([^\n]{80,})\n(Rezident YACHT KID|YACHT KID resident|Resident)\n/gi)].map(([, q, who]) => ({on: p.path, who, quote: q.slice(0, 160)})));

// ---------- 10. Articolele ----------
const catName = Object.fromEntries(wpCategories.map(c => [c.id, {slug: c.slug, name: decode(c.name)}]));
const posts = wpPosts.map(x => {
  const path = pathOf(x.link);
  const p = pages[path];
  return {wp_id: x.id, path, lang: p?.lang, date: x.date, modified: x.modified, title: decode(x.title.rendered), author: wpUsers.find(u => u.id === x.author)?.name ?? x.author,
    categories: x.categories.map(c => catName[c]?.slug ?? c), featured_media: x.featured_media || null,
    pair: p?.alternates?.[p?.lang === 'ro' ? 'en' : 'ro'] ?? null, words: text(x.content.rendered).split(/\s+/).length,
    internal_links: [...x.content.rendered.matchAll(/href="([^"]+)"/g)].map(([, h]) => pathOf(h)).filter(h => h && !h.startsWith('/wp-content')),
    images_in_content: (x.content.rendered.match(/<img\b/g) ?? []).length,
    blocks: Object.entries([...x.content.rendered.matchAll(/<(h[1-6]|p|ul|ol|blockquote|figure|table|iframe|div)\b/g)].reduce((a, [, t]) => inc(a, t), {})).map(([t, n]) => `${t}:${n}`).join(' ')};
});

// ---------- 11. Blocuri repetate între pagini (copii în loc de trimiteri, §0.2) ----------
const paraIndex = {};
for (const p of publicPages) for (const para of new Set(p._text.split('\n').filter(s => s.length >= 120))) (paraIndex[sha1(fold(para))] ??= {text: para, pages: new Set()}).pages.add(p.path);
const repeated = Object.values(paraIndex).filter(x => x.pages.size > 1).map(x => ({pages: x.pages.size, text: x.text.slice(0, 200), on: [...x.pages].slice(0, 12)})).sort((a, b) => b.pages - a.pages);
const sectionUse = {};
for (const p of publicPages) for (const s of new Set(p.sections)) if (s !== '(fără id)') (sectionUse[s] ??= []).push(p.path);
const sharedSections = Object.entries(sectionUse).filter(([, ps]) => ps.length > 1).map(([id, ps]) => ({section: id, pages: ps.length, example: ps.slice(0, 6)})).sort((a, b) => b.pages - a.pages);

// ---------- 12. Formularele ----------
const forms = {};
for (const p of publicPages) for (const f of p.forms) { const e = forms[f.hash] ??= {fields: f.fields.map(x => x.name), options: f.options, pages: []}; e.pages.push(p.path); }

// ---------- Scriere ----------
await mkdir(OUT, {recursive: true});
const strip = ({_main, _text, _header, _footer, header_hash, footer_hash, links, media, forms, ...rest}) => ({...rest, layout: `${header_hash}/${footer_hash}`, links: links?.length, media: media?.length, forms: forms?.map(f => f.id)});
await write('pages', Object.values(pages).map(p => p.status === 200 ? strip(p) : p));
await write('translations', translations);
await write('bilingual', bilingual);
await write('layout', layout);
await write('links', linkReport);
await write('media', {summary: mediaSummary, items: mediaReport});
await write('values', values);
await write('apartments', apartments);
await write('mentions', mentions);
await write('testimonials', {count_api: testimonials.length, cards_on_pages: testimonialCards.length, orphan_cards: orphanCards, inline_quotes: inlineQuotes, items: testimonials});
await write('posts', posts);
await write('repeated', {paragraphs: repeated, shared_sections: sharedSections});
await write('forms', Object.values(forms));

const kinds = live.reduce((a, p) => inc(a, `${p.kind}:${p.lang}`), {});
const summary = {
  generated_at: new Date().toISOString(), snapshot: manifest.finished_at,
  pages: {total: Object.keys(pages).length, live: live.length, by_kind: kinds},
  bilingual: {value_mismatches: bilingual.value_mismatches.length, unlinked_candidates: bilingual.unlinked_candidates.length, missing_en: bilingual.missing_en.length, missing_ro: bilingual.missing_ro.length},
  translations: {pairs: translations.pairs.length, ro_only: translations.ro_only.length, en_only: translations.en_only.length, asymmetric: translations.asymmetric.length},
  layout: {header_variants: layout.header.length, footer_variants: layout.footer.length},
  links: linkReport.summary,
  media: {...mediaSummary, identical_files: mediaSummary.identical_files.length, referenced_but_not_in_library: mediaSummary.referenced_but_not_in_library.length},
  values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.map(x => `${x.value} (${x.pages} pag.)`).slice(0, 8)])),
  mentions: Object.fromEntries(Object.entries(mentions).map(([k, v]) => [k, `${v.category}: ${v.pages} pag.`])),
  testimonials: {api: testimonials.length, shown: testimonials.filter(t => t.shown_on.length).length, orphan_cards: orphanCards.length, inline_quotes: inlineQuotes.length},
  posts: {total: posts.length, by_category: posts.flatMap(p => p.categories.map(c => `${c}:${p.lang}`)).reduce((a, c) => inc(a, c), {})},
  repeated_paragraphs: repeated.length, shared_sections: sharedSections.length, forms: Object.keys(forms).length
};
await write('summary', summary);
console.log(JSON.stringify(summary, null, 1));
