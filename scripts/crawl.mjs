// Etapa 1 din §1.3: crawl. Scrie un snapshot local al site-ului vechi în reference/snapshot/,
// din care analyze și importul pot reface totul fără site-ul vechi. Reluabil: ce există nu se descarcă din nou
// (--force descarcă tot din nou, --media descarcă și fișierele din biblioteca media).
import {mkdir, writeFile, readFile, stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const ORIGIN = 'https://yachtkid.ro';
const OUT = fileURLToPath(new URL('../reference/snapshot/', import.meta.url));
const UA = 'Mozilla/5.0 (YachtKid Brain crawler)';
const FORCE = process.argv.includes('--force');
const MEDIA = process.argv.includes('--media');
const CONCURRENCY = 4;

const API_TYPES = ['pages', 'posts', 'testimonial', 'media', 'categories', 'tags', 'users', 'bricks_template', 'menu-items', 'menus'];
const SKIP = /\/(wp-admin|wp-json|wp-login|feed|xmlrpc|wp-content|wp-includes)(\/|$)|[?#]|\.(jpe?g|png|webp|gif|svg|mp4|webm|pdf|zip|css|js|xml)$/i;

const sha1 = s => createHash('sha1').update(s).digest('hex');
const exists = p => stat(p).then(() => true, () => false);
const sleep = ms => new Promise(r => setTimeout(r, ms));

async function get(url, {redirect = 'manual', binary = false} = {}) {
  for (let i = 0; ; i++) {
    try {
      const res = await fetch(url, {headers: {'user-agent': UA}, redirect});
      const body = binary ? Buffer.from(await res.arrayBuffer()) : await res.text();
      return {status: res.status, location: res.headers.get('location'), type: res.headers.get('content-type'), headers: res.headers, body};
    } catch (e) {
      if (i >= 3) throw e;
      await sleep(1000 * 2 ** i);
    }
  }
}

async function save(rel, data) {
  const file = join(OUT, rel);
  await mkdir(dirname(file), {recursive: true});
  await writeFile(file, data);
  return rel.replaceAll('\\', '/');
}

async function pool(items, fn) {
  const queue = [...items];
  await Promise.all(Array.from({length: CONCURRENCY}, async () => { while (queue.length) await fn(queue.shift()); }));
}

const pathFile = path => `html${path === '/' ? '/index' : path.replace(/\/$/, '')}.html`;
const normalize = href => {
  try {
    const u = new URL(href, ORIGIN);
    if (u.origin !== ORIGIN) return null;
    u.hash = ''; u.search = '';
    return SKIP.test(u.pathname) ? null : u.pathname;
  } catch { return null; }
};

// 1. API-ul WordPress: toate tipurile publice, paginat, câte 100.
async function crawlApi(manifest) {
  for (const type of API_TYPES) {
    const rel = `api/${type}.json`;
    if (!FORCE && manifest.api[type]?.file && await exists(join(OUT, rel))) continue;
    const all = [];
    for (let page = 1; ; page++) {
      const r = await get(`${ORIGIN}/wp-json/wp/v2/${type}?per_page=100&page=${page}&context=view&lang=`, {redirect: 'follow'});
      if (r.status !== 200) { if (page === 1) manifest.api[type] = {status: r.status}; break; }
      const items = JSON.parse(r.body);
      all.push(...items);
      if (page >= Number(r.headers.get('x-wp-totalpages') || 1)) break;
    }
    if (!all.length) continue;
    manifest.api[type] = {status: 200, count: all.length, file: await save(rel, JSON.stringify(all, null, 1)), fetched_at: new Date().toISOString()};
    console.log(`api ${type}: ${all.length}`);
  }
  // Polylang: limbile și perechile de traduceri
  const langs = await get(`${ORIGIN}/wp-json/pll/v1/languages`, {redirect: 'follow'});
  if (langs.status === 200) manifest.api.languages = {status: 200, file: await save('api/languages.json', langs.body)};
}

// 2. Sitemap-urile Yoast.
async function crawlSitemaps() {
  const index = await get(`${ORIGIN}/sitemap_index.xml`, {redirect: 'follow'});
  await save('sitemaps/sitemap_index.xml', index.body);
  const urls = new Map();
  for (const [, loc] of index.body.matchAll(/<loc>([^<]+)<\/loc>/g)) {
    const sm = await get(loc, {redirect: 'follow'});
    const name = new URL(loc).pathname.slice(1);
    await save(`sitemaps/${name}`, sm.body);
    for (const [, block] of sm.body.matchAll(/<url>([\s\S]*?)<\/url>/g)) {
      const u = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
      const path = u && normalize(u);
      if (path) urls.set(path, {sitemap: name, lastmod: block.match(/<lastmod>([^<]+)/)?.[1] ?? null});
    }
  }
  return urls;
}

// 3. HTML-ul fiecărei adrese: din sitemap, din API și din linkurile descoperite.
async function crawlHtml(seed, manifest) {
  const seen = new Set(seed.keys());
  const queue = [...seen];
  const pages = manifest.pages;
  while (queue.length) {
    const batch = queue.splice(0);
    await pool(batch, async path => {
      const file = pathFile(path);
      let html;
      if (!FORCE && pages[path]?.file && await exists(join(OUT, pages[path].file))) {
        html = pages[path].status === 200 ? await readFile(join(OUT, pages[path].file), 'utf8') : '';
      } else {
        const r = await get(ORIGIN + path);
        const entry = {path, status: r.status, fetched_at: new Date().toISOString(), in_sitemap: seed.get(path)?.sitemap ?? null, lastmod: seed.get(path)?.lastmod ?? null};
        if (r.status >= 300 && r.status < 400) entry.redirect = r.location;
        if (r.status === 200) { html = r.body; entry.file = await save(file, html); entry.sha1 = sha1(html); entry.bytes = html.length; }
        pages[path] = entry;
        console.log(`${r.status} ${path}${entry.redirect ? ' → ' + entry.redirect : ''}`);
        if (entry.redirect) { const t = normalize(entry.redirect); if (t && !seen.has(t)) { seen.add(t); queue.push(t); } }
      }
      for (const [, href] of (html ?? '').matchAll(/<a\b[^>]*\bhref=["']([^"']+)["']/gi)) {
        const p = normalize(href);
        if (p && !seen.has(p)) { seen.add(p); queue.push(p); pages[p] ??= {discovered_from: path}; }
      }
    });
  }
}

// 4. Opțional: fișierele media (originalele), denumite după calea din uploads.
async function crawlMedia(manifest) {
  const items = JSON.parse(await readFile(join(OUT, 'api/media.json'), 'utf8'));
  manifest.media ??= {};
  await pool(items, async m => {
    const url = m.source_url; if (!url) return;
    const rel = 'media/' + decodeURIComponent(new URL(url).pathname.replace(/^\/wp-content\/uploads\//, ''));
    if (!FORCE && manifest.media[m.id]?.sha1 && await exists(join(OUT, rel))) return;
    const r = await get(url, {redirect: 'follow', binary: true});
    manifest.media[m.id] = r.status === 200
      ? {url, file: await save(rel, r.body), sha1: sha1(r.body), bytes: r.body.length, type: r.type}
      : {url, status: r.status, certainty: 'unrecoverable'};
    if (r.status !== 200) console.log(`media ${m.id}: ${r.status} ${url}`);
  });
}

const manifestFile = join(OUT, 'manifest.json');
const manifest = await exists(manifestFile) ? JSON.parse(await readFile(manifestFile, 'utf8')) : {};
manifest.origin = ORIGIN; manifest.api ??= {}; manifest.pages ??= {};
manifest.started_at = new Date().toISOString();

await crawlApi(manifest);
const seed = await crawlSitemaps();
for (const type of ['pages', 'posts', 'testimonial', 'categories'])
  for (const item of await readFile(join(OUT, `api/${type}.json`), 'utf8').then(JSON.parse, () => []))
    if (item.link) { const p = normalize(item.link); if (p && !seed.has(p)) seed.set(p, {sitemap: `api:${type}`}); }
seed.set('/', seed.get('/') ?? {sitemap: 'root'});
await crawlHtml(seed, manifest);
if (MEDIA) await crawlMedia(manifest);

manifest.finished_at = new Date().toISOString();
await writeFile(manifestFile, JSON.stringify(manifest, null, 1));
const st = Object.values(manifest.pages).reduce((a, p) => (a[p.status ?? '?'] = (a[p.status ?? '?'] ?? 0) + 1, a), {});
console.log('pagini:', st, MEDIA ? `media: ${Object.keys(manifest.media).length}` : '');
