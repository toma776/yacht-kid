// Baza locală: Postgres încorporat (PGlite), cu datele în data/pg, servit pe 127.0.0.1:5433 ca site-ul și scripturile să
// lucreze cu aceeași bază în același timp (src/core/db.mjs se conectează aici când nu există DATABASE_URL).
//   node scripts/db-local.mjs              doar baza (rămâne pornită)
//   node scripts/db-local.mjs next dev     baza + comanda dată (așa pornește `npm run dev`); dacă baza rulează deja, doar comanda
import {spawn} from 'node:child_process';
import {createConnection} from 'node:net';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';

const PORT = 5433, HOST = '127.0.0.1';
const DIR = join(process.cwd(), 'data', 'pg');
const running = () => new Promise(r => { const s = createConnection(PORT, HOST, () => { s.end(); r(true); }); s.on('error', () => r(false)); });

let server, db;
if (await running()) console.log(`  · baza locală rulează deja pe ${HOST}:${PORT}`);
else {
  const {PGlite} = await import('@electric-sql/pglite');
  const {PGLiteSocketServer} = await import('@electric-sql/pglite-socket');
  mkdirSync(DIR, {recursive: true});
  db = await PGlite.create(DIR);
  // O singură conexiune reală: PGlite nu are tranzacții paralele; celelalte așteaptă la rând
  server = new PGLiteSocketServer({db, port: PORT, host: HOST, maxConnections: 1});
  await server.start();
  console.log(`  ✓ baza locală (PGlite, data/pg) pe ${HOST}:${PORT}`);
}

const stop = async code => { await server?.stop(); await db?.close(); process.exit(code ?? 0); };
process.on('SIGINT', () => stop(0));
process.on('SIGTERM', () => stop(0));

const [cmd, ...args] = process.argv.slice(2);
if (cmd) {
  const child = spawn(cmd === 'next' ? join('node_modules', '.bin', process.platform === 'win32' ? 'next.cmd' : 'next') : cmd, args, {stdio: 'inherit', shell: process.platform === 'win32'});
  child.on('exit', code => stop(code));
}
