// Legături de verificat (§2.5): relațiile deduse, grupate pe relație, ordonate după încredere, cu recomandare.
import {getDb} from '../../../../../core/db.mjs';
import {entity} from '../../../../../registry/derive.mjs';
import {legaturiDeVerificat} from '../../../../../manage/data.mjs';
import Decide from '../../../../../manage/ui/Decide.jsx';

export default async function Legaturi() {
  const groups = await legaturiDeVerificat(await getDb());
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  return (
    <>
      <div className="head"><div><div className="crumb"><a href="/manage/">manage</a> › surse</div><h1>Legături de verificat <span className="muted small" style={{fontWeight: 400}}>{total}</span></h1></div></div>
      <p className="lead">Legăturile propuse de import, cu dovada lor. Nu apar pe site până nu le confirmă un om. Ce scoți se ține minte și nu mai e propus din aceeași dovadă.</p>
      {!groups.length && <div className="card empty"><b>Nimic de verificat</b>Toate legăturile sunt confirmate.</div>}
      {groups.map(g => (
        <section key={g.relation} className="lv-group">
          <h2>{entity(g.source).label} <span className="muted" style={{fontWeight: 400}}>{g.verb}</span> {entity(g.target).label} <span className="n">{g.items.length}</span>
            <span className={`tag ${g.recommendation === 'confirmă' ? 'ok' : 'warn'}`}>recomandare: {g.recommendation}</span></h2>
          <Decide group={g}/>
        </section>
      ))}
    </>
  );
}
