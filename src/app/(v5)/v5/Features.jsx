// Avantajele v5: bandă navy. Titlul sus; dedesubt fotografia secțiunii în stânga (alunecă ușor în cadru la derulare)
// și avantajele în dreapta, ca o grilă 2 × 2 despărțită de linii fine: pictogramă, număr, titlu, explicație.
// Pe mobil, fotografia și apoi lista.
import {Icon} from '../../../site/ui/Icons.jsx';

const num = i => String(i + 1).padStart(2, '0');

export default function Features({data}) {
  if (!data?.items.length) return null;
  return (
    <section className="a5" id={data.anchor} aria-labelledby="a5-title">
      <div className="h5-wrap">
        <header className="a5-head">
          <p className="v5-eyebrow a5-eyebrow">{data.eyebrow}</p>
          <h2 className="a5-title" id="a5-title" data-rv>{data.heading}</h2>
          {data.text && <p className="a5-lead">{data.text}</p>}
        </header>
        <div className="a5-grid">
          {data.image && (
            <figure className="a5-fig" data-rv>
              <img src={data.image.src} srcSet={data.image.srcSet} sizes="(max-width: 1023px) 100vw, 42vw" alt="" loading="lazy" decoding="async" data-px="44"/>
            </figure>
          )}
          <ul className="a5-list" data-rv>
            {data.items.map((f, i) => (
              <li key={f.id} className="a5-item">
                <span className="a5-ic"><Icon id={f.icon} size={30}/></span>
                <span className="a5-num">{num(i)}</span>
                <h3 className="a5-item-title">{f.title}</h3>
                {f.text && <p className="a5-item-text">{f.text}</p>}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
