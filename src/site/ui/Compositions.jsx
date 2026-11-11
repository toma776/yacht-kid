// Art direction v2 (păstrat din propunere): recunoașterea pe homepage, în varianta compactă. Un rând pe premiu: anul,
// competiția (numele exact), distincția și categoria din Brain, marca competiției mică și monocromă; legătura spre
// articol sau pagina oficială. Sections.jsx o folosește pe homepage în locul benzii de premii (vezi `composition`).
import {fillTokens} from '../rich.mjs';
import {Icon} from './Icons.jsx';

async function Recognition({ctx, s, values}) {
  const awards = await ctx.within(`Premii (${s.id})`, 'premiile publicate cu logo, fără lista scurtă', () =>
    ctx.query('premii', {scope: `sectiuni:${s.id}`, where: `e.logo_id IS NOT NULL AND e.result != 'lista-scurta'`,
      order: `e.year DESC, CASE e.result WHEN 'castigator' THEN 0 WHEN 'distinctie' THEN 1 WHEN 'mentiune' THEN 2 ELSE 3 END, e.id`, limit: s.limit}));
  if (!awards.length) return null;
  const links = await Promise.all(awards.map(async a => ({a, href: a.article ? await ctx.href('articole', a.article) : null})));
  // Varianta compactă: un rând pe premiu (anul, competiția și distincția, logo-ul), fiecare cu legătura spre articolul lui
  return (
    <section className="v2-awards v2-awards--compact bg-porcelain" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap v2-awards-grid">
        <header>
          {s.eyebrow && <p className="eyebrow reveal">{fillTokens(s.eyebrow, values)}</p>}
          {s.heading && <h2 className="h2 ruled reveal" id={`t-${s.id}`}>{fillTokens(s.heading, values)}</h2>}
        </header>
        <ul className="v2-list reveal">
          {links.map(({a, href}) => {
            const body = <>
              <span className="v2-list-year num">{a.year}</span>
              <span className="v2-list-copy"><b>{a.competition}</b><span>{[a.distinction, a.category_name].filter(Boolean).join(' · ')}</span></span>
              <span className="v2-award-logo" role="img" aria-label={a.competition} style={{'--logo': `url('${ctx.media(a.logo)}')`}}/>
              {(href || a.url) && <Icon id="arrow" className="v2-list-arrow"/>}
            </>;
            return <li key={a.id}>{href ? <a href={href}>{body}</a> : a.url ? <a href={a.url} target="_blank" rel="noopener">{body}</a> : <div>{body}</div>}</li>;
          })}
        </ul>
      </div>
    </section>
  );
}

// Compoziția homepage-ului pentru o secțiune; null = macheta de bază
export const composition = s => (s.kind === 'premii' ? Recognition : null);
