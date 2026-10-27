// Etapa 3 din §1.3: importul din snapshot în Brain. Reguli:
// - ID-uri deterministe din chei naturale (`wp:page:42`, `media:<sha1>`, `afacere:fabriq`), ținute în import_keys;
//   un import repetat dă aceleași ID-uri și actualizează, nu dublează;
// - o singură tranzacție: totul sau nimic;
// - fiecare câmp importat își scrie sursa și certitudinea (provenance);
// - perechile RO ↔ EN devin aceeași entitate, cu două traduceri (§1.10);
// - verificarea dus-întors pe textele bogate; relațiile deduse intră ca `inferred`, niciodată ca reale (§1.5);
// - refuză să ruleze peste editări făcute de oameni, fără `overwriteEdits` (§1.3, testul 16).
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {entity, field, hasStatus, hasTranslations, relation, relTable} from '../registry/derive.mjs';
import {columnOf} from '../core/schema.mjs';
import {trFingerprint} from '../core/fingerprint.mjs';
import {decode, text, attr, mainOf, metaOf, byHeading, paragraphs, images, uploadKey, sanitize, roundTrip, fold, squash} from './html.mjs';
import {PARTNERS, AWARDS, BUSINESSES, FACTS, LABELS, PAGE_TEMPLATES, FORM_FIELD_RENAMES, FORM_FIELD_ALIASES} from './curated.mjs';

const ORIGIN = 'https://yachtkid.ro';
const IMPORT_USER = 'Import';
const JSON_TYPES = ['multiselect', 'list', 'links', 'texts', 'table'];
const sha1 = s => createHash('sha1').update(s).digest('hex');
const pathOf = href => { try { const u = new URL(decode(href), ORIGIN); return u.origin === ORIGIN ? u.pathname : null; } catch { return null; } };
const withSlash = p => (p && !p.endsWith('/') && !/\.\w+$/.test(p) ? `${p}/` : p);
const slugOf = path => path.replace(/^\/(en\/)?/, '').replace(/\/$/, '').split('/').pop() ?? '';

export class ImportRefused extends Error {}

// ───────────── Scrierea, cu proveniență și chei naturale ─────────────
class Writer {
  constructor(tx, now) { this.tx = tx; this.now = now; this.sources = new Map(); this.counts = {}; this.warnings = []; this.paths = new Map(); }
  run(sql, args = []) { return this.tx.execute({sql, args}); }
  async get(sql, args = []) { return (await this.run(sql, args)).rows[0] ?? null; }
  warn(msg) { this.warnings.push(msg); }

  async idFor(key, natural) { return (await this.get('SELECT entity_id FROM import_keys WHERE entity = ? AND natural_key = ?', [key, natural]))?.entity_id ?? null; }

  enc(key, k, v) {
    const f = field(key, k);
    if (!f) throw new Error(`${key}.${k} nu e în registru`);
    if (v == null) return null;
    if (JSON_TYPES.includes(f.type)) return JSON.stringify(v);
    if (f.type === 'boolean') return v ? 1 : 0;
    if (['int', 'money'].includes(f.type)) return Math.round(v);
    return v;
  }

  // Salvează o entitate: rândul de bază + câte o traducere pe limbă. Întoarce ID-ul.
  async save(key, natural, {base = {}, tr = {}, status = 'published', published_at = null, aliases = []}) {
    const e = entity(key);
    let id = await this.idFor(key, natural);
    const cols = Object.fromEntries(Object.entries(base).filter(([, v]) => v !== undefined).map(([k, v]) => [columnOf(field(key, k)), this.enc(key, k, v)]));
    if (hasStatus(key)) Object.assign(cols, {status, published_at});
    const names = Object.keys(cols);
    if (id) {
      if (names.length) await this.run(`UPDATE "${e.table}" SET ${names.map(n => `"${n}" = ?`).join(', ')}, updated_at = ?, updated_by = ? WHERE id = ?`, [...Object.values(cols), this.now, IMPORT_USER, id]);
    } else {
      const all = [...names, 'created_at', 'updated_at', 'created_by', 'updated_by'];
      const r = await this.run(`INSERT INTO "${e.table}" (${all.map(n => `"${n}"`).join(', ')}) VALUES (${all.map(() => '?').join(', ')})`,
        [...Object.values(cols), this.now, this.now, IMPORT_USER, IMPORT_USER]);
      id = Number(r.lastInsertRowid);
      this.counts[key] = (this.counts[key] ?? 0) + 1;
    }
    for (const n of [natural, ...aliases]) await this.run('INSERT OR IGNORE INTO import_keys (entity, natural_key, entity_id, at) VALUES (?, ?, ?, ?)', [key, n, id, this.now]);
    if (hasTranslations(key)) {
      // Amprenta textului RO din momentul traducerii: când RO se schimbă, traducerea apare „învechită” (§1.10)
      const roCols = tr.ro && Object.fromEntries(Object.entries(tr.ro).map(([k, v]) => [columnOf(field(key, k)), this.enc(key, k, v)]));
      const fp = trFingerprint(key, roCols);
      for (const [lang, t] of Object.entries(tr)) {
        if (!t) continue;
        const tc = Object.fromEntries(Object.entries(t).filter(([, v]) => v !== undefined).map(([k, v]) => [columnOf(field(key, k)), this.enc(key, k, v)]));
        Object.assign(tc, {source_fp: lang === 'ro' ? null : fp, translated_at: lang === 'ro' ? null : this.now, translated_by: lang === 'ro' ? null : 'site vechi', updated_at: this.now});
        const n = Object.keys(tc);
        await this.run(`INSERT INTO "${e.table}_translations" (entity_id, lang, ${n.map(c => `"${c}"`).join(', ')}) VALUES (?, ?, ${n.map(() => '?').join(', ')})
          ON CONFLICT (entity_id, lang) DO UPDATE SET ${n.map(c => `"${c}" = excluded."${c}"`).join(', ')}`, [id, lang, ...Object.values(tc)]);
      }
    }
    await this.run('INSERT INTO audit_log (at, user_name, action, entity, entity_id, label, changes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [this.now, IMPORT_USER, 'import', key, id, natural, JSON.stringify({base: Object.keys(base), tr: Object.keys(tr)})]);
    return id;
  }

  async source(url, {kind = 'site', title = null, file = null, lang = null, method = 'crawl'} = {}) {
    if (this.sources.has(url)) return this.sources.get(url);
    await this.run(`INSERT INTO sources (kind, url, title, fetched_at, method, snapshot_file, status, lang, created_at) VALUES (?, ?, ?, ?, ?, ?, 200, ?, ?)
      ON CONFLICT (url) DO UPDATE SET title = excluded.title, snapshot_file = excluded.snapshot_file`, [kind, url, title, this.fetchedAt ?? this.now, method, file, lang, this.now]);
    const id = (await this.get('SELECT id FROM sources WHERE url = ?', [url])).id;
    this.sources.set(url, id);
    return id;
  }

  async prov(key, id, fields, {lang = '', source, excerpt = null, method = 'html', certainty = 'confirmed', confidence = null}) {
    for (const f of [].concat(fields))
      await this.run(`INSERT OR REPLACE INTO provenance (entity, entity_id, field, lang, source_id, excerpt, method, certainty, confidence, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [key, id, f, lang, source, excerpt?.slice(0, 500) ?? null, method, certainty, confidence, this.now]);
  }

  // O legătură multiplă. Decizia omului nu se suprascrie: o legătură existentă rămâne cum e, una respinsă nu revine (§1.5)
  async link(relId, src, dst, {status = 'inferred', confidence = null, source = null, note = null, position = 0, attrs = null} = {}) {
    if (!src || !dst) return false;
    const r = relation(relId);
    if (await this.get('SELECT 1 FROM link_dismissals WHERE relation = ? AND src_id = ? AND dst_id = ?', [relId, src, dst])) return false;
    const res = await this.run(`INSERT OR IGNORE INTO "${relTable(r.source, r.field)}" (src_id, dst_id, position, status, confidence, source_id, note, attrs, created_at, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [src, dst, position, status, confidence, source, note, attrs && JSON.stringify(attrs), this.now, IMPORT_USER]);
    if (res.rowsAffected) this.counts[`rel:${relId}`] = (this.counts[`rel:${relId}`] ?? 0) + 1;
    return !!res.rowsAffected;
  }

  registerPath(path, key, id) { if (path) this.paths.set(path, {key, id}); }
}

// ───────────── Snapshot ─────────────
async function loadSnapshot(dir) {
  const json = async f => JSON.parse(await readFile(join(dir, f), 'utf8'));
  const manifest = await json('snapshot/manifest.json');
  const api = {};
  for (const t of ['pages', 'posts', 'testimonial', 'media', 'categories', 'users']) api[t] = await json(`snapshot/api/${t}.json`).catch(() => []);
  const analysis = {};
  for (const r of ['pages', 'media', 'layout', 'bilingual', 'repeated', 'testimonials']) analysis[r] = await json(`analysis/${r}.json`);
  const htmlCache = new Map();
  const html = async path => {
    if (!htmlCache.has(path)) {
      const file = manifest.pages[path]?.file;
      htmlCache.set(path, file ? await readFile(join(dir, 'snapshot', file), 'utf8') : null);
    }
    return htmlCache.get(path);
  };
  const page = Object.fromEntries(analysis.pages.map(p => [p.path, p]));
  return {dir, manifest, api, analysis, html, page};
}

// Perechile RO ↔ EN: hreflang, plus perechile găsite la analiză fără hreflang (confidențialitate, cookies)
function pairs(S, filter) {
  const extra = new Map(S.analysis.bilingual.unlinked_candidates.flatMap(c => [[c.ro, c.en], [c.en, c.ro]]));
  const out = [], seen = new Set();
  for (const p of S.analysis.pages.filter(p => p.status === 200 && filter(p)).sort((a, b) => (a.lang === b.lang ? (a.wp_id ?? 0) - (b.wp_id ?? 0) : a.lang === 'ro' ? -1 : 1))) {
    if (seen.has(p.path)) continue;
    const otherPath = p.alternates?.[p.lang === 'ro' ? 'en' : 'ro'] ?? extra.get(p.path);
    const other = otherPath && S.page[otherPath]?.status === 200 ? S.page[otherPath] : null;
    const ro = p.lang === 'ro' ? p : other, en = p.lang === 'en' ? p : other;
    [ro, en].forEach(x => x && seen.add(x.path));
    out.push({ro, en, natural: `wp:${(ro ?? en).kind}:${(ro ?? en).wp_id}`});
  }
  return out;
}

const titleOfPage = p => p.h1?.[0] || p.title.replace(/\s*[-–|]\s*YachtKID\s*$/i, '');

// ───────────── Importul ─────────────
export async function runImport(client, {dir, overwriteEdits = false, now = new Date().toISOString()} = {}) {
  const human = (await client.execute(`SELECT count(*) n FROM audit_log WHERE user_name != '${IMPORT_USER}'`)).rows[0].n;
  if (human > 0 && !overwriteEdits)
    throw new ImportRefused(`Baza are ${human} modificări făcute de oameni. Importul nu le suprascrie fără --overwrite-edits.`);

  const S = await loadSnapshot(dir);
  const tx = await client.transaction('write');
  const W = new Writer(tx, now);
  W.fetchedAt = S.manifest.finished_at;
  const report = {roundtrip: {checked: 0, failed: []}, unresolved_links: [], sanitize_issues: []};
  try {
    const pageSource = async (path, lang) => path && W.source(ORIGIN + path, {file: S.manifest.pages[path]?.file, lang, title: S.page[path]?.title});
    const apiSource = (t, id) => W.source(`${ORIGIN}/wp-json/wp/v2/${t}/${id}`, {kind: 'endpoint', file: `api/${t}.json`, method: 'wp-json'});

    // 1. Media: doar fișierele folosite (A10); fișierele identice devin o singură înregistrare (§3.9)
    const mediaUsed = new Map(S.analysis.media.items.filter(m => m.used_on.length || m.used_in_templates).map(m => [m.id, m]));
    const mediaByKey = new Map(), bySha = new Map();
    for (const m of [...S.api.media].sort((a, b) => a.id - b.id)) {
      if (!mediaUsed.has(m.id)) continue;
      const snap = S.manifest.media?.[m.id];
      const file = decodeURIComponent(new URL(m.source_url).pathname.replace('/wp-content/uploads/', ''));
      const sha = snap?.sha1 ?? `lipsa:${m.id}`;
      let id;
      if (bySha.has(sha)) {
        id = bySha.get(sha);
        await W.run('INSERT OR IGNORE INTO import_keys (entity, natural_key, entity_id, at) VALUES (?, ?, ?, ?)', ['media', `wp:media:${m.id}`, id, now]);
      } else {
        id = await W.save('media', `media:${sha}`, {
          base: {filename: file, sha1: sha, mime: m.mime_type, width: m.media_details?.width, height: m.media_details?.height,
            bytes: snap?.bytes ?? m.media_details?.filesize, legacy_url: m.source_url, legacy_id: m.id},
          tr: {ro: {alt: m.alt_text || null, caption: text(m.caption?.rendered) || null}},
          aliases: [`wp:media:${m.id}`]
        });
        bySha.set(sha, id);
        const src = await W.source(m.source_url, {file: snap?.file ? `snapshot/${snap.file}` : null, method: 'download'});
        await W.prov('media', id, ['filename', 'sha1', 'mime', 'bytes'], {source: src, certainty: snap?.sha1 ? 'confirmed' : 'unrecoverable', method: 'download'});
        if (m.alt_text) await W.prov('media', id, 'alt', {lang: 'ro', source: await apiSource('media', m.id), excerpt: m.alt_text, method: 'wp-json'});
      }
      for (const k of [file, file.replace(/-scaled(?=\.\w+$)/, '')]) mediaByKey.set(k, id);
    }
    const mediaId = url => { const k = uploadKey(url); return (k && (mediaByKey.get(k) ?? mediaByKey.get(k.replace(/(\.\w+)$/, '-scaled$1')))) ?? null; };
    const missingAlt = (await W.get(`SELECT count(*) n FROM media m LEFT JOIN media_translations t ON t.entity_id = m.id AND t.lang = 'ro' WHERE m.mime LIKE 'image/%' AND t.alt IS NULL`)).n;
    if (missingAlt) W.warn(`${missingAlt} imagini folosite nu au text alternativ în RO; niciuna nu are în EN.`);

    // Textul bogat: linkurile interne devin trimiteri (rezolvate la final, când toate adresele au ID), imaginile devin data-media
    const clean = (html, where) => {
      const r = sanitize(html, {
        link: href => {
          if (/^(mailto|tel):/i.test(href)) return {href};
          const p = pathOf(href);
          if (!p) return /^https?:/i.test(href) ? {href} : null;
          if (p.startsWith('/wp-content/uploads/')) { const id = mediaId(p); return id ? {media: id} : {href: p}; }
          return {ref: `@path:${withSlash(p)}`};
        },
        image: src => mediaId(src)
      });
      for (const i of r.issues) report.sanitize_issues.push({where, ...i});
      return r.html;
    };

    // 2. Date firmă (singleton)
    const contactHtml = await S.html('/contact/'), termsHtml = await S.html('/termeni-si-conditii/');
    const terms = text(mainOf(termsHtml)), contact = text(mainOf(contactHtml)), contactEn = text(mainOf(await S.html('/en/contact-us/')));
    const grab = (t, rx) => t.match(rx)?.[1]?.trim() ?? null;
    const addr = contact.match(/(Str\. [^,]+?\d+), (București) (\d{6})/);
    const footerLinks = S.analysis.layout.footer.find(v => v.langs.includes('ro'))?.links ?? [];
    const social = footerLinks.filter(l => /facebook|instagram|linkedin|youtube|tiktok/i.test(l.href ?? '')).map(l => ({label: l.label, url: l.href}));
    const phone = grab(contact, /Telefon \+?(\+?40[\d ]+\d)/);
    const firmaId = await W.save('firma', 'singleton', {
      base: {legal_name: grab(terms, /Denumire legală: (.+?S\.R\.L\.)/), brand: 'YACHT KID', cui: grab(terms, /CUI: (RO\d+)/),
        reg_com: grab(terms, /Registrul Comerțului: (J\w+)/), registered_office: grab(terms, /Sediu social: (.+?cod poștal \d{6})/),
        street: addr?.[1], city: addr?.[2], postal_code: addr?.[3], phone: phone ? `+${phone.replace(/\D/g, '')}` : null,
        email: grab(contact, /([\w.+-]+@yachtkid\.ro)/), social},
      tr: {ro: {schedule: grab(contact, /Program (Luni – Vineri: [\d:]+ – [\d:]+)/)}, en: {schedule: grab(contactEn, /(Monday – Friday: [\d:]+ – [\d:]+)/)}}
    });
    const termsSrc = await pageSource('/termeni-si-conditii/', 'ro'), contactSrc = await pageSource('/contact/', 'ro');
    await W.prov('firma', firmaId, ['legal_name', 'cui', 'reg_com', 'registered_office'], {source: termsSrc, excerpt: terms.match(/Denumire legală.{0,300}/)?.[0]});
    await W.prov('firma', firmaId, ['street', 'city', 'postal_code', 'phone', 'email'], {source: contactSrc, excerpt: addr?.[0]});
    await W.prov('firma', firmaId, 'schedule', {lang: 'ro', source: contactSrc, excerpt: 'Luni – Vineri'});
    await W.prov('firma', firmaId, 'social', {source: await pageSource('/', 'ro'), method: 'html-footer'});
    W.warn('Adresa din EN („Anton Holban Stree, no. 6, Bucharest”, fără cod poștal) nu s-a importat: adresa vine o singură dată din Date firmă, prin {adresa}.');
    if (!grab(contactEn, /(Monday – Friday)/)) W.warn('Programul nu există pe /en/contact-us/: Date firmă nu are program în EN (traducere lipsă).');

    // 3. Cifre-cheie: valoarea trebuie găsită în text, altfel nu se importă
    for (const f of FACTS) {
      const t = text(mainOf(await S.html(f.find.page)));
      const m = t.match(f.find.rx);
      if (!m) { W.warn(`Cifra {${f.token}} nu s-a găsit pe ${f.find.page}; nu s-a importat.`); continue; }
      const value = Number(m[1].replace(/\./g, '').replace(',', '.'));
      const id = await W.save('cifre', `cifra:${f.token}`, {base: {token: f.token, value, unit: f.unit}, tr: {ro: {label: f.label.ro}, en: {label: f.label.en}}});
      await W.prov('cifre', id, 'value', {source: await pageSource(f.find.page, 'ro'), excerpt: t.slice(Math.max(0, m.index - 60), m.index + 80), method: 'regex'});
      await W.prov('cifre', id, ['token', 'unit', 'label'], {source: await W.source('curated:cifre', {kind: 'manual', method: 'curated'}), method: 'curated', certainty: 'inferred'});
    }

    // 4. Parteneri
    const curatedSrc = await W.source('curated:docs/01-entitati.md', {kind: 'document', method: 'curated', file: 'docs/01-entitati.md'});
    const partnerIds = {};
    for (const p of PARTNERS) {
      const id = await W.save('parteneri', `partener:${fold(p.name)}`, {base: {name: p.name, aliases: p.aliases, roles: p.roles}, tr: {}});
      partnerIds[p.name] = id;
      await W.prov('parteneri', id, ['name', 'roles', 'aliases'], {source: curatedSrc, method: 'curated', certainty: 'inferred'});
    }

    // 5. Categorii (perechi prin hreflang pe paginile de arhivă)
    const catByWp = new Map();
    for (const pr of pairs(S, p => p.kind === 'category' && !/\/page\/\d+\/$/.test(p.path))) {
      const term = l => S.api.categories.find(c => pathOf(c.link) === pr[l]?.path);
      const ro = term('ro'), en = term('en');
      const id = await W.save('categorii', `wp:term:${(ro ?? en).id}`, {
        tr: Object.fromEntries([['ro', ro], ['en', en]].filter(([, c]) => c).map(([l, c]) => [l, {name: decode(c.name), slug: c.slug, description: text(c.description) || null, legacy_id: c.id}]))
      });
      for (const [l, c] of [['ro', ro], ['en', en]]) if (c) { catByWp.set(c.id, id); W.registerPath(pr[l].path, 'categorii', id); await W.prov('categorii', id, ['name', 'slug'], {lang: l, source: await apiSource('categories', c.id), method: 'wp-json'}); }
    }

    // 6. Tipuri de locuințe: fișa tehnică din pagină, RO și EN comparate (cifrele nu se traduc)
    const SPEC = {Suprafață: 'area', Area: 'area', Etaj: 'floor', Floor: 'floor', 'Nr. băi': 'baths', Bathrooms: 'baths', Terasă: 'terrace', Terrace: 'terrace',
      Balcon: 'balcony', Balcony: 'balcony', Preț: 'price', 'Preț de la': 'price', Price: 'price'};
    const repeatedTexts = S.analysis.repeated.paragraphs.map(r => fold(r.text).slice(0, 100));
    const isRepeated = p => repeatedTexts.some(r => fold(p).startsWith(r.slice(0, 80)));
    const readSpec = html => {
      const out = {};
      const parts = byHeading(mainOf(html));
      parts.forEach((s, i) => { const k = SPEC[s.heading]; if (k) out[k] = text(s.html) || parts[i + 1]?.heading; });
      return out;
    };
    const range = s => { const n = (s ?? '').match(/\d+(?:\.\d+)?/g)?.map(Number) ?? []; return [n[0] ?? null, n.length > 1 ? n[n.length - 1] : n[0] ?? null]; };
    const price = s => { const m = (s ?? '').match(/\d{1,3}(?:[.,]\d{3})+/); return m ? Number(m[0].replace(/[.,]/g, '')) : null; };
    const unitIds = {};
    for (const pr of pairs(S, p => p.kind === 'page' && /apartament|bedroom|duplex|spatii-comerciale|commercial-spaces/.test(p.path))) {
      const ro = pr.ro, en = pr.en;
      const [hRo, hEn] = [await S.html(ro.path), en && await S.html(en.path)];
      const [sRo, sEn] = [readSpec(hRo), hEn ? readSpec(hEn) : {}];
      const kind = /duplex/.test(ro.path) ? 'duplex' : /comerciale/.test(ro.path) ? 'comercial' : 'apartament';
      const rooms = +(ro.path.match(/(\d)-camere/)?.[1] ?? 0) || null;
      const base = {kind, rooms, balcony: /^(Da|Yes)/i.test(sRo.balcony ?? sEn.balcony ?? '') ? 1 : 0, vat_excluded: 1};
      for (const k of ['area', 'floor', 'baths', 'terrace']) [base[`${k}_min`], base[`${k}_max`]] = range(sRo[k] ?? sEn[k]);
      const pRo = price(sRo.price), pEn = price(sEn.price);
      base.price_from = pRo ?? pEn;
      // Pozele care apar doar pe paginile acestui tip formează galeria
      const own = new Set([ro.path, en?.path]);
      const gallery = [...new Set(images(mainOf(hRo)).map(i => mediaId(i.src)).filter(Boolean))]
        .filter(id => { const m = S.analysis.media.items.find(x => mediaId(`/wp-content/uploads/${x.file}`) === id); return m && m.used_on.every(p => own.has(p)); });
      base.hero_image = mediaId(metaOf(hRo, 'og:image'));
      const trOf = (p, h) => {
        const paras = paragraphs(mainOf(h)).filter(x => x.length >= 80 && !isRepeated(x));
        return {name: titleOfPage(p), slug: slugOf(p.path), intro: paras[0] ?? null,
          description: paras.slice(1).map(x => `<p>${x.replace(/</g, '&lt;')}</p>`).join('\n') || null,
          seo_title: p.title, seo_description: p.description || null, legacy_id: p.wp_id};
      };
      const id = await W.save('locuinte', pr.natural, {base, tr: {ro: trOf(ro, hRo), ...(en ? {en: trOf(en, hEn)} : {})}});
      unitIds[kind === 'apartament' ? `ap${rooms}` : kind] = id;
      // Imaginile sunt chiar pe pagina tipului, deci legătura e confirmată, nu dedusă
      for (const [i, m] of gallery.entries()) await W.link('locuinte.gallery', id, m, {status: 'confirmed', position: i, source: await pageSource(ro.path, 'ro'), note: 'imagine de pe pagina tipului'});
      W.registerPath(ro.path, 'locuinte', id); W.registerPath(en?.path, 'locuinte', id);
      const srcRo = await pageSource(ro.path, 'ro'), srcEn = en && await pageSource(en.path, 'en');
      const specFields = ['kind', 'rooms', 'area_min', 'area_max', 'floor_min', 'floor_max', 'baths_min', 'baths_max', 'terrace_min', 'terrace_max', 'balcony'];
      await W.prov('locuinte', id, specFields, {source: srcRo, excerpt: JSON.stringify(sRo)});
      if (srcEn) await W.prov('locuinte', id, specFields, {source: srcEn, excerpt: JSON.stringify(sEn)});
      for (const k of ['area', 'floor', 'baths', 'terrace'])
        if (sEn[k] && JSON.stringify(range(sRo[k])) !== JSON.stringify(range(sEn[k]))) W.warn(`${ro.path}: ${k} diferă între RO (${sRo[k]}) și EN (${sEn[k]}).`);
      // A1: prețul diferit între limbi se păstrează din RO, „unverified”, cu ambele surse
      const conflict = pRo && pEn && pRo !== pEn;
      await W.prov('locuinte', id, 'price_from', {source: srcRo, excerpt: sRo.price, certainty: conflict ? 'unverified' : 'confirmed'});
      if (srcEn && pEn) await W.prov('locuinte', id, 'price_from', {source: srcEn, excerpt: sEn.price, certainty: conflict ? 'unverified' : 'confirmed'});
      if (conflict) W.warn(`${ro.path}: prețul diferă (RO ${pRo} €, EN ${pEn} €). Importat ${pRo} € (A1), certitudine „unverified”.`);
      if (!pRo && pEn) W.warn(`${ro.path}: prețul apare doar în EN (${pEn} €).`);
      for (const [l, p, src] of [['ro', ro, srcRo], ['en', en, srcEn]]) if (p) await W.prov('locuinte', id, ['name', 'slug', 'intro', 'description', 'seo_title', 'seo_description'], {lang: l, source: src});
    }

    // 7. Afaceri: cardurile de pe /spatii-comerciale/ și perechea lor EN, în aceeași ordine
    const cards = async path => {
      const parts = byHeading(mainOf(await S.html(path)));
      const start = parts.findIndex(p => p.level === 2 && /Branduri|Brands/i.test(p.heading));
      const out = [];
      for (let i = start + 1; i < parts.length && parts[i].level > 2; i++) {
        const prev = images(parts[i - 1].html);
        out.push({name: parts[i].heading, tagline: paragraphs(parts[i].html)[0] ?? text(parts[i].html.replace(/<a\b[\s\S]*?<\/a>/g, '')),
          href: attr(parts[i].html.match(/<a\b[^>]*>/)?.[0] ?? '', 'href'), image: prev[prev.length - 1]?.src});
      }
      return out;
    };
    const [cRo, cEn] = [await cards('/spatii-comerciale/'), await cards('/en/commercial-spaces/')];
    if (cRo.length !== cEn.length) W.warn(`Cardurile afacerilor: ${cRo.length} în RO, ${cEn.length} în EN; perechile EN nu s-au importat.`);
    const cardMembers = byHeading(mainOf(await S.html('/community-card-concept/')));
    const partnersAt = cardMembers.findIndex(p => /Parteneri în comunitate/.test(p.heading));
    const memberNames = cardMembers.slice(partnersAt + 1).filter(p => p.level > 2).map(p => p.heading);
    const businessIds = {}, businessByPost = new Map();
    const commercialSrc = await pageSource('/spatii-comerciale/', 'ro'), commercialSrcEn = await pageSource('/en/commercial-spaces/', 'en');
    for (const [i, c] of cRo.entries()) {
      const cur = BUSINESSES[c.name];
      if (!cur) { W.warn(`Afacerea „${c.name}” nu e în lista curată; nu s-a importat.`); continue; }
      const e = cRo.length === cEn.length ? cEn[i] : null;
      const id = await W.save('afaceri', `afacere:${fold(cur.name).replace(/[^a-z0-9]+/g, '-')}`, {
        base: {name: cur.name, aliases: cur.aliases, image: mediaId(c.image), state: 'deschis', card_member: memberNames.includes(c.name) ? 1 : 0},
        tr: {ro: {tagline: c.tagline, service: cur.service.ro}, ...(e ? {en: {tagline: e.tagline, service: cur.service.en}} : {})}
      });
      businessIds[cur.name] = id;
      await W.prov('afaceri', id, ['name', 'image'], {source: commercialSrc, excerpt: c.name});
      await W.prov('afaceri', id, 'tagline', {lang: 'ro', source: commercialSrc, excerpt: c.tagline});
      if (e) await W.prov('afaceri', id, 'tagline', {lang: 'en', source: commercialSrcEn, excerpt: e.tagline});
      await W.prov('afaceri', id, ['aliases', 'service'], {source: curatedSrc, method: 'curated', certainty: 'inferred'});
      // A7, A8: starea nu apare pe site
      await W.prov('afaceri', id, 'state', {source: curatedSrc, method: 'curated', certainty: cur.assume === 'A8' ? 'unverified' : 'inferred'});
      if (c.href) businessByPost.set(withSlash(pathOf(c.href)), id);
    }

    // 8. Premii
    const awardIds = {};
    for (const a of AWARDS) {
      const post = S.api.posts.find(p => p.id === a.post);
      const title = decode(post?.title.rendered ?? '');
      if (!post || !(fold(title).includes(fold(a.titleCheck ?? a.competition)) && (a.titleCheck || title.includes(String(a.year)))))
        W.warn(`Premiul ${a.competition} ${a.year}: articolul ${a.post} nu-l confirmă în titlu („${title}”).`);
      const ext = [...(post?.content.rendered ?? '').matchAll(/href="(https?:\/\/[^"]+)"/g)].map(m => m[1]).find(h => !/yachtkid\.ro|facebook|instagram|linkedin|youtube|antena3|mediafax/.test(h));
      const id = await W.save('premii', `premiu:${fold(a.competition).replace(/[^a-z0-9]+/g, '-')}:${a.year}`, {
        base: {competition: a.competition, year: a.year, result: a.result, url: ext ? decode(ext) : null},
        tr: {ro: {distinction: a.distinction.ro, category_name: a.category?.ro ?? null}, en: {distinction: a.distinction.en, category_name: a.category?.en ?? null}}
      });
      awardIds[a.post] = id;
      const src = await apiSource('posts', a.post);
      await W.prov('premii', id, ['competition', 'year'], {source: src, excerpt: title, method: 'wp-json'});
      await W.prov('premii', id, ['result', 'distinction', 'category_name'], {source: curatedSrc, method: 'curated', certainty: 'inferred'});
      if (ext) await W.prov('premii', id, 'url', {source: src, excerpt: ext, method: 'wp-json', certainty: 'inferred'});
    }

    // 9. Articole: perechi prin hreflang, text curățat cu verificare dus-întors, relații deduse
    const users = new Map(S.api.users.map(u => [u.id, u.name]));
    const postByPath = new Map(S.api.posts.map(p => [pathOf(p.link), p]));
    for (const pr of pairs(S, p => p.kind === 'post')) {
      const [pRo, pEn] = [pr.ro && postByPath.get(pr.ro.path), pr.en && postByPath.get(pr.en.path)];
      const main = pRo ?? pEn;
      const trOf = (p, page) => {
        const content = clean(p.content.rendered, page.path);
        const rt = roundTrip(p.content.rendered, content);
        report.roundtrip.checked++;
        if (!rt.ok) report.roundtrip.failed.push({path: page.path, ...rt});
        return {title: decode(p.title.rendered), slug: decodeURIComponent(p.slug), excerpt: text(p.excerpt.rendered) || null, content,
          seo_title: page.title, seo_description: page.description || null, legacy_id: p.id};
      };
      const cat = catByWp.get(main.categories[0]);
      const id = await W.save('articole', pr.natural, {
        base: {category: cat, author: users.get(main.author) ?? 'YachtKID', image: main.featured_media ? mediaId(S.api.media.find(m => m.id === main.featured_media)?.source_url) : null},
        tr: {...(pRo ? {ro: trOf(pRo, pr.ro)} : {}), ...(pEn ? {en: trOf(pEn, pr.en)} : {})},
        published_at: main.date
      });
      for (const [l, p, page] of [['ro', pRo, pr.ro], ['en', pEn, pr.en]]) if (p) {
        W.registerPath(page.path, 'articole', id);
        await W.prov('articole', id, ['title', 'slug', 'excerpt', 'content'], {lang: l, source: await apiSource('posts', p.id), method: 'wp-json'});
      }
      await W.prov('articole', id, ['category', 'author', 'image'], {source: await apiSource('posts', main.id), method: 'wp-json'});
      // Relațiile deduse: niciodată confirmate la import (§1.5)
      const src = await apiSource('posts', main.id);
      const titleRo = decode((pRo ?? pEn).title.rendered);
      for (const [name, bid] of Object.entries(businessIds)) {
        const cur = Object.values(BUSINESSES).find(b => b.name === name);
        const hit = [name, ...cur.aliases].find(n => new RegExp(`(?<![\\p{L}\\p{N}])${fold(n).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![\\p{L}\\p{N}])`, 'u').test(fold(titleRo)));
        const viaCard = [pr.ro?.path, pr.en?.path].some(p => businessByPost.get(p) === bid);
        if (viaCard || hit) await W.link('articole.businesses', id, bid, {confidence: viaCard ? 0.98 : 0.9, source: viaCard ? commercialSrc : src,
          note: viaCard ? 'cardul afacerii de pe /spatii-comerciale/ trimite la articol' : `numele în titlu: „${titleRo}”`});
      }
      if (awardIds[pRo?.id]) await W.link('articole.awards', id, awardIds[pRo.id], {confidence: 0.95, source: src, note: `articolul anunță premiul: „${titleRo}”`});
      const body = text(pRo?.content.rendered ?? pEn?.content.rendered);
      for (const [kindKey, rx] of [['comercial', /spați(u|i) comercial/i], ['duplex', /\bduplex/i]]) {
        const m = body.match(rx);
        if (m && unitIds[kindKey]) await W.link('articole.unit_types', id, unitIds[kindKey], {confidence: 0.6, source: src,
          note: `mențiune în text: „…${body.slice(Math.max(0, m.index - 60), m.index + 60)}…”`});
      }
    }

    // 10. Testimoniale (A5): cele 12 afișate au textul; celelalte 39 nu au text public
    const tSrc = await pageSource('/testimoniale/', 'ro');
    for (const t of [...S.analysis.testimonials.items].sort((a, b) => a.wp_id - b.wp_id)) {
      const truncated = /…$|\.\.\.$/.test(t.text ?? '');
      const id = await W.save('testimoniale', `wp:testimonial:${t.wp_id}`, {
        base: {author: t.name, anonymous: 0, quote: t.text, quote_lang: 'ro', given_on: t.date?.slice(0, 10), featured: t.shown_on.length ? 1 : 0},
        tr: {ro: {legacy_id: t.wp_id}},
        status: t.text ? 'published' : 'draft', published_at: t.date
      });
      await W.prov('testimoniale', id, ['author', 'given_on'], {source: await apiSource('testimonial', t.wp_id), method: 'wp-json'});
      await W.prov('testimoniale', id, 'quote', t.text
        ? {source: tSrc, excerpt: t.text, certainty: truncated ? 'unverified' : 'confirmed'}
        : {source: await pageSource(t.single_page, 'ro'), certainty: 'unrecoverable', excerpt: 'textul nu apare nici în API, nici pe pagina proprie'});
      W.registerPath(t.single_page, 'testimoniale', id);
    }
    const noText = S.analysis.testimonials.items.filter(t => !t.text).length;
    if (noText) W.warn(`${noText} testimoniale nu au text public (API gol, pagina proprie fără citat): importate ca ciorne, textul trebuie cerut clientului.`);
    // Citatele anonime de pe /comunitate/: originalul RO, traducerea din /en/community/
    // Citatele stau în sliderul Bricks, câte unul în fiecare testimonial-content-wrapper
    const anon = async path => [...mainOf(await S.html(path)).matchAll(/class="testimonial-content-wrapper">([\s\S]*?)<\/div>/g)].map(m => text(m[1])).filter(Boolean);
    const [qRo, qEn] = [await anon('/comunitate/'), await anon('/en/community/')];
    for (const [i, q] of qRo.entries()) {
      const id = await W.save('testimoniale', `citat:comunitate:${i + 1}`, {
        base: {author: 'Rezident YACHT KID', anonymous: 1, quote: q, quote_lang: 'ro', featured: 0},
        tr: {ro: {role: 'Membru al comunității'}, en: {role: 'Community member', quote_translated: qEn[i] ?? null}}
      });
      await W.prov('testimoniale', id, ['quote', 'author'], {source: await pageSource('/comunitate/', 'ro'), excerpt: q});
      if (qEn[i]) await W.prov('testimoniale', id, 'quote_translated', {lang: 'en', source: await pageSource('/en/community/', 'en'), excerpt: qEn[i]});
    }
    if (qRo.length !== 3) W.warn(`Citate anonime găsite pe /comunitate/: ${qRo.length} (așteptat 3).`);

    // 11. Avantaje și tehnologii: titlurile RO și EN, aliniate pe poziție (structura e identică în ambele limbi)
    const outlineItems = async (roPath, enPath, from, count) => {
      const [a, b] = [byHeading(mainOf(await S.html(roPath))), byHeading(mainOf(await S.html(enPath)))];
      const i = a.findIndex(x => x.heading === from);
      if (i < 0) { W.warn(`„${from}” nu e pe ${roPath}.`); return []; }
      if (a.length !== b.length) W.warn(`${roPath} și ${enPath} au structuri diferite (${a.length} / ${b.length} titluri); EN nu s-a importat.`);
      return a.slice(i, i + count).map((x, k) => ({ro: x, en: a.length === b.length ? b[i + k] : null}));
    };
    for (const [group, from, count] of [['avantaje', 'Patent de invenție pentru fațade', 12], ['confort', 'Consum redus de energie', 6]]) {
      for (const it of await outlineItems('/', '/en/', from, count)) {
        const id = await W.save('avantaje', `avantaj:${fold(it.ro.heading).replace(/[^a-z0-9]+/g, '-').slice(0, 60)}`, {
          base: {group}, tr: {ro: {title: it.ro.heading, text: paragraphs(it.ro.html)[0] ?? null}, ...(it.en ? {en: {title: it.en.heading, text: paragraphs(it.en.html)[0] ?? null}} : {})}
        });
        await W.prov('avantaje', id, ['title', 'text'], {lang: 'ro', source: await pageSource('/', 'ro'), excerpt: it.ro.heading});
        if (it.en) await W.prov('avantaje', id, ['title', 'text'], {lang: 'en', source: await pageSource('/en/', 'en'), excerpt: it.en.heading});
      }
    }
    const techSrc = await pageSource('/tehnologie/', 'ro');
    const techLong = text(mainOf(await S.html('/tehnologie/')));
    for (const it of await outlineItems('/tehnologie/', '/en/technology/', 'Structură și rezistență la seism', 6)) {
      const img = images(it.ro.html)[0];
      const id = await W.save('tehnologii', `tehnologie:${fold(it.ro.heading).replace(/[^a-z0-9]+/g, '-')}`, {
        base: {image: img ? mediaId(img.src) : null},
        tr: {ro: {title: it.ro.heading, summary: paragraphs(it.ro.html)[0] ?? text(it.ro.html) ?? null}, ...(it.en ? {en: {title: it.en.heading, summary: paragraphs(it.en.html)[0] ?? text(it.en.html) ?? null}} : {})}
      });
      await W.prov('tehnologii', id, ['title', 'summary'], {lang: 'ro', source: techSrc, excerpt: it.ro.heading});
      if (it.en) await W.prov('tehnologii', id, ['title', 'summary'], {lang: 'en', source: await pageSource('/en/technology/', 'en'), excerpt: it.en.heading});
      // Furnizorii: numele în titlu sau în rezumat → legătură dedusă
      for (const p of PARTNERS) {
        const hay = `${it.ro.heading} ${text(it.ro.html)}`;
        const n = [p.name, ...p.aliases].find(x => hay.includes(x));
        if (n) await W.link('tehnologii.suppliers', id, partnerIds[p.name], {confidence: 0.9, source: techSrc, note: `„${n}” în „${it.ro.heading}”`});
      }
    }
    if (/ISO CHEMIE/.test(techLong)) W.warn('ISO CHEMIE apare doar în textul lung de pe /tehnologie/ (panourile prefabricate); legătura nu s-a dedus automat.');

    // 12. Niveluri Community Card
    const cardPage = byHeading(mainOf(await S.html('/community-card-concept/')));
    for (const [rank, name] of ['GOLD', 'PLATINUM', 'DIAMOND'].entries()) {
      if (!cardPage.some(p => p.heading === name)) { W.warn(`Nivelul ${name} nu e pe /community-card-concept/.`); continue; }
      const id = await W.save('niveluri-card', `card:${name.toLowerCase()}`, {base: {name: name[0] + name.slice(1).toLowerCase(), rank: rank + 1}, tr: {}});
      await W.prov('niveluri-card', id, ['name', 'rank'], {source: await pageSource('/community-card-concept/', 'ro'), excerpt: name});
    }
    W.warn('Beneficiile pe niveluri (Gold / Platinum / Diamond) nu apar pe site: nivelurile s-au importat fără beneficii și fără legătura cu tipurile de locuințe.');

    // 13. Pagini: tot ce nu e deținut de alt tip. Paginile legale primesc textul din API; restul așteaptă secțiunile.
    const pageApi = new Map(S.api.pages.map(p => [p.id, p]));
    const pageIds = {};
    for (const pr of pairs(S, p => (p.kind === 'page' || p.kind === 'other') && !W.paths.has(p.path) && !/apartament|bedroom|duplex|spatii-comerciale|commercial-spaces/.test(p.path))) {
      const roPath = pr.ro?.path;
      const template = PAGE_TEMPLATES[roPath] ?? 'standard';
      const trOf = (p) => {
        const api = pageApi.get(p.wp_id);
        const body = template === 'legal' && api?.content.rendered ? clean(api.content.rendered, p.path) : null;
        if (body) { const rt = roundTrip(api.content.rendered, body); report.roundtrip.checked++; if (!rt.ok) report.roundtrip.failed.push({path: p.path, ...rt}); }
        return {title: p.path === '/' || p.path === '/en/' ? (p.lang === 'ro' ? 'Pagina principală' : 'Home') : titleOfPage(p),
          slug: p.path === '/' || p.path === '/en/' ? '' : slugOf(p.path), body, seo_title: p.title, seo_description: p.description || null, legacy_id: p.wp_id};
      };
      const id = await W.save('pagini', pr.natural, {
        base: {template, noindex: template === 'multumim' ? 1 : 0},
        tr: {...(pr.ro ? {ro: trOf(pr.ro)} : {}), ...(pr.en ? {en: trOf(pr.en)} : {})}
      });
      pageIds[roPath ?? pr.en.path] = id;
      for (const [l, p] of [['ro', pr.ro], ['en', pr.en]]) if (p) {
        W.registerPath(p.path, 'pagini', id);
        await W.prov('pagini', id, ['title', 'slug', 'seo_title', 'seo_description'], {lang: l, source: await pageSource(p.path, l)});
        if (template === 'legal') await W.prov('pagini', id, 'body', {lang: l, source: await apiSource('pages', p.wp_id), method: 'wp-json'});
      }
      await W.prov('pagini', id, 'template', {source: curatedSrc, method: 'curated', certainty: 'inferred'});
    }
    W.warn('Secțiunile paginilor (Bricks) nu sunt încă importate: paginile compuse au titlu și SEO, fără conținut. Felurile de secțiuni se mapează la pasul următor.');

    // 14. Formulare: structura o dată, etichetele pe limbă; opțiunile „tip apartament” vin din tipurile de locuințe
    const formOf = async (path, handle) => {
      const html = await S.html(path);
      const f = mainOf(html).match(/<form\b[\s\S]*?<\/form>/)?.[0];
      if (!f) return null;
      const labels = [...f.matchAll(/<label\b[^>]*>([\s\S]*?)<\/label>/g)].map(m => text(m[1]));
      const seen = {};
      const fields = [...f.matchAll(/<(input|select|textarea)\b[^>]*>(?:([\s\S]*?)<\/select>)?/g)].map(([tag, kind, inner]) => {
        let name = attr(tag, 'name'); const type = kind === 'input' ? attr(tag, 'type') : kind;
        if (!name || type === 'hidden') return null;
        name = FORM_FIELD_ALIASES[name] ?? name.replace(/\[\]$/, '');
        seen[name] = (seen[name] ?? 0) + 1;
        const renamed = FORM_FIELD_RENAMES[handle]?.[name]?.[seen[name] - 1];
        if (seen[name] > 1) W.warn(`Formularul ${handle} (${path}): două câmpuri cu numele „${name}”; al doilea a devenit „${renamed ?? `${name}_${seen[name]}`}”.`);
        const options = inner ? [...inner.matchAll(/<option[^>]*>([^<]*)/g)].map(m => decode(m[1]).trim()).filter(Boolean) : null;
        return {name: renamed ?? (seen[name] > 1 ? `${name}_${seen[name]}` : name), type, required: /\brequired\b/.test(tag), options};
      }).filter(Boolean);
      fields.forEach((x, i) => (x.label = labels[i] ?? null));
      return {fields, intro: null};
    };
    const forms = [['contact', 'Formular de contact', '/contact/', '/en/contact-us/'], ['vizionare', 'Programează o vizionare', '/programeaza-o-vizionare/', null]];
    for (const [handle, name, roPath, enPath] of forms) {
      const [fr, fe] = [await formOf(roPath, handle), enPath && await formOf(enPath, handle)];
      if (!fr) { W.warn(`Formularul ${handle} nu s-a găsit pe ${roPath}.`); continue; }
      if (fe && fe.fields.map(x => x.name).join() !== fr.fields.map(x => x.name).join()) W.warn(`Formularul ${handle}: câmpurile EN diferă de RO (${fe.fields.map(x => x.name)}).`);
      const structure = fr.fields.map(x => ({name: x.name, type: x.type, required: x.required, options_from: x.name === 'tip_apartament' ? 'locuinte' : null,
        options: x.options && x.name !== 'tip_apartament' ? x.options.slice(1).map((_, i) => `opt${i + 1}`) : null}));
      const labelsOf = f => f.fields.map(x => ({name: x.name, label: x.label, placeholder: x.options?.[0] ?? null, options: x.name === 'tip_apartament' ? null : x.options?.slice(1) ?? null}));
      const id = await W.save('formulare', `formular:${handle}`, {
        base: {name, handle, fields: structure, success_page: pageIds['/multumim/'] ?? null, notify: []},
        tr: {ro: {field_labels: labelsOf(fr)}, ...(fe ? {en: {field_labels: labelsOf(fe)}} : {})}
      });
      await W.prov('formulare', id, ['fields'], {source: await pageSource(roPath, 'ro'), method: 'html-form'});
      await W.prov('formulare', id, 'field_labels', {lang: 'ro', source: await pageSource(roPath, 'ro'), method: 'html-form'});
      if (fe) await W.prov('formulare', id, 'field_labels', {lang: 'en', source: await pageSource(enPath, 'en'), method: 'html-form'});
    }

    // 15. Meniuri: antetul și subsolul fiecărei limbi; destinațiile devin ref: la final
    const menuItems = (links, lang) => {
      const out = [], seen = new Set();
      for (const l of links.filter(l => l.label && l.href && !/facebook|instagram|linkedin|youtube/i.test(l.href))) {
        const k = `${l.label}|${l.href}`;
        if (seen.has(k)) continue; seen.add(k);
        const href = decode(l.href);
        const p = pathOf(href);
        if (p && lang === 'en' && !p.startsWith('/en/') && p !== '/') W.warn(`Meniul EN trimite la pagina RO ${p} („${l.label}”); ca trimitere spre entitate, se afișează adresa EN.`);
        out.push({label: l.label, to: p ? `@path:${withSlash(p)}` : href});
      }
      return out;
    };
    for (const [location, part] of [['antet', 'header'], ['subsol', 'footer']]) {
      const tr = {};
      for (const lang of ['ro', 'en']) {
        const v = S.analysis.layout[part].find(x => x.langs.includes(lang));
        if (v) tr[lang] = {items: menuItems(v.links, lang)};
      }
      const id = await W.save('meniuri', `meniu:${location}`, {base: {name: location === 'antet' ? 'Antet' : 'Subsol', location}, tr});
      for (const lang of Object.keys(tr)) await W.prov('meniuri', id, 'items', {lang, source: await pageSource(lang === 'ro' ? '/' : '/en/', lang), method: 'html-nav'});
    }

    // 16. Redirecționări: paginile de testimonial (A5) și arhivele de autor
    const testimonialsPage = pageIds['/testimoniale/'], blogPage = pageIds['/blog/'];
    const redirects = [
      ...S.analysis.testimonials.items.map(t => [t.single_page, testimonialsPage && `ref:pagini:${testimonialsPage}`]),
      ['/author/s360_yachtkid/', blogPage && `ref:pagini:${blogPage}`],
      ['/en/author/s360_yachtkid/', blogPage && `ref:pagini:${blogPage}`]
    ];
    for (const [from, to] of redirects) {
      if (!to) continue;
      const id = await W.save('redirectari', `redirect:${from}`, {base: {from_path: from, to_ref: to, code: '301', origin: 'import'}});
      await W.prov('redirectari', id, ['from_path', 'to_ref'], {source: curatedSrc, method: 'curated', certainty: 'inferred'});
      W.paths.delete(from);
    }

    // 17. Etichetele interfeței
    for (const l of LABELS) {
      const id = await W.save('etichete', `eticheta:${l.key}`, {base: {key: l.key}, tr: {ro: {text: l.ro}, ...(l.en ? {en: {text: l.en}} : {})}});
      await W.prov('etichete', id, 'text', {lang: 'ro', source: curatedSrc, method: 'curated', certainty: 'inferred'});
    }

    // 18. Trimiterile: @path:/… → tip:id, acum că toate adresele au ID
    const resolveRef = p => W.paths.get(p) ?? W.paths.get(withSlash(p));
    for (const [key, fields] of [['articole', ['content']], ['pagini', ['body']]]) {
      const t = `${entity(key).table}_translations`;
      for (const row of (await W.run(`SELECT entity_id, lang, ${fields.map(f => `"${f}"`).join(', ')} FROM "${t}"`)).rows) for (const f of fields) {
        if (!row[f]?.includes('@path:')) continue;
        const html = row[f].replace(/<a data-ref="@path:([^"]+)">/g, (m, p) => {
          const r = resolveRef(p);
          if (r) return `<a data-ref="${r.key}:${r.id}">`;
          report.unresolved_links.push({in: `${key}:${row.entity_id}:${row.lang}`, path: p});
          return `<a href="${p}">`;
        });
        await W.run(`UPDATE "${t}" SET "${f}" = ? WHERE entity_id = ? AND lang = ?`, [html, row.entity_id, row.lang]);
      }
    }
    for (const row of (await W.run('SELECT t.entity_id, t.lang, t.items, m.location FROM menus_translations t JOIN menus m ON m.id = t.entity_id')).rows) {
      const items = JSON.parse(row.items ?? '[]').map(i => {
        if (!i.to?.startsWith('@path:')) return i;
        const p = i.to.slice(6), r = resolveRef(p);
        if (!r && p !== '/' && p !== '/en/') report.unresolved_links.push({in: `meniuri:${row.entity_id}:${row.lang}`, path: p});
        return {...i, to: r ? `ref:${r.key}:${r.id}` : null};
      });
      // „Apartamente” trimite în site-ul vechi spre prima pagină doar ca să deschidă submeniul:
      // un element spre prima pagină urmat de tipuri de locuințe devine grup, fără link propriu
      const homeRef = `ref:pagini:${pageIds['/']}`;
      const homes = new Set(Object.entries(unitIds).filter(([k]) => k !== 'comercial').map(([, id]) => `ref:locuinte:${id}`));
      const isHome = i => homes.has(i?.to);
      const nested = [];
      items.forEach((i, n) => {
        const parent = nested[nested.length - 1];
        if (row.location === 'antet' && i.to === homeRef && isHome(items[n + 1])) nested.push({label: i.label, to: null, children: []});
        else if (isHome(i) && parent?.children) parent.children.push(i);
        else nested.push(i);
      });
      await W.run('UPDATE menus_translations SET items = ? WHERE entity_id = ? AND lang = ?', [JSON.stringify(nested), row.entity_id, row.lang]);
    }

    // 19. Un singur eveniment pentru tot importul; prima scanare (§3.5) îl rezolvă
    if (report.sanitize_issues.length) W.warn(`${report.sanitize_issues.length} imagini sau linkuri din texte n-au putut fi rezolvate (de exemplu imagini de pe dev.sota360.ro); detalii în import-report.json.`);
    const summary = {counts: W.counts, warnings: W.warnings, roundtrip: {checked: report.roundtrip.checked, failed: report.roundtrip.failed.length},
      unresolved_links: report.unresolved_links.length, sanitize_issues: report.sanitize_issues.length};
    await W.run(`INSERT INTO change_events (at, user_name, action, label, payload, status) VALUES (?, ?, 'import', ?, ?, 'pending')`,
      [now, IMPORT_USER, 'Import din snapshot', JSON.stringify(summary)]);
    await tx.commit();
    return {...summary, report};
  } catch (e) {
    await tx.rollback();
    throw e;
  }
}
