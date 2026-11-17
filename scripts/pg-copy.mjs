// Copia întregii baze, tabel cu tabel, într-o singură tranzacție (cheile străine se verifică la final):
//   node scripts/pg-copy.mjs --from sqlite --to local      data/brain.db (vechiul Brain SQLite) → Postgres-ul local, o dată
//   npm run db:push                                         Postgres-ul local → Neon (DATABASE_URL din .env.neon.local)
//   npm run db:pull                                         Neon → Postgres-ul local (de exemplu după editări în /manage pe Vercel)
//   --from source --to neon                                 SOURCE_DATABASE_URL → DATABASE_URL (transferul la client, scripts/transfer-client.mjs)
// Ținta e golită și rescrisă; schema o creează prepare() din registru. După copiere, numărătoarele de ID-uri continuă de la
// cel mai mare ID. La push: dacă pe Neon există testimoniale trimise de pe site care lipsesc local, copierea se oprește
// (le-ar șterge) — întâi `npm run db:pull` sau aprobarea lor local.
import {join} from 'node:path';
import {createClient} from '@libsql/client';
import {openDb, prepare, all, LOCAL_URL} from '../src/core/db.mjs';

const opt = k => process.argv[process.argv.indexOf(`--${k}`) + 1];
const from = opt('from'), to = opt('to');
const urlOf = k => (k === 'local' ? LOCAL_URL : k === 'neon' ? process.env.DATABASE_URL : k === 'source' ? process.env.SOURCE_DATABASE_URL : null);
if (!['sqlite', 'local', 'neon', 'source'].includes(from) || !['local', 'neon'].includes(to) || from === to) {
  console.error('Folosire: node scripts/pg-copy.mjs --from sqlite|local|neon|source --to local|neon'); process.exit(1);
}
if (from === 'source' && !process.env.SOURCE_DATABASE_URL) { console.error('SOURCE_DATABASE_URL lipsește (baza de la care se copiază).'); process.exit(1); }
if ((from === 'neon' || to === 'neon') && !process.env.DATABASE_URL) { console.error('DATABASE_URL lipsește (vezi .env.neon.local).'); process.exit(1); }

const source = from === 'sqlite' ? createClient({url: `file:${join(process.cwd(), 'data', 'brain.db')}`}) : openDb({url: urlOf(from)});
const target = await prepare(openDb({url: urlOf(to)}));

// Tabelele țintei (create din registru) și coloanele lor; din sursă se copiază doar ce există și în țintă
const cols = new Map();
for (const r of await all(target, `SELECT table_name AS t, column_name AS c FROM information_schema.columns WHERE table_schema = current_schema() ORDER BY ordinal_position`))
  (cols.get(r.t) ?? cols.set(r.t, []).get(r.t)).push(r.c);
const tables = [...cols.keys()];

if (to === 'neon' && from !== 'source') {
  const remote = await all(target, `SELECT id, author FROM testimonials WHERE source = 'site'`).catch(() => []);
  const local = new Set((await all(source, `SELECT id FROM testimonials WHERE source = 'site'`).catch(() => [])).map(r => r.id));
  const lost = remote.filter(r => !local.has(r.id));
  if (lost.length) {
    console.error(`  ✗ Pe Neon sunt ${lost.length} testimoniale trimise de pe site care nu există local (${lost.map(r => `#${r.id}`).join(', ')}).`);
    console.error('    Rulează întâi `npm run db:pull` (sau copiază-le local), altfel copierea le-ar șterge.');
    process.exit(1);
  }
}

const quote = s => `"${s}"`;
const tx = await target.transaction();
try {
  await tx.execute(`TRUNCATE ${tables.map(quote).join(', ')} RESTART IDENTITY CASCADE`);
  let total = 0;
  for (const t of tables) {
    let rows;
    try { rows = (await source.execute(`SELECT * FROM ${quote(t)}`)).rows; } catch { continue; }   // tabel nou, inexistent în sursă
    if (!rows.length) continue;
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
if (source.close) await source.close();
