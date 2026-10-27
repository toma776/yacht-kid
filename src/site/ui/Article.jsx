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

export async function Article({ctx, rec, title, chrome}) {
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
