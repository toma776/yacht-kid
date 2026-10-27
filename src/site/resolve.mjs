// Adresa cerută → entitatea care o deține. Se calculează din registru (public.path), deci o pagină nouă,
// un slug schimbat sau o traducere adăugată apar fără nicio listă întreținută de mână.
// Mai târziu, page_index (scris de scan, §3.5) face aceeași căutare fără să parcurgă tipurile.
import {ENTITIES} from '../registry/entities.mjs';
import {hasPublicPage, publicPath} from '../registry/derive.mjs';
import {LANGS, DEFAULT_LANG} from '../registry/langs.mjs';
import {all, one} from '../core/db.mjs';
import {hydrate, selectSql} from './context.mjs';

export const langOfPath = path => LANGS.find(l => l !== DEFAULT_LANG && (path === `/${l}/` || path.startsWith(`/${l}/`))) ?? DEFAULT_LANG;

export async function resolvePath(db, path, {preview = false} = {}) {
  const lang = langOfPath(path);
  for (const e of ENTITIES.filter(e => hasPublicPage(e.key))) {
    const {sql, args, where} = selectSql(e.key, {lang, publicOnly: !preview});
    const rows = await all(db, `${sql}${where.length ? ` WHERE ${where.join(' AND ')}` : ''}`, args);
    for (const row of rows) {
      const rec = hydrate(e.key, row);
      if (publicPath(e.key, rec, lang, rec) === path) return {key: e.key, id: rec.id, lang};
    }
  }
  // Redirecționările: spre o entitate (ref:) sau spre o adresă (§3.8)
  const r = await one(db, 'SELECT * FROM redirects WHERE from_path = ?', [path]);
  if (r) return {redirect: r, lang};
  return {lang};
}

// Toate adresele unei entități, pe limbi (pentru hreflang și comutatorul de limbă, §1.10)
export async function pathsOf(db, key, id) {
  const out = {};
  for (const lang of LANGS) {
    const {sql, args, where} = selectSql(key, {lang, publicOnly: true});
    const row = await one(db, `${sql} WHERE ${['e.id = ?', ...where].join(' AND ')}`, [...args, id]);
    const rec = hydrate(key, row);
    const p = rec && publicPath(key, rec, lang, rec);
    if (p) out[lang] = p;
  }
  return out;
}
