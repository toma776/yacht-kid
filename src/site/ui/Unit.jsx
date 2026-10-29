// Pagina unui tip de locuință (2, 3, 4 camere, duplex), construită din Brain, în ordinea paginii vechi, dar așezată nou:
//   antet în două coloane (titlu, introducere, întreținerea, butoane | coperta) și rândul de caracteristici;
//   descrierea lângă video (locuinte.video; fără video, o fotografie din galerie);
//   galeria (primele 9 în grilă, toate în lightbox); celelalte tipuri de locuințe, cu fotografie și buton;
//   formularul de contact (cu tipul paginii ales deja) și ultimele articole.
// Spațiile comerciale au secțiuni proprii (pagină compusă) și nu trec pe aici.
import {formatMoney, formatRange} from '../../registry/langs.mjs';
import {rich, fillTokens} from '../rich.mjs';
import {unitCard} from '../chrome.mjs';
import {Icon} from './Icons.jsx';
import {ContactForm, PhotoGrid, PostList} from './Sections.jsx';

const Arrow = () => <Icon id="arrow"/>;

function facts(u, lang, L) {
  return [
    ['area', L.suprafata ?? 'Suprafață', formatRange(u.area_min, u.area_max, lang, 'm²')],
    ['floor', L.etaj ?? 'Etaj', formatRange(u.floor_min, u.floor_max, lang)],
    ['bath', L.bai ?? 'Băi', formatRange(u.baths_min, u.baths_max, lang)],
    ['terrace', L.terasa ?? 'Terasă', formatRange(u.terrace_min, u.terrace_max, lang, 'm²')],
    ['balcony', L.balcon ?? 'Balcon', u.balcony ? (L.da ?? 'Da') : ''],
    ['price', L['pret-de-la'] ?? 'Preț de la', u.price_from ? formatMoney(u.price_from, 'EUR', lang) : '', u.vat_excluded ? (L.tva ?? '+ TVA') : null]
  ].filter(([, , v]) => v);
}

export async function UnitPage({ctx, rec, title, chrome}) {
  const L = chrome.labels, lang = ctx.lang, values = {...chrome.values, __labels: L};
  const gallery = await ctx.within('Galerie', 'imaginile tipului de locuință', () => ctx.links('locuinte.gallery', rec.id));
  const video = rec.video ? await ctx.item('media', rec.video, 'video') : null;
  const clip = q => (video?.renditions ?? []).find(r => r.quality === q) ?? video?.renditions?.[0];
  const description = await rich(ctx, rec.description, values);
  const others = (await Promise.all((await ctx.within('Alte locuințe', 'celelalte tipuri publicate', () =>
    ctx.query('locuinte', {fields: ['kind', 'price_from'], where: `e.kind != 'comercial' AND e.id != ?`, args: [rec.id], order: 'e.price_from'})))
    .map(t => unitCard(ctx, t.id, L)))).filter(Boolean);
  const [form] = await ctx.query('formulare', {fields: ['handle'], where: `e.handle = 'contact'`, limit: 1});
  const posts = await ctx.within('Articole', 'cele mai noi', () => ctx.query('articole', {scope: `locuinte:${rec.id}`, order: 'e.published_at DESC', limit: 3}));
  const side = video ? null : gallery[1] ?? gallery[0];

  return (
    <div className="unit-page">
      <section className="unit-intro wrap">
        <div className="unit-intro-copy">
          <p className="eyebrow">{L.apartamente ?? 'Apartamente'}</p>
          <h1 className="display">{title}</h1>
          {rec.intro && <p className="lead">{fillTokens(rec.intro, values)}</p>}
          {values.intretinere && <p className="unit-pill"><Icon id="maintenance" className="icon"/>{L['intretinere-doar'] ?? 'Mentenanță de la doar'} <b>{values.intretinere}</b></p>}
          <div className="unit-actions">
            <a className="btn" href="#contact">{L['solicita-oferta']} <span className="btn-icon"><Arrow/></span></a>
            {/* Al doilea buton: vizionarea (pagina cu formularul), aceeași țintă ca în meniu și în subsol; video-ul rămâne în Despre */}
            <a className="btn btn--ghost" href={chrome.header.find(i => i.mega === 'locuinte')?.aside?.cta?.href ?? chrome.contactHref}>{L['programeaza-vizionare'] ?? 'Programează o vizionare'} <span className="btn-icon"><Icon id="calendar"/></span></a>
          </div>
        </div>
        {rec.hero_image && <figure className="frame frame--band unit-cover"><img src={ctx.media(rec.hero_image)} srcSet={ctx.srcset(rec.hero_image)} sizes="(max-width: 1000px) 100vw, 45vw" alt={title} fetchPriority="high"/></figure>}
      </section>

      <div className="wrap">
        <dl className="unit-facts" style={{'--n': facts(rec, lang, L).length}}>
          {facts(rec, lang, L).map(([k, label, v, note]) => <div key={k}><dt>{label}</dt><dd className="num">{v}{note && <small>{note}</small>}</dd></div>)}
        </dl>
      </div>

      <section className="unit-about floor bg-paper slab" aria-labelledby="unit-about-title">
        <div className="wrap unit-about-grid">
          <div>
            <p className="eyebrow reveal">{L.caracteristici ?? 'Caracteristici'}</p>
            <h2 className="h2 ruled reveal" id="unit-about-title">{L['unit-despre-titlu'] ?? 'Un stil de viață aspirațional într-o comunitate prosperă'}</h2>
            <div className="body prose reveal" style={{'--d': '120ms'}} dangerouslySetInnerHTML={{__html: description}}/>
          </div>
          {video ? (
            <figure className="frame frame--band unit-video reveal" style={{'--d': '160ms'}}>
              <video autoPlay muted loop playsInline preload="metadata" poster={video.poster}><source src={clip('720p')?.file} type="video/mp4"/></video>
              <a className="unit-video-play" href="#video" data-video-open aria-label={L['vezi-video'] ?? 'Vezi video de prezentare'}><Icon id="play"/></a>
            </figure>
          ) : side && <figure className="frame frame--band unit-video reveal"><img src={ctx.media(side.id)} alt={side.alt ?? ''} loading="lazy"/></figure>}
        </div>
        {video && (
          <dialog className="video-dialog" data-video-dialog aria-label={L['vezi-video'] ?? ''}>
            <button className="dialog-close" type="button" data-video-close aria-label="×"><Icon id="close" size={24}/></button>
            <video controls playsInline preload="none" poster={video.poster} data-video-full><source src={clip('1080p')?.file} type="video/mp4"/></video>
          </dialog>
        )}
      </section>

      {/* Fundalurile alternează: galeria e banda gri dintre secțiunile albe */}
      {gallery.length > 0 && PhotoGrid({ctx, values, imgs: gallery, limit: 9, allLabel: L['toate-fotografiile'], tone: 'bg-porcelain',
        s: {id: 'unit-galerie', anchor: 'galerie', eyebrow: L.galerie ?? 'Galerie', heading: title}})}

      {others.length > 0 && (
        <section className="unit-others floor bg-paper slab" aria-labelledby="unit-others-title">
          <div className="wrap">
            <div className="section-head section-head--split">
              <div><p className="eyebrow reveal">{L.apartamente ?? 'Apartamente'}</p><h2 className="h2 ruled reveal" id="unit-others-title">{L['alte-apartamente'] ?? 'Alte apartamente YACHT KID'}</h2></div>
              <p className="lead reveal" style={{'--d': '160ms'}}>{L['alte-apartamente-text']}</p>
            </div>
            <ul className="other-units">
              {others.map((u, i) => (
                <li key={u.id} className="reveal" style={{'--d': `${i * 80}ms`}}>
                  <a href={u.href}>
                    <span className="frame">{u.image && <img src={u.image} alt={u.name} loading="lazy"/>}</span>
                    <span className="other-unit-body">
                      <b className="h3">{u.name}</b>
                      <span>{[u.area, u.price].filter(Boolean).join(' · ')}</span>
                      <span className="btn btn--ghost">{L['vezi-detalii'] ?? 'Vezi detalii'} <span className="btn-icon"><Arrow/></span></span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}

      {form && ContactForm({ctx, values, chrome, preset: rec.name,
        s: {id: 'unit-contact', anchor: 'contact', form: form.id, eyebrow: 'Contact', heading: L['contact-titlu'], text: L['contact-text'] ? `<p>${L['contact-text']}</p>` : null}})}

      {posts.length > 0 && (
        <section className="unit-posts floor bg-paper slab" aria-labelledby="unit-posts-title">
          <div className="wrap">
            <div className="section-head"><p className="eyebrow">Blog</p><h2 className="h2 ruled" id="unit-posts-title">{L['citeste-mai-multe'] ?? 'Citește mai multe despre YACHT KID'}</h2></div>
            {await PostList({ctx, posts, labels: L})}
          </div>
        </section>
      )}
    </div>
  );
}
