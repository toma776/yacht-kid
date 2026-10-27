// Site-ul public, randat pe server din Brain (§3.1). Aceeași funcție servește ambele limbi;
// limba vine din adresă (/en/… = EN), nu din cookie, ca fiecare pagină să aibă o singură adresă.
import {notFound, permanentRedirect} from 'next/navigation';
import {getDb} from '../core/db.mjs';
import {LINK_REF, titleOf} from '../registry/derive.mjs';
import {formatMoney, formatRange, localPath} from '../registry/langs.mjs';
import {createContext} from './context.mjs';
import {resolvePath, pathsOf} from './resolve.mjs';
import {rich, tokenValues, fillTokens} from './rich.mjs';

const L = {
  ro: {area: 'Suprafață', floor: 'Etaj', baths: 'Băi', terrace: 'Terasă', balcony: 'Balcon', price: 'Preț de la', yes: 'Da', vat: '+ TVA', home: 'Pagina principală', read: 'Citește articolul'},
  en: {area: 'Area', floor: 'Floor', baths: 'Bathrooms', terrace: 'Terrace', balcony: 'Balcony', price: 'Starting from', yes: 'Yes', vat: '+ VAT', home: 'Home', read: 'Read article'}
};

export const pathFrom = (lang, segments = []) => localPath(lang, ...segments.map(decodeURIComponent));

async function target(ctx, to) {
  const m = to?.match(LINK_REF);
  if (!m) return to;
  const href = await ctx.href(m[1], +m[2]);
  return href && `${href}${m[3] ?? ''}${m[4] ?? ''}`;
}

async function Menu({ctx, location}) {
  const menus = await ctx.within(`Meniu ${location}`, 'meniul limbii', () => ctx.query('meniuri', {fields: ['location', 'items'], where: 'e.location = ?', args: [location]}));
  const items = menus[0]?.items ?? [];
  const resolved = await Promise.all(items.map(async i => ({...i, href: await target(ctx, i.to),
    children: await Promise.all((i.children ?? []).map(async c => ({...c, href: await target(ctx, c.to)})))})));
  return (
    <nav className={`menu menu-${location}`}>
      <ul>{resolved.filter(i => i.href || i.children.some(c => c.href)).map((i, n) => (
        <li key={n}>{i.href ? <a href={i.href}>{i.label}</a> : <span>{i.label}</span>}
          {i.children.some(c => c.href) && <ul>{i.children.filter(c => c.href).map((c, k) => <li key={k}><a href={c.href}>{c.label}</a></li>)}</ul>}
        </li>))}
      </ul>
    </nav>
  );
}

function Spec({u, lang}) {
  const t = L[lang];
  const rows = [
    [t.area, formatRange(u.area_min, u.area_max, lang, 'm²')],
    [t.floor, formatRange(u.floor_min, u.floor_max, lang)],
    [t.baths, formatRange(u.baths_min, u.baths_max, lang)],
    [t.terrace, formatRange(u.terrace_min, u.terrace_max, lang, 'm²')],
    [t.balcony, u.balcony ? t.yes : ''],
    [t.price, u.price_from ? `${formatMoney(u.price_from, 'EUR', lang)}${u.vat_excluded ? ` ${t.vat}` : ''}` : '']
  ].filter(([, v]) => v);
  return <dl className="spec">{rows.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}</dl>;
}

async function Body({ctx, kind, rec, values}) {
  const html = async h => ({__html: await rich(ctx, h, values)});
  switch (kind) {
    case 'locuinte': {
      const gallery = await ctx.within('Galerie', 'imaginile tipului de locuință', () => ctx.links('locuinte.gallery', rec.id));
      return <>
        {rec.intro && <p className="lead">{fillTokens(rec.intro, values)}</p>}
        <Spec u={rec} lang={ctx.lang}/>
        <div className="rich" dangerouslySetInnerHTML={await html(rec.description)}/>
        {gallery.length > 0 && <div className="gallery">{gallery.map(m => <img key={m.id} src={ctx.media(m.id)} alt={m.alt ?? ''} loading="lazy"/>)}</div>}
      </>;
    }
    case 'articole':
      return <>
        {rec.published_at && <p className="meta">{new Date(rec.published_at).toLocaleDateString(ctx.lang === 'en' ? 'en-US' : 'ro-RO', {dateStyle: 'long'})}</p>}
        <div className="rich" dangerouslySetInnerHTML={await html(rec.content)}/>
      </>;
    case 'categorii': {
      const posts = await ctx.within('Lista articolelor', `categoria ${rec.id}`, () =>
        ctx.query('articole', {scope: `categorii:${rec.id}`, where: 'e.category_id = ?', args: [rec.id], order: 'e.published_at DESC'}));
      const links = await Promise.all(posts.map(async p => ({p, href: await ctx.href('articole', p.id)})));
      return <ul className="posts">{links.map(({p, href}) => <li key={p.id}><a href={href}>{p.title}</a></li>)}</ul>;
    }
    default:
      return rec.body
        ? <div className="rich" dangerouslySetInnerHTML={await html(rec.body)}/>
        : <p className="todo">{ctx.lang === 'en' ? 'Sections are not imported yet.' : 'Secțiunile nu sunt încă importate.'}</p>;
  }
}

export async function renderPublic(lang, segments) {
  const db = await getDb();
  const path = pathFrom(lang, segments);
  const hit = await resolvePath(db, path);
  if (hit.redirect) {
    const ctx = createContext(db, lang);
    const to = hit.redirect.to_ref ? await target(ctx, hit.redirect.to_ref) : hit.redirect.to_path;
    if (to) permanentRedirect(to);
  }
  if (!hit.key) notFound();
  const ctx = createContext(db, lang);
  const rec = await ctx.within('Pagina', 'pagina proprie', () => ctx.item(hit.key, hit.id, 'page'));
  const values = await tokenValues(ctx);
  const alternates = await pathsOf(db, hit.key, hit.id);
  const firma = await ctx.single('firma');
  return (
    <>
      <header className="site-header">
        <a className="brand" href={localPath(lang)}>YACHT KID</a>
        <Menu ctx={ctx} location="antet"/>
        <nav className="langs">{Object.entries(alternates).map(([l, p]) => <a key={l} href={p} hrefLang={l} aria-current={l === lang ? 'true' : undefined}>{l.toUpperCase()}</a>)}</nav>
      </header>
      <main>
        <h1>{titleOf(hit.key, rec, rec)}</h1>
        <Body ctx={ctx} kind={hit.key} rec={rec} values={values}/>
      </main>
      <footer className="site-footer">
        <Menu ctx={ctx} location="subsol"/>
        {firma && <p>{values.firma} · {values.adresa} · <a href={`tel:${firma.phone}`}>{firma.phone}</a> · <a href={`mailto:${firma.email}`}>{firma.email}</a></p>}
      </footer>
    </>
  );
}

export async function metadataFor(lang, segments) {
  const db = await getDb();
  const hit = await resolvePath(db, pathFrom(lang, segments));
  if (!hit.key) return {};
  const ctx = createContext(db, lang);
  const rec = await ctx.item(hit.key, hit.id);
  const alternates = await pathsOf(db, hit.key, hit.id);
  return {
    title: rec?.seo_title || titleOf(hit.key, rec, rec),
    description: rec?.seo_description || undefined,
    alternates: {canonical: alternates[lang], languages: alternates}
  };
}
