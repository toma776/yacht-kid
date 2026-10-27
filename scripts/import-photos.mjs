// Fotografiile din folderul Drive „Photo” (Exterior / Interior) în biblioteca Media.
//   node scripts/import-photos.mjs
// Fișierele (2560 px, din Drive) stau în reference/snapshot/media/foto/; textele și etichetele în reference/foto/photos.json.
// Cheia naturală e ID-ul din Drive (`drive:<id>`): un import repetat actualizează, nu dublează.
// Textele sunt scrise de AI din imagine, deci intră ca `inferred` (de verificat de un om), nu ca `confirmed`.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {openDb, prepare} from '../src/core/db.mjs';
import {trFingerprint} from '../src/core/fingerprint.mjs';

const ROOT = process.cwd();
const FOLDER = 'https://drive.google.com/drive/folders/1hr3CDb26XWG2rf5PJB_o_-QefiglGy-e';
const USER = 'Import';

// Lățimea și înălțimea din antetul JPEG (markerul SOF), fără dependențe
function jpegSize(b) {
  for (let i = 2; i < b.length - 9;) {
    if (b[i] !== 0xff) { i++; continue; }
    const m = b[i + 1], len = b.readUInt16BE(i + 2);
    if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return {height: b.readUInt16BE(i + 5), width: b.readUInt16BE(i + 7)};
    i += 2 + len;
  }
  return {};
}

const photos = JSON.parse(await readFile(join(ROOT, 'reference', 'foto', 'photos.json'), 'utf8'));
const db = await prepare(openDb());
const now = new Date().toISOString();
const tx = await db.transaction('write');
const run = (sql, args = []) => tx.execute({sql, args});
const counts = {created: 0, updated: 0, duplicates: [], missing: []};
try {
  await run(`INSERT INTO sources (kind, url, title, fetched_at, method, status, created_at) VALUES ('document', ?, 'Google Drive · Photo (Exterior, Interior)', ?, 'download', 200, ?)
    ON CONFLICT (url) DO UPDATE SET fetched_at = excluded.fetched_at`, [FOLDER, now, now]);
  const src = (await run('SELECT id FROM sources WHERE url = ?', [FOLDER])).rows[0].id;
  const ai = `${FOLDER}#descrieri-ai`;
  await run(`INSERT INTO sources (kind, url, title, fetched_at, method, created_at) VALUES ('manual', ?, 'Descrieri și etichete generate de AI din imagine', ?, 'ai-vision', ?)
    ON CONFLICT (url) DO UPDATE SET fetched_at = excluded.fetched_at`, [ai, now, now]);
  const aiSrc = (await run('SELECT id FROM sources WHERE url = ?', [ai])).rows[0].id;

  for (const p of photos) {
    let body;
    try { body = await readFile(join(ROOT, 'reference', 'snapshot', 'media', p.file)); } catch { counts.missing.push(p.file); continue; }
    const sha = createHash('sha1').update(body).digest('hex');
    const natural = `drive:${p.drive_id}`;
    let id = (await run(`SELECT entity_id FROM import_keys WHERE entity = 'media' AND natural_key = ?`, [natural])).rows[0]?.entity_id;
    const same = (await run('SELECT id FROM media WHERE sha1 = ?', [sha])).rows[0]?.id;
    if (same && same !== id) { counts.duplicates.push(`${p.file} = media ${same}`); continue; }
    const {width, height} = jpegSize(body);
    const base = {filename: p.file, sha1: sha, mime: 'image/jpeg', width, height, bytes: body.length,
      legacy_url: `https://drive.google.com/file/d/${p.drive_id}/view`, tags: JSON.stringify(p.tags)};
    if (id) {
      await run(`UPDATE media SET ${Object.keys(base).map(c => `"${c}" = ?`).join(', ')}, updated_at = ?, updated_by = ? WHERE id = ?`, [...Object.values(base), now, USER, id]);
      counts.updated++;
    } else {
      const cols = [...Object.keys(base), 'created_at', 'updated_at', 'created_by', 'updated_by'];
      id = Number((await run(`INSERT INTO media (${cols.map(c => `"${c}"`).join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
        [...Object.values(base), now, now, USER, USER])).lastInsertRowid);
      await run('INSERT INTO import_keys (entity, natural_key, entity_id, at) VALUES (?, ?, ?, ?)', ['media', natural, id, now]);
      counts.created++;
    }
    const tr = {ro: {alt: p.alt_ro, description: p.description_ro}, en: {alt: p.alt_en, description: p.description_en}};
    const fp = trFingerprint('media', tr.ro);
    for (const [lang, t] of Object.entries(tr)) {
      const c = {...t, source_fp: lang === 'ro' ? null : fp, translated_at: lang === 'ro' ? null : now, translated_by: lang === 'ro' ? null : 'AI', updated_at: now};
      const n = Object.keys(c);
      await run(`INSERT INTO media_translations (entity_id, lang, ${n.map(x => `"${x}"`).join(', ')}) VALUES (?, ?, ${n.map(() => '?').join(', ')})
        ON CONFLICT (entity_id, lang) DO UPDATE SET ${n.map(x => `"${x}" = excluded."${x}"`).join(', ')}`, [id, lang, ...Object.values(c)]);
    }
    const prov = (field, lang, source, method, certainty) => run(`INSERT OR REPLACE INTO provenance (entity, entity_id, field, lang, source_id, method, certainty, created_at)
      VALUES ('media', ?, ?, ?, ?, ?, ?, ?)`, [id, field, lang, source, method, certainty, now]);
    for (const f of ['filename', 'sha1', 'mime', 'width', 'height', 'bytes']) await prov(f, '', src, 'download', 'confirmed');
    await prov('tags', '', aiSrc, 'ai-vision', 'inferred');
    for (const lang of ['ro', 'en']) for (const f of ['alt', 'description']) await prov(f, lang, aiSrc, 'ai-vision', 'inferred');
    await run('INSERT INTO audit_log (at, user_name, action, entity, entity_id, label, changes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [now, USER, 'import', 'media', id, natural, JSON.stringify({base: Object.keys(base), tr: ['ro', 'en']})]);
  }
  await tx.commit();
} catch (e) {
  await tx.rollback();
  throw e;
} finally {
  db.close();
}
console.log(`Fotografii: ${counts.created} create, ${counts.updated} actualizate`);
if (counts.duplicates.length) console.log(`Identice cu altele deja în bibliotecă (${counts.duplicates.length}):\n- ${counts.duplicates.join('\n- ')}`);
if (counts.missing.length) console.log(`Lipsesc din reference/snapshot/media (${counts.missing.length}):\n- ${counts.missing.join('\n- ')}`);
