// Scrierea din /manage (§3.3): tranzacție cu istoric, eveniment și proveniență manuală; validare din registru.
import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {createClient} from '@libsql/client';
import {prepare, one, all} from '../src/core/db.mjs';
import {runImport} from '../src/import/run.mjs';
import {saveEntity, createEntity, decideLinks, StoreError} from '../src/core/store.mjs';
import {trFingerprint} from '../src/core/fingerprint.mjs';

let db, duplex;
before(async () => {
  db = await prepare(createClient({url: ':memory:'}));
  await runImport(db, {dir: join(process.cwd(), 'reference')});
  duplex = (await one(db, `SELECT id FROM unit_types WHERE kind = 'duplex'`)).id;
});

test('o salvare scrie modificarea, istoricul, evenimentul și proveniența manuală', async () => {
  const r = await saveEntity(db, 'locuinte', duplex, {base: {price_from: '1.450.000'}}, {user: 'Toma'});
  assert.deepEqual(r.changed, ['price_from']);
  assert.equal((await one(db, 'SELECT price_from FROM unit_types WHERE id = ?', [duplex])).price_from, 1450000);
  const a = await one(db, `SELECT user_name, changes FROM audit_log WHERE entity = 'locuinte' AND entity_id = ? ORDER BY id DESC LIMIT 1`, [duplex]);
  assert.equal(a.user_name, 'Toma');
  assert.deepEqual(JSON.parse(a.changes).price_from, [1495000, 1450000]);
  const ev = await one(db, `SELECT payload, status FROM change_events WHERE entity = 'locuinte' AND entity_id = ? ORDER BY id DESC LIMIT 1`, [duplex]);
  assert.equal(ev.status, 'pending');
  assert.deepEqual(JSON.parse(ev.payload).after.paths, {ro: '/duplex/', en: '/en/duplex-apartments/'});
  const p = await one(db, `SELECT certainty, verified_by FROM provenance WHERE entity = 'locuinte' AND entity_id = ? AND field = 'price_from' AND method = 'manual'`, [duplex]);
  assert.deepEqual({...p}, {certainty: 'confirmed', verified_by: 'Toma'});
});

test('nimic schimbat = niciun eveniment', async () => {
  const n = (await one(db, 'SELECT count(*) n FROM change_events')).n;
  const r = await saveEntity(db, 'locuinte', duplex, {base: {price_from: 1450000}});
  assert.deepEqual(r.changed, []);
  assert.equal((await one(db, 'SELECT count(*) n FROM change_events')).n, n);
});

test('blocare optimistă: o salvare peste o versiune veche primește 409', async () => {
  const {updated_at} = await one(db, 'SELECT updated_at FROM unit_types WHERE id = ?', [duplex]);
  await saveEntity(db, 'locuinte', duplex, {base: {terrace_max: 111}, expectedUpdatedAt: updated_at});
  await assert.rejects(saveEntity(db, 'locuinte', duplex, {base: {terrace_max: 112}, expectedUpdatedAt: updated_at}), e => e instanceof StoreError && e.status === 409);
});

test('validarea vine din registru', async () => {
  await assert.rejects(saveEntity(db, 'locuinte', duplex, {base: {kind: 'vila'}}), /nu e o opțiune/);
  await assert.rejects(saveEntity(db, 'locuinte', duplex, {base: {area_min: 300}}), /mai mică decât cea minimă/);
  await assert.rejects(saveEntity(db, 'locuinte', duplex, {tr: {ro: {name: ''}}}), /obligatoriu pentru publicare/);
  await assert.rejects(saveEntity(db, 'locuinte', duplex, {tr: {ro: {price_from: 1}}}), /nu se traduce/);
  await assert.rejects(saveEntity(db, 'locuinte', duplex, {tr: {ro: {slug: 'apartamente-2-camere'}}}), e => e.status === 409);
});

test('textul bogat se curăță la salvare (vocabular fix)', async () => {
  const id = (await one(db, `SELECT entity_id id FROM posts_translations WHERE lang = 'ro' LIMIT 1`)).id;
  await saveEntity(db, 'articole', id, {tr: {ro: {content: '<div class="x" style="color:red"><p>Text <script>alert(1)</script><b>bold</b></p></div>'}}});
  assert.equal((await one(db, `SELECT content FROM posts_translations WHERE entity_id = ? AND lang = 'ro'`, [id])).content, '<p>Text <strong>bold</strong></p>');
});

test('o schimbare în RO face traducerea EN „învechită”', async () => {
  const fpRo = async () => trFingerprint('locuinte', {...(await one(db, `SELECT * FROM unit_types_translations WHERE entity_id = ? AND lang = 'ro'`, [duplex]))});
  const en = async () => (await one(db, `SELECT source_fp FROM unit_types_translations WHERE entity_id = ? AND lang = 'en'`, [duplex])).source_fp;
  assert.equal(await en(), await fpRo(), 'la import, traducerea e la zi');
  await saveEntity(db, 'locuinte', duplex, {tr: {ro: {intro: 'Un text nou pentru duplex.'}}});
  assert.notEqual(await en(), await fpRo());
  await saveEntity(db, 'locuinte', duplex, {tr: {en: {intro: 'A new text for the duplex.'}}});
  assert.equal(await en(), await fpRo(), 'tradusă din nou, e iar la zi');
});

test('legăturile: cele noi sunt confirmate, cele deduse scoase se țin minte', async () => {
  const [l] = await all(db, `SELECT src_id, dst_id FROM rel_posts_businesses WHERE status = 'inferred' LIMIT 1`);
  await saveEntity(db, 'articole', l.src_id, {links: {businesses: []}});
  assert.ok(await one(db, `SELECT 1 FROM link_dismissals WHERE relation = 'articole.businesses' AND src_id = ? AND dst_id = ?`, [l.src_id, l.dst_id]));
  await saveEntity(db, 'articole', l.src_id, {links: {businesses: [l.dst_id]}});
  assert.equal((await one(db, 'SELECT status FROM rel_posts_businesses WHERE src_id = ? AND dst_id = ?', [l.src_id, l.dst_id])).status, 'confirmed');
});

test('Legături de verificat: confirmarea în masă e o tranzacție cu un singur eveniment', async () => {
  const pairs = (await all(db, `SELECT src_id, dst_id FROM rel_posts_awards WHERE status = 'inferred'`)).map(r => [r.src_id, r.dst_id]);
  const n = (await one(db, 'SELECT count(*) n FROM change_events')).n;
  const r = await decideLinks(db, 'articole.awards', pairs, 'confirm');
  assert.equal(r.changed, pairs.length);
  assert.equal((await one(db, 'SELECT count(*) n FROM change_events')).n, n + 1);
  assert.equal((await one(db, `SELECT count(*) n FROM rel_posts_awards WHERE status != 'confirmed'`)).n, 0);
});

test('o înregistrare nouă începe ca ciornă și nu se publică fără câmpurile obligatorii', async () => {
  const id = await createEntity(db, 'afaceri', {base: {name: 'Afacere test'}});
  assert.equal((await one(db, 'SELECT status FROM businesses WHERE id = ?', [id])).status, 'draft');
  await assert.rejects(saveEntity(db, 'premii', (await one(db, 'SELECT id FROM awards LIMIT 1')).id, {base: {year: ''}}), /obligatoriu/);
  await saveEntity(db, 'afaceri', id, {base: {state: 'deschis'}, status: 'published'});
  assert.equal((await one(db, 'SELECT status FROM businesses WHERE id = ?', [id])).status, 'published');
});
