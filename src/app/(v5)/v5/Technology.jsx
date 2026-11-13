// Tehnologia v5: în stânga titlul, textul, legătura spre pagina Tehnologie și fotografia unui detaliu de fațadă; în
// dreapta cele trei avantaje ale construcției (cu explicație), apoi beneficiile de confort ca rând de pictograme.
import {Icon} from '../../../site/ui/Icons.jsx';

const num = i => String(i + 1).padStart(2, '0');

export default function Technology({data}) {
  if (!data) return null;
  return (
    <section className="t5" id={data.anchor} aria-labelledby="t5-title">
      <div className="h5-wrap t5-grid">
        <div className="t5-copy">
          <p className="v5-eyebrow">{data.eyebrow}</p>
          <h2 className="t5-title" id="t5-title">{data.heading}</h2>
          {data.paras.map((p, i) => <p key={i} className={i === 0 ? 't5-lead' : 't5-body'}>{p}</p>)}
          {data.cta && <a className="v5-btn" href={data.cta.href}>{data.cta.label} <Icon id="arrow" size={16}/></a>}
          {data.image && (
            <figure className="t5-fig">
              <img src={data.image.src} srcSet={data.image.srcSet} sizes="(max-width: 1023px) 100vw, 40vw" alt="" loading="lazy" decoding="async"/>
            </figure>
          )}
        </div>

        <div className="t5-side">
          <ol className="t5-main">
            {data.main.map((f, i) => (
              <li key={f.id} className="t5-item">
                <span className="t5-ic"><Icon id={f.icon} size={30}/></span>
                <div>
                  <span className="t5-num">{num(i)}</span>
                  <h3 className="t5-item-title">{f.title}</h3>
                  {f.text && <p className="t5-item-text">{f.text}</p>}
                </div>
              </li>
            ))}
          </ol>
          {data.comfort.length > 0 && (
            <ul className="t5-comfort">
              {data.comfort.map(f => (
                <li key={f.id}><span className="t5-c-ic"><Icon id={f.icon} size={26}/></span><span>{f.title}</span></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
