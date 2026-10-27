// Textul bogat la afișare (§1.6 c, §1.6 a): trimiterile devin adresele curente, jetoanele devin valori.
// Textul din bază conține doar trimiteri: <a data-ref="articole:12">, <img data-media="34">, {telefon}.
import {formatNumber} from '../registry/langs.mjs';

const UNITS = {
  ro: {m2: 'm²', ron_m2: 'RON/m²', procent: '%', ore: 'ore', buc: ''},
  en: {m2: 'sqm', ron_m2: 'RON/sqm', procent: '%', ore: 'hours', buc: ''}
};

export function formatFact(f, lang) {
  const unit = UNITS[lang][f.unit] ?? '';
  return `${formatNumber(f.value, lang)}${unit === '%' ? '%' : unit ? ` ${unit}` : ''}`;
}

// Valorile jetoanelor pentru o pagină; fiecare citire e o dependență prin context
export async function tokenValues(ctx) {
  const values = {};
  const firma = await ctx.within('Jetoane', 'Date firmă', () => ctx.single('firma'));
  if (firma) Object.assign(values, {
    telefon: firma.phone, email: firma.email, program: firma.schedule, cui: firma.cui, reg_com: firma.reg_com,
    sediu: firma.registered_office, firma: firma.legal_name,
    adresa: `${firma.street}, ${ctx.lang === 'en' ? 'Bucharest' : firma.city} ${firma.postal_code}`
  });
  const facts = await ctx.within('Jetoane', 'Cifre-cheie', () => ctx.query('cifre', {fields: ['token', 'value', 'unit']}));
  for (const f of facts) values[f.token] = formatFact(f, ctx.lang);
  const awards = await ctx.within('Jetoane', '{nr_premii}', () => ctx.query('premii', {fields: ['result'], where: `e.result != 'lista-scurta'`}));
  values.nr_premii = String(awards.length);
  return values;
}

export const fillTokens = (text, values) => (text ?? '').replace(/\{([a-z][a-z0-9_]*)\}/g, (m, k) => values[k] ?? m);

export async function rich(ctx, html, values = {}) {
  if (!html) return '';
  let out = fillTokens(html, values);
  // Linkurile spre entități: adresa curentă sau doar textul, dacă ținta nu e publicată
  const refs = [...out.matchAll(/<a\b([^>]*)\bdata-ref="([a-z-]+):(\d+)"([^>]*)>([\s\S]*?)<\/a>/g)];
  for (const [m, pre, key, id, post, inner] of refs) {
    const href = await ctx.href(key, +id);
    out = out.replace(m, href ? `<a${pre}href="${href}"${post}>${inner}</a>` : inner);
  }
  out = out.replace(/<img\b([^>]*)\bdata-media="(\d+)"([^>]*)>/g, (m, pre, id, post) => `<img${pre}src="${ctx.media(+id)}"${post}>`);
  return out;
}
