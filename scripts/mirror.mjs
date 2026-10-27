// Copia offline a site-ului vechi: descarcă în reference/assets/ tot ce cer paginile din snapshot și nu există local
// (CSS, JS, fonturi, imaginile redimensionate), plus ce cer fișierele CSS prin url(). Originalele din
// reference/snapshot/media/ nu se descarcă din nou. Reluabil: ce există nu se descarcă din nou (--force descarcă tot).
// Paginile se văd cu `npm run mirror:serve`.
import {mkdir, writeFile, readFile, readdir, stat} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ORIGIN = 'https://yachtkid.ro';
const REF = fileURLToPath(new URL('../reference/', import.meta.url));
const HTML = join(REF, 'snapshot/html');
const MEDIA = join(REF, 'snapshot/media');
const OUT = join(REF, 'assets');
const UA = 'Mozilla/5.0 (YachtKid Brain crawler)';
const FORCE = process.argv.includes('--force');
const CONCURRENCY = 6;

const exists = p => stat(p).then(() => true, () => false);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, {headers: {'user-agent': UA}});
      return {status: res.status, type: res.headers.get('content-type'), body: Buffer.from(await res.arrayBuffer())};
    } catch (e) {
      if (i >= 3) throw e;
      await sleep(1000 * 2 ** i);
    }
  }
}

async function pool(items, fn) {
  const queue = [...items];
  await Promise.all(Array.from({length: CONCURRENCY}, async () => { while (queue.length) await fn(queue.shift()); }));
}

// Adresele de resurse de pe site, absolute (și cu „\/” din JSON-ul inline) sau relative la rădăcină
const ASSET = /(?:https?:\\?\/\\?\/yachtkid\.ro)?((?:\\?\/)wp-(?:content|includes)\\?\/[^"'\s)<>,]+)/g;
export function assetPaths(text) {
  const out = new Set();
  for (const [, raw] of text.matchAll(ASSET)) {
    const p = raw.replaceAll('\\/', '/').split(/[?#]/)[0].replace(/&quot;|&#039;|;$/g, '');
    // Șabloane JS ({banner_id}) și foldere nu sunt fișiere
    if (p.includes('{') || p.endsWith('/') || !/\.[a-z0-9]{2,5}$/i.test(p)) continue;
    out.add(p);
  }
  return out;
}

// Calea pe disc a unei resurse: întâi originalul din snapshot, apoi reference/assets/
export function localFile(path) {
  let p;
  try { p = decodeURIComponent(path); } catch { p = path; }
  const upload = p.match(/^\/wp-content\/uploads\/(\d{4}\/.+)$/);
  return {media: upload ? join(MEDIA, upload[1]) : null, asset: join(OUT, p)};
}

// CSS-ul își cere fonturile și imaginile cu url(), relativ la propria adresă
function cssUrls(css, path) {
  const out = new Set();
  for (const [, raw] of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/g)) {
    if (raw.startsWith('data:') || raw.startsWith('#')) continue;
    const u = new URL(raw, ORIGIN + path);
    if (u.origin === ORIGIN && /^\/wp-(content|includes)\//.test(u.pathname)) out.add(u.pathname);
  }
  return out;
}

async function main() {
  const pages = (await readdir(HTML, {recursive: true})).filter(f => f.endsWith('.html'));
  const wanted = new Set();
  for (const f of pages) for (const p of assetPaths(await readFile(join(HTML, f), 'utf8'))) wanted.add(p);

  const stats = {local: 0, downloaded: 0, cached: 0, failed: []};
  const done = new Set();
  let queue = [...wanted];
  while (queue.length) {
    const next = [];
    await pool(queue, async path => {
      if (done.has(path)) return;
      done.add(path);
      const {media, asset} = localFile(path);
      if (media && await exists(media)) { stats.local++; return; }
      let body;
      if (!FORCE && await exists(asset)) { stats.cached++; body = /\.css$/i.test(path) ? await readFile(asset) : null; }
      else {
        const r = await get(ORIGIN + path);
        if (r.status !== 200) { stats.failed.push(`${r.status} ${path}`); return; }
        await mkdir(dirname(asset), {recursive: true});
        await writeFile(asset, r.body);
        stats.downloaded++;
        body = r.body;
      }
      if (body && /\.css$/i.test(path)) for (const p of cssUrls(body.toString('utf8'), path)) if (!done.has(p)) next.push(p);
    });
    queue = next;
  }
  console.log(`Resurse: ${done.size} · din snapshot/media: ${stats.local} · descărcate: ${stats.downloaded} · deja în assets: ${stats.cached} · eșuate: ${stats.failed.length}`);
  if (stats.failed.length) console.log(stats.failed.join('\n'));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
