// Branding › Variante de logo (paginile 5–7): A–F, fiecare pe fond închis și pe fond deschis.
import {VARIANTE, BRANDBOOK} from '../../../../../manage/brand.mjs';

export default function Variante() {
  return (
    <>
      <p className="lead" style={{marginTop: 0}}>Brandbook-ul prezintă șase variante, notate A–F, fiecare pe navy (pagina 6) și pe alb (pagina 7). Nu spune când se folosește fiecare; descrierile de mai jos sunt observate din desen.</p>
      <div className="bb-variants">
        {VARIANTE.map(v => (
          <div key={v.id} className={`bb-var ${v.principal ? 'is-main' : ''}`}>
            <div className="pair">
              <div><img src={v.negativ} alt={`Varianta ${v.id}, negativ`} loading="lazy"/></div>
              <div><img src={v.pozitiv} alt={`Varianta ${v.id}, pozitiv`} loading="lazy"/></div>
            </div>
            <div className="cap">
              <b><span className="bb-letter">{v.id}</span>Varianta {v.id}{v.principal && <span className="tag ok">principală</span>}</b>
              <span>{v.descriere}</span>
              <span><a href={v.negativ} download>PNG negativ</a> · <a href={v.pozitiv} download>PNG pozitiv</a></span>
            </div>
          </div>
        ))}
      </div>
      <section style={{marginTop: 22}}>
        <h2>Paginile din brandbook</h2>
        <div className="bb-pages">{[5, 6, 7].map(n => <a key={n} className="bb-page" href={BRANDBOOK.img(n)} target="_blank" rel="noopener"><img src={BRANDBOOK.img(n)} alt={`Pagina ${n}`} loading="lazy"/>Pagina {n}</a>)}</div>
      </section>
    </>
  );
}
