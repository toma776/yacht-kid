// Importul din snapshot (§1.3) și site-ul citit prin contextul urmărit, pe datele reale.
// Testele 16–19 din §5 (refuzul peste editări, determinismul, verificarea dus-întors, proveniența) + regulile bilingve.
import {test, before} from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {createClient} from '@libsql/client';
import {prepare, all, one} from '../src/core/db.mjs';
import {runImport, ImportRefused} from '../src/import/run.mjs';
import {ENTITIES} from '../src/registry/entities.mjs';
import {RELATION_TYPES} from '../src/registry/derive.mjs';
import {createContext} from '../src/site/context.mjs';
import {resolvePath} from '../src/site/resolve.mjs';
import {tokenValues, rich} from '../src/site/rich.mjs';

const dir = join(process.cwd(), 'reference');
const fresh = async () => prepare(createClient({url: ':memory:'}));
const keys = async db => all(db, 'SELECT entity, natural_key, entity_id FROM import_keys ORDER BY entity, natural_key');
const counts = async db => Object.fromEntries(await Promise.all(ENTITIES.map(async e => [e.key, (await one(db, `SELECT count(*) n FROM "${e.table}"`)).n])));

let db, result;
before(async () => { db = await fresh(); result = await runImport(db, {dir}); });

test('importul trece verificarea dus-întors și rezolvă toate linkurile interne', () => {
  assert.ok(result.roundtrip.checked >= 48);
  assert.equal(result.roundtrip.failed, 0, JSON.stringify(result.report.roundtrip.failed));
  assert.equal(result.unresolved_links, 0);
});

test('importul e determinist: două baze goale primesc aceleași ID-uri', async () => {
  const other = await fresh();
  await runImport(other, {dir});
  assert.deepEqual(await keys(other), await keys(db));
  assert.deepEqual(await counts(other), await counts(db));
});

test('reimportul actualizează, nu dublează', async () => {
  const before = {k: await keys(db), c: await counts(db)};
  const links = (await one(db, 'SELECT count(*) n FROM rel_posts_businesses')).n;
  await runImport(db, {dir});
  assert.deepEqual(await keys(db), before.k);
  assert.deepEqual(await counts(db), before.c);
  assert.equal((await one(db, 'SELECT count(*) n FROM rel_posts_businesses')).n, links);
});

test('importul refuză să ruleze peste editări făcute de oameni, fără --overwrite-edits', async () => {
  const d = await fresh();
  await runImport(d, {dir});
  await d.execute(`INSERT INTO audit_log (at, user_name, action, entity, entity_id) VALUES ('2026-10-27', 'Toma', 'update', 'locuinte', 1)`);
  await assert.rejects(runImport(d, {dir}), ImportRefused);
  await runImport(d, {dir, overwriteEdits: true});
});

test('fiecare înregistrare importată are proveniență', async () => {
  for (const e of ENTITIES.filter(e => e.key !== 'cereri')) {
    const orphans = await one(db, `SELECT count(*) n FROM "${e.table}" x WHERE NOT EXISTS (SELECT 1 FROM provenance p WHERE p.entity = ? AND p.entity_id = x.id)`, [e.key]);
    assert.equal(orphans.n, 0, `${e.key}: ${orphans.n} fără sursă`);
  }
});

test('relațiile deduse la import nu sunt niciodată confirmate', async () => {
  for (const r of RELATION_TYPES.filter(r => (r.cardinality === 'M:N' && r.source === 'articole') || r.id === 'tehnologii.suppliers')) {
    const n = (await one(db, `SELECT count(*) n FROM "${r.storage}" WHERE status = 'confirmed'`)).n;
    assert.equal(n, 0, r.id);
  }
});

test('decizia omului rămâne la reimport; o legătură respinsă nu revine', async () => {
  const d = await fresh();
  await runImport(d, {dir});
  const [a, b] = await all(d, 'SELECT src_id, dst_id FROM rel_posts_businesses ORDER BY src_id LIMIT 2');
  await d.execute({sql: `UPDATE rel_posts_businesses SET status = 'confirmed' WHERE src_id = ? AND dst_id = ?`, args: [a.src_id, a.dst_id]});
  await d.execute({sql: 'DELETE FROM rel_posts_businesses WHERE src_id = ? AND dst_id = ?', args: [b.src_id, b.dst_id]});
  await d.execute({sql: `INSERT INTO link_dismissals (relation, src_id, dst_id, evidence, at, by) VALUES ('articole.businesses', ?, ?, 'titlu', '2026-10-27', 'Toma')`, args: [b.src_id, b.dst_id]});
  await runImport(d, {dir});
  assert.equal((await one(d, 'SELECT status FROM rel_posts_businesses WHERE src_id = ? AND dst_id = ?', [a.src_id, a.dst_id])).status, 'confirmed');
  assert.equal(await one(d, 'SELECT 1 FROM rel_posts_businesses WHERE src_id = ? AND dst_id = ?', [b.src_id, b.dst_id]), null);
});

test('bilingv: perechea RO ↔ EN e aceeași entitate', async () => {
  const ro = await resolvePath(db, '/apartamente-2-camere/');
  const en = await resolvePath(db, '/en/1-bedroom-apartment/');
  assert.equal(ro.key, 'locuinte');
  assert.equal(ro.id, en.id);
  assert.equal(en.lang, 'en');
  const priv = [await resolvePath(db, '/politica-de-confidentialitate/'), await resolvePath(db, '/en/privacy-policy/')];
  assert.equal(priv[0].id, priv[1].id, 'perechea fără hreflang a fost unită');
});

test('A1: prețul duplexului e scris o dată, cu ambele surse și certitudinea „unverified”', async () => {
  const {id} = await resolvePath(db, '/duplex/');
  assert.equal((await one(db, 'SELECT price_from FROM unit_types WHERE id = ?', [id])).price_from, 1495000);
  const prov = await all(db, `SELECT p.certainty, s.url FROM provenance p JOIN sources s ON s.id = p.source_id WHERE p.entity = 'locuinte' AND p.entity_id = ? AND p.field = 'price_from'`, [id]);
  assert.deepEqual(prov.map(p => p.certainty), ['unverified', 'unverified']);
  assert.deepEqual(prov.map(p => new URL(p.url).pathname).sort(), ['/duplex/', '/en/duplex-apartments/']);
});

test('A3, A5: articolele doar RO n-au pagină EN; testimonialele fără text sunt ciorne și au 301', async () => {
  assert.equal((await one(db, `SELECT count(*) n FROM posts p WHERE NOT EXISTS (SELECT 1 FROM posts_translations t WHERE t.entity_id = p.id AND t.lang = 'en')`)).n, 10);
  assert.equal(await resolvePath(db, '/en/tva-apartamente-noi/').key, undefined);
  assert.equal((await one(db, `SELECT count(*) n FROM testimonials WHERE status = 'draft' AND quote IS NULL`)).n, 39);
  assert.equal((await resolvePath(db, '/testimonial/georgiana-p/')).redirect.to_ref.startsWith('ref:pagini:'), true);
});

test('contextul: pe site doar ce e publicat; jetoanele vin din Date firmă și din premii', async () => {
  const ro = createContext(db, 'ro'), en = createContext(db, 'en');
  const [vRo, vEn] = [await tokenValues(ro), await tokenValues(en)];
  assert.equal(vRo.telefon, '+40739085331');
  assert.equal(vRo.adresa, 'Str. Anton Holban 6, București 077190');
  assert.equal(vEn.adresa, 'Str. Anton Holban 6, Bucharest 077190');
  assert.equal(vRo.nr_premii, '5', 'T2: fără lista scurtă');
  assert.equal(vRo.parc, '10.000 m²');
  assert.equal(vEn.parc, '10,000 sqm');
  const drafts = await ro.query('testimoniale', {fields: ['featured']});
  assert.ok(drafts.every(t => t.quote), 'ciornele nu ajung pe site');
  await assert.rejects(ro.query('articole', {}), /fără scope/);
});

test('primul import de pe server rulează o singură dată', async () => {
  const {importIfEmpty} = await import('../src/import/auto.mjs');
  const d = await fresh();
  assert.ok((await importIfEmpty(d, {dir})).imported);
  assert.ok((await importIfEmpty(d, {dir})).skipped);
  assert.equal((await one(d, `SELECT count(*) n FROM change_events WHERE action = 'import'`)).n, 1);
});

test('textul bogat: trimiterile devin adresa curentă în limba paginii', async () => {
  const row = await one(db, `SELECT t.content FROM posts_translations t WHERE t.lang = 'ro' AND t.content LIKE '%data-ref="%' LIMIT 1`);
  assert.ok(row, 'există articole cu linkuri interne');
  const html = await rich(createContext(db, 'ro'), row.content);
  assert.ok(!html.includes('data-ref='));
  assert.match(html, /href="\/[^"]*\/"/);
});
