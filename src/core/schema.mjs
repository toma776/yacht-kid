// Schema bazei, generată din registru (§1.1, Anexa B). Dialect SQLite (presupunerea T1): node:sqlite local, libSQL pe Vercel.
// Migrarea doar adaugă: `schemaStatements()` folosește IF NOT EXISTS, iar `missingColumns()` spune ce coloane noi
// trebuie adăugate cu ALTER TABLE, deci rulează sigur la fiecare pornire.
import {ENTITIES} from '../registry/entities.mjs';
import {entity, baseFields, translatableFields, hasTranslations, hasStatus, RELATION_TYPES} from '../registry/derive.mjs';
import {LANGS} from '../registry/langs.mjs';

const q = s => `"${s}"`;
const sqlList = xs => xs.map(x => `'${String(x).replace(/'/g, "''")}'`).join(', ');
const JSON_TYPES = ['multiselect', 'list', 'links', 'texts', 'table'];

// Numele coloanei: cheile străine primesc sufixul _id (services.specialty_id)
export const columnOf = f => (f.type === 'ref' || f.type === 'image' ? `${f.key}_id` : f.key);

// Câmpurile obligatorii nu sunt NOT NULL în bază: o ciornă poate fi incompletă, iar store-ul validează la publicare.
function columnSql(f) {
  const c = q(columnOf(f));
  switch (f.type) {
    case 'int': case 'money': return `${c} INTEGER${f.default != null ? ` DEFAULT ${+f.default}` : ''}`;
    case 'number': return `${c} REAL`;
    case 'boolean': return `${c} INTEGER NOT NULL DEFAULT ${f.default ? 1 : 0} CHECK (${c} IN (0, 1))`;
    case 'select': return `${c} TEXT${f.default != null ? ` DEFAULT '${f.default}'` : ''} CHECK (${c} IS NULL OR ${c} IN (${sqlList(f.options)}))`;
    case 'image': return `${c} INTEGER REFERENCES media(id) ON DELETE ${f.required ? 'RESTRICT' : 'SET NULL'}`;
    case 'ref': return `${c} INTEGER REFERENCES ${q(entity(f.target).table)}(id) ON DELETE ${f.required ? 'RESTRICT' : 'SET NULL'}`;
    default: return JSON_TYPES.includes(f.type) ? `${c} TEXT CHECK (${c} IS NULL OR json_valid(${c}))` : `${c} TEXT${f.default != null ? ` DEFAULT '${f.default}'` : ''}`;
  }
}

function entityTable(e) {
  const cols = ['id INTEGER PRIMARY KEY AUTOINCREMENT'];
  if (hasStatus(e.key)) cols.push(
    `status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published', 'archived'))`,
    'draft TEXT CHECK (draft IS NULL OR json_valid(draft))',
    'published_at TEXT');
  cols.push(...baseFields(e.key).map(columnSql));
  cols.push('search TEXT', 'created_at TEXT NOT NULL', 'updated_at TEXT NOT NULL', 'created_by TEXT', 'updated_by TEXT');
  if (e.singleton) cols.push('CHECK (id = 1)');
  const out = [`CREATE TABLE IF NOT EXISTS ${q(e.table)} (\n  ${cols.join(',\n  ')}\n)`];
  for (const f of baseFields(e.key)) {
    if (f.unique) out.push(`CREATE UNIQUE INDEX IF NOT EXISTS ${q(`ux_${e.table}_${f.key}`)} ON ${q(e.table)}(${q(columnOf(f))})`);
    else if (f.type === 'ref' || f.type === 'image') out.push(`CREATE INDEX IF NOT EXISTS ${q(`ix_${e.table}_${columnOf(f)}`)} ON ${q(e.table)}(${q(columnOf(f))})`);
  }
  if (hasStatus(e.key)) out.push(`CREATE INDEX IF NOT EXISTS ${q(`ix_${e.table}_status`)} ON ${q(e.table)}(status)`);
  return out;
}

// §1.10: un rând pe limbă. `source_fp` = amprenta textului RO din momentul traducerii; diferită de cea curentă = „învechită”.
function translationTable(e) {
  const t = `${e.table}_translations`;
  const fields = translatableFields(e.key);
  const cols = [
    `entity_id INTEGER NOT NULL REFERENCES ${q(e.table)}(id) ON DELETE CASCADE`,
    `lang TEXT NOT NULL CHECK (lang IN (${sqlList(LANGS)}))`,
    ...fields.map(columnSql),
    'source_fp TEXT', 'translated_at TEXT', 'translated_by TEXT', 'updated_at TEXT NOT NULL',
    'PRIMARY KEY (entity_id, lang)'
  ];
  const out = [`CREATE TABLE IF NOT EXISTS ${q(t)} (\n  ${cols.join(',\n  ')}\n)`];
  // Slug-ul e unic pe limbă, nu global (§1.10); unicitatea adresei între tipuri o verifică store-ul (§1.2)
  if (fields.some(f => f.type === 'slug')) out.push(`CREATE UNIQUE INDEX IF NOT EXISTS ${q(`ux_${t}_slug`)} ON ${q(t)}(lang, slug) WHERE slug IS NOT NULL`);
  if (fields.some(f => f.key === 'legacy_id')) out.push(`CREATE INDEX IF NOT EXISTS ${q(`ix_${t}_legacy`)} ON ${q(t)}(legacy_id)`);
  return out;
}

// Anexa B: o relație multiplă, cu stare, încredere, sursă, atribute proprii și trigger fără legături spre sine
function relationTable(r) {
  const src = entity(r.source).table, dst = entity(r.target).table, t = r.storage;
  const out = [`CREATE TABLE IF NOT EXISTS ${q(t)} (
  src_id INTEGER NOT NULL REFERENCES ${q(src)}(id) ON DELETE CASCADE,
  dst_id INTEGER NOT NULL REFERENCES ${q(dst)}(id) ON DELETE CASCADE,
  position INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('confirmed', 'inferred', 'unverified')),
  confidence REAL,
  source_id INTEGER REFERENCES sources(id) ON DELETE SET NULL,
  note TEXT,
  attrs TEXT CHECK (attrs IS NULL OR json_valid(attrs)),
  created_at TEXT, created_by TEXT,
  PRIMARY KEY (src_id, dst_id)
)`, `CREATE INDEX IF NOT EXISTS ${q(`ix_${t}_dst`)} ON ${q(t)}(dst_id)`];
  if (src === dst) out.push(`CREATE TRIGGER IF NOT EXISTS ${q(`no_self_${t}`)} BEFORE INSERT ON ${q(t)} WHEN NEW.src_id = NEW.dst_id
BEGIN SELECT RAISE(ABORT, 'o înregistrare nu se poate lega de ea însăși'); END`);
  return out;
}

// Tabelele sistemului, după Anexa B (+ NOU), plus cele „ca în nucleu”, scrise aici cât timp nu avem acces la nucleu
export const SYSTEM_SQL = [
  `CREATE TABLE IF NOT EXISTS sources (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  kind TEXT NOT NULL CHECK (kind IN ('site', 'endpoint', 'repo', 'document', 'manual')),
  url TEXT NOT NULL UNIQUE, title TEXT, fetched_at TEXT, method TEXT, snapshot_file TEXT, status INTEGER, note TEXT,
  lang TEXT,
  created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS provenance (
  id INTEGER PRIMARY KEY AUTOINCREMENT, entity TEXT NOT NULL, entity_id INTEGER NOT NULL, field TEXT NOT NULL DEFAULT '',
  lang TEXT NOT NULL DEFAULT '',
  source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE, excerpt TEXT, method TEXT,
  certainty TEXT NOT NULL DEFAULT 'confirmed' CHECK (certainty IN ('confirmed', 'inferred', 'unverified', 'unrecoverable')),
  confidence REAL, verified_at TEXT, verified_by TEXT, created_at TEXT NOT NULL,
  UNIQUE (entity, entity_id, field, lang, source_id))`,
  `CREATE INDEX IF NOT EXISTS ix_provenance_entity ON provenance(entity, entity_id)`,
  `CREATE TABLE IF NOT EXISTS link_dismissals (
  relation TEXT NOT NULL, src_id INTEGER NOT NULL, dst_id INTEGER NOT NULL, evidence TEXT,
  at TEXT NOT NULL, by TEXT, PRIMARY KEY (relation, src_id, dst_id))`,
  `CREATE TABLE IF NOT EXISTS aliases (
  entity TEXT NOT NULL, entity_id INTEGER NOT NULL, alias TEXT NOT NULL, learned_from TEXT, at TEXT NOT NULL,
  PRIMARY KEY (entity, alias))`,
  // Cheia naturală din sistemul vechi → ID-ul din Brain (§1.3: ID-uri deterministe, reimportul actualizează, nu dublează)
  `CREATE TABLE IF NOT EXISTS import_keys (
  entity TEXT NOT NULL, natural_key TEXT NOT NULL, entity_id INTEGER NOT NULL, at TEXT NOT NULL,
  PRIMARY KEY (entity, natural_key))`,
  `CREATE TABLE IF NOT EXISTS page_index (
  path TEXT PRIMARY KEY, lang TEXT NOT NULL, owner_entity TEXT, owner_id INTEGER, title TEXT, status INTEGER, rendered_at TEXT,
  hash TEXT, deps INTEGER, error TEXT, stale INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS page_deps (
  path TEXT NOT NULL, entity TEXT NOT NULL, entity_id INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('page', 'direct', 'list', 'query', 'link', 'media', 'layout', 'pending')),
  component TEXT NOT NULL DEFAULT '', scope TEXT NOT NULL DEFAULT '', fields TEXT, reason TEXT)`,
  `CREATE INDEX IF NOT EXISTS ix_page_deps_entity ON page_deps(entity, entity_id)`,
  `CREATE INDEX IF NOT EXISTS ix_page_deps_path ON page_deps(path)`,
  `CREATE TABLE IF NOT EXISTS change_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT, at TEXT NOT NULL, user_name TEXT, action TEXT NOT NULL, entity TEXT, entity_id INTEGER,
  label TEXT, payload TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'done', 'failed')),
  attempts INTEGER NOT NULL DEFAULT 0, last_error TEXT, processed_at TEXT, affected INTEGER)`,
  `CREATE INDEX IF NOT EXISTS ix_change_events_status ON change_events(status)`,
  `CREATE TABLE IF NOT EXISTS sync_log (
  id INTEGER PRIMARY KEY, event_id INTEGER REFERENCES change_events(id) ON DELETE CASCADE, at TEXT NOT NULL,
  path TEXT, action TEXT NOT NULL, detail TEXT)`,
  `CREATE TABLE IF NOT EXISTS audit_log (id INTEGER PRIMARY KEY, at TEXT NOT NULL, user_id INTEGER, user_name TEXT,
  action TEXT NOT NULL, entity TEXT, entity_id INTEGER, lang TEXT, label TEXT, changes TEXT, reverted_by INTEGER)`,
  `CREATE INDEX IF NOT EXISTS ix_audit_entity ON audit_log(entity, entity_id)`,
  `CREATE TABLE IF NOT EXISTS validations (entity TEXT NOT NULL, entity_id INTEGER NOT NULL, fp TEXT NOT NULL, user_name TEXT,
  at TEXT NOT NULL, comment TEXT, PRIMARY KEY (entity, entity_id))`,
  `CREATE TABLE IF NOT EXISTS validation_log (id INTEGER PRIMARY KEY, entity TEXT NOT NULL, entity_id INTEGER NOT NULL, fp TEXT,
  user_name TEXT, at TEXT NOT NULL, action TEXT NOT NULL, comment TEXT)`,
  `CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT, updated_at TEXT, updated_by TEXT)`,
  `CREATE TABLE IF NOT EXISTS meta (key TEXT PRIMARY KEY, value TEXT)`,
  `CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('administrator', 'editor', 'vizualizare')),
  password_hash TEXT, active INTEGER NOT NULL DEFAULT 1, created_at TEXT NOT NULL, last_login_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TEXT NOT NULL, expires_at TEXT NOT NULL, ip TEXT, user_agent TEXT)`,
  `CREATE TABLE IF NOT EXISTS login_attempts (id INTEGER PRIMARY KEY, email TEXT, ip TEXT, at TEXT NOT NULL, ok INTEGER NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS backups (id INTEGER PRIMARY KEY, at TEXT NOT NULL, file TEXT NOT NULL, bytes INTEGER,
  kind TEXT NOT NULL CHECK (kind IN ('automat', 'manual', 'inainte-de-restaurare')), created_by TEXT)`
];

// Ordinea contează: media și țintele cheilor străine întâi, apoi restul, apoi traducerile și relațiile
function orderedEntities() {
  const done = new Set(), out = [];
  const visit = (e, stack = new Set()) => {
    if (done.has(e.key) || stack.has(e.key)) return;
    stack.add(e.key);
    for (const f of e.fields) {
      const t = f.type === 'image' ? 'media' : f.type === 'ref' ? f.target : null;
      if (t && t !== e.key) visit(entity(t), stack);
    }
    done.add(e.key); out.push(e);
  };
  ENTITIES.forEach(e => visit(e));
  return out;
}

export function schemaStatements() {
  const entities = orderedEntities();
  return [
    ...SYSTEM_SQL,
    ...entities.flatMap(entityTable),
    ...entities.filter(e => hasTranslations(e.key)).flatMap(translationTable),
    ...RELATION_TYPES.filter(r => r.cardinality === 'M:N').flatMap(relationTable)
  ];
}

export const schemaSql = () => `-- Generat din src/registry/entities.mjs de src/core/schema.mjs. Nu se editează de mână.\n\n${schemaStatements().map(s => `${s};`).join('\n\n')}\n`;

// Migrare care doar adaugă: coloanele declarate în registru care lipsesc dintr-o bază existentă.
// `columnsOf(table)` întoarce numele coloanelor; așa merge la fel pe node:sqlite (sincron) și pe libSQL (asincron).
const migrationTargets = () => ENTITIES.flatMap(e => [
  [e.table, baseFields(e.key)],
  ...(hasTranslations(e.key) ? [[`${e.table}_translations`, translatableFields(e.key)]] : [])
]);
const alterFor = (table, fields, have) => (have.size ? fields.filter(f => !have.has(columnOf(f)))
  .map(f => `ALTER TABLE ${q(table)} ADD COLUMN ${columnSql(f).replace(/ NOT NULL DEFAULT/, ' DEFAULT')}`) : []);

export const missingColumns = db => migrationTargets()
  .flatMap(([t, fields]) => alterFor(t, fields, new Set(db.prepare(`PRAGMA table_info(${q(t)})`).all().map(c => c.name))));

// Ordinea contează pe o bază existentă: tabelele, apoi coloanele noi (ALTER), abia apoi indexurile —
// un index pe o coloană adăugată acum în registru ar eșua înainte ca ALTER-ul să o creeze
const isIndex = s => /^CREATE (UNIQUE )?INDEX/i.test(s.trim());

export function migrate(db) {
  db.exec('PRAGMA foreign_keys = ON');
  const all = schemaStatements();
  for (const s of all.filter(s => !isIndex(s))) db.exec(s);
  for (const s of missingColumns(db)) db.exec(s);
  for (const s of all.filter(isIndex)) db.exec(s);
}

// Aceeași migrare pe clientul libSQL (local: fișier; producție: Turso)
export async function migrateClient(client) {
  const all = schemaStatements();
  await client.batch(all.filter(s => !isIndex(s)), 'write');
  const alters = [];
  for (const [t, fields] of migrationTargets()) {
    const {rows} = await client.execute(`PRAGMA table_info(${q(t)})`);
    alters.push(...alterFor(t, fields, new Set(rows.map(r => r.name))));
  }
  if (alters.length) await client.batch(alters, 'write');
  await client.batch(all.filter(isIndex), 'write');
  return alters;
}
