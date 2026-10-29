// Art direction v2 (păstrat din propunere): recunoașterea pe ani. Anul e numeralul mare; sub el, competiția (numele
// exact), distincția și categoria din Brain, cu marca competiției mică și monocromă; legătura spre articol sau pagina
// oficială. Sections.jsx o folosește pe homepage în locul benzii de premii (vezi `composition`).
import {fillTokens} from '../rich.mjs';

async function Recognition({ctx, s, values}) {
  const awards = await ctx.within(`Premii (${s.id})`, 'premiile publicate cu logo, fără lista scurtă', () =>
    ctx.query('premii', {scope: `sectiuni:${s.id}`, where: `e.logo_id IS NOT NULL AND e.result != 'lista-scurta'`,
      order: `e.year DESC, CASE e.result WHEN 'castigator' THEN 0 WHEN 'distinctie' THEN 1 WHEN 'mentiune' THEN 2 ELSE 3 END, e.id`, limit: s.limit}));
  if (!awards.length) return null;
  const links = await Promise.all(awards.map(async a => ({a, href: a.article ? await ctx.href('articole', a.article) : null})));
  const years = [...new Set(awards.map(a => a.year))].map(y => [y, links.filter(l => l.a.year === y)]);
  return (
    <section className="v2-awards bg-porcelain" id={s.anchor || undefined} aria-labelledby={`t-${s.id}`}>
      <div className="wrap v2-awards-grid">
        <header>
          {s.eyebrow && <p className="eyebrow reveal">{fillTokens(s.eyebrow, values)}</p>}
          {s.heading && <h2 className="h2 ruled reveal" id={`t-${s.id}`}>{fillTokens(s.heading, values)}</h2>}
        </header>
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

// Compoziția homepage-ului pentru o secțiune; null = macheta de bază
export const composition = s => (s.kind === 'premii' ? Recognition : null);
