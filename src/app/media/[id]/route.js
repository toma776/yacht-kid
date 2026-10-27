// Fișierele media, după ID (§3.9: ID-ul rămâne la înlocuire, ?v= schimbă adresa).
// Local, fișierele vin din snapshot. Pe Vercel vor sta în Vercel Blob (de ales la pasul site-ului); până atunci 404.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {getDb, one} from '../../../core/db.mjs';

const SNAPSHOT = join(process.cwd(), 'reference', 'snapshot', 'media');

export async function GET(request, {params}) {
  const {id} = await params;
  const db = await getDb();
  const m = await one(db, 'SELECT filename, mime FROM media WHERE id = ?', [+id]);
  if (!m || process.env.VERCEL) return new Response('Not found', {status: 404});
  try {
    const body = await readFile(join(SNAPSHOT, m.filename));
    return new Response(body, {headers: {'content-type': m.mime, 'cache-control': 'public, max-age=31536000, immutable'}});
  } catch {
    return new Response('Not found', {status: 404});
  }
}
