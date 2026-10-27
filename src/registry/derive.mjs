// Tot ce se deduce din registru (principiul 9): tipurile de câmpuri, relațiile și inversele lor, adresele pe limbă,
// jetoanele și verificarea registrului. Nimic de aici nu se întreține de mână.
import {ENTITIES, CATEGORIES} from './entities.mjs';
import {ASSUMPTIONS} from './assumptions.mjs';
import {LANGS} from './langs.mjs';

export const FIELD_TYPES = ['text', 'textarea', 'richtext', 'slug', 'int', 'number', 'money', 'boolean', 'select', 'multiselect',
  'date', 'datetime', 'url', 'email', 'phone', 'list', 'links', 'texts', 'table', 'image', 'ref', 'refs'];

// Ce se poate traduce. Cifrele, banii, datele, contactele și legăturile se scriu o singură dată (docs/01-entitati.md, §2).
export const TRANSLATABLE_TYPES = ['text', 'textarea', 'richtext', 'slug', 'list', 'links', 'texts', 'table', 'url', 'int'];
const TRANSLATABLE_INT_KEYS = ['legacy_id'];

// Scurtătura de link din meniuri, carduri și butoane: ref:<tip>:<id>[?parametri][#ancoră] (§2.1)
export const LINK_REF = /^ref:([a-z][a-z0-9-]*):(\d+)(\?[^#]*)?(#.*)?$/;
// Jeton într-un text: {telefon}, {nr_premii}
export const TOKEN = /\{([a-z][a-z0-9_]*)\}/g;

export const entity = key => ENTITIES.find(e => e.key === key);
export const entityByTable = table => ENTITIES.find(e => e.table === table);
export const fieldsOf = key => entity(key)?.fields ?? [];
export const field = (key, f) => fieldsOf(key).find(x => x.key === f);
export const isTranslatable = f => !!f.translatable;
export const baseFields = key => fieldsOf(key).filter(f => !f.translatable && f.type !== 'refs');
export const translatableFields = key => fieldsOf(key).filter(f => f.translatable);
export const hasTranslations = key => translatableFields(key).length > 0;
export const hasStatus = key => !entity(key)?.noStatus;
export const hasPublicPage = key => typeof entity(key)?.public?.path === 'function';
export const titleOf = (key, rec, tr) => {
  const f = entity(key)?.title;
  return (field(key, f)?.translatable ? tr?.[f] : rec?.[f]) ?? `${entity(key)?.one} #${rec?.id ?? '?'}`;
};

// Adresa publică într-o limbă; null = nicio pagină în acea limbă (fără traducere, fără path)
export const publicPath = (key, rec, lang, tr) => entity(key)?.public?.path?.(rec, lang, tr) ?? null;
export const publicPaths = (key, rec, trByLang = {}) =>
  Object.fromEntries(LANGS.map(l => [l, publicPath(key, rec, l, trByLang[l])]).filter(([, p]) => p));

// Relațiile: fiecare declarată o dată, din capătul care o deține (§2.1)
const relId = (src, f) => `${src}.${f}`;
export const relTable = (src, f) => `rel_${entity(src).table}_${f}`;
export const RELATION_TYPES = ENTITIES.flatMap(e => e.fields.filter(f => f.type === 'ref' || f.type === 'refs' || f.type === 'image').map(f => ({
  id: relId(e.key, f.key),
  source: e.key,
  field: f.key,
  target: f.type === 'image' ? 'media' : f.target,
  verb: f.rel ?? (f.type === 'image' ? 'folosește imaginea' : null),
  inverseLabel: f.inverseLabel ?? e.label,
  cardinality: f.type === 'refs' ? 'M:N' : 'N:1',
  storage: f.type === 'refs' ? relTable(e.key, f.key) : `${e.table}.${f.key}_id`,
  required: !!f.required,
  ordered: !!f.ordered,
  owned: !!f.owned,
  sensitive: !!f.sensitive,
  attrs: f.attrs ?? [],
  kinds: f.kinds ?? null,
  threshold: f.threshold ?? null,
  onTargetDelete: f.onTargetDelete ?? (f.type === 'refs' ? 'scoate legătura' : f.required ? 'blochează ștergerea' : 'golește câmpul')
})));
export const relation = id => RELATION_TYPES.find(r => r.id === id);
export const outgoingRelations = key => RELATION_TYPES.filter(r => r.source === key);
export const inverseRelations = key => RELATION_TYPES.filter(r => r.target === key);

// Jetoanele oferite de registru: nume → sursa. `'*'` = fiecare înregistrare e un jeton (cifrele-cheie).
export const TOKENS = ENTITIES.flatMap(e => Object.entries(e.tokens ?? {}).map(([name, spec]) => ({name, entity: e.key, ...spec})));
export const tokenSource = name => TOKENS.find(t => t.name === name) ?? TOKENS.find(t => t.name === '*');

// Presupunerile: unde e folosită fiecare (tip, câmp sau jeton)
export const assumptionsUsed = () => {
  const out = [];
  const add = (ids, where) => [].concat(ids ?? []).forEach(id => out.push({id, where}));
  for (const e of ENTITIES) {
    add(e.assume, e.key);
    add(e.duplicates?.assume, `${e.key}.duplicates`);
    for (const f of e.fields) add(f.assume, `${e.key}.${f.key}`);
    for (const [n, t] of Object.entries(e.tokens ?? {})) add(t.assume, `${e.key}.tokens.${n}`);
  }
  return out;
};

// Verificarea registrului: rulează în teste și la pornire. Întoarce lista erorilor; goală = registru valid.
export function checkRegistry() {
  const errors = [];
  const err = (where, message) => errors.push(`${where}: ${message}`);
  const SYSTEM = ['id', 'status', 'draft', 'published_at', 'search', 'created_at', 'updated_at', 'created_by', 'updated_by'];
  const keys = new Set(), tables = new Set();
  for (const e of ENTITIES) {
    if (keys.has(e.key)) err(e.key, 'cheie dublă'); keys.add(e.key);
    if (tables.has(e.table)) err(e.key, `tabel dublu ${e.table}`); tables.add(e.table);
    if (!CATEGORIES.some(c => c.key === e.category)) err(e.key, `categorie necunoscută ${e.category}`);
    if (!e.fields.some(f => f.key === e.title)) err(e.key, `câmpul de titlu ${e.title} lipsește`);
    for (const lf of e.linkFields ?? []) if (!SYSTEM.includes(lf) && !e.fields.some(f => f.key === lf)) err(e.key, `linkFields: ${lf} nu e câmp`);
    if (e.mentions && !e.fields.some(f => f.key === (e.mentionName ?? e.title))) err(e.key, 'mentions fără câmp de nume');
    if (e.public && !e.fields.some(f => f.key === 'slug')) err(e.key, 'pagină publică fără slug');
    const fkeys = new Set();
    for (const f of e.fields) {
      const w = `${e.key}.${f.key}`;
      if (fkeys.has(f.key)) err(w, 'câmp dublu'); fkeys.add(f.key);
      if (SYSTEM.includes(f.key)) err(w, 'nume rezervat de sistem');
      if (!FIELD_TYPES.includes(f.type)) err(w, `tip necunoscut ${f.type}`);
      if (f.translatable && (!TRANSLATABLE_TYPES.includes(f.type) || (f.type === 'int' && !TRANSLATABLE_INT_KEYS.includes(f.key))))
        err(w, `un câmp ${f.type} nu se traduce (se scrie o singură dată)`);
      if ((f.type === 'ref' || f.type === 'refs') && !entity(f.target)) err(w, `ținta ${f.target} nu există`);
      if ((f.type === 'select' || f.type === 'multiselect') && !f.options?.length) err(w, 'select fără opțiuni');
      if (f.default != null && f.type === 'select' && !f.options.includes(f.default)) err(w, `default ${f.default} nu e opțiune`);
      if (f.kinds && e.key !== 'sectiuni') err(w, '`kinds` are sens doar la secțiuni');
      for (const k of f.kinds ?? []) if (!field('sectiuni', 'kind').options.includes(k)) err(w, `kind necunoscut ${k}`);
      if (f.unique && f.translatable) err(w, 'unic pe limbă se declară doar pe slug');
    }
  }
  const known = new Set(ASSUMPTIONS.map(a => a.id));
  for (const {id, where} of assumptionsUsed()) if (!known.has(id)) err(where, `presupunere necunoscută ${id}`);
  const names = new Map();
  for (const t of TOKENS) { if (names.has(t.name)) err(t.entity, `jeton dublu {${t.name}}`); names.set(t.name, t.entity); }
  return errors;
}
