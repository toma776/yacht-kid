// Datele homepage-ului v5, din Brain: aceleași înregistrări ca site-ul, puse în forma de care au nevoie secțiunile v5.
import {formatNumber, formatMoney, formatRange} from '../../../registry/langs.mjs';
import {fillTokens, tokenValues, rich} from '../../../site/rich.mjs';
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

// Colecția de apartamente: secțiunea „alte-locuinte” a homepage-ului (titlul, textul, ancora) și tipurile de locuințe
// publicate, fără spațiile comerciale, de la cel mai accesibil la cel mai mare
export async function loadCollection(ctx, labels, visitHref, t) {
  const values = await tokenValues(ctx);
  const [s] = await ctx.query('sectiuni', {scope: 'v5:colectie', where: "e.kind = 'alte-locuinte'", order: 'e.id', limit: 1});
  const types = await ctx.query('locuinte', {scope: 'v5:colectie', where: "e.kind != 'comercial'", order: 'e.price_from'});
  const r = (a, b, u = '') => (a ?? b) != null ? formatRange(a, b, ctx.lang, u) : null;
  const items = await Promise.all(types.map(async u => ({
    id: u.id,
    name: u.name,
    short: u.rooms ? t.rooms(u.rooms) : (u.kind === 'duplex' ? t.duplex : u.name),
    viewLabel: t.viewType(u.name),
    href: await ctx.href('locuinte', u.id),
    image: u.hero_image ? {src: ctx.media(u.hero_image), srcSet: ctx.srcset(u.hero_image)} : null,
    intro: u.intro ?? '',
    price: u.price_from ? formatMoney(u.price_from, 'EUR', ctx.lang) : null,
    vat: u.vat_excluded ? (labels.tva ?? '+ TVA') : '',
    specs: [
      {label: labels.suprafata ?? 'Suprafață', value: r(u.area_min, u.area_max, 'm²')},
      {label: labels.terasa ?? 'Terasă', value: r(u.terrace_min, u.terrace_max, 'm²')},
      {label: t.baths, value: r(u.baths_min, u.baths_max)},
      {label: t.floor, value: u.floor_min != null ? (u.floor_min === u.floor_max ? `${u.floor_min}` : `${u.floor_min} – ${u.floor_max}`) : null}
    ].filter(x => x.value)
  })));
  return {
    anchor: s?.anchor || 'apartamente',
    eyebrow: s?.eyebrow ? fillTokens(s.eyebrow, values) : t.collectionEyebrow,
    heading: s?.heading ? fillTokens(s.heading, values) : t.collectionHeading,
    text: s?.text ? strip(await rich(ctx, s.text, values)) : '',
    visit: visitHref,
    items: items.filter(i => i.href)
  };
}

// Proiectul (secțiunea „despre” a homepage-ului): citatul, apoi capitolele (titlu, paragraf, fotografie cu legendă).
// Legenda „{parc} — parc cu deschidere directă” se împarte în cifră și text; sub capitole, paginile proiectului
// (din placa „Proiectul” a meniului): Tehnologie, Comunitate, Spații comerciale.
export async function loadProject(ctx, chrome) {
  const values = await tokenValues(ctx);
  const [s] = await ctx.query('sectiuni', {scope: 'v5:proiect', where: "e.anchor = 'despre' AND e.kind = 'text'", order: 'e.id', limit: 1});
  if (!s) return null;
  const html = fillTokens(s.text ?? '', values);
  const quote = strip(html.match(/<blockquote>([\s\S]*?)<\/blockquote>/)?.[1] ?? '');
  const chapters = [...html.matchAll(/<h3>([\s\S]*?)<\/h3>([\s\S]*?)(?=<h3>|$)/g)].map(([, title, body]) => {
    const block = body.match(/<figure>[\s\S]*?<\/figure>/)?.[0] ?? '';
    const fig = block.match(/data-media="(\d+)"[^>]*?alt="([^"]*)"/);
    const caption = strip(block.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? '');
    const [value, label] = caption.split(/\s+—\s+/);
    return {
      title: strip(title),
      text: (body.replace(/<figure>[\s\S]*?<\/figure>/g, '').match(/<p>[\s\S]*?<\/p>/g) ?? []).map(strip).filter(Boolean),
      image: fig ? {src: ctx.media(+fig[1]), srcSet: ctx.srcset(+fig[1]), alt: fig[2]} : null,
      stat: label ? {value, label} : value ? {value: '', label: value} : null
    };
  });
  const [b1] = await buttons(ctx, s, values);
  const topics = chrome.header.find(i => i.mega === 'proiect');
  return {
    anchor: s.anchor,
    eyebrow: fillTokens(s.eyebrow ?? '', values),
    heading: fillTokens(s.heading ?? '', values),
    quote,
    chapters,
    cta: b1?.href ? b1 : null,
    pages: (topics?.children ?? []).map(c => ({href: c.href, label: c.label, desc: c.desc, icon: c.icon, image: c.image}))
  };
}

// Pictograma unui avantaj, după cuvintele din titlu, pe ambele limbi (desenele sunt în sprite-ul site-ului)
const FEATURE_ICONS = [[/piscin|pool/i, 'pool'], [/promenad/i, 'promenade'], [/aerisit|airy/i, 'air'], [/paz[aă]|cctv|security/i, 'shield'],
  [/fa[țt]ad|facade/i, 'facade'], [/comercial|commercial/i, 'shop'], [/energie|energy/i, 'energy'], [/loca[țt]i|location/i, 'location']];

// Avantajele: secțiunea „avantaje” a homepage-ului (titlul, fotografia) și beneficiile legate de ea, în ordinea din Brain
export async function loadFeatures(ctx) {
  const values = await tokenValues(ctx);
  const [s] = await ctx.query('sectiuni', {scope: 'v5:avantaje', where: "e.anchor = 'avantaje' AND e.kind = 'avantaje'", order: 'e.id', limit: 1});
  if (!s) return null;
  const items = (await ctx.links('sectiuni.features', s.id)).map(f => {
    const title = fillTokens(f.title ?? '', values);
    return {id: f.id, title, text: fillTokens(f.text ?? '', values), icon: FEATURE_ICONS.find(([rx]) => rx.test(title))?.[1] ?? 'leaf'};
  });
  return {
    anchor: s.anchor,
    eyebrow: fillTokens(s.eyebrow ?? '', values),
    heading: fillTokens(s.heading ?? '', values),
    text: s.text ? strip(await rich(ctx, s.text, values)) : '',
    image: s.image ? {src: ctx.media(s.image), srcSet: ctx.srcset(s.image)} : null,
    items
  };
}
