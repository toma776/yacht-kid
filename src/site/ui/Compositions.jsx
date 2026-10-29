// Art direction v2: compozițiile homepage-ului. Fiecare secțiune pornește de la povestea ei și de la fotografia reală
// aleasă pentru ea (nu de la o machetă comună de tip „etichetă + titlu + paragraf + buton”). Conținutul vine din Brain:
// textul secțiunii (paragrafe, listă de adnotări cu <b>, figuri), imaginea ei, cifrele, tipurile de locuințe,
// tehnologiile și premiile. Sections.jsx le folosește doar pe homepage, după ancora secțiunii (vezi `composition`).
import {formatNumber, formatRange, formatMoney} from '../../registry/langs.mjs';
import {fillTokens, rich} from '../rich.mjs';
import {unitCard} from '../chrome.mjs';
import {Icon} from './Icons.jsx';
import LocationMap from './LocationMap.jsx';
import {strip, num, Arrow, buttons, Btn, parasOf, itemsOf, figuresOf} from './parts.jsx';
import {mapData} from './Sections.jsx';

const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
const isNum = t => /^[+\d]/.test(t ?? '');

// Marcajul de capitol: numărul secțiunii pe homepage, linia de apă (cele trei valuri din logo) și eticheta
const Mark = ({index, label, values}) => (
  <p className="v2-mark reveal"><span className="v2-mark-n num">{String(index).padStart(2, '0')}</span><span className="v2-mark-line" aria-hidden="true"/>{fillTokens(label ?? '', values)}</p>
);
const Title = ({s, values, id, cls = ''}) => s.heading ? <h2 className={`v2-h2 reveal ${cls}`} id={id} style={{'--d': '60ms'}}>{fillTokens(s.heading, values)}</h2> : null;

// A. Deschiderea: clădirea. Titlul stă pe spațiul negativ al fotografiei (cerul), fără voal; o singură acțiune
// (apartamentele; vizionarea rămâne în antet); suprafața și prețul de pornire pe o linie discretă, sub fotografie.
async function Opening({ctx, s, values, chrome}) {
  const L = values.__labels ?? {}, lang = ctx.lang, f = chrome.firma;
  const [b1] = await buttons(ctx, s, values);
  const units = await ctx.within('Hero', 'suprafața și prețul de pornire', () =>
    ctx.query('locuinte', {fields: ['kind', 'area_min', 'price_from'], where: `e.kind != 'comercial'`}));
  const minArea = Math.min(...units.map(u => u.area_min).filter(Boolean)), minPrice = Math.min(...units.map(u => u.price_from).filter(Boolean));
  const vat = units.find(u => u.price_from === minPrice)?.vat_excluded;
  return (
    <section className="v2 v2-open" aria-labelledby="hero-title">
      <div className="hero-card v2-open-stage">
        {s.image && <img className="hero-card-img v2-open-img" src={ctx.media(s.image)} alt="" fetchPriority="high"/>}
        <div className="wrap v2-open-copy">
          {s.eyebrow && <p className="v2-open-eyebrow"><span className="v2-mark-line" aria-hidden="true"/>{fillTokens(s.eyebrow, values)}</p>}
          <h1 className="v2-open-title" id="hero-title">{fillTokens(s.heading ?? '', values)}</h1>
          {s.text && <p className="v2-open-sub">{fillTokens(strip(s.text), values)}</p>}
          <Btn b={b1}/>
        </div>
      </div>
      <div className="wrap v2-open-foot">
        <dl>
          {Number.isFinite(minArea) && <div><dt>{L['suprafata-de-la'] ?? 'Suprafețe de la'}</dt><dd className="num">{formatNumber(minArea, lang)} m²</dd></div>}
          {Number.isFinite(minPrice) && <div><dt>{L['preturi-de-la'] ?? 'Prețuri de la'}</dt><dd className="num">{formatMoney(minPrice, 'EUR', lang)}{vat ? <small> {L.tva ?? '+ TVA'}</small> : null}</dd></div>}
        </dl>
        {f?.address && <p className="v2-open-addr"><span>{L['birou-vanzari'] ?? 'Birou de vânzări'}</span>{f.address}</p>}
      </div>
    </section>
  );
}

// Manifestul (Despre): un moment tipografic. Citatul e monumentul; capitolele, trei coloane de text, fără imagini.
async function Manifest({ctx, s, values, index}) {
  const html = await rich(ctx, s.text, values);
  const quote = strip(html.match(/<blockquote>([\s\S]*?)<\/blockquote>/)?.[1] ?? '');
  const chapters = html.split(/<h3>/).slice(1).map(p => ({
    title: strip(p.slice(0, p.indexOf('</h3>'))), body: parasOf(p.slice(p.indexOf('</h3>') + 5).replace(/<figure>[\s\S]*?<\/figure>/g, ''))
  }));
  return (
    <section className="v2 v2-manifest" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap v2-manifest-grid">
        <div className="v2-manifest-side"><Mark index={index} label={s.eyebrow} values={values}/><Title s={s} values={values} id={`t-${s.id}`}/></div>
        {quote && <blockquote className="v2-manifest-quote reveal" style={{'--d': '120ms'}}>{quote}</blockquote>}
      </div>
      {chapters.length > 0 && (
        <ol className="wrap v2-manifest-chapters">
          {chapters.map((c, i) => (
            <li key={i} className="reveal" style={{'--d': `${i * 90}ms`}}>
              <span className="v2-roman">{ROMAN[i]}</span>
              <h3>{c.title}</h3>
              {c.body.map((p, k) => <p key={k}>{p}</p>)}
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

// Adnotările (lista din text): titlul în <b>; o cifră (3, 4, {parc}) devine numeral mare
const Notes = ({items, cls = 'v2-notes'}) => (
  <ol className={cls}>
    {items.map((it, i) => (
      <li key={i} className={isNum(it.title) ? 'is-num' : ''}>
        <span className="v2-note-n num">{num(i)}</span>
        {it.title && <b className={isNum(it.title) ? 'num' : ''}>{it.title}</b>}
        {it.text && <span>{it.text}</span>}
      </li>
    ))}
  </ol>
);

// B. Arhitectura: fotografia formei (cerul încadrat de planșeele curbe) pornește din marginea ecranului, înaltă cât
// ecranul; alături, textul scurt, adnotările numerotate și un detaliu de fațadă, cu legenda lui
async function Architecture({ctx, s, values, index}) {
  const html = await rich(ctx, s.text, values);
  const [fig] = figuresOf(html);
  return (
    <section className="v2 v2-arch" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="v2-arch-grid">
        <figure className="v2-arch-main">{s.image && <img src={ctx.media(s.image)} alt="" loading="lazy"/>}</figure>
        <div className="v2-arch-copy">
          <Mark index={index} label={s.eyebrow} values={values}/>
          <Title s={s} values={values} id={`t-${s.id}`}/>
          {parasOf(html).map((p, i) => <p key={i} className="v2-lead reveal" style={{'--d': '120ms'}}>{p}</p>)}
          <div className="reveal" style={{'--d': '160ms'}}><Notes items={itemsOf(html)}/></div>
          {fig && <figure className="v2-arch-detail reveal"><img src={fig.src} alt={fig.alt} loading="lazy"/><figcaption><span>Fig. 01</span>{fig.alt}</figcaption></figure>}
        </div>
      </div>
    </section>
  );
}

// C. Viața pe malul lacului: lacul pe toată lățimea ecranului; dedesubt textul, cifra parcului și terasa, care urcă
// peste marginea fotografiei mari; reperele (promenadă, locație, parter, pază) și terasele, ca index de date
async function Lake({ctx, s, values, index}) {
  const L = values.__labels ?? {};
  const html = await rich(ctx, s.text, values);
  const items = itemsOf(html), [fig] = figuresOf(html);
  const big = items.find(it => isNum(it.title)), rest = items.filter(it => it !== big);
  const types = await ctx.within(`Lacul (${s.id})`, 'terasele tipurilor de locuințe', () =>
    ctx.query('locuinte', {fields: ['kind', 'terrace_min', 'terrace_max'], where: `e.kind != 'comercial'`}));
  const tmin = Math.min(...types.map(t => t.terrace_min).filter(Boolean)), tmax = Math.max(...types.map(t => t.terrace_max).filter(Boolean));
  const terraces = Number.isFinite(tmin) && Number.isFinite(tmax) ? formatRange(tmin, tmax, ctx.lang, 'm²') : null;
  return (
    <section className="v2 v2-lake" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <figure className="v2-lake-wide">{s.image && <img src={ctx.media(s.image)} alt="" loading="lazy"/>}</figure>
      <div className="wrap v2-lake-grid">
        <div className="v2-lake-copy">
          <Mark index={index} label={s.eyebrow} values={values}/>
          <Title s={s} values={values} id={`t-${s.id}`}/>
          {parasOf(html).map((p, i) => <p key={i} className="v2-lead reveal" style={{'--d': '120ms'}}>{p}</p>)}
        </div>
        {big && <p className="v2-bignum reveal" style={{'--d': '160ms'}}><b className="num">{big.title}</b><span>{big.text}</span></p>}
        {fig && <figure className="v2-lake-terrace reveal"><img src={fig.src} alt={fig.alt} loading="lazy"/><figcaption><span>Fig. 02</span>{fig.alt}</figcaption></figure>}
        <dl className="v2-index reveal">
          {terraces && <div><dt>{L.terase ?? (ctx.lang === 'en' ? 'Terraces' : 'Terase')}</dt><dd className="num">{terraces}</dd></div>}
          {rest.map((it, i) => <div key={i}><dt>{it.title}</dt><dd>{it.text}</dd></div>)}
        </dl>
      </div>
    </section>
  );
}

// D. Piscinele private: momentul-semnătură. Fotografia de la nivelul apei domină două treimi din ecran, până la
// margine; alături, numeralul în albastrul elementului de apă din logo, titlul și o a doua piscină
async function Pools({ctx, s, values, index}) {
  const html = await rich(ctx, s.text, values);
  const [big] = itemsOf(html).filter(it => isNum(it.title)), [fig] = figuresOf(html);
  return (
    <section className="v2 v2-pools" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <figure className="v2-pools-img">{s.image && <img src={ctx.media(s.image)} alt="" loading="lazy"/>}</figure>
      <div className="v2-pools-copy">
        <Mark index={index} label={s.eyebrow} values={values}/>
        {big && <p className="v2-pools-n num reveal" aria-hidden="true">{big.title}</p>}
        <Title s={s} values={values} id={`t-${s.id}`}/>
        {parasOf(html).map((p, i) => <p key={i} className="v2-lead reveal" style={{'--d': '120ms'}}>{p}</p>)}
        {fig && <figure className="v2-pools-second reveal"><img src={fig.src} alt={fig.alt} loading="lazy"/><figcaption><span>Fig. 03</span>{fig.alt}</figcaption></figure>}
      </div>
    </section>
  );
}

// E. Colecția: un tabel comparativ (suprafață, terasă, etaje, preț de la) lângă o fotografie care pornește din
// marginea ecranului și urmează rândul ales. Nu e o listă de unități disponibile: duce la pagina fiecărui tip.
async function Collection({ctx, s, values, index}) {
  const L = values.__labels ?? {}, lang = ctx.lang;
  const types = await ctx.within(`Colecția (${s.id})`, 'tipurile de locuințe publicate', () =>
    ctx.query('locuinte', {fields: ['kind', 'price_from'], where: `e.kind != 'comercial'`, order: 'e.price_from'}));
  const rows = (await Promise.all(types.map(async t => {
    const c = await unitCard(ctx, t.id, L);
    return c && {...c, area: formatRange(t.area_min, t.area_max, lang, 'm²'), terrace: formatRange(t.terrace_min, t.terrace_max, lang, 'm²'),
      floors: formatRange(t.floor_min, t.floor_max, lang), price: t.price_from ? formatMoney(t.price_from, 'EUR', lang) : '', vat: t.vat_excluded};
  }))).filter(Boolean);
  const lead = strip(await rich(ctx, s.text, values));
  const COLS = [['area', L.suprafata ?? 'Suprafață'], ['terrace', L.terasa ?? 'Terasă'], ['floors', L.etaj ?? 'Etaj'], ['price', L['pret-de-la'] ?? 'Preț de la']];
  return (
    <section className="v2 v2-coll" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap v2-coll-head">
        <div><Mark index={index} label={s.eyebrow} values={values}/><Title s={s} values={values} id={`t-${s.id}`}/></div>
        {lead && <p className="v2-lead reveal" style={{'--d': '120ms'}}>{lead}</p>}
      </div>
      <div className="v2-coll-body" data-typo>
        <div className="v2-coll-stage" aria-hidden="true">
          {rows.map((u, i) => u.image && <img key={u.id} src={u.image} alt="" loading="lazy" className={i === 0 ? 'is-active' : ''} data-typo-img={i}/>)}
        </div>
        <div className="v2-coll-table">
          <div className="v2-coll-th" aria-hidden="true"><span>{L.tipologie ?? (lang === 'en' ? 'Type' : 'Tipologie')}</span>{COLS.map(([k, l]) => <span key={k}>{l}</span>)}<span/></div>
          <ol>
            {rows.map((u, i) => (
              <li key={u.id} className={`v2-coll-row ${i === 0 ? 'is-active' : ''}`} data-typo-item={i}>
                <a href={u.href}>
                  {u.image && <span className="v2-coll-thumb"><img src={u.image} alt="" loading="lazy"/></span>}
                  <span className="v2-coll-name"><span className="num">{num(i)}</span>{u.name}</span>
                  {COLS.map(([k, l]) => <span key={k} className="v2-coll-cell num" data-l={l}>{u[k] || '—'}{k === 'price' && u.vat ? <small> {L.tva ?? '+ TVA'}</small> : null}</span>)}
                  <span className="v2-coll-go" aria-hidden="true"><Arrow/></span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}

// F. Dosarul tehnic: claritate și inginerie, pe antracit. Fișele tehnologiilor (codificate T-01…), cifra seismică,
// confortul ca specificații scurte, un detaliu fotografic cu legendă și legătura spre pagina Tehnologie
async function Dossier({ctx, s, values, index}) {
  const html = await rich(ctx, s.text, values);
  const [lead, ...more] = parasOf(html);
  const spec = await ctx.links('sectiuni.features', s.id);
  const techs = await ctx.within('Dosar tehnic', 'tehnologiile publicate', () => ctx.query('tehnologii', {fields: ['group'], order: 'e.id'}));
  const facts = await ctx.within('Dosar tehnic', 'cifra seismică', () => ctx.query('cifre', {fields: ['token', 'value', 'unit'], where: `e.token = 'seism'`}));
  const seism = facts[0];
  const [b1] = await buttons(ctx, s, values);
  return (
    <section className="v2 v2-dossier on-dark" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap">
        <header className="v2-dossier-head">
          <div><Mark index={index} label={s.eyebrow} values={values}/><Title s={s} values={values} id={`t-${s.id}`}/></div>
          {lead && <p className="v2-lead reveal" style={{'--d': '120ms'}}>{lead}</p>}
        </header>
        <div className="v2-dossier-grid">
          <ol className="v2-sheets">
            {techs.map((t, i) => (
              <li key={t.id} className="reveal" style={{'--d': `${(i % 2) * 70}ms`}}>
                <span className="v2-code num">T-{num(i)}</span>
                <h3>{t.title}</h3>
                {t.summary && <p>{t.summary}</p>}
              </li>
            ))}
          </ol>
          <aside className="v2-dossier-side">
            {seism && <p className="v2-bignum reveal"><b className="num">+{formatNumber(seism.value, ctx.lang)}%</b><span>{fillTokens(seism.label ?? '', values)}</span></p>}
            {s.image && <figure className="v2-dossier-fig reveal"><img src={ctx.media(s.image)} alt="" loading="lazy"/><figcaption><span>Fig. 04</span>{fillTokens(s.heading ?? '', values)}</figcaption></figure>}
            {spec.length > 0 && <ul className="v2-spec reveal">{spec.map(f => <li key={f.id}>{f.title}</li>)}</ul>}
            {more.map((p, i) => <p key={i} className="v2-dossier-note">{p}</p>)}
            {b1 && <a className="link-arrow" href={b1.href}>{b1.label} <Arrow/></a>}
          </aside>
        </div>
      </div>
    </section>
  );
}

// G. Locația: tranziția spre oraș. Titlul și textul deasupra; harta pe toată lățimea ecranului (cu reperele și
// timpii din Brain); dedesubt adresa, deschiderea în hărți și oferta
async function Place({ctx, s, values, chrome, index}) {
  const L = values.__labels ?? {}, f = chrome.firma;
  const html = await rich(ctx, s.text, values);
  const fig = html.match(/<figure>([\s\S]*?)<\/figure>/)?.[1];
  const body = html.replace(`<p>${values.adresa}</p>`, '').replace(/<figure>[\s\S]*?<\/figure>/g, '');
  const map = s.show_map ? await mapData(ctx, s) : null;
  const fallback = fig ? {src: fig.match(/src="([^"]+)"/)?.[1], alt: fig.match(/alt="([^"]*)"/)?.[1] ?? ''} : null;
  const [b1] = await buttons(ctx, s, values);
  return (
    <section className="v2 v2-place" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap v2-place-head">
        <div><Mark index={index} label={s.eyebrow} values={values}/><Title s={s} values={values} id={`t-${s.id}`}/></div>
        <div className="v2-place-text reveal" style={{'--d': '120ms'}}>{parasOf(body).map((p, i) => <p key={i}>{p}</p>)}</div>
      </div>
      <div className="v2-place-map">
        {map ? <LocationMap {...map} lang={ctx.lang} fallback={fallback}/> : fallback && <img src={fallback.src} alt={fallback.alt} loading="lazy"/>}
      </div>
      <div className="wrap v2-place-foot">
        {values.adresa && <address className="v2-place-addr"><Icon id="pin" size={18}/>{values.adresa}</address>}
        {f?.maps && <a className="link-arrow" href={f.maps} target="_blank" rel="noopener">{L['deschide-maps'] ?? 'Deschide în Google Maps'} <Arrow/></a>}
        {b1 && <a className="link-arrow" href={b1.href}>{b1.label} <Arrow/></a>}
      </div>
    </section>
  );
}

// H. Recunoașterea: editorial, pe ani. Anul e numeralul mare; sub el, competiția (numele exact), distincția și
// categoria din Brain, cu marca competiției mică și monocromă; legătura spre articol sau pagina oficială
async function Recognition({ctx, s, values, index}) {
  const awards = await ctx.within(`Premii (${s.id})`, 'premiile publicate cu logo, fără lista scurtă', () =>
    ctx.query('premii', {scope: `sectiuni:${s.id}`, where: `e.logo_id IS NOT NULL AND e.result != 'lista-scurta'`,
      order: `e.year DESC, CASE e.result WHEN 'castigator' THEN 0 WHEN 'distinctie' THEN 1 WHEN 'mentiune' THEN 2 ELSE 3 END, e.id`, limit: s.limit}));
  if (!awards.length) return null;
  const links = await Promise.all(awards.map(async a => ({a, href: a.article ? await ctx.href('articole', a.article) : null})));
  const years = [...new Set(awards.map(a => a.year))].map(y => [y, links.filter(l => l.a.year === y)]);
  return (
    <section className="v2 v2-awards" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap v2-awards-grid">
        <header><Mark index={index} label={s.eyebrow} values={values}/><Title s={s} values={values} id={`t-${s.id}`}/></header>
        <div className="v2-years">
          {years.map(([year, list]) => (
            <div key={year} className="v2-year reveal">
              <p className="v2-year-n num">{year}</p>
              <ul>
                {list.map(({a, href}) => {
                  const body = <>
                    <b>{a.competition}</b>
                    <span>{[a.distinction, a.category_name].filter(Boolean).join(' · ')}</span>
                    <span className="v2-award-logo" role="img" aria-label={a.competition} style={{'--logo': `url('${ctx.media(a.logo)}')`}}/>
                  </>;
                  return <li key={a.id}>{href ? <a href={href}>{body}</a> : a.url ? <a href={a.url} target="_blank" rel="noopener">{body}</a> : <div>{body}</div>}</li>;
                })}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// Compoziția homepage-ului pentru o secțiune: după fel (hero) sau după ancoră + fel; null = macheta de bază
const BY_ANCHOR = {
  despre: ['text', Manifest], arhitectura: ['text', Architecture], lac: ['text', Lake], piscine: ['text', Pools],
  apartamente: ['alte-locuinte', Collection], tehnologie: ['avantaje', Dossier], locatie: ['text', Place], premii: ['premii', Recognition]
};
export function composition(s) {
  if (s.kind === 'hero') return Opening;
  const [kind, C] = BY_ANCHOR[s.anchor] ?? [];
  return kind === s.kind ? C : null;
}
