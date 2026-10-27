// Servește copia offline a site-ului vechi: paginile din reference/snapshot/html/, resursele din snapshot/media/
// și reference/assets/ (vezi mirror.mjs). Adresele absolute spre yachtkid.ro devin locale la servire, iar
// scripturile de tracking (GTM, Facebook, Clarity, HubSpot) sunt scoase, ca vizitele locale să nu ajungă în statistici.
//   node scripts/mirror-serve.mjs [--port 4000]
import {createServer} from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {localFile} from './mirror.mjs';

const SNAPSHOT = fileURLToPath(new URL('../reference/snapshot/', import.meta.url));
const DESIGN = fileURLToPath(new URL('../design/', import.meta.url));
const PORT = Number(process.argv[process.argv.indexOf('--port') + 1]) || 4000;
const manifest = JSON.parse(await readFile(join(SNAPSHOT, 'manifest.json'), 'utf8'));

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg',
  '.webp': 'image/webp', '.gif': 'image/gif', '.ico': 'image/x-icon', '.woff': 'font/woff', '.woff2': 'font/woff2',
  '.ttf': 'font/ttf', '.eot': 'application/vnd.ms-fontobject', '.mp4': 'video/mp4', '.webm': 'video/webm', '.pdf': 'application/pdf'
};
const TRACKERS = /googletagmanager|gtag\(|clarity\.ms|fbevents|fbq\(|hs-scripts|hs-analytics|hubspot/i;

const isFile = p => stat(p).then(s => s.isFile(), () => false);
const localize = text => text.replace(/(?:https?:)?(\\?\/\\?\/)yachtkid\.ro(?=[\\/"'\s)?#]|$)/g, '');
const stripTrackers = html => html
  .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, tag => TRACKERS.test(tag) ? '' : tag)
  .replace(/<noscript\b[^>]*>[\s\S]*?<\/noscript>/gi, tag => TRACKERS.test(tag) || /facebook\.com\/tr/.test(tag) ? '' : tag)
  .replace(/<link\b[^>]*>/gi, tag => TRACKERS.test(tag) ? '' : tag);

async function resolve(pathname) {
  // Prototipurile de design (design/) folosesc aceleași imagini, de la aceleași adrese
  if (pathname.startsWith('/design/')) {
    const file = join(DESIGN, decodeURIComponent(pathname.slice('/design/'.length)), pathname.endsWith('/') ? 'index.html' : '');
    return file.startsWith(DESIGN) && await isFile(file) ? {file} : null;
  }
  // Fișierele media adăugate în Brain (reference/snapshot/media/brain/…), pentru prototipuri
  if (pathname.startsWith('/media-store/')) {
    const root = join(SNAPSHOT, 'media');
    const file = join(root, decodeURIComponent(pathname.slice('/media-store/'.length)));
    return file.startsWith(root) && await isFile(file) ? {file} : null;
  }
  if (/^\/wp-(content|includes)\//.test(pathname)) {
    const {media, asset} = localFile(pathname);
    for (const f of [media, asset]) if (f && await isFile(f)) return {file: f};
    return null;
  }
  const page = manifest.pages[pathname] ?? manifest.pages[pathname + '/'];
  if (page?.redirect) return {redirect: localize(page.redirect) || '/'};
  if (page?.file) return {file: join(SNAPSHOT, page.file), html: true};
  return null;
}

createServer(async (req, res) => {
  const {pathname} = new URL(req.url, 'http://localhost');
  const hit = await resolve(pathname);
  if (!hit) { res.writeHead(404, {'content-type': 'text/plain; charset=utf-8'}); return res.end(`Nu e în copia offline: ${pathname}`); }
  if (hit.redirect) { res.writeHead(301, {location: hit.redirect}); return res.end(); }
  const type = hit.html ? TYPES['.html'] : TYPES[extname(hit.file).toLowerCase()] ?? 'application/octet-stream';
  let body = await readFile(hit.file);
  if (/^text\//.test(type)) body = localize(body.toString('utf8'));
  if (hit.html) body = stripTrackers(body);
  res.writeHead(200, {'content-type': type, 'cache-control': 'no-store'});
  res.end(body);
}).listen(PORT, () => console.log(`Copia offline a yachtkid.ro: http://localhost:${PORT}/`));
