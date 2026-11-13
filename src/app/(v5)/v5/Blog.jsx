// Blogul v5: titlul și „toate articolele” sus; dedesubt cel mai nou articol, mare, în stânga, și următoarele trei ca
// rânduri cu miniatură în dreapta. Pe mobil, articolul mare și apoi rândurile.
import {Icon} from '../../../site/ui/Icons.jsx';

export default function Blog({data, t}) {
  if (!data?.items.length) return null;
  const [first, ...rest] = data.items;
  const meta = p => (
    <span className="b5-meta">
      {p.category && <span className="b5-cat">{p.category}</span>}
      {p.date && <time dateTime={p.iso}>{p.date}</time>}
    </span>
  );
  return (
    <section className="b5" id={data.anchor} aria-labelledby="b5-title">
      <div className="h5-wrap">
        <header className="b5-head">
          <div>
            <p className="v5-eyebrow">{data.eyebrow}</p>
            <h2 className="b5-title" id="b5-title">{data.heading}</h2>
          </div>
          {data.all && <a className="b5-all" href={data.all}>{t.allPosts} <Icon id="arrow" size={16}/></a>}
        </header>

        <div className="b5-grid">
          <a className="b5-feature" href={first.href}>
            <span className="b5-feature-img">{first.image && <img src={first.image.src} srcSet={first.image.srcSet} sizes="(max-width: 1023px) 100vw, 55vw" alt="" loading="lazy" decoding="async"/>}</span>
            {meta(first)}
            <h3 className="b5-feature-title">{first.title}</h3>
            <span className="b5-read">{t.readPost} <Icon id="arrow" size={16}/></span>
          </a>
          {rest.length > 0 && (
            <ul className="b5-list">
              {rest.map(p => (
                <li key={p.id}><a className="b5-row" href={p.href}>
                  <span className="b5-row-img">{p.image && <img src={p.image.src} srcSet={p.image.srcSet} sizes="160px" alt="" loading="lazy" decoding="async"/>}</span>
                  <span className="b5-row-text">{meta(p)}<b>{p.title}</b></span>
                </a></li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
