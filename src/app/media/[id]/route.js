// Fișierele media, după ID (§3.9: ID-ul rămâne la înlocuire, ?v= schimbă adresa).
// Imaginile stau comprimate în repo, în public/m/ (scripts/media-to-repo.mjs): <id>.webp, iar pentru hero-uri și coperte și
// lățimile <id>-<w>.webp cerute prin ?w= (srcset-ul din context.mjs). După transfer, aceleași fișiere stau în Vercel Blob-ul
// clientului (npm run blob:copy); src/site/media-source.mjs decide de unde le servim.
// Local, un fișier care nu e încă în public/m (urcat între timp în /manage) vine direct din snapshot.
import {readFile, stat} from 'node:fs/promises';
import {join} from 'node:path';
import {getDb, one} from '../../../core/db.mjs';
import VARIANTS from '../../../site/media-variants.json';
import {mediaSource} from '../../../site/media-source.mjs';

const SNAPSHOT = join(process.cwd(), 'reference', 'snapshot', 'media');
const PUBLIC = join(process.cwd(), 'public', 'm');
// Lățimile pregătite (aceleași ca în ctx.srcset); orice altă valoare primește fișierul întreg
const WIDTHS = [480, 828, 1200, 1920];
const WIDE = new Set(VARIANTS);
const RASTER = /^image\/(jpeg|png|webp|gif|avif)$/;

export async function GET(request, {params}) {
  const {id} = await params;
  const db = await getDb();
  const m = await one(db, 'SELECT id, filename, mime FROM media WHERE id = ?', [+id]);
  if (!m || m.mime.startsWith('video/')) return new Response('Not found', {status: 404});
  const w = +new URL(request.url).searchParams.get('w');
  const raster = RASTER.test(m.mime);
  const file = raster ? (WIDTHS.includes(w) && WIDE.has(m.id) ? `${m.id}-${w}.webp` : `${m.id}.webp`) : `${m.id}.${m.filename.split('.').pop().toLowerCase()}`;
  const blob = mediaSource().base;
  if (!blob && !process.env.VERCEL && !await stat(join(PUBLIC, file)).catch(() => null)) {
    try {
      const body = await readFile(join(SNAPSHOT, m.filename));
      return new Response(body, {headers: {'content-type': m.mime, 'cache-control': 'no-store'}});
    } catch {
      return new Response('Not found', {status: 404});
    }
  }
  // Browserul ține redirecționarea 5 minute, CDN-ul Vercel o zi (se golește la fiecare deploy): când se schimbă locul
  // fișierelor (repo → Blob), vizitatorii nu rămân o zi întreagă cu adresa veche
  const to = blob ? `${blob}/m/${file}` : new URL(`/m/${file}`, request.url).toString();
  return new Response(null, {status: 308, headers: {location: to, 'cache-control': 'public, max-age=300, s-maxage=86400'}});
}
