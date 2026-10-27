// Harta 3D în Brain: din rezultatul lui scripts/harta-locatie.mjs (design/homepage/harta/locatie.json) scrie
//   - Date firmă: latitudinea, longitudinea, etajele și conturul clădirii
//   - Puncte de interes (repere): numele și categoria RO/EN, pictograma, coordonatele, publicate,
//     plus distanța, minutele pe jos și cu mașina și traseul pe jos (câmpuri calculate, doar de citit în /manage)
// Prin store (istoric, eveniment, proveniență), cu autorul „Harta”; câmpurile calculate, pe care store nu le scrie
// fiindcă sunt readonly, direct, în aceeași formă (audit_log + change_events + provenance). Se poate rula din nou:
// un punct e recunoscut după cheia lui (meta: harta:<id> → id) și doar se actualizează.
//   node scripts/harta-brain.mjs                                (local)
//   node --env-file=.env.turso.local scripts/harta-brain.mjs    (Turso)
import {readFileSync} from 'node:fs';
import {openDb, prepare, one} from '../src/core/db.mjs';
import {saveEntity, createEntity} from '../src/core/store.mjs';

const USER = 'Harta';
const SOURCE_URL = 'repo:scripts/harta-locatie.mjs';
const opts = {user: USER};
const EN = {Transport: 'Transport', Cumpărături: 'Shopping', Natură: 'Nature', Sport: 'Sport', Restaurant: 'Restaurant'};
const data = JSON.parse(readFileSync('design/homepage/harta/locatie.json', 'utf8'));
const now = () => new Date().toISOString();
const db = await prepare(openDb());

async function source(tx) {
  await tx.execute({sql: `INSERT INTO sources (kind, url, title, method, created_at) VALUES ('repo', ?, ?, 'OpenStreetMap + OSRM', ?) ON CONFLICT (url) DO NOTHING`,
    args: [SOURCE_URL, `Coordonate OpenStreetMap, rute OSRM (${data.source})`, now()]});
  return (await tx.execute({sql: 'SELECT id FROM sources WHERE url = ?', args: [SOURCE_URL]})).rows[0].id;
}
// Câmpurile calculate (readonly): doar cele care diferă, cu istoric, eveniment și proveniență
async function computed(key, table, id, label, values) {
  const tx = await db.transaction('write');
  try {
    const before = (await tx.execute({sql: `SELECT ${Object.keys(values).map(k => `"${k}"`).join(', ')} FROM "${table}" WHERE id = ?`, args: [id]})).rows[0];
    const changes = Object.fromEntries(Object.entries(values).filter(([k, v]) => String(before[k] ?? '') !== String(v ?? '')).map(([k, v]) => [k, [before[k] ?? null, v]]));
    if (!Object.keys(changes).length) { await tx.rollback(); return 0; }
    const at = now();
    await tx.execute({sql: `UPDATE "${table}" SET ${Object.keys(changes).map(k => `"${k}" = ?`).join(', ')}, updated_at = ?, updated_by = ? WHERE id = ?`,
      args: [...Object.keys(changes).map(k => values[k]), at, USER, id]});
    await tx.execute({sql: 'INSERT INTO audit_log (at, user_name, action, entity, entity_id, label, changes) VALUES (?, ?, ?, ?, ?, ?, ?)',
      args: [at, USER, 'update', key, id, label, JSON.stringify(changes)]});
    await tx.execute({sql: `INSERT INTO change_events (at, user_name, action, entity, entity_id, label, payload, status) VALUES (?, ?, 'update', ?, ?, ?, ?, 'pending')`,
      args: [at, USER, key, id, label, JSON.stringify({fields: Object.keys(changes)})]});
    const src = await source(tx);
    for (const field of Object.keys(changes))
      await tx.execute({sql: `INSERT INTO provenance (entity, entity_id, field, lang, source_id, method, certainty, created_at) VALUES (?, ?, ?, '', ?, 'calculat', 'confirmed', ?)
        ON CONFLICT (entity, entity_id, field, lang, source_id) DO UPDATE SET created_at = excluded.created_at`, args: [key, id, field, src, at]});
    await tx.commit();
    return Object.keys(changes).length;
  } catch (e) { await tx.rollback(); throw e; }
}

// 1. Date firmă
const {home, pois} = data;
await saveEntity(db, 'firma', 1, {base: {latitude: home.lat, longitude: home.lng, building_levels: home.levels}}, opts);
await computed('firma', 'company', 1, 'Date firmă', {building_footprint: JSON.stringify(home.footprint)});
console.log(`  ✓ Date firmă: ${home.lat}, ${home.lng} · ${home.levels} etaje · contur ${home.footprint.coordinates[0].length} puncte`);

// 2. Punctele de interes
for (const p of pois) {
  const key = `harta:${p.id}`;
  let id = (await one(db, 'SELECT value FROM meta WHERE key = ?', [key]))?.value;
  if (id && !(await one(db, 'SELECT id FROM places WHERE id = ?', [+id]))) id = null;
  const fields = {base: {icon: p.icon, latitude: p.lat, longitude: p.lng},
    tr: {ro: {name: p.name, category_name: p.kind}, en: {name: p.name, category_name: EN[p.kind] ?? p.kind}}};
  if (!id) {
    id = await createEntity(db, 'repere', fields, opts);
    await db.execute({sql: 'INSERT INTO meta (key, value) VALUES (?, ?) ON CONFLICT (key) DO UPDATE SET value = excluded.value', args: [key, String(id)]});
  } else await saveEntity(db, 'repere', +id, fields, opts);
  const st = await one(db, 'SELECT status FROM places WHERE id = ?', [+id]);
  if (st.status !== 'published') await saveEntity(db, 'repere', +id, {status: 'published'}, opts);
  const n = await computed('repere', 'places', +id, p.name, {distance_m: p.distance_m, walk_min: p.walk_min, drive_min: p.drive_min,
    walk_route: JSON.stringify(p.walk_route ?? []), osm: p.osm});
  console.log(`  ✓ #${id} ${p.name}: ${p.distance_m} m · ${p.walk_min} min pe jos · ${p.drive_min} min cu mașina${n ? '' : ' · neschimbat'}`);
}
db.close();
