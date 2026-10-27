// Importul din snapshot în Brain (§1.3, etapa 3). Local scrie în data/brain.db; cu TURSO_DATABASE_URL scrie în Turso.
//   node scripts/import.mjs [--overwrite-edits]
// Raportul complet ajunge în reference/analysis/import-report.json.
import {writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {openDb, prepare} from '../src/core/db.mjs';
import {runImport, ImportRefused} from '../src/import/run.mjs';

const dir = join(process.cwd(), 'reference');
const db = await prepare(openDb());
try {
  const t0 = Date.now();
  const r = await runImport(db, {dir, overwriteEdits: process.argv.includes('--overwrite-edits')});
  await writeFile(join(dir, 'analysis', 'import-report.json'), JSON.stringify(r, null, 1));
  console.log(`Import terminat în ${((Date.now() - t0) / 1000).toFixed(1)} s`);
  console.log('Create:', r.counts);
  console.log(`Verificare dus-întors: ${r.roundtrip.checked} texte, ${r.roundtrip.failed} diferențe · linkuri nerezolvate: ${r.unresolved_links} · probleme la curățare: ${r.sanitize_issues}`);
  console.log(`\nDe lămurit (${r.warnings.length}):\n- ${r.warnings.join('\n- ')}`);
} catch (e) {
  if (e instanceof ImportRefused) { console.error(e.message); process.exit(2); }
  throw e;
} finally {
  db.close();
}
