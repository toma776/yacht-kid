// Articolul de blog în stilul nou, construit din textul existent (nu se rescrie nimic în Brain):
//   antet cu categoria, data, timpul de citire și rezumatul; fotografia mare;
//   textul pe secțiuni numerotate (din H2), listele ca listă de verificare, fraza scurtă de după o listă ca concluzie;
//   „Întrebări frecvente” (ultima secțiune, întrebări în <strong> + răspuns în <p>) ca acordeon;
//   alături, un sidebar care rămâne pe ecran: cuprinsul (cu secțiunea curentă), alte articole, îndemnul la vizionare.
import {rich} from '../rich.mjs';
import {Icon} from './Icons.jsx';

const strip = html => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim();
const slug = t => strip(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60);
const FAQ = /întrebări frecvente|intrebari frecvente|frequently asked|faq/i;
const dateOf = (d, lang) => new Date(d).toLocaleDateString(lang === 'en' ? 'en-US' : 'ro-RO', {dateStyle: 'long'});

// Textul unei secțiuni: listele devin listă de verificare, iar un paragraf scurt imediat după o listă devine concluzia ei
function shape(html) {
  return html
    .replace(/<ul>/g, '<ul class="checklist">')
    .replace(/<\/ul>\s*<p>([^<]{0,170})<\/p>/g, '</ul><p class="takeaway">$1</p>')
    .replace(/<figure>/g, '<figure class="frame article-figure">');
}

export function splitArticle(html) {
  const parts = html.split(/<h2>/);
  const intro = parts.shift() ?? '';
  const sections = parts.map(p => {
    const end = p.indexOf('</h2>');
    const title = strip(p.slice(0, end));
    return {title, id: slug(title), html: p.slice(end + 5)};
  });
  // Întrebările frecvente devin acordeon doar dacă au forma întrebare (<strong> sau <h3>) + răspuns (<p>);
  // altfel secțiunea rămâne una obișnuită, ca nimic din text să nu se piardă
  const faqAt = sections.findIndex(s => FAQ.test(s.title));
  const qa = faqAt < 0 ? [] : [...sections[faqAt].html.matchAll(/<(strong|h3)>([\s\S]*?)<\/\1>\s*((?:<p>[\s\S]*?<\/p>\s*)+?)(?=<(?:strong|h3)>|$)/g)]
    .map(m => ({q: strip(m[2]), a: m[3]})).filter(x => x.q && strip(x.a));
  const faq = qa.length ? {...sections.splice(faqAt, 1)[0], qa} : null;
  return {intro, sections, faq};
}

// Conținutul unui capitol: paragrafele (cu legăturile lor), listele ca bife, fraza scurtă de după o listă ca citat
// cu linia coral; figura capitolului se scoate (stă în coloana din dreapta)
const chapterBody = html => html
  .replace(/<figure>[\s\S]*?<\/figure>/g, '')
  .replace(/<ul>/g, '<ul class="ax-check">')
  .replace(/<\/ul>\s*<p>([^<]{0,170})<\/p>/g, '</ul><blockquote class="pull ax-take"><p>$1</p></blockquote>');
const figureOf = html => { const f = html.match(/<figure>([\s\S]*?)<\/figure>/)?.[1]; return f ? {src: f.match(/src="([^"]+)"/)?.[1], alt: f.match(/alt="([^"]*)"/)?.[1] ?? ''} : null; };
const two = i => String(i + 1).padStart(2, '0');

// Macheta schematică (preview): antetul ca o secțiune de capitol (titlu cu linie, introducerea ca citat), „Pe scurt” cu
// întrebările articolului, capitolele ca acordeon (unul deschis, fotografia alături, „Următoarea întrebare”),
// întrebările frecvente în același stil, apoi alte articole și vizionarea. Textul din Brain rămâne neschimbat.
export async function Article({ctx, rec, title, chrome}) {
  const L = chrome.labels, lang = ctx.lang, en = lang === 'en';
  const html = await rich(ctx, rec.content, chrome.values);
  const {intro, sections, faq} = splitArticle(html);
  const minutes = Math.max(1, Math.round(strip(html).split(' ').length / 200));
  const category = rec.category ? await ctx.item('categorii', rec.category, 'link') : null;
  const categoryHref = rec.category ? await ctx.href('categorii', rec.category) : null;
  const others = await Promise.all((await ctx.within('Alte articole', `categoria ${rec.category}`, () => ctx.query('articole', {scope: `articole:${rec.id}`,
    where: 'e.id != ?', args: [rec.id], order: 'e.published_at DESC', limit: 3}))).map(async p => ({p, href: await ctx.href('articole', p.id)})));
  const cover = rec.image ? {src: ctx.media(rec.image), alt: ''} : null;
  const viewHref = chrome.header.find(i => i.mega === 'locuinte')?.aside?.cta?.href ?? chrome.contactHref;
  const introText = strip(intro);
  return (
    <article className="ax">
      <header className="about ax-head bg-porcelain">
        <div className="wrap about-head">
          <div className="about-intro">
            <p className="eyebrow">{categoryHref ? <a href={categoryHref}>{category?.name ?? 'Blog'}</a> : (category?.name ?? 'Blog')}</p>
            <h1 className="h2 ruled">{title}</h1>
            <p className="ax-meta">{rec.published_at && <time dateTime={rec.published_at}>{dateOf(rec.published_at, lang)}</time>}<span>{minutes} {L['min-citire'] ?? 'min de citit'}</span><span>{sections.length} {en ? 'questions' : 'întrebări'}</span></p>
          </div>
          {introText && <div className="about-statement"><blockquote className="pull subhead">{introText}</blockquote></div>}
        </div>
      </header>

      {sections.length > 1 && (
        <nav className="wrap ax-brief" aria-label={en ? 'In short' : 'Pe scurt'}>
          <p className="eyebrow">{en ? 'In short' : 'Pe scurt'}</p>
          <ol>{sections.map((s, i) => <li key={s.id}><a href={`#${s.id}`} data-chapter-open={i}><span className="num">{two(i)}</span>{s.title}</a></li>)}</ol>
        </nav>
      )}

      <section className="about ax-body bg-paper">
        <div className="wrap chapters ax-chapters" data-chapters data-chapters-multi>
          <div className="chapters-copy">
            <ol className="chapter-list">
              {sections.map((s, i) => (
                <li key={s.id} id={s.id} className={`chapter ${i === 0 ? 'is-active' : ''}`} data-chapter={i}>
                  <h2 className="chapter-head"><button type="button" id={`ax-btn-${i}`} aria-expanded={i === 0} aria-controls={`ax-panel-${i}`}>
                    <span className="chapter-num num">{two(i)}</span><span className="chapter-title">{s.title}</span><span className="chapter-icon" aria-hidden="true"/>
                  </button></h2>
                  <div className="chapter-panel" id={`ax-panel-${i}`} role="region" aria-labelledby={`ax-btn-${i}`}>
                    <div>
                      <div className="ax-text" dangerouslySetInnerHTML={{__html: chapterBody(s.html)}}/>
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          </div>
          <div className="chapter-stage ax-stage">
            {sections.map((s, i) => { const f = figureOf(s.html) ?? cover; return (
              <figure key={s.id} className={`chapter-figure ${i === 0 ? 'is-active' : ''}`} data-figure={i} aria-hidden={i === 0 ? undefined : true}>
                {f?.src && <img src={f.src} alt={f.alt} loading="lazy"/>}
              </figure>
            ); })}
          </div>
        </div>
      </section>

      {faq && (
        <section id={faq.id} className="about ax-faq bg-porcelain">
          <div className="wrap">
            <p className="eyebrow">{en ? 'FAQ' : 'Întrebări frecvente'}</p>
            <h2 className="h2 ruled">{faq.title}</h2>
            <div className="chapter-list ax-faq-list">
              {faq.qa.map((x, i) => (
                <details key={i} className="chapter" open={i === 0}>
                  <summary className="chapter-head"><span className="chapter-num num">{two(i)}</span><span className="chapter-title">{x.q}</span><span className="chapter-icon" aria-hidden="true"/></summary>
                  <div className="ax-text" dangerouslySetInnerHTML={{__html: x.a}}/>
                </details>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="ax-end bg-paper">
        <div className="wrap ax-end-grid">
          {others.length > 0 && (
            <div>
              <p className="eyebrow">{L['alte-articole'] ?? 'Alte articole'}</p>
              <ol className="ax-more">{others.map(({p, href}, i) => <li key={p.id}><a href={href}><span className="num">{two(i)}</span><b>{p.title}</b><Icon id="arrow"/></a></li>)}</ol>
            </div>
          )}
          <div className="ax-cta">
            <blockquote className="pull subhead">{L['articol-cta-text'] ?? 'Programează o vizionare și descoperă locuințele de lângă parc.'}</blockquote>
            <a className="btn" href={viewHref}>{L['programeaza-vizionare'] ?? 'Programează o vizionare'} <span className="btn-icon"><Icon id="calendar"/></span></a>
          </div>
        </div>
      </section>
    </article>
  );
}

export async function ArticleClassic({ctx, rec, title, chrome}) {
  const L = chrome.labels, lang = ctx.lang;
  const html = await rich(ctx, rec.content, chrome.values);
  const {intro, sections, faq} = splitArticle(html);
  const minutes = Math.max(1, Math.round(strip(html).split(' ').length / 200));
  // Rezumatul din WordPress e adesea începutul articolului tăiat cu „[…]”: îl arătăm doar dacă spune altceva
  const excerpt = rec.excerpt && !/\[(…|\.\.\.)\]\s*$/.test(rec.excerpt) && !strip(intro).startsWith(strip(rec.excerpt).slice(0, 60)) ? rec.excerpt : null;
  const category = rec.category ? await ctx.item('categorii', rec.category, 'link') : null;
  const categoryHref = rec.category ? await ctx.href('categorii', rec.category) : null;
  // Alte articole: din aceeași categorie, cele mai noi; dacă sunt prea puține, completăm cu cele mai noi din blog
  const same = await ctx.within('Alte articole', `categoria ${rec.category}`, () => ctx.query('articole', {scope: `articole:${rec.id}`,
    where: 'e.id != ? AND e.category_id = ?', args: [rec.id, rec.category], order: 'e.published_at DESC', limit: 4}));
  const more = same.length >= 4 ? [] : await ctx.query('articole', {scope: `articole:${rec.id}`,
    where: `e.id != ? AND e.id NOT IN (${same.map(p => +p.id).join(',') || 0})`, args: [rec.id], order: 'e.published_at DESC', limit: 4 - same.length});
  const others = await Promise.all([...same, ...more].map(async p => ({p, href: await ctx.href('articole', p.id)})));
  const toc = [...sections, ...(faq ? [faq] : [])];

  return (
    <article className="article">
      <header className="article-head wrap">
        <p className="eyebrow">{categoryHref ? <a href={categoryHref}>{category?.name ?? 'Blog'}</a> : (category?.name ?? 'Blog')}</p>
        <h1 className="display">{title}</h1>
        <p className="article-meta">
          {rec.published_at && <time dateTime={rec.published_at}>{dateOf(rec.published_at, lang)}</time>}
          <span>{minutes} {L['min-citire'] ?? 'min de citit'}</span>
        </p>
        {excerpt && <p className="lead article-excerpt">{excerpt}</p>}
      </header>
      {rec.image && <div className="wrap"><div className="frame frame--band article-cover"><img src={ctx.media(rec.image)} alt=""/></div></div>}

      <div className="wrap article-layout">
        <div className="article-main">
          {strip(intro) && <div className="article-intro prose" dangerouslySetInnerHTML={{__html: shape(intro)}}/>}
          {sections.map((s, i) => (
            <section key={s.id} id={s.id} className="article-section" data-toc-section>
              <h2><span className="num">{String(i + 1).padStart(2, '0')}</span>{s.title}</h2>
              <div className="prose" dangerouslySetInnerHTML={{__html: shape(s.html)}}/>
            </section>
          ))}
          {faq && (
            <section id={faq.id} className="article-faq" data-toc-section>
              <h2>{faq.title}</h2>
              <div className="faq-list">
                {faq.qa.map((x, i) => (
                  <details key={i} className="faq-item" open={i === 0}>
                    <summary><span>{x.q}</span><span className="chapter-icon" aria-hidden="true"/></summary>
                    <div className="faq-answer prose" dangerouslySetInnerHTML={{__html: x.a}}/>
                  </details>
                ))}
              </div>
            </section>
          )}
        </div>

        <aside className="article-aside">
          {toc.length > 1 && (
            <nav className="aside-card toc" aria-label={L.cuprins ?? 'Cuprins'} data-toc>
              <p className="aside-title">{L.cuprins ?? 'Cuprins'}</p>
              <ol>{toc.map((s, i) => <li key={s.id}><a href={`#${s.id}`}>{s === faq ? <Icon id="chevron" size={12}/> : <span className="num">{String(i + 1).padStart(2, '0')}</span>}{s.title}</a></li>)}</ol>
            </nav>
          )}
          {others.length > 0 && (
            <div className="aside-card">
              <p className="aside-title">{L['alte-articole'] ?? 'Alte articole'}</p>
              <ul className="aside-posts">
                {others.map(({p, href}) => (
                  <li key={p.id}><a href={href}>
                    <span className="frame">{p.image && <img src={ctx.media(p.image)} alt="" loading="lazy"/>}</span>
                    <span><b>{p.title}</b>{p.published_at && <time dateTime={p.published_at}>{dateOf(p.published_at, lang)}</time>}</span>
                  </a></li>
                ))}
              </ul>
            </div>
          )}
          <div className="aside-card aside-cta on-dark">
            <p className="aside-cta-title">{L['articol-cta-titlu'] ?? 'Vino să vezi YACHT KID'}</p>
            <p>{L['articol-cta-text'] ?? 'Programează o vizionare și descoperă locuințele de lângă parc.'}</p>
            <a className="btn" href={chrome.contactHref}>{L['solicita-oferta']} <span className="btn-icon"><Icon id="arrow"/></span></a>
          </div>
        </aside>
      </div>
    </article>
  );
}
