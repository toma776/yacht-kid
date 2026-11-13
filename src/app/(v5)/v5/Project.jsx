// Proiectul v5: un capitol editorial. Sus, titlul și citatul; apoi trei capitole numerotate, fotografia și textul
// alternând stânga/dreapta (fotografia alunecă ușor în cadru la derulare, cu cifra capitolului pe ea); jos, paginile
// proiectului.
import {Icon} from '../../../site/ui/Icons.jsx';

const num = i => String(i + 1).padStart(2, '0');

export default function Project({data, t}) {
  if (!data) return null;
  return (
    <section className="p5" id={data.anchor} aria-labelledby="p5-title">
      <div className="h5-wrap p5-body">
        <header className="p5-head" data-rv>
          <p className="v5-eyebrow">{data.eyebrow}</p>
          <h2 className="p5-title" id="p5-title">{data.heading}</h2>
          {data.quote && <blockquote className="p5-quote"><p>{data.quote}</p></blockquote>}
        </header>

        <ol className="p5-chapters">
          {data.chapters.map((c, i) => (
            <li key={c.title} className="p5-ch" data-rv>
              {c.image && (
                <figure className="p5-fig">
                  <div className="p5-frame">
                    <img src={c.image.src} srcSet={c.image.srcSet} sizes="(max-width: 1023px) 100vw, 55vw" alt={c.image.alt} loading="lazy" decoding="async" data-px="28"/>
                  </div>
                  {c.stat && (
                    <figcaption className="p5-stat">
                      {c.stat.value && <b>{c.stat.value}</b>}
                      <span>{c.stat.label}</span>
                    </figcaption>
                  )}
                </figure>
              )}
              <div className="p5-text">
                <span className="p5-num">{num(i)} / {num(data.chapters.length - 1)}</span>
                <h3 className="p5-ch-title">{c.title}</h3>
                {c.text.map((p, j) => <p key={j}>{p}</p>)}
                {i === data.chapters.length - 1 && data.cta && (
                  <a className="v5-btn" href={data.cta.href}>{data.cta.label} <Icon id="arrow" size={16}/></a>
                )}
              </div>
            </li>
          ))}
        </ol>

        {data.pages.length > 0 && (
          <nav className="p5-pages" aria-label={t.projectPages} data-rv>
            <ul>
              {data.pages.map(p => (
                <li key={p.href}><a className="p5-page" href={p.href}>
                  <span className="p5-page-ic"><Icon id={p.icon ?? 'arrow'} size={26}/></span>
                  <span className="p5-page-text"><b>{p.label}</b>{p.desc && <small>{p.desc}</small>}</span>
                  <Icon id="arrow" size={18} className="p5-page-go"/>
                </a></li>
              ))}
            </ul>
          </nav>
        )}
      </div>
    </section>
  );
}
