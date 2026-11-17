// Copia întregii baze, tabel cu tabel, într-o singură tranzacție (cheile străine se verifică la final):
//   npm run db:push        Postgres-ul local → Neon (DATABASE_URL din .env.local / .env.neon.local)
//   npm run db:pull        Neon → Postgres-ul local (de exemplu după editări în /manage pe Vercel)
//   npm run db:export      Postgres-ul local → data/brain-export.json.gz (copia din repo, pentru transferul la client)
//   npm run db:seed        data/brain-export.json.gz → Neon (clientul, o dată, în baza lui nouă)
//   npm run db:from-sqlite data/brain.db (vechiul Brain SQLite) → Postgres-ul local, o dată
// Ținta e golită și rescrisă; schema o creează prepare() din registru. După copiere, numărătoarele de ID-uri continuă de la
// cel mai mare ID. La push: dacă pe Neon există testimoniale trimise de pe site care lipsesc local, copierea se oprește
// (le-ar șterge) — întâi `npm run db:pull`.
import {join} from 'node:path';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {gzipSync, gunzipSync} from 'node:zlib';
import {openDb, prepare, all, LOCAL_URL} from '../src/core/db.mjs';

const EXPORT = join(process.cwd(), 'data', 'brain-export.json.gz');
// Tabelele care nu pleacă în copia din repo: sesiunile și încercările de autentificare sunt ale serverului care le-a creat
const NOT_EXPORTED = new Set(['sessions', 'login_attempts']);
for (const f of ['.env.local', '.env.neon.local']) if (!process.env.DATABASE_URL && existsSync(f)) process.loadEnvFile(f);

const opt = k => process.argv[process.argv.indexOf(`--${k}`) + 1];
const from = opt('from'), to = opt('to');
if (!['sqlite', 'local', 'neon', 'file'].includes(from) || !['local', 'neon', 'file'].includes(to) || from === to) {
  console.error('Folosire: node scripts/pg-copy.mjs --from sqlite|local|neon|file --to local|neon|file'); process.exit(1);
}
if ((from === 'neon' || to === 'neon') && !process.env.DATABASE_URL)
  { console.error('  ✗ DATABASE_URL lipsește: rulați `npx vercel env pull .env.local` (baza Neon trebuie să fie legată de proiect).'); process.exit(1); }
if (from === 'file' && !existsSync(EXPORT)) { console.error(`  ✗ Nu există ${EXPORT}.`); process.exit(1); }
const urlOf = k => (k === 'local' ? LOCAL_URL : process.env.DATABASE_URL);

// Sursa: rândurile unui tabel, sau null dacă tabelul nu există acolo
async function openSource() {
  if (from === 'file') {
    const {tables} = JSON.parse(gunzipSync(readFileSync(EXPORT)).toString('utf8'));
    return {rows: async t => tables[t] ?? null, close() {}, guard: null};
  }
  const db = from === 'sqlite'
    ? (await import('@libsql/client')).createClient({url: `file:${join(process.cwd(), 'data', 'brain.db')}`})
    : openDb({url: urlOf(from)});
  return {rows: async t => { try { return (await db.execute(`SELECT * FROM "${t}"`)).rows; } catch { return null; } }, close: () => db.close?.(), guard: db};
}
const source = await openSource();
const quote = s => `"${s}"`;
const plainRow = r => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === 'bigint' ? Number(v) : v]));

// Exportul: tabelele bazei locale, într-un JSON comprimat
if (to === 'file') {
  const db = await prepare(openDb({url: LOCAL_URL}));
  const names = (await all(db, `SELECT table_name AS t FROM information_schema.tables WHERE table_schema = current_schema() AND table_type = 'BASE TABLE' ORDER BY 1`)).map(r => r.t);
  const tables = {};
  let total = 0;
  for (const t of names.filter(t => !NOT_EXPORTED.has(t))) { const rows = (await source.rows(t)) ?? []; tables[t] = rows.map(plainRow); total += rows.length; }
  writeFileSync(EXPORT, gzipSync(JSON.stringify({exported_at: new Date().toISOString(), tables})));
  console.log(`  ✓ ${total} rânduri din ${Object.keys(tables).length} tabele în data/brain-export.json.gz`);
  await db.close(); await source.close(); process.exit(0);
}

const target = await prepare(openDb({url: urlOf(to)}));
// Tabelele țintei (create din registru) și coloanele lor; din sursă se copiază doar ce există și în țintă
const cols = new Map();
for (const r of await all(target, `SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = current_schema() ORDER BY ordinal_position`))
  (cols.get(r.t) ?? cols.set(r.t, []).get(r.t)).push(r.c);
const tables = [...cols.keys()];

if (to === 'neon' && from === 'local') {
  const remote = await all(target, `SELECT id, author FROM testimonials WHERE source = 'site'`).catch(() => []);
  const local = new Set((await all(source.guard, `SELECT id FROM testimonials WHERE source = 'site'`).catch(() => [])).map(r => r.id));
  const lost = remote.filter(r => !local.has(r.id));
  if (lost.length) {
    console.error(`  ✗ Pe Neon sunt ${lost.length} testimoniale trimise de pe site care nu există local (${lost.map(r => `#${r.id}`).join(', ')}).`);
    console.error('    Rulează întâi `npm run db:pull`, altfel copierea le-ar șterge.');
    process.exit(1);
  }
}

const tx = await target.transaction();
try {
  await tx.execute(`TRUNCATE ${tables.map(quote).join(', ')} RESTART IDENTITY CASCADE`);
  let total = 0;
  for (const t of tables) {
    const rows = await source.rows(t);
    if (!rows?.length) continue;
    const have = cols.get(t).filter(c => c in rows[0]);
    // Câte 200 de rânduri pe INSERT, cu parametri numerotați direct ($n), ca să nu treacă prin traducerea „?”
    for (let i = 0; i < rows.length; i += 200) {
      const chunk = rows.slice(i, i + 200), args = [];
      const values = chunk.map(r => `(${have.map(c => { const v = r[c]; args.push(typeof v === 'bigint' ? Number(v) : v === undefined ? null : v); return `$${args.length}`; }).join(', ')})`);
      await tx.execute({sql: `INSERT INTO ${quote(t)} (${have.map(quote).join(', ')}) OVERRIDING SYSTEM VALUE VALUES ${values.join(', ')}`, args});
    }
    total += rows.length;
    if (cols.get(t).includes('id')) await tx.execute(`SELECT setval(pg_get_serial_sequence('${quote(t)}', 'id'), coalesce((SELECT max(id) FROM ${quote(t)}), 0) + 1, false)`);
  }
  await tx.commit();
  console.log(`  ✓ ${from} → ${to}: ${total} rânduri în ${tables.length} tabele`);
} catch (e) {
  await tx.rollback();
  console.error(`  ✗ Copierea a eșuat; ținta a rămas cum era. ${e.message}`);
  process.exitCode = 1;
}
await target.close();
await source.close();
