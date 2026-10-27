// Temporizatoarele nu depind de un server care rulează mereu (§3.7, NOU): Vercel Cron cheamă ruta cu
// Authorization: Bearer $CRON_SECRET. Aceeași rută primește și POST, ca în Anexa C.
// Pe o bază goală face mai întâi importul din snapshot (o singură dată). Celelalte sarcini (valabilitate,
// publicare programată, propagare, backup) vin odată cu nucleul; ruta spune onest ce nu rulează încă.
import {getDb, one} from '../../../../../core/db.mjs';
import {importIfEmpty} from '../../../../../import/auto.mjs';

export const dynamic = 'force-dynamic';
// Primul import scrie câteva mii de rânduri în Turso, într-o singură tranzacție
export const maxDuration = 300;

async function tick(request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return Response.json({error: 'CRON_SECRET nu e configurat'}, {status: 503});
  if (request.headers.get('authorization') !== `Bearer ${secret}`) return Response.json({error: 'neautorizat'}, {status: 401});
  const db = await getDb();
  const t0 = Date.now();
  const importResult = await importIfEmpty(db);
  const pending = (await one(db, `SELECT count(*) n FROM change_events WHERE status = 'pending'`)).n;
  return Response.json({
    ok: true, at: new Date().toISOString(), ms: Date.now() - t0, import: importResult, pending_events: pending,
    tasks: {validitate: 'neimplementat', 'publicare-programata': 'neimplementat', propagare: 'neimplementat', backup: 'neimplementat'}
  });
}

export const GET = tick;
export const POST = tick;
