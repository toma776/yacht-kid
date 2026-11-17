// Imaginile site-ului în repo, comprimate, până când clientul are propriul Vercel Blob (scripts/transfer-client.mjs le
// urcă de aici). Din snapshot (originalele) → public/m/<id>.webp, maximum 2560px, WebP calitate 78; SVG-urile și PDF-urile
// rămân cum sunt (<id>.svg, <id>.pdf). Imaginile mari de deasupra paginii (hero, coperte; cele cu ctx.srcset) primesc și
// lățimile 480/828/1200/1920 (<id>-<w>.webp), ca mobilul să nu descarce fișierul întreg — fără serviciu de optimizare.
// Lista lor ajunge în src/site/media-variants.json (ruta /media/<id>/ o citește). Videoclipurile nu intră: site-ul
// folosește variantele din public/video. Se poate relua: sare peste fișierele care există deja.
//   node scripts/media-to-repo.mjs
import {mkdir, copyFile, stat, writeFile} from 'node:fs/promises';
import {join} from 'node:path';
import {pathToFileURL} from 'node:url';
import {openDb, all} from '../src/core/db.mjs';

const sharp = (await import(pathToFileURL(join(process.cwd(), 'node_modules/sharp/dist/index.mjs')).href)).default;
const SNAPSHOT = join(process.cwd(), 'reference', 'snapshot', 'media');
const OUT = join(process.cwd(), 'public', 'm');
export const WIDTHS = [480, 828, 1200, 1920];
const MAX = 2560, QUALITY = 78;
const exists = p => stat(p).then(() => true, () => false);

const db = openDb();
const media = await all(db, `SELECT id, filename, mime FROM media WHERE mime NOT LIKE 'video/%' ORDER BY id`);
// Imaginile cu srcset: hero-urile secțiunilor, copertele tipurilor de locuințe, ale articolelor și ale afacerilor
const wide = new Set((await all(db, `
  SELECT image_id AS id FROM sections WHERE kind = 'hero' AND image_id IS NOT NULL
  UNION SELECT hero_image_id FROM unit_types WHERE hero_image_id IS NOT NULL
  UNION SELECT image_id FROM posts WHERE image_id IS NOT NULL
  UNION SELECT image_id FROM businesses WHERE image_id IS NOT NULL
  UNION SELECT hero_image_id FROM businesses WHERE hero_image_id IS NOT NULL`)).map(r => r.id));

await mkdir(OUT, {recursive: true});
let made = 0, skipped = 0, missing = 0, bytes = 0;
for (const m of media) {
  const src = join(SNAPSHOT, m.filename);
  if (!await exists(src)) { missing++; console.log(`  ! lipsește originalul #${m.id} ${m.filename}`); continue; }
  const raster = /^image\/(jpeg|png|webp|gif|avif)$/.test(m.mime);
  const base = join(OUT, `${m.id}.${raster ? 'webp' : m.filename.split('.').pop().toLowerCase()}`);
  const jobs = [[base, raster ? MAX : null]];
  if (raster && wide.has(m.id)) for (const w of WIDTHS) jobs.push([join(OUT, `${m.id}-${w}.webp`), w]);
  for (const [dst, w] of jobs) {
    if (await exists(dst)) { skipped++; bytes += (await stat(dst)).size; continue; }
    if (!raster) await copyFile(src, dst);
    else await sharp(src, {animated: false}).rotate().resize({width: w, height: w, fit: 'inside', withoutEnlargement: true}).webp({quality: QUALITY}).toFile(dst);
    bytes += (await stat(dst)).size; made++;
  }
}
await writeFile(join(process.cwd(), 'src', 'site', 'media-variants.json'), JSON.stringify([...wide].filter(id => media.some(m => m.id === id && /^image\/(jpeg|png|webp|gif|avif)$/.test(m.mime))).sort((a, b) => a - b)) + '\n');
console.log(`  ✓ ${made} fișiere noi, ${skipped} existente, ${missing} fără original; public/m are ${(bytes / 1048576).toFixed(1)} MB`);
db.close();
