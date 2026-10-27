// Video pentru web: pentru fiecare video din Brain (media cu mime video/*) face, din originalul din snapshot,
//   - 1080p: H.264 High, calitate constantă (CRF 21), +faststart → public/video/<nume>-1080.mp4
//     (un original deja H.264 ≤ 1080p doar se reîmpachetează cu +faststart, fără recomprimare)
//   - 720p: pentru mobil și pentru fundaluri, mai ușor → public/video/<nume>-720.mp4
//   - cadrul de previzualizare: cel mai „tipic” cadru din primele secunde, luminos → public/video/<nume>.jpg
// și scrie în Brain câmpurile media.duration, media.poster și media.renditions, cu istoric și proveniență.
// Originalele (4K HEVC, peste limita de 100 MB a GitHub) rămân în snapshot, în afara git.
// Necesită ffmpeg (winget install Gyan.FFmpeg).   node scripts/video.mjs [--force]
import {execFileSync} from 'node:child_process';
import {existsSync, mkdirSync, readdirSync, statSync, unlinkSync} from 'node:fs';
import {basename, join} from 'node:path';
import {openDb, prepare} from '../src/core/db.mjs';

const ROOT = process.cwd();
const SNAPSHOT = join(ROOT, 'reference', 'snapshot', 'media');
const OUT = join(ROOT, 'public', 'video');
const FORCE = process.argv.includes('--force');
const USER = 'Video';
const SOURCE_URL = 'repo:scripts/video.mjs';

// ffmpeg: din FFMPEG, din PATH sau din instalarea winget
function findBin(name) {
  if (process.env.FFMPEG && name === 'ffmpeg') return process.env.FFMPEG;
  try { return execFileSync(process.platform === 'win32' ? 'where' : 'which', [name], {encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']}).split(/\r?\n/)[0].trim(); } catch {}
  const base = join(process.env.LOCALAPPDATA ?? '', 'Microsoft', 'WinGet', 'Packages');
  if (existsSync(base)) for (const d of readdirSync(base).filter(x => /FFmpeg/i.test(x))) {
    const walk = p => { for (const f of readdirSync(p, {withFileTypes: true})) { const q = join(p, f.name); if (f.isDirectory()) { const r = walk(q); if (r) return r; } else if (f.name.toLowerCase() === `${name}.exe`) return q; } return null; };
    const r = walk(join(base, d)); if (r) return r;
  }
  throw new Error(`Nu găsesc ${name}. Instalează: winget install Gyan.FFmpeg`);
}
const FFMPEG = findBin('ffmpeg');
const FFPROBE = findBin('ffprobe');
const run = (bin, args) => execFileSync(bin, args, {stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 64 * 1024 * 1024}).toString();
const probe = src => JSON.parse(run(FFPROBE, ['-v', 'error', '-print_format', 'json', '-show_streams', '-show_format', src]));
const mb = bytes => (bytes / 1048576).toFixed(1);

// Cele două versiuni: latura scurtă, calitatea (CRF) și plafonul de bitrate, ca o scenă agitată să nu umfle fișierul
const RENDITIONS = [
  {quality: '1080p', short: 1080, crf: 21, maxrate: 8000, audio: 160},
  {quality: '720p', short: 720, crf: 24, maxrate: 3500, audio: 96}
];

function describe(file) {
  const info = probe(file);
  const v = info.streams.find(s => s.codec_type === 'video');
  const bytes = statSync(file).size, dur = +info.format.duration || 0;
  return {width: v.width, height: v.height, bytes, kbps: dur ? Math.round(bytes * 8 / dur / 1000) : null};
}

function encode(src, out, r, {vertical, hasAudio}) {
  const scale = vertical ? `scale='min(${r.short},iw)':-2` : `scale=-2:'min(${r.short},ih)'`;
  const audio = hasAudio ? ['-c:a', 'aac', '-b:a', `${r.audio}k`, '-ac', '2'] : ['-an'];
  run(FFMPEG, ['-y', '-v', 'error', '-i', src, '-map', '0:v:0', ...(hasAudio ? ['-map', '0:a:0'] : []), '-map_metadata', '-1',
    '-vf', `${scale}:flags=lanczos,format=yuv420p`, '-c:v', 'libx264', '-profile:v', 'high', '-preset', 'slow', '-crf', String(r.crf),
    '-maxrate', `${r.maxrate}k`, '-bufsize', `${r.maxrate * 2}k`, '-color_primaries', 'bt709', '-color_trc', 'bt709', '-colorspace', 'bt709',
    '-movflags', '+faststart', ...audio, out]);
}

// Cadrul de previzualizare (ca la MoaClinic): cel mai tipic din 100 de cadre; dacă iese întunecat, încearcă mai departe în clip
function poster(video, jpg, dur) {
  const luma = () => +(/YAVG=([\d.]+)/.exec(execFileSync(FFMPEG, ['-v', 'error', '-i', jpg, '-vf', 'signalstats,metadata=print:key=lavfi.signalstats.YAVG:file=-', '-f', 'null', '-'], {encoding: 'utf8'}).replace(/lavfi\.signalstats\./g, '')) ?? [0, 0])[1];
  const grab = t => { run(FFMPEG, ['-y', '-v', 'error', '-ss', String(t), '-i', video, '-t', String(Math.min(8, Math.max(1, dur - t))), '-vf', 'thumbnail=100', '-frames:v', '1', '-q:v', '3', jpg]); return luma(); };
  let best = {t: Math.max(0, Math.min(dur * .15, 3))};
  best.y = grab(best.t);
  if (best.y < 60) for (const t of [.25, .5, .75].map(k => dur * k)) { const y = grab(t); if (y > best.y) best = {t, y}; if (y >= 60) break; }
  if (luma() !== best.y) grab(best.t);
}

async function source(tx) {
  await tx.execute({sql: `INSERT INTO sources (kind, url, title, method, created_at) VALUES ('repo', ?, ?, 'ffmpeg', ?) ON CONFLICT (url) DO NOTHING`,
    args: [SOURCE_URL, 'Versiunile video pentru web, generate din original', new Date().toISOString()]});
  return (await tx.execute({sql: 'SELECT id FROM sources WHERE url = ?', args: [SOURCE_URL]})).rows[0].id;
}

// Scrierea în Brain: câmpurile, istoricul (audit_log), evenimentul (change_events) și proveniența, într-o tranzacție
async function save(db, m, values) {
  const tx = await db.transaction('write');
  try {
    const at = new Date().toISOString();
    const before = (await tx.execute({sql: 'SELECT duration, poster, renditions FROM media WHERE id = ?', args: [m.id]})).rows[0];
    const after = {duration: values.duration, poster: values.poster, renditions: JSON.stringify(values.renditions)};
    const changes = Object.fromEntries(Object.entries(after).filter(([k, v]) => String(before[k] ?? '') !== String(v)).map(([k, v]) => [k, [before[k] ?? null, v]]));
    if (!Object.keys(changes).length) { await tx.rollback(); return false; }
    await tx.execute({sql: 'UPDATE media SET duration = ?, poster = ?, renditions = ?, updated_at = ?, updated_by = ? WHERE id = ?',
      args: [after.duration, after.poster, after.renditions, at, USER, m.id]});
    await tx.execute({sql: 'INSERT INTO audit_log (at, user_name, action, entity, entity_id, label, changes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [at, USER, 'update', 'media', m.id, m.filename, JSON.stringify(changes)]});
    await tx.execute({sql: `INSERT INTO change_events (at, user_name, action, entity, entity_id, label, payload, status) VALUES (?, ?, 'update', 'media', ?, ?, ?, 'pending')`,
      args: [at, USER, m.id, m.filename, JSON.stringify({fields: Object.keys(changes)})]});
    const src = await source(tx);
    for (const field of Object.keys(changes))
      await tx.execute({sql: `INSERT INTO provenance (entity, entity_id, field, lang, source_id, excerpt, method, certainty, created_at) VALUES ('media', ?, ?, '', ?, ?, 'ffmpeg', 'confirmed', ?)
        ON CONFLICT (entity, entity_id, field, lang, source_id) DO UPDATE SET excerpt = excluded.excerpt, created_at = excluded.created_at`,
        args: [m.id, field, src, `din ${m.filename}`, at]});
    await tx.commit();
    return true;
  } catch (e) { await tx.rollback(); throw e; }
}

const db = await prepare(openDb());
mkdirSync(OUT, {recursive: true});
const videos = (await db.execute(`SELECT id, filename, bytes, renditions FROM media WHERE mime LIKE 'video/%' ORDER BY id`)).rows;
let total = {original: 0, web: 0};
for (const m of videos) {
  const src = join(SNAPSHOT, m.filename);
  if (!existsSync(src)) { console.log(`  ! #${m.id} ${m.filename}: originalul lipsește din snapshot`); continue; }
  const name = basename(m.filename, '.mp4').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const files = Object.fromEntries(RENDITIONS.map(r => [r.quality, join(OUT, `${name}-${r.short}.mp4`)]));
  const jpg = join(OUT, `${name}.jpg`);

  const info = probe(src);
  const v = info.streams.find(s => s.codec_type === 'video');
  const hasAudio = info.streams.some(s => s.codec_type === 'audio');
  const dur = +info.format.duration || 0;
  const rot = Math.abs(+(v.side_data_list?.find(x => x.rotation != null)?.rotation ?? v.tags?.rotate ?? 0));
  const [w, h] = rot === 90 || rot === 270 ? [v.height, v.width] : [v.width, v.height];
  const vertical = h > w, short = Math.min(w, h);
  const t0 = Date.now();

  const renditions = [];
  for (const r of RENDITIONS) {
    if (r.short > short && r.quality !== '1080p') continue;
    const out = files[r.quality];
    if (FORCE || !existsSync(out)) {
      // Un original H.264 8-bit care încape deja în 1080p nu se recomprimă: doar +faststart
      if (r.quality === '1080p' && v.codec_name === 'h264' && short <= 1080 && v.pix_fmt === 'yuv420p')
        run(FFMPEG, ['-y', '-v', 'error', '-i', src, '-map', '0', '-c', 'copy', '-map_metadata', '-1', '-movflags', '+faststart', out]);
      else encode(src, out, r, {vertical, hasAudio});
    }
    renditions.push({quality: r.quality, file: `/video/${basename(out)}`, ...describe(out)});
  }
  if (FORCE || !existsSync(jpg)) poster(files['1080p'], jpg, dur);

  const changed = await save(db, m, {duration: Math.round(dur * 10) / 10, poster: `/video/${basename(jpg)}`, renditions});
  total.original += m.bytes; total.web += renditions[0].bytes;
  console.log(`  ✓ #${m.id} ${m.filename}: ${mb(m.bytes)} MB → ${renditions.map(r => `${r.quality} ${mb(r.bytes)} MB (${r.kbps} kbps)`).join(' · ')} · ${Math.round(dur)} s · ${((Date.now() - t0) / 1000).toFixed(0)} s${changed ? '' : ' · neschimbat'}`);
}
for (const f of readdirSync(OUT).filter(x => x.startsWith('ffmpeg2pass'))) unlinkSync(join(OUT, f));
console.log(`Gata: ${videos.length} video · originale ${mb(total.original)} MB → 1080p ${mb(total.web)} MB · public/video/`);
db.close();
