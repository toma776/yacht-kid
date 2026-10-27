// Branding › Tipografie (pagina 9): Montserrat, ierarhia Headline / Sub headline / text.
import {TIPOGRAFIE, BRANDBOOK} from '../../../../../manage/brand.mjs';

export default function Tipografie() {
  const [h, sub, body] = TIPOGRAFIE.ierarhie;
  return (
    <>
      <div className="bb-type">
        <div>
          {TIPOGRAFIE.greutati.map(g => (
            <div key={g.nume}>
              <p className="fam" style={{fontWeight: g.greutate, fontSize: g.greutate === 700 ? 40 : 18}}>{TIPOGRAFIE.familie}</p>
              <p className="spec" style={{fontWeight: g.greutate}}>{g.specimen}</p>
            </div>
          ))}
        </div>
        <div>
          {[h, sub].map(l => (
            <div key={l.rol} className="bb-lvl">
              <span style={{fontWeight: l.greutate, letterSpacing: l.spatiere, color: l.culoare}}>{l.mostra}</span>
              <small style={{color: l.culoare, fontWeight: l.greutate === 700 ? 700 : 300}}>→ {l.regula}</small>
            </div>
          ))}
          <p className="body" style={{color: body.culoare}}>{body.mostra}</p>
        </div>
      </div>
      <section>
        <h2>Reguli</h2>
        <div className="tbl"><table>
          <thead><tr><th>Rol</th><th>Regula din brandbook</th><th>Greutate</th><th>Spațiere</th><th>Culoare</th></tr></thead>
          <tbody>{TIPOGRAFIE.ierarhie.map(l => (
            <tr key={l.rol}>
              <td><b>{l.rol}</b></td>
              <td>{l.regula} {l.sursa === 'observat' && <span className="tag grey">observat</span>}</td>
              <td>{l.greutate}</td>
              <td>{l.spatiere === '0' ? '0%' : '5%'}</td>
              <td><span style={{display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: l.culoare, verticalAlign: 'middle', marginRight: 6}}/>{l.culoare}</td>
            </tr>
          ))}</tbody>
        </table></div>
        <p className="muted small" style={{marginTop: 8}}>{TIPOGRAFIE.nota} Fontul e gratuit, pe Google Fonts: <a href="https://fonts.google.com/specimen/Montserrat" target="_blank" rel="noopener">Montserrat ↗</a></p>
      </section>
      <section>
        <h2>Pagina din brandbook</h2>
        <div className="bb-pages"><a className="bb-page" href={BRANDBOOK.img(9)} target="_blank" rel="noopener"><img src={BRANDBOOK.img(9)} alt="Pagina 9" loading="lazy"/>Pagina 9</a></div>
      </section>
    </>
  );
}
