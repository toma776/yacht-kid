// Vitrina unei afaceri din comunitate (afaceri cu slug), sub pagina Spații comerciale. Pagina are două cititori:
// clientul afacerii și antreprenorul care se gândește la un spațiu în YACHT KID și vede aici cum ar arăta pagina lui.
//   coperta pe toată lățimea (numele, domeniul, partenerul Community Card); fișa pe scurt; povestea (introducerea mare,
//   textul, o fotografie); ce găsești aici, numerotat; citatul fondatorului; galeria (mozaic, toate în lightbox);
//   vizita (adresă, program, contact); vecinii din comunitate; banda pentru următoarea afacere, cu cifrele spațiilor.
// Pagina e statică, la cererea clientului: fără apariții la derulare, parallax sau mișcare la hover.
import {formatMoney, formatRange} from '../../registry/langs.mjs';
import {rich} from '../rich.mjs';
import {Icon} from './Icons.jsx';
import {Lightbox} from './Sections.jsx';
import {Crumbs, num} from './parts.jsx';

const Arrow = () => <Icon id="arrow"/>;
const SOCIAL = {facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedin'};
// „Titlu – detaliu” se afișează pe două niveluri; un rând fără liniuță e doar titlu
const offerItem = s => {
  const [t, ...d] = s.split(/\s[–—-]\s/), text = d.join(' – ').trim();
  return {title: t.trim(), text: text ? text[0].toUpperCase() + text.slice(1) : null};
};

export async function BusinessPage({ctx, rec, title, chrome}) {
  const L = chrome.labels, lang = ctx.lang, en = lang === 'en', f = chrome.firma;
  const values = {...chrome.values, __labels: L};
  const gallery = await ctx.within('Galerie', 'fotografiile afacerii', () => ctx.links('afaceri.gallery', rec.id));
  const story = await rich(ctx, rec.story, values);
  const cover = rec.hero_image ?? rec.image;
  // Fotografia de lângă poveste e prima din galerie; mozaicul începe de la a doua, ca să nu se repete
  const [side, ...rest] = gallery;
  const mosaic = gallery.length >= 4 ? rest : [];
  const offer = (rec.offer ?? []).filter(Boolean).map(offerItem);
  // Pagina Spații comerciale: părintele din firul de navigare și ținta benzii de la final, cu cifrele ei
  const [commercial] = await ctx.within('Spații comerciale', 'pagina-părinte și cifrele spațiilor', () =>
    ctx.query('locuinte', {fields: ['name', 'kind', 'area_min', 'area_max', 'terrace_min', 'terrace_max', 'price_from', 'vat_excluded'], where: `e.kind = 'comercial'`, limit: 1}));
  const commercialHref = commercial ? await ctx.href('locuinte', commercial.id) : null;
  const neighbours = await ctx.within('Vecini', 'celelalte afaceri deschise', () =>
    ctx.query('afaceri', {scope: `afaceri:${rec.id}:vecini`, where: `e.state = 'deschis' AND e.id != ?`, args: [rec.id], order: 'e.id'}));
  const cards = await Promise.all(neighbours.map(async b => ({b, href: await ctx.href('afaceri', b.id)})));

  const facts = [
    [L['afacere-domeniu'] ?? 'Domeniu', rec.service],
    [L['afacere-unde'] ?? 'Unde', rec.location || (L['afacere-parter'] ?? 'Parterul YACHT KID')],
    [L['afacere-program'] ?? 'Program', rec.schedule],
    rec.opened_on && [L['afacere-deschis-din'] ?? 'Deschis din', rec.opened_on.slice(0, 4)],
    rec.card_member && ['Community Card', L['afacere-partener'] ?? 'Partener']
  ].filter(x => x && x[1]);
  const spaces = commercial && [
    [L.suprafata ?? 'Suprafață', formatRange(commercial.area_min, commercial.area_max, lang, 'm²')],
    [L.terasa ?? 'Terasă', formatRange(commercial.terrace_min, commercial.terrace_max, lang, 'm²')],
    [L['pret-de-la'] ?? 'Preț de la', commercial.price_from ? `${formatMoney(commercial.price_from, 'EUR', lang)}${commercial.vat_excluded ? ` ${L.tva ?? '+ TVA'}` : ''}` : null]
  ].filter(([, v]) => v);
  const contacts = [
    rec.website && {href: rec.website, icon: 'arrow', label: rec.website.replace(/^https?:\/\/(www\.)?/, '').replace(/\/$/, '')},
    rec.phone && {href: `tel:${rec.phone.replace(/\s/g, '')}`, icon: 'phone', label: rec.phone},
    ...(rec.social ?? []).map(s => SOCIAL[s.label?.toLowerCase()] && {href: s.url, icon: SOCIAL[s.label.toLowerCase()], label: s.label})
  ].filter(Boolean);
  const nth = (i, n) => `${en ? 'Open photo' : 'Deschide fotografia'} ${i + 1} ${en ? 'of' : 'din'} ${n}`;
  // Mozaicul arată cel mult cinci (două rânduri pline); restul, în lightbox
  const shown = mosaic.slice(0, 5);
  const ctaText = (L['afacere-cta-text'] ?? '{afacere} a ales parterul YACHT KID: clienți care locuiesc deasupra, o promenadă pe malul lacului și o comunitate care își recomandă vecinii. Spațiile rămase sunt gândite pentru afaceri la fel de bune.')
    .replace('{afacere}', title);

  return (
    <div className="biz-page">
      <section className="biz-hero on-dark" aria-labelledby="biz-title">
        {cover && <figure className="biz-hero-media"><img src={ctx.media(cover)} srcSet={ctx.srcset(cover)} sizes="100vw" alt="" fetchPriority="high"/></figure>}
        <div className="wrap biz-hero-inner">
          <Crumbs lang={lang} items={[{label: L['pagina-principala'] ?? 'Pagina principală', href: chrome.home}, commercial && {label: commercial.name, href: commercialHref}, {label: title}].filter(Boolean)}/>
          <div className="biz-hero-copy">
            <p className="eyebrow">{L['afacere-deja-in-comunitate'] ?? 'Deja în comunitate'}</p>
            {rec.logo && <img className="biz-logo" src={ctx.media(rec.logo)} alt=""/>}
            <h1 className="display biz-title" id="biz-title">{title}</h1>
            {rec.tagline && <p className="biz-tagline">{rec.tagline}</p>}
          </div>
        </div>
      </section>

      {facts.length > 0 && (
        <div className="wrap">
          <h2 className="sr-only" id="biz-facts-title">{en ? 'At a glance' : 'Pe scurt'}</h2>
          <dl className="biz-facts" style={{'--n': facts.length}} aria-labelledby="biz-facts-title">
            {facts.map(([k, v]) => <div key={k}><dt>{k}</dt><dd>{v}</dd></div>)}
          </dl>
        </div>
      )}

      {(rec.description || story) && (
        <section className="biz-story floor" aria-labelledby="biz-story-title">
          <div className="wrap">
            <p className="eyebrow">{L['afacere-povestea'] ?? 'Povestea'}</p>
            <h2 className="sr-only" id="biz-story-title">{L['afacere-povestea'] ?? 'Povestea'}</h2>
            {rec.description && <p className="biz-statement">{rec.description}</p>}
            <div className={`biz-story-grid${side ? '' : ' biz-story-grid--solo'}`}>
              {story && <div className="body prose" dangerouslySetInnerHTML={{__html: story}}/>}
              {side && <figure className="frame frame--band biz-story-img"><img src={ctx.media(side.id)} alt={side.alt ?? ''} loading="lazy"/></figure>}
            </div>
            {rec.credits && <p className="biz-credits">{rec.credits}</p>}
          </div>
        </section>
      )}

      {offer.length > 0 && (
        <section className="biz-offer floor bg-paper slab" aria-labelledby="biz-offer-title">
          <div className="wrap">
            <div className="section-head"><p className="eyebrow">{title}</p><h2 className="h2 ruled" id="biz-offer-title">{L['afacere-oferta'] ?? 'Ce găsești aici'}</h2></div>
            <ol className="biz-offer-list" style={{'--n': Math.min(offer.length, 3)}}>
              {offer.map((o, i) => (
                <li key={i}>
                  <span className="biz-offer-num num" aria-hidden="true">{num(i)}</span>
                  <b className="h3">{o.title}</b>
                  {o.text && <p>{o.text}</p>}
                </li>
              ))}
            </ol>
          </div>
        </section>
      )}

      {rec.quote && (
        <section className="biz-quote floor bg-navy on-dark slab" aria-label={en ? 'In their words' : 'În cuvintele lor'}>
          <figure className="wrap">
            <blockquote><p>{rec.quote}</p></blockquote>
            {rec.quote_author && <figcaption>{rec.quote_author}</figcaption>}
          </figure>
        </section>
      )}

      {shown.length > 0 && (
        <section className="biz-gallery floor bg-porcelain slab" aria-labelledby="biz-gallery-title">
          <div className="wrap">
            <div className="section-head section-head--split">
              <div><p className="eyebrow">{L.galerie ?? 'Galerie'}</p><h2 className="h2 ruled" id="biz-gallery-title">{L['afacere-spatiul'] ?? 'Spațiul'}</h2></div>
              {mosaic.length > shown.length && <button type="button" className="btn btn--ghost" data-lightbox-open={shown.length}>{L['toate-fotografiile'] ?? 'Toate fotografiile'} ({mosaic.length}) <span className="btn-icon"><Arrow/></span></button>}
            </div>
            <ul className="biz-mosaic" data-n={shown.length}>
              {shown.map((m, i) => (
                <li key={m.id}>
                  <button type="button" className="frame photo" data-lightbox-open={i} aria-label={m.alt ? `${nth(i, mosaic.length)}: ${m.alt}` : nth(i, mosaic.length)}>
                    <img src={ctx.media(m.id)} alt="" loading="lazy"/>
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <Lightbox list={mosaic.map(m => ({src: ctx.media(m.id), alt: m.alt ?? ''}))} label={title} lang={lang}/>
        </section>
      )}

      <section className="biz-visit floor bg-paper slab" aria-labelledby="biz-visit-title">
        <div className="wrap biz-visit-grid">
          <div>
            <p className="eyebrow">{L['afacere-viziteaza'] ?? 'Vizitează'}</p>
            <h2 className="h2 ruled" id="biz-visit-title">{title}</h2>
          </div>
          <dl className="biz-visit-list">
            {f?.address && <div><dt>{L['afacere-adresa'] ?? 'Adresa'}</dt><dd>{rec.location ? `${rec.location}, ` : ''}{f.address}<a className="link-arrow" href={f.maps}>{L['afacere-harta'] ?? 'Deschide în Google Maps'} <Arrow/></a></dd></div>}
            {rec.schedule && <div><dt>{L['afacere-program'] ?? 'Program'}</dt><dd>{rec.schedule}</dd></div>}
            {contacts.length > 0 && <div><dt>{L['afacere-contact'] ?? 'Contact'}</dt><dd><ul className="biz-contacts">{contacts.map(c => <li key={c.href}><a href={c.href}><Icon id={c.icon} size={16}/>{c.label}</a></li>)}</ul></dd></div>}
          </dl>
        </div>
      </section>

      {cards.length > 0 && (
        <section className="biz-neighbours floor bg-porcelain slab" aria-labelledby="biz-neighbours-title">
          <div className="wrap">
            <div className="section-head"><p className="eyebrow">{L['afacere-deja-in-comunitate'] ?? 'Deja în comunitate'}</p><h2 className="h2 ruled" id="biz-neighbours-title">{L['afacere-vecini'] ?? 'Vecinii din comunitate'}</h2></div>
            <ul className="business-grid">
              {cards.map(({b, href}) => {
                const body = <>
                  <span className="frame">{b.image && <img src={ctx.media(b.image)} alt={b.name} loading="lazy"/>}</span>
                  <h3 className="h3">{b.name}</h3>
                  {b.tagline && <p className="business-tagline">{b.tagline}</p>}
                  {href && <span className="link-arrow">{L['afla-mai-multe'] ?? 'Află mai multe'} <Arrow/></span>}
                </>;
                return <li key={b.id} className="business">{href ? <a href={href}>{body}</a> : <div>{body}</div>}</li>;
              })}
            </ul>
          </div>
        </section>
      )}

      <section className="biz-next floor bg-navy on-dark slab" aria-labelledby="biz-next-title">
        <div className="wrap biz-next-grid">
          <div className="biz-next-copy">
            <p className="eyebrow">{commercial?.name ?? (L['afacere-cta-eticheta'] ?? 'Spații comerciale')}</p>
            <h2 className="display biz-next-title" id="biz-next-title">{L['afacere-cta-titlu'] ?? 'Următoarea vitrină poate fi a ta'}</h2>
            <p className="lead">{ctaText}</p>
            <div className="biz-next-actions">
              {commercialHref && <a className="btn btn--light" href={commercialHref}>{L['afacere-cta-buton'] ?? 'Vezi spațiile comerciale'} <span className="btn-icon"><Arrow/></span></a>}
              {commercialHref && <a className="btn btn--ghost" href={`${commercialHref}#contact`}>{L['solicita-oferta'] ?? 'Solicită ofertă'} <span className="btn-icon"><Arrow/></span></a>}
              {f?.whatsapp && <a className="btn btn--ghost" href={f.whatsapp}>WhatsApp <span className="btn-icon"><Icon id="whatsapp"/></span></a>}
            </div>
          </div>
          {spaces?.length > 0 && (
            <dl className="biz-next-facts">
              {spaces.map(([k, v]) => <div key={k}><dt>{k}</dt><dd className="num">{v}</dd></div>)}
            </dl>
          )}
        </div>
      </section>
    </div>
  );
}
