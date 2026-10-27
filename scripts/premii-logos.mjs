// Logo-urile competițiilor la care a fost premiat YACHT KID, pentru banda de premii de pe homepage.
//   1. descarcă marca oficială a fiecărei competiții de pe site-ul organizatorului → reference/snapshot/media/brain/premii/
//      (lângă celelalte fișiere media; pe Vercel ajung prin scripts/media-to-blob.mjs)
//   2. le adaugă în Brain ca media, cu text alternativ RO/EN și proveniența (adresa oficială a fișierului)
//   3. leagă fiecare premiu de logo-ul competiției (awards.logo) și de insigna primită (awards.badge: sigiliile de pe
//      site-ul vechi, #241–245), iar organizatorul doar unde e confirmat pe site-ul oficial
// Reluabil: un fișier cu aceeași amprentă nu se adaugă de două ori.   node scripts/premii-logos.mjs
import {createHash} from 'node:crypto';
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {openDb, prepare} from '../src/core/db.mjs';

const DIR = 'brain/premii';
const OUT = join(process.cwd(), 'reference', 'snapshot', 'media', DIR);
const USER = 'Premii';
const UA = 'Mozilla/5.0 (YachtKid Brain)';

// Marca oficială a fiecărei competiții; badge = sigiliul primit, deja în media (de pe site-ul vechi)
const LOGOS = [
  {award: 1, file: 'iconic-awards.svg', name: 'ICONIC AWARDS', badge: 241,
    url: 'https://iconic-awards.com/_assets/8527f122aa2069c02d9fe9c530e7bdc5/Images/logo/logo-iconic-awards_white.svg'},
  {award: 2, file: 'german-design-award.svg', name: 'German Design Award', badge: 244,
    url: 'https://www.german-design-award.com/_assets/396a91bff0b3ddf7c5dbeaf6be6c0dcd/Images/logo/GDA_HO_K_RGB.svg'},
  {award: 3, file: 'saint-gobain.svg', name: 'Saint-Gobain', badge: 242,
    url: 'https://www.saint-gobain-gypsum-trophy.com/wp-content/mediafiles/2024/04/ST_GOBAIN_LOGOTYPE_RVB.svg'},
  {award: 4, file: 'built-design-awards.png', name: 'BLT Built Design Awards', badge: 243,
    url: 'https://bltawards.com/wp2/wp-content/uploads/2021/08/BLT-Logo-Negative-1.png'},
  // AMP are logo-ul doar ca SVG în pagină; diagonalele „N” sunt de altă culoare decât dreptunghiurile, așa că le
  // păstrăm la 45% opacitate: afișat monocrom (mască), N-ul rămâne lizibil
  {award: 5, file: 'architecture-masterprize.svg', name: 'Architecture MasterPrize', badge: 245, page: 'https://architectureprize.com/',
    fromPage: html => html.match(/<svg[\s\S]*?<\/svg>/)[0].replace(/ width="250px"/, '')
      .replace('.st0{fill:url(#SVGID_1_);}', '.st0{fill:#000;fill-opacity:.45;}').replace('.st2{fill:url(#SVGID_2_);}', '.st2{fill:#000;fill-opacity:.45;}')
      .replace('.st1{fill:#31C0CE;}', '.st1{fill:#000;}').replace('.st3{fill:#333132;}', '.st3{fill:#000;}')},
  {award: 6, file: 'share-architecture-awards.svg', name: 'SHARE Architecture Awards',
    url: 'https://share-architects.com/wp-content/uploads/2025/07/share-architects.com-logo-general-white.svg'}
];
// Organizatorii confirmați pe site-urile oficiale (sigla „award by German Design Council” apare pe ambele site-uri)
const ORGANIZERS = [
  {name: 'German Design Council', url: 'https://www.german-design-council.de/', awards: [1, 2]},
  {partner: 1, awards: [3]} // Saint-Gobain, deja partener (furnizor); primește și rolul de organizator
];

const now = () => new Date().toISOString();
const get = async url => { const r = await fetch(url, {headers: {'user-agent': UA}}); if (!r.ok) throw new Error(`${r.status} ${url}`); return Buffer.from(await r.arrayBuffer()); };
const sizeOf = (buf, file) => {
  if (file.endsWith('.png')) return {width: buf.readUInt32BE(16), height: buf.readUInt32BE(20)};
  const vb = buf.toString('utf8').match(/viewBox="[\d.\s-]*?([\d.]+)\s+([\d.]+)"/);
  return vb ? {width: Math.round(+vb[1]), height: Math.round(+vb[2])} : {width: null, height: null};
};

async function source(tx, url, title) {
  await tx.execute({sql: `INSERT INTO sources (kind, url, title, fetched_at, method, status, created_at) VALUES ('site', ?, ?, ?, 'descărcat', 200, ?) ON CONFLICT (url) DO NOTHING`,
    args: [url, title, now(), now()]});
  return (await tx.execute({sql: 'SELECT id FROM sources WHERE url = ?', args: [url]})).rows[0].id;
}
async function log(tx, action, entity, id, label, changes, src, fields, method) {
  const at = now();
  await tx.execute({sql: 'INSERT INTO audit_log (at, user_name, action, entity, entity_id, label, changes) VALUES (?, ?, ?, ?, ?, ?, ?)',
    args: [at, USER, action, entity, id, label, JSON.stringify(changes)]});
  await tx.execute({sql: `INSERT INTO change_events (at, user_name, action, entity, entity_id, label, payload, status) VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`,
    args: [at, USER, action, entity, id, label, JSON.stringify({fields})]});
  for (const field of fields)
    await tx.execute({sql: `INSERT INTO provenance (entity, entity_id, field, lang, source_id, method, certainty, created_at) VALUES (?, ?, ?, '', ?, ?, 'confirmed', ?)
      ON CONFLICT (entity, entity_id, field, lang, source_id) DO NOTHING`, args: [entity, id, field, src, method, at]});
}
// Schimbă doar câmpurile care diferă; întoarce câmpurile schimbate
async function update(tx, table, id, values) {
  const before = (await tx.execute({sql: `SELECT ${Object.keys(values).map(k => `"${k}"`).join(', ')} FROM "${table}" WHERE id = ?`, args: [id]})).rows[0];
  const changes = Object.fromEntries(Object.entries(values).filter(([k, v]) => String(before[k] ?? '') !== String(v ?? '')).map(([k, v]) => [k, [before[k] ?? null, v]]));
  if (Object.keys(changes).length)
    await tx.execute({sql: `UPDATE "${table}" SET ${Object.keys(changes).map(k => `"${k}" = ?`).join(', ')}, updated_at = ?, updated_by = ? WHERE id = ?`,
      args: [...Object.keys(changes).map(k => values[k]), now(), USER, id]});
  return changes;
}

const db = await prepare(openDb());
mkdirSync(OUT, {recursive: true});
const tx = await db.transaction('write');
try {
  const media = {};
  for (const l of LOGOS) {
    const buf = l.fromPage ? Buffer.from(l.fromPage((await get(l.page)).toString('utf8'))) : await get(l.url);
    writeFileSync(join(OUT, l.file), buf);
    const sha1 = createHash('sha1').update(buf).digest('hex');
    const filename = `${DIR}/${l.file}`;
    const mime = l.file.endsWith('.svg') ? 'image/svg+xml' : 'image/png';
    const {width, height} = sizeOf(buf, l.file);
    const src = await source(tx, l.url ?? l.page, `Logo ${l.name} (site oficial)`);
    let id = (await tx.execute({sql: 'SELECT id FROM media WHERE filename = ? OR sha1 = ?', args: [filename, sha1]})).rows[0]?.id;
    if (id) {
      const ch = await update(tx, 'media', id, {sha1, mime, width, height, bytes: buf.length});
      if (Object.keys(ch).length) await log(tx, 'update', 'media', id, filename, ch, src, Object.keys(ch), 'descărcat');
    } else {
      const at = now();
      id = Number((await tx.execute({sql: `INSERT INTO media (filename, sha1, mime, width, height, bytes, tags, created_at, updated_at, created_by, updated_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [filename, sha1, mime, width, height, buf.length, JSON.stringify(['premiu', 'logo']), at, at, USER, USER]})).lastInsertRowid);
      for (const [lang, alt] of [['ro', `Logo ${l.name}`], ['en', `${l.name} logo`]])
        await tx.execute({sql: 'INSERT INTO media_translations (entity_id, lang, alt, updated_at) VALUES (?, ?, ?, ?)', args: [id, lang, alt, at]});
      await log(tx, 'create', 'media', id, filename, {filename: [null, filename]}, src, ['filename', 'alt'], l.fromPage ? 'extras din pagină, normalizat pentru afișare monocromă' : 'descărcat');
    }
    media[l.award] = id;

    // Premiul: logo-ul competiției și insigna primită
    const values = {logo_id: id, ...(l.badge ? {badge_id: l.badge} : {})};
    const ch = await update(tx, 'awards', l.award, values);
    if (Object.keys(ch).length) await log(tx, 'update', 'premii', l.award, l.name, ch, src, Object.keys(ch).map(k => k.replace(/_id$/, '')), 'legătură');
    console.log(`  ✓ premiul #${l.award} ${l.name}: logo media #${id} (${(buf.length / 1024).toFixed(1)} KB, ${width}×${height})${l.badge ? ` · insigna #${l.badge}` : ''}`);
  }

  for (const o of ORGANIZERS) {
    let pid = o.partner;
    const src = await source(tx, o.url ?? 'https://www.saint-gobain-gypsum-trophy.com/', o.name ? `${o.name} (site oficial)` : 'Saint-Gobain Gypsum Trophy (site oficial)');
    if (!pid) {
      pid = (await tx.execute({sql: 'SELECT id FROM partners WHERE name = ?', args: [o.name]})).rows[0]?.id;
      if (!pid) {
        const at = now();
        pid = Number((await tx.execute({sql: `INSERT INTO partners (status, name, roles, url, published_at, created_at, updated_at, created_by, updated_by) VALUES ('published', ?, ?, ?, ?, ?, ?, ?, ?)`,
          args: [o.name, JSON.stringify(['organizator']), o.url, at, at, at, USER, USER]})).lastInsertRowid);
        await log(tx, 'create', 'parteneri', pid, o.name, {name: [null, o.name]}, src, ['name', 'roles', 'url'], 'site oficial');
      }
    } else {
      const roles = JSON.parse((await tx.execute({sql: 'SELECT roles FROM partners WHERE id = ?', args: [pid]})).rows[0].roles ?? '[]');
      const ch = await update(tx, 'partners', pid, {roles: JSON.stringify([...new Set([...roles, 'organizator'])]), ...(media[3] ? {logo_id: media[3]} : {})});
      if (Object.keys(ch).length) await log(tx, 'update', 'parteneri', pid, 'Saint-Gobain', ch, src, Object.keys(ch).map(k => k.replace(/_id$/, '')), 'site oficial');
    }
    for (const a of o.awards) {
      const ch = await update(tx, 'awards', a, {organizer_id: pid});
      if (Object.keys(ch).length) await log(tx, 'update', 'premii', a, `premiul #${a}`, ch, src, ['organizer'], 'legătură');
    }
    console.log(`  ✓ organizator #${pid} ${o.name ?? 'Saint-Gobain'} → premiile ${o.awards.join(', ')}`);
  }
  await tx.commit();
} catch (e) { await tx.rollback(); throw e; }
db.close();
