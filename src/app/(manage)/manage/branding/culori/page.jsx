// Branding › Culori (pagina 8): paleta primară, paleta secundară în perechi, gradientele Bronze și Gold.
import {CULORI, BRANDBOOK} from '../../../../../manage/brand.mjs';
import CopyCode from '../../../../../manage/ui/CopyCode.jsx';

const light = hex => { const n = parseInt(hex.slice(1), 16); return ((n >> 16) * 299 + ((n >> 8) & 255) * 587 + (n & 255) * 114) / 1000 > 160; };
const rgbCss = rgb => `rgb(${rgb.split(' ').join(', ')})`;

export default function Culori() {
  return (
    <>
      <section>
        <h2>Paleta primară</h2>
        <div className="bb-swatches">
          {CULORI.primare.map(c => (
            <div key={c.hex} className="bb-sw">
              <div className="chip big" style={{background: c.hex, color: light(c.hex) ? '#24262e' : '#fff'}}>RGB: {c.rgb}<br/>HEX: {c.hex}</div>
              <div className="cap"><b>{c.nume}</b><span>{c.rol}</span><div className="bb-codes"><CopyCode value={c.hex}/><CopyCode value={rgbCss(c.rgb)}/></div></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Paleta secundară <span className="n">în perechi: tonul de bază și tonul deschis</span></h2>
        <div className="bb-swatches">
          {CULORI.secundare.map(g => (
            <div key={g.nume} className="bb-sw bb-pair">
              <div className="chips">{g.culori.map(c => <div key={c.hex} className="chip" style={{background: c.hex, color: light(c.hex) ? '#24262e' : '#fff'}}>RGB: {c.rgb} · HEX: {c.hex}</div>)}</div>
              <div className="cap"><b>{g.nume}</b><span>{g.rol}</span><div className="bb-codes">{g.culori.map(c => <CopyCode key={c.hex} value={c.hex}/>)}</div></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Gradiente <span className="n">brandbook-ul le arată fără coduri; valorile sunt măsurate din PDF</span></h2>
        <div className="bb-swatches">
          {CULORI.gradiente.map(g => (
            <div key={g.nume} className="bb-sw">
              <div className="bb-grad" style={{background: `linear-gradient(135deg, ${g.de}, ${g.la})`}}/>
              <div className="cap"><b>{g.nume}</b><div className="bb-codes"><CopyCode value={g.de}/><CopyCode value={g.la}/><CopyCode value={`linear-gradient(135deg, ${g.de}, ${g.la})`}/></div></div>
            </div>
          ))}
        </div>
      </section>
      <section>
        <h2>Pagina din brandbook</h2>
        <div className="bb-pages"><a className="bb-page" href={BRANDBOOK.img(8)} target="_blank" rel="noopener"><img src={BRANDBOOK.img(8)} alt="Pagina 8" loading="lazy"/>Pagina 8 · fundalul paginilor: {CULORI.fundalBrandbook}</a></div>
      </section>
    </>
  );
}
