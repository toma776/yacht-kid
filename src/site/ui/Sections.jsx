// Secțiunile paginilor compuse (homepage-ul din design), randate din `sectiuni` prin contextul urmărit.
// Un fel de secțiune = o machetă. Textul vine din câmpurile secțiunii (pe limbă); listele vin din entitățile legate.
import {formatNumber, formatRange, formatMoney} from '../../registry/langs.mjs';
import {fillTokens, rich} from '../rich.mjs';
import {unitCard, resolveTo} from '../chrome.mjs';
import {Icon} from './Icons.jsx';

const strip = html => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const num = i => String(i + 1).padStart(2, '0');
const Arrow = () => <Icon id="arrow"/>;

// Pictograma unui avantaj, după cuvintele din titlu (desenele sunt în sprite, titlurile în Brain)
const ICONS = [[/fa[țt]ad|facade/i, 'facade'], [/material/i, 'material'], [/piscin|pool/i, 'pool'], [/fonic|sound/i, 'sound'], [/promenad/i, 'promenade'],
  [/aerisit|airy/i, 'air'], [/paz[aă]|cctv|security/i, 'shield'], [/comercial/i, 'shop'], [/energie|energy|consum/i, 'energy'], [/incend|fire/i, 'fire'],
  [/condens/i, 'drop'], [/termic|thermal/i, 'thermal'], [/eficien|efficien/i, 'leaf'],
  [/loca[țt]i|location/i, 'location'], [/vizibil|visib/i, 'visibility'], [/flexib/i, 'layout'], [/investi|profitab/i, 'growth']];
const iconFor = t => ICONS.find(([rx]) => rx.test(t ?? ''))?.[1] ?? 'leaf';

async function buttons(ctx, s, values) {
  return Promise.all((s.buttons ?? []).map(async b => ({...b, label: fillTokens(b.label, values), href: await resolveTo(ctx, b.to)})));
}
const Btn = ({b, cls = 'btn', icon = 'arrow'}) => b?.href ? <a className={cls} href={b.href} {...(b.video ? {'data-video-open': ''} : {})}>{b.label} <span className="btn-icon"><Icon id={b.video ? 'play' : icon}/></span></a> : null;
const Head = ({s, values, id, cls = ''}) => <>
  {s.eyebrow && <p className={`eyebrow reveal ${cls}`}>{fillTokens(s.eyebrow, values)}</p>}
  {s.heading && <h2 className="h2 ruled reveal" id={id} style={{'--d': '80ms'}}>{fillTokens(s.heading, values)}</h2>}
</>;

function mediaVideo(m, quality) {
  const r = (m?.renditions ?? []).find(x => x.quality === quality) ?? m?.renditions?.[0];
  return {src: r?.file ?? `/media/${m?.id}/`, poster: m?.poster};
}

async function Hero({ctx, s, values, next}) {
  const video = s.video ? await ctx.item('media', s.video, 'media') : null;
  const [b1, b2] = await buttons(ctx, s, values);
  const heading = fillTokens(s.heading ?? '', values);
  const [first, ...rest] = heading.split(' ');
  const bg = mediaVideo(video, '720p'), full = mediaVideo(video, '1080p');
  return (
    <section className="hero on-dark" aria-labelledby="hero-title">
      <div className="hero-media" aria-hidden="true">
        {video ? <video autoPlay muted loop playsInline preload="metadata" poster={bg.poster ?? ctx.media(s.image)} data-hero-video><source src={s.video_start ? `${bg.src}#t=${s.video_start}` : bg.src} type="video/mp4"/></video>
          : s.image && <img src={ctx.media(s.image)} alt=""/>}
      </div>
      <div className="hero-inner wrap">
        {s.eyebrow && <p className="status reveal"><span className="status-dot"/>{fillTokens(s.eyebrow, values)}</p>}
        <h1 className="display hero-title reveal" id="hero-title" style={{'--d': '80ms'}}><span className="mark">{first}</span> {rest.join(' ')}</h1>
        <div className="hero-foot">
          {s.text && <p className="subhead hero-sub reveal" style={{'--d': '160ms'}}>{fillTokens(strip(s.text), values)}</p>}
          <div className="hero-actions reveal" style={{'--d': '240ms'}}>
            <Btn b={b1}/>
            {b2 && <Btn b={{...b2, video: video && b2.to === '#video'}} cls="btn btn--glass"/>}
          </div>
        </div>
      </div>
      {next && <a className="scroll-cue" href={`#${next}`} aria-label={next}><span/></a>}
      {video && (
        <dialog className="video-dialog" data-video-dialog aria-label={b2?.label}>
          <button className="dialog-close" type="button" data-video-close aria-label="×"><Icon id="close" size={24}/></button>
          <video controls playsInline preload="none" poster={full.poster} data-video-full><source src={full.src} type="video/mp4"/></video>
        </dialog>
      )}
    </section>
  );
}

async function Facts({ctx, s, values}) {
  const facts = await ctx.links('sectiuni.facts', s.id);
  const UNIT = {ro: {m2: 'm²', ron_m2: 'RON/m²', procent: '%', ore: 'ore'}, en: {m2: 'sqm', ron_m2: 'RON/sqm', procent: '%', ore: 'hours'}}[ctx.lang];
  const tiles = [
    ...facts.map(f => ({value: `${f.unit === 'procent' ? '+' : ''}${formatNumber(f.value, ctx.lang)}`, unit: UNIT[f.unit], label: fillTokens([f.label, f.suffix].filter(Boolean).join(' '), values), num: true})),
    ...(s.buttons ?? []).map(b => ({value: fillTokens(b.value ?? '', values), label: fillTokens(b.label, values), num: /^\d/.test(fillTokens(b.value ?? '', values))}))
  ];
  return (
    <section className="facts slab bg-porcelain" aria-label={s.heading ?? 'YACHT KID'} id={s.anchor || undefined}>
      <div className="wrap">
        <ul className="facts-grid">
          {tiles.map((t, i) => <li key={i} className="fact reveal" style={{'--d': `${i * 80}ms`}}><span className={`fact-value ${t.num ? 'num' : ''}`}>{t.value}{t.unit && <small>{t.unit}</small>}</span><span className="fact-label">{t.label}</span></li>)}
        </ul>
      </div>
    </section>
  );
}

// Despre: textul are un citat (blockquote) și capitole (h3 + paragrafe + o figură cu legenda „Cifră — explicație”)
async function Chapters({ctx, s, values, html}) {
  const quote = html.match(/<blockquote>([\s\S]*?)<\/blockquote>/)?.[1];
  const parts = html.split(/<h3>/).slice(1).map(p => {
    const title = strip(p.slice(0, p.indexOf('</h3>')));
    const fig = p.match(/<figure>([\s\S]*?)<\/figure>/)?.[1] ?? '';
    const [chipB, chipS] = strip(fig.match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1]).split(/\s+[—–-]\s+/);
    return {title, body: p.slice(p.indexOf('</h3>') + 5).replace(/<figure>[\s\S]*?<\/figure>/, ''), img: fig.match(/src="([^"]+)"/)?.[1], alt: fig.match(/alt="([^"]*)"/)?.[1] ?? '', chipB, chipS};
  });
  const [b1] = await buttons(ctx, s, values);
  return (
    <section className="about floor bg-porcelain" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap">
        <div className="about-head">
          <div className="about-intro"><Head s={s} values={values} id={`t-${s.id}`}/></div>
          {quote && <div className="about-statement reveal" style={{'--d': '160ms'}}><blockquote className="pull subhead">{strip(quote)}</blockquote></div>}
        </div>
        <div className="chapters reveal" data-chapters>
          <div className="chapters-copy">
            <ol className="chapter-list">
              {parts.map((c, i) => (
                <li key={i} className={`chapter ${i === 0 ? 'is-active' : ''}`} data-chapter={i}>
                  <h3 className="chapter-head"><button type="button" id={`ch-btn-${s.id}-${i}`} aria-expanded={i === 0} aria-controls={`ch-panel-${s.id}-${i}`}>
                    <span className="chapter-num num">{num(i)}</span><span className="chapter-title">{c.title}</span><span className="chapter-icon" aria-hidden="true"/>
                  </button></h3>
                  <div className="chapter-panel" id={`ch-panel-${s.id}-${i}`} role="region" aria-labelledby={`ch-btn-${s.id}-${i}`}><div dangerouslySetInnerHTML={{__html: c.body}}/></div>
                  <span className="chapter-progress" aria-hidden="true"/>
                </li>
              ))}
            </ol>
            <Btn b={b1}/>
          </div>
          <div className="frame frame--band chapter-stage">
            {parts.map((c, i) => (
              <figure key={i} className={`chapter-figure ${i === 0 ? 'is-active' : ''}`} data-figure={i} aria-hidden={i === 0 ? undefined : true}>
                {c.img && <img src={c.img} alt={c.alt} loading="lazy"/>}
                {c.chipB && <figcaption className="chapter-chip"><b>{c.chipB}</b><span>{c.chipS}</span></figcaption>}
              </figure>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

async function Text({ctx, s, values}) {
  const html = await rich(ctx, s.text, values);
  if (/<h3>/.test(html) && /<figure>/.test(html)) return Chapters({ctx, s, values, html});
  // Un paragraf care e doar adresa (din jetonul {adresa}) devine eticheta cu pictogramă; o figură din text devine
  // imaginea din dreapta (așa, harta poate fi alta pe fiecare limbă)
  const address = values.adresa && html.includes(`<p>${values.adresa}</p>`);
  const fig = html.match(/<figure>([\s\S]*?)<\/figure>/)?.[1];
  const figImg = fig?.match(/src="([^"]+)"/)?.[1], figAlt = fig?.match(/alt="([^"]*)"/)?.[1] ?? '';
  const body = html.replace(`<p>${values.adresa}</p>`, '').replace(/<figure>[\s\S]*?<\/figure>/, '');
  const [b1] = await buttons(ctx, s, values);
  const dark = s.anchor === 'locatie';
  return (
    <section className={`location floor ${dark ? 'bg-navy on-dark' : 'bg-porcelain'} slab`} id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap location-grid">
        <div className="location-copy">
          <Head s={s} values={values} id={`t-${s.id}`}/>
          <div className="body reveal" style={{'--d': '160ms'}} dangerouslySetInnerHTML={{__html: body}}/>
          {address && <address className="address reveal" style={{'--d': '200ms'}}><Icon id="pin" size={20}/>{values.adresa}</address>}
          {b1 && <a className="btn reveal" style={{'--d': '240ms'}} href={b1.href}>{b1.label} <span className="btn-icon"><Arrow/></span></a>}
        </div>
        {(figImg || s.image) && <figure className="frame location-map reveal" style={{'--d': '120ms'}}><img src={figImg ?? ctx.media(s.image)} alt={figImg ? figAlt : s.heading ?? ''} loading="lazy"/></figure>}
      </div>
    </section>
  );
}

async function Features({ctx, s, values}) {
  const items = await ctx.links('sectiuni.features', s.id);
  const comfort = items.length && items.every(f => f.group === 'confort');
  if (!comfort) {
    // Textul secțiunii (dacă există): primul paragraf ca lead lângă titlu, restul sub el
    const paras = (await rich(ctx, s.text, values)).match(/<p>[\s\S]*?<\/p>/g) ?? [];
    return (
      <section className="features floor bg-paper slab" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
        <div className="wrap">
          <div className="section-head section-head--split">
            <div><Head s={s} values={values} id={`t-${s.id}`}/></div>
            {paras.length > 0 && <div className="features-copy reveal" style={{'--d': '160ms'}}>
              <p className="lead">{strip(paras[0])}</p>
              {paras.length > 1 && <div className="body" dangerouslySetInnerHTML={{__html: paras.slice(1).join('')}}/>}
            </div>}
          </div>
          <ul className="features-grid">
            {items.map((f, i) => <li key={f.id} className="feature reveal" style={{'--d': `${(i % 4) * 60}ms`}}>
              <Icon id={iconFor(f.title)} className="icon"/><h3 className="h3">{fillTokens(f.title, values)}</h3>
              {f.text && <p className="feature-text">{fillTokens(f.text, values)}</p>}
            </li>)}
          </ul>
        </div>
      </section>
    );
  }
  const paras = (await rich(ctx, s.text, values)).match(/<p>[\s\S]*?<\/p>/g) ?? [];
  const [b1] = await buttons(ctx, s, values);
  return (
    <section className="comfort floor bg-porcelain slab" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap comfort-grid">
        <div className="comfort-copy">
          <Head s={s} values={values} id={`t-${s.id}`}/>
          {paras[0] && <p className="lead reveal" style={{'--d': '160ms'}}>{strip(paras[0])}</p>}
          {paras.length > 1 && <div className="body reveal" style={{'--d': '200ms'}} dangerouslySetInnerHTML={{__html: paras.slice(1).join('')}}/>}
          {b1 && <a className="btn btn--ghost reveal" style={{'--d': '240ms'}} href={b1.href}>{b1.label} <span className="btn-icon"><Arrow/></span></a>}
        </div>
        <ol className="spec-list">
          {items.map((f, i) => <li key={f.id} className="reveal"><span className="num">{num(i)}</span><Icon id={iconFor(f.title)} className="icon"/><h3 className="h3">{f.title}</h3></li>)}
        </ol>
      </div>
    </section>
  );
}

async function Collection({ctx, s, values}) {
  const L = values.__labels ?? {};
  const types = await ctx.within(`Colecția (${s.id})`, 'tipurile de locuințe publicate', () =>
    ctx.query('locuinte', {fields: ['kind', 'price_from'], where: `e.kind != 'comercial'`, order: 'e.price_from'}));
  const cards = (await Promise.all(types.map(t => unitCard(ctx, t.id, L)))).filter(Boolean);
  const lead = strip(await rich(ctx, s.text, values));
  return (
    <section className="collection floor bg-porcelain" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap">
        <div className="section-head section-head--split">
          <div><Head s={s} values={values} id={`t-${s.id}`}/></div>
          {lead && <p className="lead reveal" style={{'--d': '160ms'}}>{lead}</p>}
        </div>
        <ul className="units">
          {cards.map((u, i) => (
            <li key={u.id} className="unit reveal" style={{'--d': `${(i % 2) * 100}ms`}}>
              <a href={u.href}>
                <div className="frame unit-frame">{u.image && <img src={u.image} alt={u.name} loading="lazy" data-parallax/>}</div>
                <div className="unit-meta"><span className="unit-index num">{num(i)}</span><h3 className="h3">{u.name}<small className="unit-spec">{[u.area, u.price].filter(Boolean).join(' · ')}</small></h3><span className="link-arrow">{L['afla-mai-multe'] ?? 'Află mai multe'} <Arrow/></span></div>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Arhitectura: trei fotografii ca straturi la adâncimi diferite, valurile curg deasupra
// Galeria cu mai mult de trei fotografii: grilă, prima mai mare; un click deschide fotografia mare (dialog, cu
// înainte/înapoi), ca lightbox-ul de pe site-ul vechi
function PhotoGrid({ctx, s, values, imgs}) {
  const list = imgs.map(m => ({src: ctx.media(m.id), alt: m.alt ?? ''}));
  return (
    <section className="photos floor bg-paper slab" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap">
        <div className="section-head"><Head s={s} values={values} id={`t-${s.id}`}/></div>
        <ul className="photo-grid">
          {list.map((p, i) => (
            <li key={i} className="reveal" style={{'--d': `${(i % 4) * 60}ms`}}>
              <button type="button" className="frame photo" data-lightbox-open={i} aria-label={p.alt || `${i + 1} / ${list.length}`}>
                <img src={p.src} alt={p.alt} loading="lazy"/>
              </button>
            </li>
          ))}
        </ul>
      </div>
      <dialog className="lightbox" data-lightbox={JSON.stringify(list)} aria-label={s.heading ?? ''}>
        <button className="dialog-close" type="button" data-lightbox-close aria-label="×"><Icon id="close" size={24}/></button>
        <button className="lightbox-nav lightbox-prev" type="button" data-lightbox-step="-1" aria-label="←"><Arrow/></button>
        <img alt="" data-lightbox-img/>
        <button className="lightbox-nav lightbox-next" type="button" data-lightbox-step="1" aria-label="→"><Arrow/></button>
        <p className="lightbox-count num" data-lightbox-count/>
      </dialog>
    </section>
  );
}

async function Gallery({ctx, s, values}) {
  const imgs = await ctx.links('sectiuni.gallery', s.id);
  if (imgs.length > 3) return PhotoGrid({ctx, s, values, imgs});
  const [b1] = await buttons(ctx, s, values);
  const [a, b, c] = imgs;
  return (
    <section className="architecture bg-porcelain" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <svg className="strata" viewBox="0 0 1440 120" preserveAspectRatio="none" aria-hidden="true" data-drift="1">
        <g fill="none" stroke="currentColor" strokeWidth="1" vectorEffect="non-scaling-stroke">
          {[10, 30, 50, 70].map(y => <path key={y} d={`M0 ${y}H620C680 ${y} 700 ${y + 40} 760 ${y + 40}H1440`}/>)}
        </g>
      </svg>
      <div className="arch-grid wrap">
        {a && <figure className="frame arch-a reveal"><img src={ctx.media(a.id)} alt={a.alt ?? ''} loading="lazy" data-parallax/></figure>}
        <div className="arch-copy reveal" style={{'--d': '80ms'}}>
          <Icon id="award" className="icon arch-icon"/>
          {s.heading && <h2 className="h2 ruled" id={`t-${s.id}`}>{fillTokens(s.heading, values)}</h2>}
          {b1 && <a className="link-arrow" href={b1.href}>{b1.label} <Arrow/></a>}
        </div>
        {b && <figure className="frame frame--band arch-b reveal" style={{'--d': '120ms'}} data-depth="-0.55"><img src={ctx.media(b.id)} alt={b.alt ?? ''} loading="lazy"/></figure>}
        {c && <figure className="frame arch-c reveal" style={{'--d': '200ms'}} data-depth="0.4"><img src={ctx.media(c.id)} alt={c.alt ?? ''} loading="lazy"/></figure>}
      </div>
    </section>
  );
}

async function Cta({ctx, s, values}) {
  const [b1] = await buttons(ctx, s, values);
  return (
    <section className="lifestyle bg-porcelain" id={s.anchor || undefined} aria-label={s.heading ?? ''}>
      <div className="wrap">
        <figure className="frame frame--band lifestyle-frame reveal">
          {s.image && <img src={ctx.media(s.image)} alt="" loading="lazy" data-parallax/>}
          <figcaption className="lifestyle-caption">
            {s.eyebrow && <span className="eyebrow on-dark">{s.eyebrow}</span>}
            {s.heading && <p className="h2">{fillTokens(s.heading, values)}</p>}
            <Btn b={b1} icon="calendar"/>
          </figcaption>
        </figure>
      </div>
    </section>
  );
}

async function ContactForm({ctx, s, values, chrome}) {
  const L = chrome.labels, f = chrome.firma;
  const form = s.form ? await ctx.item('formulare', s.form) : null;
  const labels = Object.fromEntries((form?.field_labels ?? []).map(l => [l.name, l]));
  // Câmpurile pe jumătate de rând; dacă sunt în număr impar, primul ia rândul întreg, ca grila să nu rămână cu un gol
  const pairs = (form?.fields ?? []).filter(x => !['textarea', 'checkbox'].includes(x.type)).length;
  const types = form?.fields?.some(x => x.options_from === 'locuinte')
    ? await ctx.query('locuinte', {fields: ['kind', 'price_from'], where: `e.kind != 'comercial'`, order: 'e.price_from'}) : [];  // spațiile comerciale au formularul lor
  const paras = (await rich(ctx, s.text, values)).match(/<p>[\s\S]*?<\/p>/g) ?? [];
  const input = (x, l, span) => {
    const id = `f-${x.name}`, label = `${l?.label ?? x.name}${x.required ? ' *' : ''}`;
    if (x.type === 'checkbox') return <label key={x.name} className="check span-2"><input type="checkbox" name={x.name} required={x.required}/><span dangerouslySetInnerHTML={{__html: L['acord-date'] ?? l?.label ?? ''}}/></label>;
    if (x.type === 'select') {
      const opts = x.options_from === 'locuinte' ? types.map(t => t.name) : l?.options ?? [];
      return <div key={x.name} className={`field ${span ? 'span-2' : ''}`}><label htmlFor={id}>{label}</label><select id={id} name={x.name} required={x.required} defaultValue=""><option value="" disabled>{l?.placeholder ?? ''}</option>{opts.map(o => <option key={o}>{o}</option>)}</select></div>;
    }
    if (x.type === 'textarea') return <div key={x.name} className="field span-2"><label htmlFor={id}>{label}</label><textarea id={id} name={x.name} rows={3} required={x.required}/></div>;
    return <div key={x.name} className={`field ${span ? 'span-2' : ''}`}><label htmlFor={id}>{label}</label><input id={id} name={x.name} type={x.type ?? 'text'} required={x.required} autoComplete={{name: 'name', email: 'email', phone: 'tel', company: 'organization'}[x.name]}/></div>;
  };
  return (
    <section className="contact floor bg-porcelain" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap contact-grid">
        <div className="contact-copy">
          <Head s={s} values={values} id={`t-${s.id}`}/>
          {paras[0] && <p className="lead reveal" style={{'--d': '160ms'}}>{strip(paras[0])}</p>}
          {f && (
            <dl className="channels reveal" style={{'--d': '200ms'}}>
              <div><dt>Email</dt><dd><a href={`mailto:${f.email}`}><Icon id="mail" size={20}/>{f.email}</a></dd></div>
              <div><dt>{L.telefon}</dt><dd><a href={`tel:${f.phone}`}><Icon id="phone" size={20}/>{f.phoneLabel}</a></dd></div>
              <div><dt>WhatsApp</dt><dd><a href={f.whatsapp}><Icon id="whatsapp" size={20}/>{L['scrie-ne-whatsapp']}</a></dd></div>
              <div><dt>{L.adresa}</dt><dd><span><Icon id="pin" size={20}/>{f.address}</span></dd></div>
            </dl>
          )}
        </div>
        {form && (
          <form className="form-card reveal" style={{'--d': '120ms'}} action="#" method="post" noValidate data-form>
            <div className="form-head"><h3 className="h3">{L[`formular-${form.handle}`] ?? L['formular-contact'] ?? form.name}</h3>{form.intro && <p className="muted">{form.intro}</p>}</div>
            <div className="form-grid">{form.fields.map((x, i) => input(x, labels[x.name], i === 0 && pairs % 2 === 1))}</div>
            <div className="form-foot">
              <button className="btn btn--navy" type="submit">{form.submit_label ?? L['trimite']} <span className="btn-icon"><Arrow/></span></button>
              <p className="form-note muted" role="status" aria-live="polite" data-form-note data-pending={L['formular-in-lucru'] ?? ''}/>
            </div>
          </form>
        )}
      </div>
    </section>
  );
}

// Fișa tehnică a unui tip de locuință, ca rând de cifre: suprafață, terasă, preț (din `locuinte`, nu din text)
async function UnitSpec({ctx, s, values}) {
  const u = s.unit_type && await ctx.item('locuinte', s.unit_type, 'page');
  if (!u) return null;
  const L = values.__labels ?? {}, lang = ctx.lang;
  const tiles = [
    [L.suprafata ?? 'Suprafață', formatRange(u.area_min, u.area_max, lang, 'm²')],
    [L.etaj ?? 'Etaj', formatRange(u.floor_min, u.floor_max, lang)],
    [L.terasa ?? 'Terasă', formatRange(u.terrace_min, u.terrace_max, lang, 'm²')],
    [L['pret-de-la'] ?? 'Preț de la', u.price_from ? formatMoney(u.price_from, 'EUR', lang) : '', u.vat_excluded ? (L.tva ?? '+ TVA') : null]
  ].filter(([, v]) => v);
  return (
    <section className="facts facts--spec bg-paper" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap">
        <div className="section-head"><Head s={s} values={values} id={`t-${s.id}`}/></div>
        <ul className="facts-grid" style={{'--cols': tiles.length}}>
          {tiles.map(([k, v, note], i) => <li key={k} className="fact reveal" style={{'--d': `${i * 80}ms`}}><span className="fact-value num spec-value">{v}{note && <small>{note}</small>}</span><span className="fact-label">{k}</span></li>)}
        </ul>
      </div>
    </section>
  );
}

// Afacerile din comunitate: imagine, nume, domeniu și, dacă există, articolul care anunță afacerea
async function Businesses({ctx, s, values}) {
  const L = values.__labels ?? {};
  const list = await ctx.within(`Afaceri (${s.id})`, s.business_filter === 'membri-card' ? 'partenerii Community Card' : 'toate afacerile deschise', () =>
    ctx.query('afaceri', {scope: `sectiuni:${s.id}`, where: `e.state = 'deschis'${s.business_filter === 'membri-card' ? ' AND e.card_member = 1' : ''}`,
      order: 'e.id', limit: s.limit}));
  const cards = await Promise.all(list.map(async b => {
    const [post] = await ctx.query('articole', {scope: `afaceri:${b.id}`, order: 'e.published_at DESC', limit: 1,
      where: 'EXISTS (SELECT 1 FROM rel_posts_businesses r WHERE r.src_id = e.id AND r.dst_id = ?)', args: [b.id]});
    return {b, href: post ? await ctx.href('articole', post.id) : null};
  }));
  const [b1] = await buttons(ctx, s, values);
  return (
    <section className="businesses floor bg-paper slab" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap">
        <div className="section-head section-head--split">
          <div><Head s={s} values={values} id={`t-${s.id}`}/></div>
          {b1 && <a className="btn btn--ghost reveal" style={{'--d': '160ms'}} href={b1.href}>{b1.label} <span className="btn-icon"><Arrow/></span></a>}
        </div>
        <ul className="business-grid">
          {cards.map(({b, href}, i) => {
            const body = <>
              <span className="frame">{b.image && <img src={ctx.media(b.image)} alt={b.name} loading="lazy"/>}</span>
              <h3 className="h3">{b.name}</h3>
              {b.tagline && <p className="business-tagline">{b.tagline}</p>}
              {href && <span className="link-arrow">{L['afla-mai-multe'] ?? 'Află mai multe'} <Arrow/></span>}
            </>;
            return <li key={b.id} className="business reveal" style={{'--d': `${(i % 4) * 60}ms`}}>{href ? <a href={href}>{body}</a> : <div>{body}</div>}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}

// Banda de premii: logo-urile competițiilor (premii.logo) ca mască monocromă, cu distincția și anul dedesubt.
// Fără lista scurtă (ca jetonul {nr_premii}); ordinea: anul, apoi câștigător → distincție → mențiune.
async function Awards({ctx, s, values}) {
  const awards = await ctx.within(`Premii (${s.id})`, 'premiile publicate cu logo, fără lista scurtă', () =>
    ctx.query('premii', {scope: `sectiuni:${s.id}`, where: `e.logo_id IS NOT NULL AND e.result != 'lista-scurta'`,
      order: `e.year DESC, CASE e.result WHEN 'castigator' THEN 0 WHEN 'distinctie' THEN 1 WHEN 'mentiune' THEN 2 ELSE 3 END, e.id`, limit: s.limit}));
  if (!awards.length) return null;
  const [b1] = await buttons(ctx, s, values);
  return (
    <section className="proof bg-porcelain" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap proof-inner">
        <div className="proof-head reveal">
          {s.eyebrow && <p className="eyebrow">{fillTokens(s.eyebrow, values)}</p>}
          {s.heading && <h2 className="proof-title" id={`t-${s.id}`}>{fillTokens(s.heading, values)}</h2>}
          {b1?.href && <a className="link-arrow" href={b1.href}>{b1.label} <Arrow/></a>}
        </div>
        <ul className="proof-list reveal" style={{'--d': '120ms', '--n': awards.length}}>
          {awards.map(a => (
            <li key={a.id} className="proof-item">
              <a href={a.url || b1?.href} {...(a.url ? {target: '_blank', rel: 'noopener'} : {})}>
                <span className="proof-logo" role="img" aria-label={a.competition} style={{'--logo': `url('${ctx.media(a.logo)}')`}}/>
                <span className="proof-meta"><b>{a.distinction}</b><span className="num">{a.year}</span></span>
              </a>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Testimonialele: cele alese în secțiune sau, dacă nu e niciunul, toate cele „Afișat pe pagina Testimoniale”.
// Textul e în limba paginii: originalul dacă e scris în ea, altfel traducerea.
async function Testimonials({ctx, s, values}) {
  const chosen = await ctx.links('sectiuni.testimonials', s.id);
  const list = chosen.length ? chosen : await ctx.within(`Testimoniale (${s.id})`, 'cele afișate pe pagina Testimoniale', () =>
    ctx.query('testimoniale', {fields: ['featured'], where: 'e.featured = 1', order: 'e.id'}));
  const [b1] = await buttons(ctx, s, values);
  const text = t => (t.quote_lang === ctx.lang ? t.quote : t.quote_translated || t.quote) ?? '';
  return (
    <section className="testimonials floor bg-navy on-dark slab" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap">
        <div className="section-head section-head--split">
          <div><Head s={s} values={values} id={`t-${s.id}`}/></div>
          {b1 && <a className="link-arrow reveal" style={{'--d': '160ms'}} href={b1.href}>{b1.label} <Arrow/></a>}
        </div>
        <ul className="quote-grid">
          {list.filter(t => text(t)).map((t, i) => (
            <li key={t.id} className="quote-card reveal" style={{'--d': `${(i % 3) * 80}ms`}}>
              <blockquote><p>{text(t)}</p></blockquote>
              <p className="quote-author"><b>{t.author}</b>{t.role && <span>{t.role}</span>}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

// Cardurile articolelor: aceeași listă pe pagina blogului (secțiunea `articole`) și pe paginile categoriilor
export async function PostList({ctx, posts, labels}) {
  const date = d => new Date(d).toLocaleDateString(ctx.lang === 'en' ? 'en-US' : 'ro-RO', {dateStyle: 'long'});
  const cards = await Promise.all(posts.map(async p => ({p, href: await ctx.href('articole', p.id)})));
  return (
    <ul className="posts-list">{cards.map(({p, href}) => (
      <li key={p.id}><a className="post-card" href={href}>
        <span className="frame">{p.image && <img src={ctx.media(p.image)} alt="" loading="lazy"/>}</span>
        {p.published_at && <time dateTime={p.published_at}>{date(p.published_at)}</time>}
        <h2 className="h3">{p.title}</h2>
        <span className="link-arrow">{labels['citeste-articolul'] ?? 'Citește articolul'} <Arrow/></span>
      </a></li>
    ))}</ul>
  );
}

// Lista articolelor: secțiunea spune doar regula (categoria, câte); ca primă secțiune a paginii ține și titlul paginii
async function Posts({ctx, s, values, first}) {
  const cat = s.post_category;
  const posts = await ctx.within(`Articole (${s.id})`, cat ? `categoria ${cat}` : 'toate articolele publicate', () =>
    ctx.query('articole', {scope: cat ? `categorii:${cat}` : `sectiuni:${s.id}`, where: cat ? 'e.category_id = ?' : '', args: cat ? [cat] : [],
      order: 'e.published_at DESC', limit: s.limit}));
  const H = first ? 'h1' : 'h2';
  return (
    <section className="wrap page-body" id={s.anchor || undefined}>
      <header className="page-head">
        {s.eyebrow && <p className="eyebrow">{fillTokens(s.eyebrow, values)}</p>}
        {s.heading && <H className={first ? 'display' : 'h2'}>{fillTokens(s.heading, values)}</H>}
      </header>
      <PostList ctx={ctx} posts={posts} labels={values.__labels ?? {}}/>
    </section>
  );
}

const KINDS = {hero: Hero, cifre: Facts, text: Text, avantaje: Features, 'alte-locuinte': Collection, galerie: Gallery, cta: Cta, formular: ContactForm, articole: Posts,
  'fisa-tehnica': UnitSpec, afaceri: Businesses, premii: Awards, testimoniale: Testimonials};

export async function Sections({ctx, owner = 'pagini', pageId, values, chrome}) {
  const sections = await ctx.within('Pagina', 'secțiunile paginii', () => ctx.links(`${owner}.sections`, pageId));
  const v = {...values, __labels: chrome.labels};
  const out = [];
  for (const [i, s] of sections.entries()) {
    const C = KINDS[s.kind];
    if (!C) continue;
    out.push(<C key={s.id} ctx={ctx} s={s} values={v} chrome={chrome} first={i === 0} next={sections[i + 1]?.anchor || null}/>);
  }
  return out;
}

// Secțiunile le pot avea paginile și tipurile de locuințe (pagina Spații comerciale)
export const sectionsOf = (ctx, owner, id) => ctx.links(`${owner}.sections`, id);
export const hasSections = async (ctx, pageId, owner = 'pagini') => (await sectionsOf(ctx, owner, pageId)).length > 0;
