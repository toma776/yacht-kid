// Baza locală (data/brain.db) → Turso, ca site-ul de pe Vercel să aibă conținutul lucrat local.
//   node --env-file=.env.turso.local scripts/turso-push.mjs --backup            doar copia de siguranță a bazei Turso
//   node --env-file=.env.turso.local scripts/turso-push.mjs --push              copia de siguranță, apoi înlocuirea
//   node --env-file=.env.turso.local scripts/turso-push.mjs --restore <fișier>  pune înapoi o copie de siguranță
// Copia: data/backups/turso-<data>.json (structura și toate rândurile; data/ e ignorat de git).
// Înlocuirea: toate tabelele, într-o singură tranzacție (reușește complet sau nu schimbă nimic), cu cheile străine
// verificate abia la final. Coloanele se scriu după nume: ordinea lor poate diferi între baze (ALTER adaugă la final).
import {createClient} from '@libsql/client';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {join} from 'node:path';

const [mode, file] = process.argv.slice(2);
if (!['--backup', '--push', '--restore'].includes(mode)) { console.error('Folosire: --backup | --push | --restore <fișier>'); process.exit(1); }
if (!process.env.TURSO_DATABASE_URL) { console.error('TURSO_DATABASE_URL lipsește (vezi .env.turso.local).'); process.exit(1); }

const root = process.cwd();
const turso = createClient({url: process.env.TURSO_DATABASE_URL, authToken: process.env.TURSO_AUTH_TOKEN});
const rows = async (db, sql) => (await db.execute(sql)).rows.map(r => ({...r}));
// Tabelele de date (fără cele interne ale SQLite: sqlite_sequence se actualizează singur la inserare)
const tableNames = async db => (await rows(db, "SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '_litestream%' ORDER BY name")).map(r => r.name);

async function snapshot(db) {
  const out = {at: new Date().toISOString(), schema: await rows(db, "SELECT type, name, sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY name"), tables: {}};
  for (const t of await tableNames(db)) out.tables[t] = await rows(db, `SELECT * FROM "${t}"`);
  return out;
}

async function backup() {
  const snap = await snapshot(turso);
  await mkdir(join(root, 'data', 'backups'), {recursive: true});
  const path = join(root, 'data', 'backups', `turso-${snap.at.replace(/[:.]/g, '-')}.json`);
  await writeFile(path, JSON.stringify(snap));
  // Verificare: fișierul se recitește și fiecare tabel are tot atâtea rânduri cât în Turso
  const back = JSON.parse(await readFile(path, 'utf8'));
  for (const t of Object.keys(snap.tables)) {
    const n = Number((await rows(turso, `SELECT count(*) n FROM "${t}"`))[0].n);
    if (back.tables[t].length !== n) throw new Error(`Copia nu se potrivește la ${t}: ${back.tables[t].length} / ${n}`);
  }
  const total = Object.values(snap.tables).reduce((s, r) => s + r.length, 0);
  console.log(`Copie de siguranță: ${path} (${Object.keys(snap.tables).length} tabele, ${total} rânduri, verificată)`);
  return path;
}

// Înlocuiește conținutul tuturor tabelelor din Turso cu `data` ({tabel: [rânduri]}), într-o singură tranzacție
async function replaceAll(data) {
  const remoteTables = await tableNames(turso);
  const missing = Object.keys(data).filter(t => !remoteTables.includes(t));
  if (missing.length) throw new Error(`Tabele care nu există în Turso: ${missing.join(', ')}`);
  const tx = await turso.transaction('write');
  try {
    await tx.execute('PRAGMA defer_foreign_keys = ON');
    for (const t of remoteTables) await tx.execute(`DELETE FROM "${t}"`);
    let inserted = 0;
    for (const [t, list] of Object.entries(data)) {
      if (!list.length) continue;
      const cols = Object.keys(list[0]);
      // Câte 100 de rânduri pe instrucțiune (sau mai puține, dacă textele sunt lungi)
      for (let i = 0; i < list.length;) {
        const chunk = [];
        let size = 0;
        while (i < list.length && chunk.length < 100 && size < 400_000) { chunk.push(list[i]); size += JSON.stringify(list[i]).length; i++; }
        await tx.execute({
          sql: `INSERT INTO "${t}" (${cols.map(c => `"${c}"`).join(', ')}) VALUES ${chunk.map(() => `(${cols.map(() => '?').join(', ')})`).join(', ')}`,
          args: chunk.flatMap(r => cols.map(c => r[c] ?? null))
        });
        inserted += chunk.length;
      }
    }
    await tx.commit();
    return inserted;
  } catch (e) {
    await tx.rollback();
    throw e;
  } finally {
    tx.close();
  }
}

if (mode === '--backup') await backup();
if (mode === '--push') {
  await backup();
  const local = createClient({url: `file:${join(root, 'data', 'brain.db')}`});
  const data = (await snapshot(local)).tables;
  local.close();
  const n = await replaceAll(data);
  console.log(`Turso înlocuit cu baza locală: ${Object.keys(data).length} tabele, ${n} rânduri.`);
}
if (mode === '--restore') {
  if (!file) { console.error('Lipsește fișierul copiei: --restore data/backups/turso-….json'); process.exit(1); }
  const snap = JSON.parse(await readFile(file, 'utf8'));
  const n = await replaceAll(snap.tables);
  console.log(`Turso restaurat din ${file} (copia din ${snap.at}): ${n} rânduri.`);
}
turso.close();
