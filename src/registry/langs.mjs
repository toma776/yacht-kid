// Limbile site-ului (§1.10). RO e limba implicită, fără prefix; EN stă sub /en/, ca pe site-ul vechi.
export const LANGS = ['ro', 'en'];
export const DEFAULT_LANG = 'ro';

const LOCALES = {ro: 'ro-RO', en: 'en-US'};

export const prefix = lang => (lang === DEFAULT_LANG ? '' : `/${lang}`);

// Adresa unei pagini într-o limbă: slug gol = prima pagină a limbii. Bara de la final se păstrează (§3.8).
export const localPath = (lang, ...parts) => {
  const rest = parts.filter(Boolean).join('/');
  return `${prefix(lang)}/${rest ? `${rest}/` : ''}`;
};

// Cifrele nu se traduc, se formatează: RO 1.495.000 / 10.000, EN 1,495,000 / 10,000.
export const formatNumber = (n, lang, opts = {}) =>
  n == null ? '' : new Intl.NumberFormat(LOCALES[lang], {maximumFractionDigits: 2, useGrouping: 'always', ...opts}).format(n);

// Banii se țin în unități întregi (euro, nu cenți): prețurile imobiliare nu au zecimale.
export const formatMoney = (n, currency, lang) => {
  if (n == null) return '';
  const v = formatNumber(n, lang);
  return lang === 'ro' ? `${v} ${currency === 'EUR' ? '€' : currency}` : `${currency === 'EUR' ? '€' : currency + ' '}${v}`;
};

export const formatRange = (min, max, lang, unit = '') => {
  if (min == null && max == null) return '';
  const u = unit ? ` ${unit}` : '';
  if (max == null || min === max) return `${formatNumber(min ?? max, lang)}${u}`;
  return `${formatNumber(min, lang)} – ${formatNumber(max, lang)}${u}`;
};
