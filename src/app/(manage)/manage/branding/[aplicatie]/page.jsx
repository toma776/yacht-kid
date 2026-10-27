// Branding › Aplicații (paginile 10–25): semnalistică, papetărie, outdoor, digital. O rută pe capitol.
import {notFound} from 'next/navigation';
import {APLICATII, BRANDBOOK, sectiune} from '../../../../../manage/brand.mjs';

export const generateStaticParams = () => Object.keys(APLICATII).map(aplicatie => ({aplicatie}));
export const dynamicParams = false;

export default async function Aplicatie({params}) {
  const {aplicatie} = await params;
  const a = APLICATII[aplicatie];
  if (!a) notFound();
  return (
    <>
      <p className="lead" style={{marginTop: 0}}>{a.intro}</p>
      <div className="bb-apps">
        {a.pagini.map(p => (
          <div key={p.n} className="bb-app">
            <a href={BRANDBOOK.img(p.n)} target="_blank" rel="noopener"><img src={BRANDBOOK.img(p.n)} alt={`${sectiune(aplicatie).titlu}: ${p.titlu}`} loading="lazy"/></a>
            <div>
              <h3>{p.titlu} <span className="muted small">pagina {p.n}</span></h3>
              <ul>{p.detalii.map(d => <li key={d}>{d}</li>)}</ul>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
