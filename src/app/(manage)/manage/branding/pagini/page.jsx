// Branding › Toate paginile: brandbook-ul complet, pagină cu pagină, cu capitolul fiecăreia.
import {BRANDBOOK, SECTIUNI} from '../../../../../manage/brand.mjs';

export default function Pagini() {
  const capitol = n => SECTIUNI.find(s => s.pagini.includes(n));
  return (
    <div className="bb-pages">
      {Array.from({length: BRANDBOOK.pagini}, (_, i) => i + 1).map(n => (
        <a key={n} className="bb-page" href={capitol(n)?.slug ? `/manage/branding/${capitol(n).slug}/` : BRANDBOOK.img(n)}>
          <img src={BRANDBOOK.img(n)} alt={`Pagina ${n}`} loading="lazy"/>
          <span><b>{n}</b> · {capitol(n)?.titlu}</span>
        </a>
      ))}
    </div>
  );
}
