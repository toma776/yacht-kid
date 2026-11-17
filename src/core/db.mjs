// Conexiunea la Brain: Postgres, cu aceeași interfață pe care o folosea clientul libSQL (execute, batch, transaction,
// close; rânduri ca obiecte; rowsAffected; lastInsertRowid), ca restul codului să nu se schimbe:
// - Vercel: Neon, din DATABASE_URL (pus de integrarea Neon din Marketplace);
// - local: PGlite (Postgres încorporat, în data/pg), servit pe 127.0.0.1:5433 de scripts/db-local.mjs
//   (`npm run dev` îl pornește singur; scripturile se conectează la același server).
// Interogările sunt scrise cu `?` și câteva forme SQLite (INSERT OR IGNORE/REPLACE, COLLATE NOCASE, PRAGMA table_info):
// adaptorul le traduce aici, într-un singur loc.
import pg from 'pg';
import {Pool as NeonPool, neonConfig, types as neonTypes} from '@neondatabase/serverless';
import {migrateClient} from './schema.mjs';

export const LOCAL_URL = 'postgres://postgres@127.0.0.1:5433/postgres';

// Numerele mari (count, sum) vin din Postgres ca text; în cod au fost mereu numere
for (const t of [pg.types, neonTypes]) {
  t.setTypeParser(20, v => (v == null ? null : Number(v)));     // int8
  t.setTypeParser(1700, v => (v == null ? null : Number(v)));   // numeric
}

// Cheile după care „INSERT OR REPLACE” devine o actualizare (tabelele care îl folosesc)
const REPLACE_KEYS = {
  provenance: ['entity', 'entity_id', 'field', 'lang', 'source_id'], link_dismissals: ['relation', 'src_id', 'dst_id'],
  meta: ['key'], settings: ['key'], validations: ['entity', 'entity_id'], aliases: ['entity', 'alias'],
  import_keys: ['entity', 'natural_key'], page_index: ['path']
};

// `?` → $1, $2…, în afara textelor și a numelor între ghilimele
function placeholders(sql) {
  let out = '', n = 0, quote = null;
  for (const ch of sql) {
    if (quote) { if (ch === quote) quote = null; out += ch; continue; }
    if (ch === "'" || ch === '"') { quote = ch; out += ch; continue; }
    out += ch === '?' ? `$${++n}` : ch;
  }
  return out;
}

const withConflict = (sql, clause) => (/\bRETURNING\b/i.test(sql) ? sql.replace(/\s+RETURNING\b/i, ` ${clause} RETURNING`) : `${sql.replace(/;\s*$/, '')} ${clause}`);

export function translate(sql) {
  let s = sql.trim();
  if (/^PRAGMA\s+(foreign_keys|busy_timeout|journal_mode)/i.test(s)) return null;
  const info = s.match(/^PRAGMA\s+table_info\(\s*"?([\w]+)"?\s*\)$/i);
  if (info) return `SELECT column_name AS name FROM information_schema.columns WHERE table_schema = current_schema() AND table_name = '${info[1]}' ORDER BY ordinal_position`;
  if (/^INSERT\s+OR\s+IGNORE\s+INTO/i.test(s)) s = withConflict(s.replace(/^INSERT\s+OR\s+IGNORE\s+INTO/i, 'INSERT INTO'), 'ON CONFLICT DO NOTHING');
  const rep = s.match(/^INSERT\s+OR\s+REPLACE\s+INTO\s+"?(\w+)"?\s*\(([^)]*)\)/i);
  if (rep) {
    const keys = REPLACE_KEYS[rep[1]];
    if (!keys) throw new Error(`INSERT OR REPLACE în ${rep[1]}: cheia de conflict nu e cunoscută (src/core/db.mjs, REPLACE_KEYS).`);
    const cols = rep[2].split(',').map(c => c.trim().replace(/"/g, '')).filter(c => !keys.includes(c));
    s = withConflict(s.replace(/^INSERT\s+OR\s+REPLACE\s+INTO/i, 'INSERT INTO'),
      `ON CONFLICT (${keys.map(k => `"${k}"`).join(', ')}) DO ${cols.length ? `UPDATE SET ${cols.map(c => `"${c}" = EXCLUDED."${c}"`).join(', ')}` : 'NOTHING'}`);
  }
  s = s.replace(/([\w."]+)\s+COLLATE\s+NOCASE/gi, 'lower($1)').replace(/\bLIKE\b/g, 'ILIKE');
  return placeholders(s);
}

const arg = v => (typeof v === 'boolean' ? (v ? 1 : 0) : typeof v === 'bigint' ? Number(v) : v === undefined ? null : v);

// Tabelele cu coloana id: un INSERT fără RETURNING primește „RETURNING id”, ca lastInsertRowid să existe ca în libSQL
async function idTables(q) {
  const {rows} = await q(`SELECT table_name FROM information_schema.columns WHERE table_schema = current_schema() AND column_name = 'id'`);
  return new Set(rows.map(r => r.table_name));
}

function runner(query, ids) {
  return async function execute(stmt, args = []) {
    const {sql, args: a} = typeof stmt === 'string' ? {sql: stmt, args} : {sql: stmt.sql, args: stmt.args ?? []};
    let text = translate(sql);
    if (text == null) return {rows: [], rowsAffected: 0, columns: []};
    const ins = text.match(/^INSERT\s+INTO\s+"?(\w+)"?/i);
    let addedReturning = false;
    if (ins && !/\bRETURNING\b/i.test(text) && (await ids()).has(ins[1])) { text = `${text} RETURNING id`; addedReturning = true; }
    const r = await query(text, (a ?? []).map(arg));
    const rows = r.rows ?? [];
    return {rows: addedReturning ? [] : rows, rowsAffected: r.rowCount ?? 0, lastInsertRowid: addedReturning ? rows[0]?.id : undefined, columns: (r.fields ?? []).map(f => f.name)};
  };
}

// Local, serverul PGlite are o singură conexiune: când e ocupată (un script, o altă cerere), o conexiune nouă e refuzată;
// reîncercăm câteva secunde în loc să cădem. Pe Neon nu se întâmplă, deci nu se reîncearcă.
const BUSY = /ECONNRESET|ECONNREFUSED|Connection terminated|timeout exceeded when trying to connect/;
async function patient(fn, tries) {
  for (let i = 0; ; i++) {
    try { return await fn(); } catch (e) {
      if (i >= tries || !BUSY.test(e.message ?? e.code ?? '')) throw e;
      await new Promise(r => setTimeout(r, 100 + i * 50));
    }
  }
}

class Client {
  constructor(pool, {local = false} = {}) {
    this.pool = pool;
    this.tries = local ? 60 : 0;
    const query = (t, a) => patient(() => pool.query(t, a), this.tries);
    let cache;
    // Lista tabelelor cu id e ținută minte doar dacă a reușit
    this.ids = () => (cache ??= idTables(query).catch(e => { cache = null; throw e; }));
    // După crearea tabelelor (prima pornire pe o bază goală), lista se recitește
    this.resetIds = () => { cache = null; };
    this.execute = runner(query, this.ids);
  }
  // O tranzacție pe o singură conexiune; interfața libSQL: execute, commit, rollback, close
  async transaction() {
    // Lista tabelelor cu id se citește înainte: în tranzacție, local nu există o a doua conexiune pentru ea
    await this.ids();
    const conn = await patient(() => this.pool.connect(), this.tries);
    await conn.query('BEGIN');
    let open = true;
    const end = async sql => { if (!open) return; open = false; try { await conn.query(sql); } finally { conn.release(); } };
    return {execute: runner((t, a) => conn.query(t, a), this.ids), commit: () => end('COMMIT'), rollback: () => end('ROLLBACK'), close: () => end('ROLLBACK')};
  }
  async batch(stmts) {
    const tx = await this.transaction();
    try { const out = []; for (const s of stmts) out.push(await tx.execute(s)); await tx.commit(); return out; }
    catch (e) { await tx.rollback(); throw e; }
  }
  close() { return this.pool.end(); }
}

export function openDb({url = process.env.DATABASE_URL} = {}) {
  if (!url) {
    // Pe Vercel nu există bază locală: fără Neon configurat, refuzăm în loc să ghicim
    if (process.env.VERCEL) throw new Error('DATABASE_URL lipsește: instalează integrarea Neon pe proiectul Vercel.');
    url = LOCAL_URL;
  }
  if (/neon\.tech/.test(url)) {
    if (typeof WebSocket !== 'undefined') neonConfig.webSocketConstructor = WebSocket;
    return new Client(new NeonPool({connectionString: url, max: 5}));
  }
  // Local: serverul PGlite are o singură conexiune reală; conexiunile se eliberează repede, ca scripturile să intre și ele
  return new Client(new pg.Pool({connectionString: url, max: 1, idleTimeoutMillis: 300}), {local: true});
}

export async function prepare(client) {
  await migrateClient(client);
  client.resetIds?.();
  return client;
}

// O singură conexiune pe proces (o instanță de funcție pe Vercel, procesul de dezvoltare local)
let shared;
// Un eșec (baza locală oprită, Neon indisponibil) nu rămâne ținut minte: următoarea cerere încearcă din nou
export const getDb = () => (shared ??= prepare(openDb()).catch(e => { shared = null; throw e; }));

export const plain = rows => rows.map(r => ({...r}));
export const one = async (db, sql, args = []) => (await db.execute({sql, args})).rows[0] ?? null;
export const all = async (db, sql, args = []) => plain((await db.execute({sql, args})).rows);

// O bază Postgres în memorie (PGlite, în același proces): pentru teste. Aceeași interfață ca openDb()
export async function memoryDb() {
  const {PGlite, types} = await import('@electric-sql/pglite');
  const pgl = await PGlite.create({parsers: {[types.INT8]: v => Number(v), [types.NUMERIC]: v => Number(v)}});
  const query = async (t, a) => { const r = await pgl.query(t, a); return {rows: r.rows, rowCount: r.affectedRows ?? 0, fields: r.fields}; };
  return new Client({query, connect: async () => ({query, release() {}}), end: () => pgl.close()});
}
