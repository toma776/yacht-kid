// Primul import pe o bază goală, pornit de pe server (ruta de cron). Pe Vercel, baza Turso nu are nevoie
// de nicio configurare locală: snapshot-ul e în repo, iar funcția îl citește din reference/.
// Rulează doar o dată: după primul import, baza nu mai e goală și ruta nu mai importă nimic.
import {join} from 'node:path';
import {one} from '../core/db.mjs';
import {runImport} from './run.mjs';

export async function importIfEmpty(db, {dir = join(process.cwd(), 'reference')} = {}) {
  const done = await one(db, `SELECT count(*) n FROM change_events WHERE action = 'import'`);
  if (done.n > 0) return {skipped: 'baza are deja un import'};
  const r = await runImport(db, {dir});
  return {imported: r.counts, warnings: r.warnings.length, roundtrip: r.roundtrip};
}
