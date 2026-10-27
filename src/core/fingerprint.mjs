// Amprenta textului RO al unei înregistrări (§1.10). Traducerea EN păstrează amprenta din momentul traducerii;
// când amprenta RO curentă diferă, traducerea e „învechită”. Aceeași funcție la import și la salvare.
import {createHash} from 'node:crypto';
import {translatableFields} from '../registry/derive.mjs';
import {columnOf} from './schema.mjs';

const IGNORE = new Set(['legacy_id', 'seo_title', 'seo_description']);

export function trFingerprint(key, roRow) {
  if (!roRow) return null;
  const parts = translatableFields(key).filter(f => !IGNORE.has(f.key) && f.type !== 'slug').map(f => [f.key, roRow[columnOf(f)] ?? null]);
  return createHash('sha1').update(JSON.stringify(parts)).digest('hex');
}
