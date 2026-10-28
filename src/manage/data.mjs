// Datele panoului /manage, derivate din registru (principiul 9): nicio listă, coloană sau relație scrisă de mână.
import {ENTITIES, CATEGORIES} from '../registry/entities.mjs';
import {ASSUMPTIONS} from '../registry/assumptions.mjs';
import {entity, field, fieldsOf, hasStatus, hasTranslations, translatableFields, RELATION_TYPES, outgoingRelations, inverseRelations, relTable, publicPaths, titleOf} from '../registry/derive.mjs';
import {LANGS, DEFAULT_LANG} from '../registry/langs.mjs';
import {columnOf} from '../core/schema.mjs';
import {trFingerprint} from '../core/fingerprint.mjs';
import {all, one} from '../core/db.mjs';

const JSON_TYPES = ['multiselect', 'list', 'links', 'texts', 'table'];
const decode = (f, v) => (v != null && JSON_TYPES.includes(f.type) && typeof v === 'string' ? JSON.parse(v) : v);

export {CATEGORIES, ASSUMPTIONS, LANGS};
export const entities = () => ENTITIES;

// Schema câmpurilor pentru editor (fără funcții, ca să treacă spre componenta din browser)
export const fieldSchema = key => fieldsOf(key).map(f => ({
  key: f.key, label: f.label, type: f.type, translatable: !!f.translatable, required: !!f.required, readonly: !!f.readonly, intern: !!f.intern,
  options: f.options ?? null, help: f.help ?? null, max: f.max ?? null, target: f.type === 'image' ? 'media' : f.target ?? null,
  kinds: f.kinds ?? null, assume: f.assume ?? null, currency: f.currency ?? null, columns: f.columns ?? null
}));

// Titlul fiecărei înregistrări a unui tip, în RO (pentru liste, chips și selecturi)
export async function titles(db, key) {
  const e = entity(key), tf = field(key, e.title);
  const sql = tf.translatable
    ? `SELECT e.id, t."${columnOf(tf)}" ro, (SELECT "${columnOf(tf)}" FROM "${e.table}_translations" x WHERE x.entity_id = e.id AND x.lang = 'en') en FROM "${e.table}" e LEFT JOIN "${e.table}_translations" t ON t.entity_id = e.id AND t.lang = 'ro'`
    : `SELECT id, "${columnOf(tf)}" ro, NULL en FROM "${e.table}"`;
  return new Map((await all(db, sql)).map(r => [r.id, r.ro ?? r.en ?? `${e.one} #${r.id}`]));
}

export const mediaUrl = id => (id ? `/media/${id}/` : null);

// ───────── cifrele pe tip ─────────
export async function typeStats(db, key) {
  const e = entity(key);
  const total = (await one(db, `SELECT count(*) n FROM "${e.table}"`)).n;
  const published = hasStatus(key) ? (await one(db, `SELECT count(*) n FROM "${e.table}" WHERE status = 'published'`)).n : null;
  const drafts = hasStatus(key) ? (await one(db, `SELECT count(*) n FROM "${e.table}" WHERE status = 'draft'`)).n : null;
  const tr = {}, outdated = {};
  if (hasTranslations(key)) {
    for (const l of LANGS) tr[l] = (await one(db, `SELECT count(*) n FROM "${e.table}_translations" WHERE lang = ?`, [l])).n;
    outdated.en = (await outdatedIds(db, key)).length;
  }
  const inferred = await inferredCount(db, key);
  return {total, published, drafts, tr, outdated, inferred};
}

async function outdatedIds(db, key) {
  const e = entity(key);
  if (!translatableFields(key).some(f => !['legacy_id', 'seo_title', 'seo_description'].includes(f.key) && f.type !== 'slug')) return [];
  const rows = await all(db, `SELECT ro.*, en.source_fp en_fp FROM "${e.table}_translations" ro JOIN "${e.table}_translations" en ON en.entity_id = ro.entity_id AND en.lang = 'en' WHERE ro.lang = 'ro'`);
  return rows.filter(r => r.en_fp && r.en_fp !== trFingerprint(key, r)).map(r => r.entity_id);
}

async function inferredCount(db, key) {
  let n = 0;
  for (const r of RELATION_TYPES.filter(r => r.cardinality === 'M:N' && r.source === key))
    n += (await one(db, `SELECT count(*) n FROM "${r.storage}" WHERE status != 'confirmed'`)).n;
  return n;
}

// ───────── „De făcut” (§1.8): observații calculate, cu impact și link direct ─────────
export async function observations(db) {
  const out = [];
  const add = (level, text, href, n) => n !== 0 && out.push({level, text, href, n});
  const drafts = await one(db, `SELECT count(*) n FROM testimonials WHERE quote IS NULL`);
  add('mare', `${drafts.n} testimoniale fără text: API-ul și paginile vechi nu au citatul. Cere-l clientului.`, '/manage/entitati/testimoniale/?f=ciorne', drafts.n);
  // Neverificate: grupate pe tip și câmp; „contradictorii” doar unde două surse spun lucruri diferite
  const unv = await all(db, `SELECT entity, field, count(DISTINCT entity_id) n, min(entity_id) one, max(sources) conflict FROM
    (SELECT entity, entity_id, field, count(*) sources FROM provenance WHERE certainty = 'unverified' GROUP BY 1, 2, 3) GROUP BY 1, 2`);
  for (const u of unv) {
    const e = entity(u.entity), f = field(u.entity, u.field)?.label ?? u.field;
    const text = u.conflict > 1 ? `${e.one} #${u.one}: „${f}” are surse contradictorii.` : `${e.label}: „${f}” neverificat la ${u.n} ${u.n === 1 ? 'înregistrare' : 'înregistrări'}.`;
    add(u.conflict > 1 ? 'mare' : 'mediu', text, u.n === 1 ? `/manage/entitati/${u.entity}/${u.one}/surse/` : `/manage/entitati/${u.entity}/`, u.n);
  }
  for (const e of ENTITIES.filter(e => typeof e.public?.path === 'function')) {
    const s = await typeStats(db, e.key);
    add('mediu', `${e.label}: ${s.total - (s.tr.en ?? 0)} fără traducere EN.`, `/manage/entitati/${e.key}/?f=fara-en`, s.total - (s.tr.en ?? 0));
    add('mediu', `${e.label}: ${s.outdated.en} traduceri EN învechite (textul RO s-a schimbat).`, `/manage/entitati/${e.key}/?f=invechite`, s.outdated.en ?? 0);
  }
  const inf = (await legaturiDeVerificat(db)).reduce((n, g) => n + g.items.length, 0);
  add('mediu', `${inf} legături deduse așteaptă confirmarea.`, '/manage/surse/legaturi/', inf);
  const noAlt = await one(db, `SELECT count(*) n FROM media m WHERE m.mime LIKE 'image/%' AND NOT EXISTS (SELECT 1 FROM media_translations t WHERE t.entity_id = m.id AND t.lang = 'ro' AND t.alt IS NOT NULL AND t.alt != '')`);
  add('mic', `${noAlt.n} imagini fără text alternativ în RO.`, '/manage/media/?f=fara-alt', noAlt.n);
  const noAltEn = await one(db, `SELECT count(*) n FROM media m WHERE m.mime LIKE 'image/%' AND NOT EXISTS (SELECT 1 FROM media_translations t WHERE t.entity_id = m.id AND t.lang = 'en' AND t.alt IS NOT NULL AND t.alt != '')`);
  add('mic', `${noAltEn.n} imagini fără text alternativ în EN.`, '/manage/media/?f=fara-alt-en', noAltEn.n);
  const pending = await one(db, `SELECT count(*) n FROM change_events WHERE status = 'pending'`);
  add('mic', `${pending.n} modificări așteaptă propagarea (nucleul de propagare nu e încă activ).`, '/manage/modificari/', pending.n);
  const order = {mare: 0, mediu: 1, mic: 2};
  return out.sort((a, b) => order[a.level] - order[b.level]);
}

export async function importWarnings(db) {
  const ev = await one(db, `SELECT at, payload FROM change_events WHERE action = 'import' ORDER BY id DESC LIMIT 1`);
  if (!ev) return null;
  const p = JSON.parse(ev.payload ?? '{}');
  return {at: ev.at, warnings: p.warnings ?? [], counts: p.counts ?? {}};
}

// ───────── lista unui tip ─────────
export async function listRows(db, key) {
  const e = entity(key);
  const tr = hasTranslations(key);
  const base = await all(db, `SELECT * FROM "${e.table}" ORDER BY ${hasStatus(key) ? `CASE status WHEN 'published' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, ` : ''}id`);
  const trs = {};
  if (tr) for (const r of await all(db, `SELECT * FROM "${e.table}_translations"`)) (trs[r.entity_id] ??= {})[r.lang] = r;
  const outdated = new Set(tr ? await outdatedIds(db, key) : []);
  const inferred = {};
  for (const r of RELATION_TYPES.filter(r => r.cardinality === 'M:N' && r.source === key))
    for (const x of await all(db, `SELECT src_id, count(*) n FROM "${r.storage}" WHERE status != 'confirmed' GROUP BY 1`)) inferred[x.src_id] = (inferred[x.src_id] ?? 0) + x.n;
  const listFields = fieldsOf(key).filter(f => f.list && f.key !== e.title).slice(0, 3);
  const refTitles = {};
  for (const f of listFields.filter(f => f.type === 'ref')) refTitles[f.key] = await titles(db, f.target);
  return base.map(b => {
    const t = trs[b.id] ?? {};
    const rec = view(key, b, t[DEFAULT_LANG] ?? t.en);
    const thumbField = e.thumb && field(key, e.thumb);
    const meta = listFields.map(f => {
      let v = f.translatable ? decode(f, t[DEFAULT_LANG]?.[columnOf(f)]) : decode(f, b[columnOf(f)]);
      if (v == null || v === '') return null;
      if (f.type === 'ref') v = refTitles[f.key]?.get(v);
      if (f.type === 'money') v = `${Number(v).toLocaleString('ro-RO')} €`;
      if (f.type === 'boolean') v = v ? f.label : null;
      if (Array.isArray(v)) v = v.join(', ');
      return v;
    }).filter(Boolean);
    return {
      id: b.id, status: b.status ?? null, updated_at: b.updated_at, updated_by: b.updated_by,
      title: titleOf(key, rec, rec), titleEn: t.en && field(key, e.title).translatable ? t.en[columnOf(field(key, e.title))] : null,
      thumb: thumbField?.type === 'image' ? mediaUrl(b[columnOf(thumbField)]) : key === 'media' && /^image\//.test(b.mime) ? mediaUrl(b.id) : null,
      meta, langs: tr ? LANGS.filter(l => t[l]) : null, outdated: outdated.has(b.id), inferred: inferred[b.id] ?? 0,
      pending: awaitsApproval(key, b),
      paths: publicPaths(key, rec, Object.fromEntries(Object.entries(t).map(([l, x]) => [l, view(key, b, x)])))
    };
  });
}

// O ciornă venită din site (entity.approve.when) așteaptă „Aprobă” în panou
export function awaitsApproval(key, base) {
  const a = entity(key)?.approve;
  return !!a && base.status === 'draft' && Object.entries(a.when).every(([k, v]) => base[k] === v);
}

function view(key, base, trRow) {
  const rec = {id: base.id, status: base.status};
  for (const f of fieldsOf(key)) {
    const col = columnOf(f);
    if (f.translatable) { if (trRow && col in trRow) rec[f.key] = decode(f, trRow[col]); } else if (col in base) rec[f.key] = decode(f, base[col]);
  }
  return rec;
}

// ───────── o înregistrare ─────────
export async function record(db, key, id) {
  const e = entity(key);
  const base = await one(db, `SELECT * FROM "${e.table}" WHERE id = ?`, [id]);
  if (!base) return null;
  const trRows = hasTranslations(key) ? await all(db, `SELECT * FROM "${e.table}_translations" WHERE entity_id = ?`, [id]) : [];
  const tr = Object.fromEntries(trRows.map(r => [r.lang, r]));
  const values = {base: {}, tr: Object.fromEntries(LANGS.map(l => [l, {}]))};
  for (const f of fieldsOf(key)) {
    if (f.type === 'refs') continue;
    if (f.translatable) for (const l of LANGS) values.tr[l][f.key] = decode(f, tr[l]?.[columnOf(f)] ?? null);
    else values.base[f.key] = decode(f, base[columnOf(f)] ?? null);
  }
  const links = {};
  for (const r of outgoingRelations(key).filter(r => r.cardinality === 'M:N'))
    links[r.field] = await all(db, `SELECT dst_id id, status, confidence, note FROM "${r.storage}" WHERE src_id = ? ORDER BY position`, [id]);
  const ro = view(key, base, tr[DEFAULT_LANG] ?? tr.en);
  const outdated = tr.en?.source_fp && tr.ro ? tr.en.source_fp !== trFingerprint(key, tr.ro) : false;
  return {
    id, status: base.status ?? null, updated_at: base.updated_at, updated_by: base.updated_by, created_at: base.created_at,
    title: titleOf(key, ro, ro), values, links, langs: LANGS.filter(l => tr[l]), outdated,
    paths: publicPaths(key, ro, Object.fromEntries(Object.entries(tr).map(([l, x]) => [l, view(key, base, x)])))
  };
}

// Opțiunile pentru câmpurile care trimit la alte entități (ref, image, refs)
export async function refOptions(db, key) {
  const out = {};
  for (const f of fieldsOf(key).filter(f => ['ref', 'refs', 'image'].includes(f.type))) {
    const target = f.type === 'image' ? 'media' : f.target;
    if (out[target]) continue;
    const t = await titles(db, target);
    out[target] = [...t].map(([id, title]) => ({id, title, thumb: target === 'media' ? mediaUrl(id) : null}));
  }
  return out;
}

export async function provenanceOf(db, key, id) {
  return all(db, `SELECT p.field, p.lang, p.certainty, p.confidence, p.method, p.excerpt, p.verified_by, p.verified_at, p.created_at, s.url, s.kind, s.title
    FROM provenance p JOIN sources s ON s.id = p.source_id WHERE p.entity = ? AND p.entity_id = ? ORDER BY p.field, p.lang`, [key, id]);
}

export async function historyOf(db, key, id) {
  return all(db, `SELECT id, at, user_name, action, label, changes FROM audit_log WHERE entity = ? AND entity_id = ? ORDER BY id DESC LIMIT 100`, [key, id]);
}

// „Unde apare” (§2.3), pe niveluri: relații directe, trimiteri din texte și meniuri, detectate neverificate
export async function whereUsed(db, key, id) {
  const direct = [];
  for (const r of outgoingRelations(key)) {
    const t = await titles(db, r.target);
    if (r.cardinality === 'M:N') for (const l of await all(db, `SELECT dst_id, status FROM "${r.storage}" WHERE src_id = ?`, [id])) direct.push({rel: r.verb, target: r.target, id: l.dst_id, title: t.get(l.dst_id), status: l.status, out: true});
    else {
      const v = (await one(db, `SELECT "${r.field}_id" v FROM "${entity(key).table}" WHERE id = ?`, [id]))?.v;
      if (v) direct.push({rel: r.verb, target: r.target, id: v, title: t.get(v), status: 'confirmed', out: true});
    }
  }
  for (const r of inverseRelations(key)) {
    const t = await titles(db, r.source);
    const rows = r.cardinality === 'M:N'
      ? await all(db, `SELECT src_id id, status FROM "${r.storage}" WHERE dst_id = ?`, [id])
      : await all(db, `SELECT id, 'confirmed' status FROM "${entity(r.source).table}" WHERE "${r.field}_id" = ?`, [id]);
    for (const x of rows) direct.push({rel: r.inverseLabel, target: r.source, id: x.id, title: t.get(x.id), status: x.status, out: false});
  }
  // Trimiterile din textele bogate și din meniuri: <a data-ref="tip:id">, ref:tip:id
  const refs = [];
  const needle = `${key}:${id}`;
  for (const e of ENTITIES.filter(e => hasTranslations(e.key))) {
    const cols = translatableFields(e.key).filter(f => ['richtext', 'links'].includes(f.type));
    if (!cols.length) continue;
    const t = await titles(db, e.key);
    for (const f of cols) for (const r of await all(db, `SELECT entity_id, lang FROM "${e.table}_translations" WHERE "${columnOf(f)}" LIKE ? OR "${columnOf(f)}" LIKE ?`, [`%data-ref="${needle}"%`, `%ref:${needle}"%`]))
      refs.push({target: e.key, id: r.entity_id, title: t.get(r.entity_id), lang: r.lang, field: f.label});
  }
  // Numele găsit în texte, fără legătură salvată (doar tipurile cu mentions)
  const mentions = [];
  const e = entity(key);
  if (e.mentions) {
    const name = (await one(db, `SELECT "${columnOf(field(key, e.mentionName ?? e.title))}" n FROM "${e.table}" WHERE id = ?`, [id]))?.n;
    const linked = new Set(direct.filter(d => d.target === 'articole').map(d => d.id));
    if (name && name.length >= 4) {
      const t = await titles(db, 'articole');
      for (const r of await all(db, `SELECT DISTINCT entity_id FROM posts_translations WHERE content LIKE ?`, [`%${name}%`]))
        if (!linked.has(r.entity_id)) mentions.push({target: 'articole', id: r.entity_id, title: t.get(r.entity_id), evidence: `„${name}” în text`});
    }
  }
  return {direct, refs, mentions};
}

// ───────── Legături de verificat (§2.5) ─────────
export async function legaturiDeVerificat(db) {
  const out = [];
  for (const r of RELATION_TYPES.filter(r => r.cardinality === 'M:N')) {
    const rows = await all(db, `SELECT src_id, dst_id, status, confidence, note FROM "${r.storage}" WHERE status != 'confirmed' ORDER BY confidence DESC, src_id`);
    if (!rows.length) continue;
    const [ts, td] = [await titles(db, r.source), await titles(db, r.target)];
    const avg = rows.reduce((s, x) => s + (x.confidence ?? 0), 0) / rows.length;
    out.push({relation: r.id, source: r.source, target: r.target, verb: r.verb, recommendation: avg >= 0.9 ? 'confirmă' : 'una câte una',
      items: rows.map(x => ({...x, srcTitle: ts.get(x.src_id), dstTitle: td.get(x.dst_id)}))});
  }
  return out;
}

// ───────── harta (§2.4): tipurile, legăturile dintre ele cu numărul real, sănătatea ─────────
export async function graphOverview(db) {
  const nodes = [];
  for (const e of ENTITIES) nodes.push({key: e.key, label: e.label, category: e.category, color: e.color, n: (await one(db, `SELECT count(*) n FROM "${e.table}"`)).n});
  const edges = [];
  for (const r of RELATION_TYPES) {
    const n = r.cardinality === 'M:N'
      ? (await one(db, `SELECT count(*) n FROM "${r.storage}"`)).n
      : (await one(db, `SELECT count(*) n FROM "${entity(r.source).table}" WHERE "${r.field}_id" IS NOT NULL`)).n;
    const pending = r.cardinality === 'M:N' ? (await one(db, `SELECT count(*) n FROM "${r.storage}" WHERE status != 'confirmed'`)).n : 0;
    const emptyRequired = r.required && r.cardinality === 'N:1' ? (await one(db, `SELECT count(*) n FROM "${entity(r.source).table}" WHERE "${r.field}_id" IS NULL`)).n : 0;
    edges.push({...r, n, pending, emptyRequired});
  }
  const linkedTypes = new Set(edges.filter(e => e.n).flatMap(e => [e.source, e.target]));
  const health = {
    isolated: nodes.filter(n => !linkedTypes.has(n.key)).map(n => n.label),
    unused: edges.filter(e => !e.n).map(e => e.id),
    emptyRequired: edges.filter(e => e.emptyRequired).map(e => `${e.id}: ${e.emptyRequired}`),
    pending: edges.reduce((s, e) => s + e.pending, 0)
  };
  return {nodes, edges, health};
}

// ───────── istoric global ─────────
export async function recentChanges(db, limit = 200) {
  return all(db, `SELECT id, at, user_name, action, entity, entity_id, label, changes FROM audit_log WHERE user_name != 'Import' ORDER BY id DESC LIMIT ?`, [limit]);
}
export async function eventStats(db) {
  return all(db, `SELECT status, count(*) n, max(at) last FROM change_events GROUP BY status`);
}

export async function mediaItems(db) {
  return all(db, `SELECT m.id, m.filename, m.mime, m.width, m.height, m.bytes, m.tags, ro.alt alt_ro, en.alt alt_en, ro.description description_ro,
    (SELECT count(*) FROM provenance p WHERE p.entity = 'media' AND p.entity_id = m.id AND p.certainty = 'unrecoverable') lost
    FROM media m LEFT JOIN media_translations ro ON ro.entity_id = m.id AND ro.lang = 'ro' LEFT JOIN media_translations en ON en.entity_id = m.id AND en.lang = 'en' ORDER BY m.id`);
}
