// Fișierele media, după ID (§3.9: ID-ul rămâne la înlocuire, ?v= schimbă adresa).
// Local, fișierele vin din snapshot. Pe Vercel stau într-un spațiu de stocare public (Cloudinary, urcate de
// scripts/media-to-cloudinary.mjs; înainte Vercel Blob), sub `media/<filename>`: ruta redirecționează la MEDIA_BASE_URL + cheie.
import {readFile} from 'node:fs/promises';
import {join} from 'node:path';
import {getDb, one} from '../../../core/db.mjs';

const SNAPSHOT = join(process.cwd(), 'reference', 'snapshot', 'media');

export async function GET(request, {params}) {
  const {id} = await params;
  const db = await getDb();
  const m = await one(db, 'SELECT filename, mime FROM media WHERE id = ?', [+id]);
  if (!m) return new Response('Not found', {status: 404});
  if (process.env.VERCEL) {
    const base = process.env.MEDIA_BASE_URL;
    if (!base || m.mime.startsWith('video/')) return new Response('Not found', {status: 404});
    const to = `${base}/media/${m.filename.split('/').map(encodeURIComponent).join('/')}`;
    // Browserul ține redirecționarea 5 minute, CDN-ul Vercel o zi (se golește la fiecare deploy): când se schimbă
    // stocarea (MEDIA_BASE_URL), vizitatorii nu rămân o zi întreagă cu adresa veche
    return new Response(null, {status: 308, headers: {location: to, 'cache-control': 'public, max-age=300, s-maxage=86400'}});
  }
  try {
    const body = await readFile(join(SNAPSHOT, m.filename));
    return new Response(body, {headers: {'content-type': m.mime, 'cache-control': 'public, max-age=31536000, immutable'}});
  } catch {
    return new Response('Not found', {status: 404});
  }
}
