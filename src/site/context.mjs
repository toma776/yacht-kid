// Contextul urmărit (§3.1). Pagina publică nu citește baza direct: fiecare citire trece pe aici, respectă regulile
// de publicare și devine o dependență, cu componenta și motivul ei (§3.2).
// Regulile de publicare stau doar aici: pe site există doar ce e publicat, are traducere în limba paginii
// și, pentru legături, doar ce e confirmat.
import {entity, field, fieldsOf, hasStatus, hasTranslations, publicPath, relation, relTable} from '../registry/derive.mjs';
import {all, one} from '../core/db.mjs';
import {columnOf} from '../core/schema.mjs';

const JSON_TYPES = ['multiselect', 'list', 'links', 'texts', 'table'];

// Rândul din bază → înregistrarea din registru: JSON-urile parsate, cheile străine sub numele câmpului
export function hydrate(key, row) {
  if (!row) return null;
  const rec = {id: row.id, status: row.status, published_at: row.published_at, updated_at: row.updated_at};
  for (const f of fieldsOf(key)) {
    const col = columnOf(f);
    if (!(col in row)) continue;
    const v = row[col];
    rec[f.key] = JSON_TYPES.includes(f.type) && typeof v === 'string' ? JSON.parse(v) : v;
  }
  return rec;
}

// SELECT pe tip, cu traducerea limbii cerute (rândul de bază + coloanele traduse)
export function selectSql(key, {lang, publicOnly}) {
  const e = entity(key);
  const tr = hasTranslations(key);
  const where = [];
  if (publicOnly && hasStatus(key)) where.push(`e.status = 'published'`);
  // Fără traducere în limba paginii, conținutul nu apare; o imagine fără text alternativ EN rămâne însă imagine:
  // traducerea e obligatorie doar când titlul însuși se traduce (articole, pagini, secțiuni)
  if (publicOnly && tr && field(key, e.title)?.translatable) where.push('t.entity_id IS NOT NULL');
  const sql = tr
    ? `SELECT t.*, e.* FROM "${e.table}" e LEFT JOIN "${e.table}_translations" t ON t.entity_id = e.id AND t.lang = ?`
    : `SELECT e.* FROM "${e.table}" e`;
  return {sql, args: tr ? [lang] : [], where};
}

export function createContext(db, lang, {preview = false} = {}) {
  const deps = [];
  let component = '', reason = '';
  const dep = (kind, key, id = null, extra = {}) => deps.push({kind, entity: key, entity_id: id, component, reason, scope: '', ...extra});

  const ctx = {
    lang, deps, db,
    async within(c, r, fn) {
      const prev = [component, reason];
      [component, reason] = [c, r];
      try { return await fn(); } finally { [component, reason] = prev; }
    },

    // O înregistrare citită direct (Date firmă în subsol, un tip de locuință)
    async item(key, id, kind = 'direct') {
      const {sql, args, where} = selectSql(key, {lang, publicOnly: !preview});
      const row = await one(db, `${sql} WHERE ${['e.id = ?', ...where].join(' AND ')}`, [...args, id]);
      dep(row ? kind : 'pending', key, id);
      return hydrate(key, row);
    },

    async single(key) {
      const {sql, args} = selectSql(key, {lang, publicOnly: false});
      const row = await one(db, `${sql} LIMIT 1`, args);
      dep('direct', key, row?.id ?? null);
      return hydrate(key, row);
    },

    // O listă: scope sau câmpurile după care filtrează sunt obligatorii (§3.2, NOU)
    async query(key, {where = '', args: extra = [], scope, fields, order = 'e.id', limit} = {}) {
      if (!scope && !fields) throw new Error(`ctx.query('${key}') fără scope și fără fields (§3.2)`);
      const {sql, args, where: w} = selectSql(key, {lang, publicOnly: !preview});
      const conds = [...w, ...(where ? [where] : [])];
      const rows = await all(db, `${sql}${conds.length ? ` WHERE ${conds.join(' AND ')}` : ''} ORDER BY ${order}${limit ? ` LIMIT ${+limit}` : ''}`, [...args, ...extra]);
      dep('query', key, null, {scope: scope ?? '', fields: fields ? JSON.stringify(fields) : null});
      return rows.map(r => { dep('list', key, r.id); return hydrate(key, r); });
    },

    // Legăturile multiple ale unei înregistrări, în ordine; pe site doar cele confirmate (§1.5)
    async links(relId, srcId) {
      const r = relation(relId);
      const {sql, args, where} = selectSql(r.target, {lang, publicOnly: !preview});
      const conds = ['l.src_id = ?', ...(preview ? [] : [`l.status = 'confirmed'`]), ...where];
      const rows = await all(db, `${sql.replace(/ FROM "([^"]+)" e/, ` FROM "${relTable(r.source, r.field)}" l JOIN "$1" e ON e.id = l.dst_id`)} WHERE ${conds.join(' AND ')} ORDER BY l.position`, [...args, srcId]);
      return rows.map(row => { dep('list', r.target, row.id); return hydrate(r.target, row); });
    },

    // Adresa unei entități în limba paginii; null = nepublicată (linkul devine text)
    async href(key, id) {
      const rec = await ctx.item(key, id, 'link');
      if (!rec) return null;
      return publicPath(key, rec, lang, rec);
    },

    media(id) {
      if (!id) return null;
      dep('media', 'media', id);
      return `/media/${id}/`;
    },

    // Variantele pe lățimi pentru imaginile mari (hero): pe Vercel, Cloudinary le livrează redimensionate și optimizate
    srcset(id) {
      if (!id) return null;
      return [480, 828, 1200, 1920].map(w => `/media/${id}/?w=${w} ${w}w`).join(', ');
    }
  };
  return ctx;
}
