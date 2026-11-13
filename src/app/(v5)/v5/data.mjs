// Datele homepage-ului v5, din Brain: aceleași înregistrări ca site-ul, puse în forma de care au nevoie secțiunile v5.
import {formatNumber, formatMoney} from '../../../registry/langs.mjs';
import {fillTokens, tokenValues} from '../../../site/rich.mjs';
import {buttons, mediaVideo, strip} from '../../../site/ui/parts.jsx';

const UNIT = {m2: 'm²', procent: '%'};

// Hero-ul: secțiunea „hero” a homepage-ului (prima), plus banda de date: suprafața și prețul de pornire
// (calculate din tipurile de locuințe), parcul și rezistența seismică (din cifre)
export async function loadHero(ctx, labels) {
  const values = await tokenValues(ctx);
  const [s] = await ctx.query('sectiuni', {scope: 'v5:hero', where: "e.kind = 'hero'", order: 'e.id', limit: 1});
  if (!s) return null;
  const [b1, b2] = await buttons(ctx, s, values);
  const video = s.video ? await ctx.item('media', s.video, 'media') : null;

  const units = await ctx.query('locuinte', {fields: ['area_min', 'price_from', 'vat_excluded'], where: `e.kind != 'comercial'`});
  const minArea = Math.min(...units.map(u => u.area_min).filter(Boolean));
  const minPrice = Math.min(...units.map(u => u.price_from).filter(Boolean));
  const vat = units.find(u => u.price_from === minPrice)?.vat_excluded;
  const facts = (await ctx.query('cifre', {fields: ['token', 'value', 'unit', 'label'], where: "e.token IN ('parc', 'seism')"}))
    .sort((x, y) => ['parc', 'seism'].indexOf(x.token) - ['parc', 'seism'].indexOf(y.token));

  const band = [
    Number.isFinite(minArea) && {label: labels['suprafata-de-la'] ?? 'Suprafețe de la', value: formatNumber(minArea, ctx.lang), unit: 'm²'},
    Number.isFinite(minPrice) && {label: labels['preturi-de-la'] ?? 'Prețuri de la', value: formatMoney(minPrice, 'EUR', ctx.lang), unit: vat ? (labels.tva ?? '+ TVA') : ''},
    ...facts.map(x => ({label: fillTokens(x.label ?? '', values), value: `${x.unit === 'procent' ? '+' : ''}${formatNumber(x.value, ctx.lang)}`, unit: UNIT[x.unit] ?? ''}))
  ].filter(Boolean);

  return {
    eyebrow: fillTokens(s.eyebrow ?? '', values),
    heading: fillTokens(s.heading ?? '', values),
    text: s.text ? fillTokens(strip(s.text), values) : '',
    primary: b1?.href ? b1 : null,
    secondary: b2?.href ? b2 : null,
    image: s.image ? {src: ctx.media(s.image), srcSet: ctx.srcset(s.image)} : null,
    video: video && {bg: mediaVideo(video, '720p'), full: mediaVideo(video, '1080p'), start: s.video_start ?? 0},
    band
  };
}
