// Scrierea în Brain (§3.3). Orice modificare din /manage trece pe aici și scrie, în aceeași tranzacție:
// 1. modificarea; 2. istoricul (audit_log), cu valoarea veche și nouă a fiecărui câmp; 3. evenimentul (change_events),
// cu starea de dinainte și de după; plus proveniența „manual” a câmpurilor schimbate (§1.4, NOU).
// Validarea vine din registru: tipul câmpului, opțiunile, obligatoriile la publicare, validate(rec) al tipului.
import {entity, field, fieldsOf, hasStatus, hasTranslations, relation, relTable, publicPaths, titleOf} from '../registry/derive.mjs';
import {LANGS, DEFAULT_LANG} from '../registry/langs.mjs';
import {columnOf} from './schema.mjs';
import {trFingerprint} from './fingerprint.mjs';
import {sanitize} from '../import/html.mjs';

const JSON_TYPES = ['multiselect', 'list', 'links', 'texts', 'table'];
const now = () => new Date().toISOString();

export class StoreError extends Error {
  constructor(message, {status = 400, errors = []} = {}) { super(message); this.status = status; this.errors = errors; }
}

// Valoarea din formular → valoarea din bază, după tipul câmpului din registru
function encode(key, f, v) {
  const err = msg => { throw new StoreError(msg, {errors: [{field: f.key, message: msg}]}); };
  if (v === '' || v === undefined) v = null;
  if (v == null) return null;
  switch (f.type) {
    case 'int': case 'money': { const n = Number(String(v).replace(/[\s.]/g, '').replace(',', '.')); if (!Number.isFinite(n)) err(`${f.label}: trebuie să fie un număr.`); return Math.round(n); }
    case 'number': { const n = Number(String(v).replace(',', '.')); if (!Number.isFinite(n)) err(`${f.label}: trebuie să fie un număr.`); return n; }
    case 'boolean': return v === true || v === 1 || v === '1' || v === 'on' ? 1 : 0;
    case 'select': if (!f.options.includes(String(v))) err(`${f.label}: „${v}” nu e o opțiune.`); return String(v);
    case 'multiselect': { const a = [].concat(v); const bad = a.find(x => !f.options.includes(x)); if (bad) err(`${f.label}: „${bad}” nu e o opțiune.`); return JSON.stringify(a); }
    case 'ref': case 'image': { const n = Number(v); if (!Number.isInteger(n)) err(`${f.label}: trimitere invalidă.`); return n; }
    case 'email': if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) err(`${f.label}: adresă de email invalidă.`); return String(v).trim();
    case 'url': if (!/^(https?:\/\/|\/|ref:)/.test(v)) err(`${f.label}: adresa trebuie să înceapă cu https:// sau /.`); return String(v).trim();
    case 'slug': { const s = String(v).trim().toLowerCase(); if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(s) && s !== '') err(`${f.label}: doar litere mici, cifre și cratime.`); return s; }
    // §1.8: textul bogat are un vocabular fix; restul se scoate la salvare
    case 'richtext': return sanitize(String(v)).html || null;
    default:
      if (JSON_TYPES.includes(f.type)) return JSON.stringify(typeof v === 'string' ? JSON.parse(v) : v);
      if (f.max && String(v).length > f.max) err(`${f.label}: cel mult ${f.max} caractere.`);
      return String(v);
  }
}
const decode = (f, v) => (v != null && JSON_TYPES.includes(f.type) ? JSON.parse(v) : v);

async function readRecord(tx, key, id) {
  const e = entity(key);
  const base = (await tx.execute({sql: `SELECT * FROM "${e.table}" WHERE id = ?`, args: [id]})).rows[0];
  if (!base) throw new StoreError(`${e.one} #${id} nu există.`, {status: 404});
  const tr = {};
  if (hasTranslations(key))
    for (const r of (await tx.execute({sql: `SELECT * FROM "${e.table}_translations" WHERE entity_id = ?`, args: [id]})).rows) tr[r.lang] = {...r};
  return {base: {...base}, tr};
}

// Înregistrarea, cum o vede registrul (pentru validate, titlu și adrese)
function view(key, base, trRow) {
  const rec = {id: base.id, status: base.status};
  for (const f of fieldsOf(key)) {
    const col = columnOf(f);
    if (f.translatable) { if (trRow && col in trRow) rec[f.key] = decode(f, trRow[col]); }
    else if (col in base) rec[f.key] = decode(f, base[col]);
  }
  return rec;
}
const snap = (key, rec) => {
  const trBy = {};
  for (const l of LANGS) if (rec.tr[l]) trBy[l] = view(key, rec.base, rec.tr[l]);
  const ro = view(key, rec.base, rec.tr[DEFAULT_LANG]);
  return {status: rec.base.status ?? null, title: titleOf(key, ro, ro), paths: publicPaths(key, ro, trBy)};
};

async function manualSource(tx, user) {
  const url = `manual:${user}`;
  await tx.execute({sql: `INSERT INTO sources (kind, url, title, method, created_at) VALUES ('manual', ?, ?, 'manage', ?) ON CONFLICT (url) DO NOTHING`, args: [url, `Editare în /manage — ${user}`, now()]});
  return (await tx.execute({sql: 'SELECT id FROM sources WHERE url = ?', args: [url]})).rows[0].id;
}

function required(key, base, tr) {
  const errors = [];
  for (const f of fieldsOf(key).filter(f => f.required && f.type !== 'refs')) {
    const v = f.translatable ? tr[DEFAULT_LANG]?.[columnOf(f)] : base[columnOf(f)];
    if (v == null || v === '') errors.push({field: f.key, lang: f.translatable ? DEFAULT_LANG : undefined, message: `${f.label} e obligatoriu pentru publicare.`});
  }
  return errors;
}

async function inTx(db, fn) {
  const tx = await db.transaction('write');
  try { const r = await fn(tx); await tx.commit(); return r; } catch (e) {
    await tx.rollback();
    if (/UNIQUE constraint failed: .*slug/.test(e.message)) throw new StoreError('Adresa (slug) e deja folosită în această limbă.', {status: 409, errors: [{field: 'slug', message: 'Slug deja folosit'}]});
    if (/UNIQUE constraint failed/.test(e.message)) throw new StoreError('Valoarea trebuie să fie unică și există deja.', {status: 409});
    if (/FOREIGN KEY constraint failed/.test(e.message)) throw new StoreError('Înregistrarea e folosită de altele și nu poate fi ștearsă sau schimbată așa.', {status: 409});
    throw e;
  }
}

async function emit(tx, user, action, key, id, before, after, extra = {}) {
  await tx.execute({sql: `INSERT INTO change_events (at, user_name, action, entity, entity_id, label, payload, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    args: [now(), user, action, key, id, (after ?? before)?.title ?? null, JSON.stringify({before, after, ...extra})]});
}
async function audit(tx, user, action, key, id, label, changes) {
  await tx.execute({sql: 'INSERT INTO audit_log (at, user_name, action, entity, entity_id, label, changes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [now(), user, action, key, id, label, JSON.stringify(changes)]});
}

// Salvarea unei înregistrări: câmpurile comune (base), textele pe limbă (tr) și legăturile multiple (links)
export async function saveEntity(db, key, id, {base = {}, tr = {}, links = {}, status, expectedUpdatedAt} = {}, {user = 'Panou'} = {}) {
  const e = entity(key);
  if (!e) throw new StoreError(`Tipul ${key} nu există.`, {status: 404});
  return inTx(db, async tx => {
    const before = await readRecord(tx, key, id);
    // Blocare optimistă (§1.8): dacă a salvat altcineva între timp, nu suprascriem
    if (expectedUpdatedAt && before.base.updated_at !== expectedUpdatedAt)
      throw new StoreError(`${e.one} a fost modificat între timp (${before.base.updated_by ?? '?'}, ${before.base.updated_at}). Reîncarcă pagina.`, {status: 409});
    const changes = {}, at = now();
    const set = {};
    for (const [k, v] of Object.entries(base)) {
      const f = field(key, k);
      if (!f || f.translatable || f.type === 'refs') throw new StoreError(`${k} nu e un câmp comun al tipului ${e.one}.`);
      if (f.readonly) continue;
      const col = columnOf(f), val = encode(key, f, v);
      if (String(val ?? '') !== String(before.base[col] ?? '')) { set[col] = val; changes[k] = [before.base[col] ?? null, val]; }
    }
    if (status && hasStatus(key) && status !== before.base.status) { set.status = status; changes.status = [before.base.status, status]; if (status === 'published' && !before.base.published_at) set.published_at = at; }
    const trSet = {};
    for (const [lang, vals] of Object.entries(tr)) {
      if (!LANGS.includes(lang)) throw new StoreError(`Limba ${lang} nu e folosită pe site.`);
      for (const [k, v] of Object.entries(vals ?? {})) {
        const f = field(key, k);
        if (!f?.translatable) throw new StoreError(`${k} nu se traduce.`);
        if (f.readonly) continue;
        const col = columnOf(f), val = encode(key, f, v);
        if (String(val ?? '') !== String(before.tr[lang]?.[col] ?? '')) { (trSet[lang] ??= {})[col] = val; changes[`${lang}.${k}`] = [before.tr[lang]?.[col] ?? null, val]; }
      }
    }
    // Starea rezultată: la publicare, câmpurile obligatorii și validate(rec) al tipului trebuie să treacă
    const afterBase = {...before.base, ...set};
    const afterTr = Object.fromEntries(LANGS.map(l => [l, before.tr[l] || trSet[l] ? {...(before.tr[l] ?? {}), ...(trSet[l] ?? {})} : null]).filter(([, v]) => v));
    const rec = view(key, afterBase, afterTr[DEFAULT_LANG]);
    const trViews = Object.fromEntries(Object.entries(afterTr).map(([l, t]) => [l, view(key, afterBase, t)]));
    const checks = [...(e.validate?.(rec, {tr: trViews, changed: Object.keys(trSet)}) ?? [])];
    const publishing = !hasStatus(key) || afterBase.status === 'published';
    if (publishing) checks.push(...required(key, afterBase, afterTr));
    const errors = checks.filter(c => c.level !== 'warning');
    if (errors.length) throw new StoreError(errors.map(x => x.message).join(' '), {errors});

    if (Object.keys(set).length)
      await tx.execute({sql: `UPDATE "${e.table}" SET ${Object.keys(set).map(c => `"${c}" = ?`).join(', ')}, updated_at = ?, updated_by = ? WHERE id = ?`, args: [...Object.values(set), at, user, id]});
    const roFp = trFingerprint(key, afterTr[DEFAULT_LANG]);
    for (const [lang, cols] of Object.entries(trSet)) {
      const extra = lang === DEFAULT_LANG ? {} : {source_fp: roFp, translated_at: at, translated_by: user};
      const all = {...cols, ...extra, updated_at: at};
      const n = Object.keys(all);
      await tx.execute({sql: `INSERT INTO "${e.table}_translations" (entity_id, lang, ${n.map(c => `"${c}"`).join(', ')}) VALUES (?, ?, ${n.map(() => '?').join(', ')})
        ON CONFLICT (entity_id, lang) DO UPDATE SET ${n.map(c => `"${c}" = excluded."${c}"`).join(', ')}`, args: [id, lang, ...Object.values(all)]});
    }
    // Legăturile multiple, din capătul care le deține (§2.2)
    const touched = [];
    for (const [fk, ids] of Object.entries(links)) {
      const r = await replaceLinks(tx, `${key}.${fk}`, id, ids, user);
      if (r.changed) { changes[`legături.${fk}`] = [r.before, r.after]; touched.push(...r.touched); }
    }
    if (!Object.keys(changes).length) return {id, changed: [], warnings: checks.filter(c => c.level === 'warning'), updated_at: before.base.updated_at};
    if (!Object.keys(set).length) await tx.execute({sql: `UPDATE "${e.table}" SET updated_at = ?, updated_by = ? WHERE id = ?`, args: [at, user, id]});
    // Proveniența editărilor manuale (§1.4, NOU): sursa e omul, certitudinea e „confirmată”
    const src = await manualSource(tx, user);
    for (const k of Object.keys(changes).filter(k => !k.startsWith('legături.') && k !== 'status')) {
      const [lang, f] = k.includes('.') ? k.split('.') : ['', k];
      await tx.execute({sql: `INSERT OR REPLACE INTO provenance (entity, entity_id, field, lang, source_id, method, certainty, verified_at, verified_by, created_at)
        VALUES (?, ?, ?, ?, ?, 'manual', 'confirmed', ?, ?, ?)`, args: [key, id, f, lang, src, at, user, at]});
    }
    const after = await readRecord(tx, key, id);
    const label = snap(key, after).title;
    await audit(tx, user, changes.status ? (afterBase.status === 'published' ? 'publish' : 'status') : 'update', key, id, label, changes);
    await emit(tx, user, 'update', key, id, snap(key, before), snap(key, after), {touched});
    return {id, changed: Object.keys(changes), warnings: checks.filter(c => c.level === 'warning'), updated_at: after.base.updated_at};
  });
}

// O înregistrare nouă: ciornă, cu câmpurile primite; publicarea se face apoi, după validare
export async function createEntity(db, key, {base = {}, tr = {}} = {}, {user = 'Panou'} = {}) {
  const e = entity(key);
  if (!e || e.creatable === false || e.singleton) throw new StoreError(`${e?.label ?? key}: nu se pot crea înregistrări din /manage.`);
  const id = await inTx(db, async tx => {
    const at = now();
    const cols = {created_at: at, updated_at: at, created_by: user, updated_by: user};
    if (hasStatus(key)) cols.status = 'draft';
    const r = await tx.execute({sql: `INSERT INTO "${e.table}" (${Object.keys(cols).join(', ')}) VALUES (${Object.keys(cols).map(() => '?').join(', ')})`, args: Object.values(cols)});
    const newId = Number(r.lastInsertRowid);
    await audit(tx, user, 'create', key, newId, null, {});
    return newId;
  });
  if (Object.keys(base).length || Object.keys(tr).length) await saveEntity(db, key, id, {base, tr}, {user});
  return id;
}

// Înlocuiește lista legăturilor unei relații multiple. Legăturile păstrate își păstrează starea și sursa;
// cele noi sunt confirmate (le-a pus un om); cele scoase care erau deduse se țin minte ca respinse (§1.5).
async function replaceLinks(tx, relId, srcId, ids, user) {
  const r = relation(relId);
  if (!r || r.cardinality !== 'M:N') throw new StoreError(`${relId} nu e o relație multiplă.`);
  const t = relTable(r.source, r.field);
  const cur = (await tx.execute({sql: `SELECT dst_id, status FROM "${t}" WHERE src_id = ? ORDER BY position`, args: [srcId]})).rows;
  // Un element poate fi un ID sau {id, confirm: true}: legătura dedusă e confirmată pe loc de omul care o vede
  const items = ids.map(x => (typeof x === 'object' ? {id: Number(x.id), confirm: !!x.confirm} : {id: Number(x), confirm: false}));
  const want = [...new Set(items.map(x => x.id))];
  const confirm = new Set(items.filter(x => x.confirm).map(x => x.id));
  const before = cur.map(x => x.dst_id), at = now();
  let confirmed = 0;
  for (const x of cur.filter(x => confirm.has(x.dst_id) && x.status !== 'confirmed'))
    confirmed += (await tx.execute({sql: `UPDATE "${t}" SET status = 'confirmed', note = coalesce(note, '') || ? WHERE src_id = ? AND dst_id = ?`, args: [` · confirmat de ${user}`, srcId, x.dst_id]})).rowsAffected;
  for (const x of cur.filter(x => !want.includes(x.dst_id))) {
    await tx.execute({sql: `DELETE FROM "${t}" WHERE src_id = ? AND dst_id = ?`, args: [srcId, x.dst_id]});
    if (x.status !== 'confirmed') await tx.execute({sql: 'INSERT OR REPLACE INTO link_dismissals (relation, src_id, dst_id, evidence, at, by) VALUES (?, ?, ?, ?, ?, ?)', args: [relId, srcId, x.dst_id, 'scoasă din /manage', at, user]});
  }
  for (const [pos, dst] of want.entries()) {
    if (before.includes(dst)) await tx.execute({sql: `UPDATE "${t}" SET position = ? WHERE src_id = ? AND dst_id = ?`, args: [pos, srcId, dst]});
    else await tx.execute({sql: `INSERT INTO "${t}" (src_id, dst_id, position, status, created_at, created_by) VALUES (?, ?, ?, 'confirmed', ?, ?)`, args: [srcId, dst, pos, at, user]});
  }
  const changed = confirmed > 0 || JSON.stringify(before) !== JSON.stringify(want);
  return {changed, before, after: want, touched: [...new Set([...before, ...want])].map(d => `${r.target}:${d}`)};
}

// „Legături de verificat” (§2.5): confirmarea sau scoaterea în masă, într-o singură tranzacție, cu un singur eveniment
export async function decideLinks(db, relId, pairs, decision, {user = 'Panou'} = {}) {
  if (!['confirm', 'dismiss'].includes(decision)) throw new StoreError('Decizie necunoscută.');
  if (pairs.length > 5000) throw new StoreError('Cel mult 5.000 de perechi o dată.');
  const r = relation(relId);
  if (!r || r.cardinality !== 'M:N') throw new StoreError(`${relId} nu e o relație multiplă.`);
  const t = relTable(r.source, r.field);
  return inTx(db, async tx => {
    const at = now();
    let n = 0;
    for (const [src, dst] of pairs) {
      if (decision === 'confirm') n += (await tx.execute({sql: `UPDATE "${t}" SET status = 'confirmed', note = coalesce(note, '') || ? WHERE src_id = ? AND dst_id = ? AND status != 'confirmed'`, args: [` · confirmat de ${user}`, src, dst]})).rowsAffected;
      else {
        n += (await tx.execute({sql: `DELETE FROM "${t}" WHERE src_id = ? AND dst_id = ?`, args: [src, dst]})).rowsAffected;
        await tx.execute({sql: 'INSERT OR REPLACE INTO link_dismissals (relation, src_id, dst_id, evidence, at, by) VALUES (?, ?, ?, ?, ?, ?)', args: [relId, src, dst, 'respinsă în Legături de verificat', at, user]});
      }
      await audit(tx, user, decision === 'confirm' ? 'link-confirm' : 'link-dismiss', r.source, src, `${relId} → ${r.target}:${dst}`, {[`legături.${r.field}`]: [null, dst]});
    }
    const touched = [...new Set(pairs.flatMap(([s, d]) => [`${r.source}:${s}`, `${r.target}:${d}`]))];
    if (n) await emit(tx, user, decision === 'confirm' ? 'links-confirm' : 'links-dismiss', r.source, null, null, {title: `${n} legături ${relId}`}, {touched});
    return {changed: n};
  });
}
