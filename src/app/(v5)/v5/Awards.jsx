// Premiile v5: sus, numărul mare de premii lângă titlu și fotografia arhitecturii (alunecă ușor în cadru la derulare);
// dedesubt, câte o coloană pe premiu (logo-ul competiției ca mască navy, anul, competiția, distincția), despărțite de
// linii fine. Pe mobil, rânduri.
import {Icon} from '../../../site/ui/Icons.jsx';

export default function Awards({data, t}) {
  if (!data?.items.length) return null;
  return (
    <section className="w5" id={data.anchor} aria-labelledby="w5-title">
      <div className="h5-wrap">
        <div className="w5-head">
          <div className="w5-copy" data-rv>
            <p className="v5-eyebrow">{data.eyebrow}</p>
            <div className="w5-titlerow">
              <span className="w5-count" aria-hidden="true">{data.count}</span>
              <h2 className="w5-title" id="w5-title">{data.heading}</h2>
            </div>
          </div>
          {data.image && (
            <figure className="w5-fig" data-rv>
              <img src={data.image.src} srcSet={data.image.srcSet} sizes="(max-width: 1023px) 100vw, 40vw" alt="" loading="lazy" decoding="async" data-px="22"/>
            </figure>
          )}
        </div>

        <ol className="w5-list" data-rv>
          {data.items.map(a => {
            const body = (
              <>
                <span className="w5-logo" role="img" aria-label={a.competition} style={{'--logo': `url('${a.logo}')`}}/>
                <span className="w5-year">{a.year}{a.winner && <em>{a.distinction}</em>}</span>
                <b className="w5-comp">{a.competition}</b>
                <span className="w5-dist">{[a.winner ? null : a.distinction, a.category].filter(Boolean).join(' · ')}</span>
                {a.href && <span className="w5-go"><Icon id="arrow" size={16}/>{a.external ? t.officialPage : t.readMore}</span>}
              </>
            );
            return (
              <li key={a.id} className="w5-item">
                {a.href
                  ? <a className="w5-card" href={a.href} {...(a.external ? {target: '_blank', rel: 'noopener'} : {})}>{body}</a>
                  : <div className="w5-card">{body}</div>}
              </li>
            );
          })}
        </ol>
      </div>
    </section>
  );
}
