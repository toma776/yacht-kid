// Datele „ramei” site-ului (antet, meniul pe mobil, subsol, bara de contact): totul din Brain, prin contextul urmărit.
// Meniurile au forma din design: o intrare cu `mega` deschide o placă; copiii ei sunt trimiteri (`ref:locuinte:1`) sau
// capitole cu descriere, imagine și pictogramă. Etichetele interfeței vin din `etichete`, pe limbă.
import {LINK_REF} from '../registry/derive.mjs';
import {formatMoney, formatRange, localPath} from '../registry/langs.mjs';
import {tokenValues, fillTokens} from './rich.mjs';

export async function resolveTo(ctx, to) {
  if (!to) return null;
  if (to.startsWith('#') || /^(https?:|mailto:|tel:)/.test(to)) return to;
  const m = to.match(LINK_REF);
  if (!m) return to;
  const href = await ctx.href(m[1], +m[2]);
  return href && `${href}${m[3] ?? ''}${m[4] ?? ''}`;
}

// Un tip de locuință, cum apare în meniu și în colecție: adresă, imagine, suprafață, preț
export async function unitCard(ctx, id, labels) {
  const u = await ctx.item('locuinte', id, 'link');
  if (!u) return null;
  return {
    id, href: await ctx.href('locuinte', id), name: u.name, image: ctx.media(u.hero_image), kind: u.kind,
    area: formatRange(u.area_min, u.area_max, ctx.lang, 'm²'),
    price: u.price_from ? `${labels['de-la'] ?? 'de la'} ${formatMoney(u.price_from, 'EUR', ctx.lang)}${u.vat_excluded ? ` ${labels.tva ?? '+ TVA'}` : ''}` : null
  };
}

// Textele din meniu pot conține jetoane ({nr_premii}); se completează aici, ca în orice text
const fillAll = (o, values) => Object.fromEntries(Object.entries(o).map(([k, v]) => [k, typeof v === 'string' && !['to', 'icon', 'mega'].includes(k) ? fillTokens(v, values) : v]));

async function resolveItems(ctx, items, labels, values) {
  return Promise.all((items ?? []).map(async raw => {
    const it = fillAll(raw, values);
    if (it.aside) it.aside = fillAll(it.aside, values);
    it.children = (it.children ?? []).map(c => fillAll(c, values));
    const out = {...it, href: await resolveTo(ctx, it.to)};
    if (it.more) out.more = {...it.more, href: await resolveTo(ctx, it.more.to)};
    if (it.aside?.cta) out.aside = {...it.aside, cta: {...it.aside.cta, href: await resolveTo(ctx, it.aside.cta.to)}};
    out.children = (await Promise.all((it.children ?? []).map(async c => {
      const m = c.to?.match(LINK_REF);
      if (m?.[1] === 'locuinte') { const u = await unitCard(ctx, +m[2], labels); return u && {...c, unit: u, href: u.href, image: c.image ? ctx.media(c.image) : u.image}; }
      return {...c, href: await resolveTo(ctx, c.to), image: c.image ? ctx.media(c.image) : null};
    }))).filter(c => c && c.href);
    return out;
  }));
}

export async function loadChrome(ctx, alternates = {}) {
  return ctx.within('Rama site-ului', 'antet, meniu, subsol', async () => {
    const labels = Object.fromEntries((await ctx.query('etichete', {fields: ['key', 'text']})).map(l => [l.key, l.text]));
    const menus = Object.fromEntries((await ctx.query('meniuri', {fields: ['location', 'items']})).map(m => [m.location, m.items ?? []]));
    const firma = await ctx.single('firma');
    const values = await tokenValues(ctx);
    const phone = firma?.phone ?? '';
    // Broșura (PDF) e pusă pe hero-ul homepage-ului; subsolul o oferă pe toate paginile
    const [withBrochure] = await ctx.query('sectiuni', {fields: ['brochure'], where: 'e.brochure_id IS NOT NULL', order: 'e.id', limit: 1});
    // Harta (secțiunea Locație de pe homepage, cu „Harta 3D”): cardul din placa Proiectul arată harta zonei din textul
    // secțiunii (alta pe fiecare limbă) și duce la harta interactivă
    const [withMap] = await ctx.query('sectiuni', {fields: ['anchor', 'text'], where: 'e.show_map = 1', order: 'e.id', limit: 1});
    const mapImg = withMap?.text?.match(/<figure>[\s\S]*?data-media="(\d+)"/)?.[1];
    return {
      lang: ctx.lang, labels, values, alternates, home: localPath(ctx.lang),
      firma: firma && {
        ...firma, phoneLabel: phone.replace(/^\+40(\d{3})(\d{3})(\d{3})$/, '+40 $1 $2 $3'),
        whatsapp: `https://wa.me/${phone.replace(/\D/g, '')}`, address: values.adresa,
        maps: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(values.adresa ?? '')}`
      },
      header: await resolveItems(ctx, menus.antet, labels, values),
      footer: await resolveItems(ctx, menus.subsol, labels, values),
      contactHref: await resolveTo(ctx, menus.antet?.find(i => i.cta)?.to) ?? '#contact',
      brochure: withBrochure?.brochure ? ctx.media(withBrochure.brochure) : null,
      map: withMap && {href: `${localPath(ctx.lang)}#${withMap.anchor || 'locatie'}`, image: mapImg ? ctx.media(+mapImg) : null}
    };
  });
}
