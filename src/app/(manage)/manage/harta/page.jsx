// Harta legăturilor (§2.4), nivelul tipurilor: coloane pe categorie, curbe între tipuri, grosime ∝ √n.
// Sub ea: sănătatea hărții și tabelul „Toate legăturile”. Totul vine din registru și din numărătorile reale.
import {getDb} from '../../../../core/db.mjs';
import {CATEGORIES} from '../../../../registry/entities.mjs';
import {entity} from '../../../../registry/derive.mjs';
import {graphOverview} from '../../../../manage/data.mjs';

const W = 1100, COL = W / CATEGORIES.length, BOX_W = 170, BOX_H = 46, GAP = 16, TOP = 50;

export default async function Harta() {
  const db = await getDb();
  const {nodes, edges, health} = await graphOverview(db);
  const pos = {};
  let H = 0;
  CATEGORIES.forEach((c, ci) => {
    nodes.filter(n => n.category === c.key).forEach((n, i) => {
      pos[n.key] = {x: ci * COL + (COL - BOX_W) / 2, y: TOP + i * (BOX_H + GAP)};
      H = Math.max(H, pos[n.key].y + BOX_H + 30);
    });
  });
  const curve = e => {
    const a = pos[e.source], b = pos[e.target];
    if (e.source === e.target) return `M${a.x + BOX_W} ${a.y + 12} c40 -20 40 40 0 20`;
    const [ax, bx] = a.x <= b.x ? [a.x + BOX_W, b.x] : [a.x, b.x + BOX_W];
    const ay = a.y + BOX_H / 2, by = b.y + BOX_H / 2;
    if (Math.abs(a.x - b.x) < 1) { const x = a.x + BOX_W; return `M${x} ${ay} C${x + 60} ${ay}, ${x + 60} ${by}, ${x} ${by}`; }
    const mx = (ax + bx) / 2;
    return `M${ax} ${ay} C${mx} ${ay}, ${mx} ${by}, ${bx} ${by}`;
  };
  const shown = edges.filter(e => !(e.target === 'media' && e.cardinality === 'N:1'));
  return (
    <>
      <div className="head"><div><div className="crumb"><a href="/manage/">manage</a></div><h1>Harta legăturilor</h1></div></div>
      <p className="lead">Tipurile din registru, pe categorii, și relațiile dintre ele cu numărul real de legături. Grosimea crește cu √n; punctat auriu = legături deduse de verificat; punctat șters = relație declarată, dar nefolosită. Clic pe un tip deschide lista lui.</p>
      <div className="map">
        <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Harta tipurilor și a legăturilor">
          {CATEGORIES.map((c, ci) => <text key={c.key} className="m-h" x={ci * COL + COL / 2} y={28} textAnchor="middle">{c.label}</text>)}
          {shown.map(e => (
            <path key={e.id} d={curve(e)} className={`m-l ${e.pending ? 'pending' : ''} ${e.n ? '' : 'empty'}`} strokeWidth={Math.max(1, Math.sqrt(e.n) * 0.9)}>
              <title>{`${entity(e.source).label} → ${entity(e.target).label}: ${e.verb ?? ''} · ${e.n} legături${e.pending ? ` (${e.pending} de verificat)` : ''}`}</title>
            </path>
          ))}
          {nodes.map(n => pos[n.key] && (
            <a key={n.key} href={`/manage/entitati/${n.key}/`} className="m-n">
              <rect x={pos[n.key].x} y={pos[n.key].y} width={BOX_W} height={BOX_H} rx={10}/>
              <rect x={pos[n.key].x} y={pos[n.key].y} width={4} height={BOX_H} rx={2} fill={n.color} stroke="none"/>
              <text x={pos[n.key].x + 14} y={pos[n.key].y + 20}>{n.label.length > 22 ? `${n.label.slice(0, 21)}…` : n.label}</text>
              <text className="c" x={pos[n.key].x + 14} y={pos[n.key].y + 36}>{n.n} înregistrări</text>
            </a>
          ))}
        </svg>
      </div>
      <div className="legend"><span><i/>legături confirmate</span><span><i className="p"/>cu legături deduse de verificat</span><span>Imaginile (chei străine spre media) nu sunt desenate, ca harta să rămână lizibilă.</span></div>

      <section>
        <h2>Sănătatea hărții</h2>
        <div className="grid2">
          <div className="card"><h3>Tipuri izolate <span className="muted small">· {health.isolated.length}</span></h3><p>{health.isolated.join(', ') || 'Niciunul.'}</p></div>
          <div className="card"><h3>Relații declarate, nefolosite <span className="muted small">· {health.unused.length}</span></h3><p>{health.unused.map(x => <code key={x} style={{marginRight: 4}}>{x}</code>)}{!health.unused.length && 'Niciuna.'}</p></div>
          <div className="card"><h3>Relații obligatorii goale</h3><p>{health.emptyRequired.join(', ') || 'Niciuna. Toate articolele au categorie.'}</p></div>
          <div className="card"><h3>Legături de verificat</h3><p><a href="/manage/surse/legaturi/">{health.pending} legături deduse →</a></p></div>
        </div>
      </section>

      <section>
        <h2>Toate legăturile <span className="n">{edges.length}</span></h2>
        <div className="tbl"><table>
          <thead><tr><th>Relația</th><th>De la</th><th>Spre</th><th>Fel</th><th>Unde e stocată</th><th className="num">Legături</th><th className="num">De verificat</th></tr></thead>
          <tbody>{edges.map(e => (
            <tr key={e.id}>
              <td>{e.verb ?? '—'} <span className="muted small">/ {e.inverseLabel}</span></td>
              <td><a href={`/manage/entitati/${e.source}/`}>{entity(e.source).label}</a></td><td><a href={`/manage/entitati/${e.target}/`}>{entity(e.target).label}</a></td>
              <td>{e.cardinality}{e.required ? ' · obligatorie' : ''}{e.owned ? ' · deținută' : ''}</td><td><code>{e.storage}</code></td>
              <td className="num">{e.n}</td><td className="num">{e.pending || ''}</td>
            </tr>))}
          </tbody>
        </table></div>
      </section>
    </>
  );
}
