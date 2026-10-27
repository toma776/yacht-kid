// Registrul, schema generată din el și regulile bilingve. Rulează pe node:sqlite, fără dependențe.
import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DatabaseSync} from 'node:sqlite';
import {ENTITIES} from '../src/registry/entities.mjs';
import {ASSUMPTIONS} from '../src/registry/assumptions.mjs';
import {formatMoney, formatNumber, formatRange} from '../src/registry/langs.mjs';
import {checkRegistry, publicPaths, inverseRelations, RELATION_TYPES, TOKENS, assumptionsUsed, entity, field, titleOf, LINK_REF} from '../src/registry/derive.mjs';
import {migrate, missingColumns, schemaSql} from '../src/core/schema.mjs';

const now = new Date().toISOString();
const freshDb = () => { const db = new DatabaseSync(':memory:'); migrate(db); return db; };
const insert = (db, table, row) => {
  const keys = Object.keys(row);
  return db.prepare(`INSERT INTO "${table}" (${keys.map(k => `"${k}"`).join(', ')}) VALUES (${keys.map(() => '?').join(', ')})`).run(...Object.values(row)).lastInsertRowid;
};

test('registrul e valid', () => {
  assert.deepEqual(checkRegistry(), []);
});

test('schema rulează pe SQLite, de două ori, fără coloane lipsă', () => {
  const db = freshDb();
  migrate(db);
  assert.deepEqual(missingColumns(db), []);
  for (const e of ENTITIES) assert.ok(db.prepare(`PRAGMA table_info("${e.table}")`).all().length, e.table);
});

test('db/schema.sql e la zi cu registrul', () => {
  assert.equal(readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8'), schemaSql(), 'rulează npm run schema');
});

test('migrarea adaugă o coloană nouă declarată în registru', () => {
  const db = freshDb();
  db.exec('ALTER TABLE businesses DROP COLUMN website');
  assert.deepEqual(missingColumns(db), ['ALTER TABLE "businesses" ADD COLUMN "website" TEXT']);
  migrate(db);
  assert.deepEqual(missingColumns(db), []);
});

test('bilingv: aceeași entitate, două traduceri, slug unic pe limbă', () => {
  const db = freshDb();
  const id = insert(db, 'unit_types', {kind: 'apartament', rooms: 2, area_min: 61.9, area_max: 66.24, price_from: 210000, created_at: now, updated_at: now});
  insert(db, 'unit_types_translations', {entity_id: id, lang: 'ro', name: 'Apartamente 2 camere', slug: 'apartamente-2-camere', legacy_id: 42, updated_at: now});
  insert(db, 'unit_types_translations', {entity_id: id, lang: 'en', name: '1-Bedroom Apartment', slug: '1-bedroom-apartment', legacy_id: 473, updated_at: now});
  // Același slug e permis în altă limbă, dar nu în aceeași
  const id2 = insert(db, 'unit_types', {kind: 'apartament', rooms: 3, area_min: 87.6, price_from: 390000, created_at: now, updated_at: now});
  insert(db, 'unit_types_translations', {entity_id: id2, lang: 'en', name: 'X', slug: 'apartamente-2-camere', updated_at: now});
  assert.throws(() => insert(db, 'unit_types_translations', {entity_id: id2, lang: 'ro', name: 'Y', slug: 'apartamente-2-camere', updated_at: now}), /UNIQUE/);
  assert.throws(() => insert(db, 'unit_types_translations', {entity_id: id, lang: 'de', name: 'Z', updated_at: now}), /CHECK/);
  // Prețul există o singură dată, pe entitate
  assert.equal(db.prepare('SELECT price_from FROM unit_types WHERE id = ?').get(id).price_from, 210000);
  assert.ok(!db.prepare('PRAGMA table_info(unit_types_translations)').all().some(c => c.name === 'price_from'));
});

test('adresele pe limbă păstrează adresele vechi; fără traducere nu există pagină', () => {
  const tr = {ro: {slug: 'apartamente-2-camere'}, en: {slug: '1-bedroom-apartment'}};
  assert.deepEqual(publicPaths('locuinte', {}, tr), {ro: '/apartamente-2-camere/', en: '/en/1-bedroom-apartment/'});
  assert.deepEqual(publicPaths('articole', {}, {ro: {slug: 'tva-apartamente-noi'}}), {ro: '/tva-apartamente-noi/'});
  assert.deepEqual(publicPaths('categorii', {}, {ro: {slug: 'premii'}, en: {slug: 'awards'}}), {ro: '/category/premii/', en: '/en/category/awards/'});
  assert.deepEqual(publicPaths('pagini', {}, {ro: {slug: ''}, en: {slug: ''}}), {ro: '/', en: '/en/'});
  assert.deepEqual(publicPaths('testimoniale', {}, {ro: {}}), {}, 'A5: testimonialele nu au pagină proprie');
});

test('cifrele, prețurile și legăturile nu se traduc', () => {
  for (const e of ENTITIES) for (const f of e.fields.filter(f => f.translatable))
    assert.ok(!['number', 'money', 'boolean', 'date', 'datetime', 'image', 'ref', 'refs', 'phone', 'email', 'select', 'multiselect'].includes(f.type), `${e.key}.${f.key}`);
  assert.ok(!field('locuinte', 'price_from').translatable);
  assert.ok(field('media', 'alt').translatable, 'o imagine are câte un text alternativ pe limbă');
});

test('formatarea după limbă: o valoare, două scrieri', () => {
  assert.equal(formatMoney(1495000, 'EUR', 'ro'), '1.495.000 €');
  assert.equal(formatMoney(1495000, 'EUR', 'en'), '€1,495,000');
  assert.equal(formatNumber(10000, 'ro'), '10.000');
  assert.equal(formatNumber(10000, 'en'), '10,000');
  assert.equal(formatRange(61.9, 66.24, 'ro', 'm²'), '61,9 – 66,24 m²');
  assert.equal(formatRange(61.9, 66.24, 'en', 'm²'), '61.9 – 66.24 m²');
});

test('validarea tipului de locuință: intervale și denumirea EN', () => {
  const v = entity('locuinte').validate;
  assert.deepEqual(v({kind: 'apartament', rooms: 2, area_min: 61.9, area_max: 66.24}, {tr: {en: {name: '1-Bedroom Apartment'}}}), []);
  const bad = v({kind: 'apartament', rooms: 2, area_min: 70, area_max: 60}, {tr: {en: {name: '2-Bedroom Apartment'}}});
  assert.deepEqual(bad.map(e => e.field), ['area_max', 'name']);
  assert.equal(bad[1].level, 'warning');
});

test('relațiile: declarate o dată, inversele se calculează', () => {
  const inv = inverseRelations('afaceri').map(r => r.id).sort();
  assert.deepEqual(inv, ['articole.businesses', 'niveluri-card.partners']);
  const rel = RELATION_TYPES.find(r => r.id === 'locuinte.gallery');
  assert.equal(rel.storage, 'rel_unit_types_gallery');
  assert.equal(rel.cardinality, 'M:N');
  assert.ok(rel.owned);
  // Filtrul `only`: ținta trebuie să aibă rolul cerut
  const only = field('premii', 'organizer').only;
  assert.ok(only({roles: '["organizator"]'}));
  assert.ok(!only({roles: ['furnizor']}));
});

test('cheile străine: categoria obligatorie blochează ștergerea, galeria se scoate în cascadă', () => {
  const db = freshDb();
  const cat = insert(db, 'categories', {created_at: now, updated_at: now});
  insert(db, 'posts', {category_id: cat, created_at: now, updated_at: now});
  assert.throws(() => db.prepare('DELETE FROM categories WHERE id = ?').run(cat), /FOREIGN KEY/);
  const unit = insert(db, 'unit_types', {kind: 'duplex', created_at: now, updated_at: now});
  const img = insert(db, 'media', {filename: 'a.webp', sha1: 'x', mime: 'image/webp', created_at: now, updated_at: now});
  insert(db, 'rel_unit_types_gallery', {src_id: unit, dst_id: img, status: 'confirmed'});
  db.prepare('DELETE FROM unit_types WHERE id = ?').run(unit);
  assert.equal(db.prepare('SELECT count(*) n FROM rel_unit_types_gallery').get().n, 0);
  assert.throws(() => insert(db, 'rel_unit_types_gallery', {src_id: 999, dst_id: img}), /FOREIGN KEY/);
});

test('jetoanele: fiecare are o singură sursă, formatată după limbă', () => {
  const names = TOKENS.map(t => t.name);
  for (const n of ['telefon', 'email', 'adresa', 'program', 'cui', 'nr_premii', '*']) assert.ok(names.includes(n), n);
  const adresa = TOKENS.find(t => t.name === 'adresa').format;
  const firma = {street: 'Str. Anton Holban 6', city: 'București', postal_code: '077190'};
  assert.equal(adresa(firma, 'ro'), 'Str. Anton Holban 6, București 077190');
  assert.equal(adresa(firma, 'en'), 'Str. Anton Holban 6, Bucharest 077190');
  // T2: cele 6 premii găsite dau „5 competiții”, ca pe site
  const premii = ['castigator', 'distinctie', 'mentiune', 'mentiune', 'distinctie', 'lista-scurta'].map(result => ({result}));
  assert.equal(premii.filter(TOKENS.find(t => t.name === 'nr_premii').count).length, 5);
});

test('scurtătura ref: păstrează parametrii și ancora', () => {
  assert.deepEqual([...'ref:locuinte:3?tip=duplex#contact'.match(LINK_REF)].slice(1), ['locuinte', '3', '?tip=duplex', '#contact']);
  assert.equal('ref:Locuinte:3'.match(LINK_REF), null);
});

test('titlul unei înregistrări vine din traducere când câmpul se traduce', () => {
  assert.equal(titleOf('locuinte', {id: 1}, {name: 'Duplex'}), 'Duplex');
  assert.equal(titleOf('afaceri', {id: 2, name: 'FABRIQ'}), 'FABRIQ');
  assert.equal(titleOf('locuinte', {id: 3}), 'Tip de locuință #3');
});

test('presupunerile: fiecare A* e folosită în registru și toate sunt în documentație', () => {
  const used = new Set(assumptionsUsed().map(u => u.id));
  for (const a of ASSUMPTIONS.filter(a => a.id.startsWith('A'))) assert.ok(used.has(a.id), `${a.id} nu e legată de niciun tip sau câmp`);
  const doc = readFileSync(new URL('../docs/02-registru.md', import.meta.url), 'utf8');
  for (const a of ASSUMPTIONS) assert.match(doc, new RegExp(`\\b${a.id}\\b`), `${a.id} lipsește din docs/02-registru.md`);
});

test('fiecare tip din documentul de entități există în registru', () => {
  const doc = readFileSync(new URL('../docs/01-entitati.md', import.meta.url), 'utf8');
  const declared = [...doc.matchAll(/\*\*`([a-z-]+)`\*\*/g)].map(m => m[1]);
  assert.ok(declared.length >= 15);
  for (const k of declared) assert.ok(entity(k), `${k} e în docs/01-entitati.md, dar nu în registru`);
});

test('migrarea pe o bază veche: o coloană nouă cu index se adaugă înainte de index', () => {
  const db = new DatabaseSync(':memory:');
  migrate(db);
  // Baza „de ieri”: fără logo-ul premiilor (coloană nouă în registru, cu index)
  db.exec('DROP INDEX "ix_awards_logo_id"; ALTER TABLE awards DROP COLUMN logo_id');
  assert.doesNotThrow(() => migrate(db));
  assert.ok(db.prepare('PRAGMA table_info(awards)').all().some(c => c.name === 'logo_id'));
  assert.ok(db.prepare(`SELECT 1 FROM sqlite_master WHERE name = 'ix_awards_logo_id'`).get());
});
