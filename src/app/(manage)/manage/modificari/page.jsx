// Modificări: istoricul editărilor din panou și starea propagării (evenimentele din change_events).
import {getDb} from '../../../../core/db.mjs';
import {entity} from '../../../../registry/derive.mjs';
import {recentChanges, eventStats, importWarnings} from '../../../../manage/data.mjs';

const when = s => new Date(s).toLocaleString('ro-RO', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'});
const short = v => { const s = typeof v === 'string' ? v.replace(/<[^>]+>/g, ' ') : JSON.stringify(v); return s == null ? '∅' : s.length > 120 ? `${s.slice(0, 119)}…` : s; };
const ACT = {update: 'editare', publish: 'publicare', status: 'stare', create: 'creare', 'link-confirm': 'legătură confirmată', 'link-dismiss': 'legătură scoasă'};

export default async function Modificari() {
  const db = await getDb();
  const [rows, ev, imp] = [await recentChanges(db), await eventStats(db), await importWarnings(db)];
  return (
    <>
      <div className="head"><div><div className="crumb"><a href="/manage/">manage</a></div><h1>Modificări</h1></div></div>
      <div className="kpis">
        {ev.map(e => <div key={e.status} className="kpi"><b>{e.n}</b><span>evenimente {e.status === 'pending' ? 'în așteptare' : e.status === 'done' ? 'propagate' : 'eșuate'}</span><small>ultimul {when(e.last)}</small></div>)}
        {imp && <div className="kpi"><b>1</b><span>import din snapshot</span><small>{when(imp.at)}</small></div>}
      </div>
      <p className="note" style={{marginBottom: 16}}>Paginile publice se randează la fiecare cerere, deci o modificare se vede imediat. Propagarea prin dependențe (§3.5) va marca evenimentele „propagate” odată cu cache-ul paginilor.</p>
      <div className="rows">
        {rows.map(r => {
          const ch = JSON.parse(r.changes ?? '{}');
          return (
            <div key={r.id} className="card">
              <b>{ACT[r.action] ?? r.action}</b> · <a href={`/manage/entitati/${r.entity}/${r.entity_id}/istoric/`}>{r.label ?? `${entity(r.entity)?.one} #${r.entity_id}`}</a>
              <span className="muted small"> · {entity(r.entity)?.label} · {r.user_name} · {when(r.at)}</span>
              <div className="diff">{Object.entries(ch).filter(([, v]) => Array.isArray(v)).slice(0, 8).map(([k, [a, b]]) => <div key={k}><span className="muted">{k}:</span> <del>{short(a)}</del> → <ins>{short(b)}</ins></div>)}</div>
            </div>
          );
        })}
        {!rows.length && <div className="card empty"><b>Nicio modificare din panou încă</b>Tot ce e în Brain vine din import. Prima salvare apare aici.</div>}
      </div>
    </>
  );
}
