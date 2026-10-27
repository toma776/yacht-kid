// Branding › Logo (paginile 2–4): principiul, cele trei elemente și versiunile pozitiv / negativ.
import {LOGO, BRANDBOOK} from '../../../../../manage/brand.mjs';

export default function Logo() {
  return (
    <>
      <section>
        <h2>Principiul</h2>
        {LOGO.principiu.map((p, i) => <blockquote key={i} className="bb-quote"><q>{p.en}</q><span>{p.ro}</span></blockquote>)}
      </section>
      <section>
        <h2>Cele trei elemente <span className="n">pagina 3</span></h2>
        <div className="bb-formula">
          {LOGO.elemente.map((e, i) => (
            <div key={e.nume} style={{display: 'contents'}}>
              {i > 0 && <i aria-hidden="true">+</i>}
              <figure><img src={e.img} alt={e.nume}/><figcaption>{e.nume}</figcaption></figure>
            </div>
          ))}
        </div>
        <blockquote className="bb-quote"><q>{LOGO.intro.en}</q><span>{LOGO.intro.ro}</span></blockquote>
        {LOGO.elemente.map(e => <blockquote key={e.nume} className="bb-quote"><q>{e.en}</q><span>{e.ro}</span></blockquote>)}
      </section>
      <section>
        <h2>Versiunile principale</h2>
        <div className="bb-logos">
          {LOGO.versiuni.map(v => (
            <div key={v.nume} className="bb-logo">
              <div className="stage" style={{background: v.fundal}}><img src={v.img} alt={`Logo YACHT KID, ${v.nume.toLowerCase()}`}/></div>
              <div className="cap"><b>{v.nume}<a className="btn sm" href={v.img} download>Descarcă PNG</a></b><span>{v.descriere}</span></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Construcția <span className="n">observat din desen</span></h2>
        <div className="card"><ul style={{margin: 0, paddingLeft: 18, display: 'grid', gap: 4}}>{LOGO.constructie.map(c => <li key={c}>{c}</li>)}</ul></div>
      </section>
      <section>
        <h2>Paginile din brandbook</h2>
        <div className="bb-pages">{[2, 3, 4].map(n => <a key={n} className="bb-page" href={BRANDBOOK.img(n)} target="_blank" rel="noopener"><img src={BRANDBOOK.img(n)} alt={`Pagina ${n}`} loading="lazy"/>Pagina {n}</a>)}</div>
      </section>
    </>
  );
}
