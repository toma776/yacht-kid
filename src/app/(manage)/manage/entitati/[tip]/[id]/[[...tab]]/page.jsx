// Fișa unei înregistrări (Anexa C): /manage/entitati/<tip>/<id>/<tab>/ cu Detalii, Unde apare, Surse, Istoric.
import {notFound} from 'next/navigation';
import {getDb} from '../../../../../../../core/db.mjs';
import {entity, hasStatus, field} from '../../../../../../../registry/derive.mjs';
import {ASSUMPTIONS} from '../../../../../../../registry/assumptions.mjs';
import {record, fieldSchema, refOptions, provenanceOf, historyOf, whereUsed, awaitsApproval} from '../../../../../../../manage/data.mjs';
import Editor from '../../../../../../../manage/ui/Editor.jsx';
import Approve from '../../../../../../../manage/ui/Approve.jsx';

const TABS = [['', 'Detalii'], ['unde-apare', 'Unde apare'], ['surse', 'Surse'], ['istoric', 'Istoric']];
const CERT = {confirmed: ['ok', 'confirmată'], inferred: ['warn', 'dedusă'], unverified: ['bad', 'neverificată'], unrecoverable: ['bad', 'nerecuperabilă']};
const STATUS = {published: 'publicat', draft: 'ciornă', archived: 'arhivat'};
const when = s => (s ? new Date(s).toLocaleString('ro-RO', {day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'}) : '—');
const short = v => { const s = typeof v === 'string' ? v.replace(/<[^>]+>/g, ' ') : JSON.stringify(v); return s == null ? '∅' : s.length > 140 ? `${s.slice(0, 139)}…` : s; };

export default async function Fisa({params}) {
  const {tip, id, tab = []} = await params;
  const e = entity(tip);
  if (!e) notFound();
  const db = await getDb();
  const rec = await record(db, tip, Number(id));
  if (!rec) notFound();
  const t = tab[0] ?? '';
  const [prov, hist, where] = [await provenanceOf(db, tip, rec.id), await historyOf(db, tip, rec.id), await whereUsed(db, tip, rec.id)];
  const certCount = prov.reduce((a, p) => ((a[p.certainty] = (a[p.certainty] ?? 0) + 1), a), {});
  const assumptions = ASSUMPTIONS.filter(a => [].concat(e.assume ?? []).includes(a.id) || e.fields.some(f => f.assume === a.id));
  const href = x => `/manage/entitati/${tip}/${rec.id}/${x ? `${x}/` : ''}`;
  const n = {'unde-apare': where.direct.length + where.refs.length + where.mentions.length, surse: prov.length, istoric: hist.length};

  return (
    <>
      <div className="head">
        <div>
          <div className="crumb"><a href="/manage/">manage</a> › <a href="/manage/entitati/">entități</a> › <a href={`/manage/entitati/${tip}/`}>{e.label.toLowerCase()}</a> › #{rec.id}</div>
          <h1>{rec.title}{rec.status && <span className={`st ${rec.status}`}>{STATUS[rec.status]}</span>}</h1>
        </div>
        {Object.entries(rec.paths).map(([l, p]) => <a key={l} className="btn sm" href={p} target="_blank" rel="noopener">{l.toUpperCase()} {p} ↗</a>)}
        {awaitsApproval(tip, {...rec.values, status: rec.status}) && <div className="toolbar" style={{margin: 0}}><span className="tag gold">trimis din site</span><Approve tip={tip} id={rec.id} set={e.approve.set}/></div>}
      </div>
      <nav className="subtabs">{TABS.map(([k, l]) => <a key={k} href={href(k)} className={t === k ? 'on' : ''}>{l}{n[k] ? <span>{n[k]}</span> : null}</a>)}</nav>

      {t === '' && (
        <div className="split">
          <Editor tip={tip} schema={fieldSchema(tip)} initial={{id: rec.id, ...rec.values}} links={rec.links} options={await refOptions(db, tip)}
            status={rec.status} hasStatus={hasStatus(tip)} updatedAt={rec.updated_at} approval={!!e.approval}
            missing={{en: rec.langs && !rec.langs.includes('en') && e.public, outdated: rec.outdated}}/>
          <div className="aside-box">
            <div className="card">
              <h3>Pe site</h3>
              {Object.keys(rec.paths).length ? <div className="where">{Object.entries(rec.paths).map(([l, p]) => <a key={l} href={p} target="_blank" rel="noopener"><span>{l === 'ro' ? 'Română' : 'English'}</span><small>{p}</small></a>)}</div>
                : <p>{e.public ? 'Nicio pagină publicată încă (lipsește slug-ul sau traducerea).' : 'Tipul nu are pagină proprie: apare prin secțiuni, liste și trimiteri.'}</p>}
              {rec.status && rec.status !== 'published' && <p className="note warn" style={{marginTop: 8}}>Nu apare pe site: e {STATUS[rec.status]}.</p>}
            </div>
            <div className="card">
              <h3><a href={href('unde-apare')}>Unde apare →</a></h3>
              <p>{where.direct.length} legături directe · {where.refs.length} trimiteri din texte și meniuri{where.mentions.length ? ` · ${where.mentions.length} mențiuni fără legătură` : ''}</p>
            </div>
            <div className="card">
              <h3><a href={href('surse')}>Surse →</a></h3>
              <p>{Object.entries(certCount).map(([k, v]) => <span key={k} className={`tag ${CERT[k][0]}`}>{v} {CERT[k][1]}</span>)}{!prov.length && 'Nicio sursă.'}</p>
            </div>
            <div className="card small">
              <p>Creat {when(rec.created_at)} · modificat {when(rec.updated_at)}{rec.updated_by ? ` de ${rec.updated_by}` : ''}</p>
              {assumptions.map(a => <p key={a.id} className="note" style={{marginTop: 8}}><span className="tag gold">{a.id}</span> {a.assumed}</p>)}
            </div>
          </div>
        </div>
      )}

      {t === 'unde-apare' && (
        <div className="grid2">
          <section className="card">
            <h3>1 · Relații directe <span className="muted small">· {where.direct.length}</span></h3>
            {where.direct.map((d, i) => <p key={i}><span className="muted">{d.out ? d.rel : `${d.rel} ←`}</span> <a href={`/manage/entitati/${d.target}/${d.id}/`}>{d.title}</a> {d.status !== 'confirmed' && <span className="tag warn">{d.status === 'inferred' ? 'dedusă' : 'neverificată'}</span>}</p>)}
            {!where.direct.length && <p>Nicio legătură salvată.</p>}
          </section>
          <section className="card">
            <h3>2 · Trimiteri din texte și meniuri <span className="muted small">· {where.refs.length}</span></h3>
            {where.refs.map((r, i) => <p key={i}><a href={`/manage/entitati/${r.target}/${r.id}/`}>{r.title}</a> <span className="muted">· {r.field} · {r.lang.toUpperCase()}</span></p>)}
            {!where.refs.length && <p>Niciun text sau meniu nu trimite aici.</p>}
            <p className="note" style={{marginTop: 10}}>Dependențele măsurate la randare (listele, componentele comune) apar aici odată cu propagarea (§3.5).</p>
          </section>
          {where.mentions.length > 0 && (
            <section className="card">
              <h3>4 · Detectate, neverificate <span className="muted small">· {where.mentions.length}</span></h3>
              {where.mentions.map((m, i) => <p key={i}><a href={`/manage/entitati/${m.target}/${m.id}/`}>{m.title}</a> <span className="muted">· {m.evidence}</span></p>)}
            </section>
          )}
        </div>
      )}

      {t === 'surse' && (
        <div className="tbl"><table>
          <thead><tr><th>Câmp</th><th>Limbă</th><th>Certitudine</th><th>Sursa</th><th>Metoda</th><th>Fragment</th></tr></thead>
          <tbody>{prov.map((p, i) => (
            <tr key={i}>
              <td>{field(tip, p.field)?.label ?? p.field}</td><td>{p.lang ? p.lang.toUpperCase() : '—'}</td>
              <td><span className={`tag ${CERT[p.certainty][0]}`}>{CERT[p.certainty][1]}</span>{p.verified_by ? <div className="small muted">{p.verified_by}, {when(p.verified_at)}</div> : null}</td>
              <td className="small">{/^https?:/.test(p.url) ? <a href={p.url} target="_blank" rel="noopener">{p.url.replace('https://yachtkid.ro', '')}</a> : p.title ?? p.url}</td>
              <td className="small muted">{p.method}</td><td className="small">{p.excerpt ? short(p.excerpt) : ''}</td>
            </tr>))}
          </tbody>
        </table></div>
      )}

      {t === 'istoric' && (
        <div className="rows">
          {hist.map(h => {
            const ch = JSON.parse(h.changes ?? '{}');
            return (
              <div key={h.id} className="card">
                <b>{h.action}</b> <span className="muted small">· {h.user_name} · {when(h.at)}</span>
                <div className="diff">{Object.entries(ch).filter(([, v]) => Array.isArray(v)).map(([k, [a, b]]) => <div key={k}><span className="muted">{k}:</span> <del>{short(a)}</del> → <ins>{short(b)}</ins></div>)}</div>
              </div>
            );
          })}
        </div>
      )}
    </>
  );
}
