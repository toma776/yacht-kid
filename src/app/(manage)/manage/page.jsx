// Panoul: cifrele, „De făcut” (§1.8), acoperirea traducerilor, tipurile de locuințe și ultimele modificări.
import {getDb, one, all} from '../../../core/db.mjs';
import {ENTITIES} from '../../../registry/entities.mjs';
import {ASSUMPTIONS} from '../../../registry/assumptions.mjs';
import {formatMoney, formatRange} from '../../../registry/langs.mjs';
import {observations, typeStats, importWarnings, recentChanges} from '../../../manage/data.mjs';

const when = s => new Date(s).toLocaleString('ro-RO', {day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'});

export default async function Panou() {
  const db = await getDb();
  const imp = await importWarnings(db);
  if (!imp) return <div className="card empty"><b>Baza e goală</b>Rulează <code>npm run import</code>.</div>;
  const [obs, changes] = [await observations(db), await recentChanges(db, 8)];
  const pub = ENTITIES.filter(e => typeof e.public?.path === 'function');
  const stats = Object.fromEntries(await Promise.all(ENTITIES.map(async e => [e.key, await typeStats(db, e.key)])));
  const units = await all(db, `SELECT u.id, u.kind, u.price_from, u.area_min, u.area_max, t.name FROM unit_types u LEFT JOIN unit_types_translations t ON t.entity_id = u.id AND t.lang = 'ro' WHERE u.status = 'published' ORDER BY u.price_from`);
  const kpi = [
    ['locuinte', 'tipuri de locuințe', `de la ${formatMoney(units[0]?.price_from, 'EUR', 'ro')}`],
    ['articole', 'articole', `${stats.articole.tr.en} și în EN`],
    ['afaceri', 'afaceri în comunitate'],
    ['premii', 'premii', `${(await one(db, `SELECT count(*) n FROM awards WHERE result != 'lista-scurta'`)).n} câștigate`],
    ['testimoniale', 'testimoniale', `${stats.testimoniale.published} publicate`],
    ['media', 'fișiere media']
  ];
  return (
    <>
      <div className="head"><div><div className="crumb">manage</div><h1>Panou</h1></div></div>
      <div className="kpis">
        {kpi.map(([k, label, sub]) => <a key={k} className="kpi" href={`/manage/entitati/${k}/`}><b>{stats[k].total}</b><span>{label}</span>{sub && <small>{sub}</small>}</a>)}
      </div>
      <div className="grid2">
        <div className="card">
          <h3>De făcut <span className="muted small">· {obs.length}</span></h3>
          {obs.map((o, i) => <div key={i} className="obs"><span className={`lvl ${o.level}`}>{o.level}</span><a href={o.href}>{o.text}</a></div>)}
        </div>
        <div className="card">
          <h3>Traduceri în engleză</h3>
          {pub.map(e => {
            const s = stats[e.key], pct = s.total ? Math.round(((s.tr.en ?? 0) / s.total) * 100) : 100;
            return (
              <div key={e.key} className="small" style={{margin: '10px 0 0'}}>
                <a href={`/manage/entitati/${e.key}/?f=fara-en`}>{e.label}</a> <span className="muted">· {s.tr.en ?? 0} din {s.total}{s.outdated.en ? ` · ${s.outdated.en} învechite` : ''}</span>
                <div className="bar"><i className={pct === 100 ? 'ok' : ''} style={{width: `${pct}%`}}/></div>
              </div>
            );
          })}
        </div>
        <div className="card">
          <h3><a href="/manage/entitati/locuinte/">Tipuri de locuințe →</a></h3>
          {units.map(u => (
            <p key={u.id}><a href={`/manage/entitati/locuinte/${u.id}/`}><b>{u.name}</b></a> · {formatRange(u.area_min, u.area_max, 'ro', 'm²')} · de la {formatMoney(u.price_from, 'EUR', 'ro')} + TVA</p>
          ))}
        </div>
        <div className="card">
          <h3><a href="/manage/modificari/">Ultimele modificări →</a></h3>
          {changes.length ? changes.map(c => (
            <p key={c.id}><a href={`/manage/entitati/${c.entity}/${c.entity_id}/istoric/`}>{c.label ?? `${c.entity} #${c.entity_id}`}</a> <span className="muted">· {c.action} · {c.user_name} · {when(c.at)}</span></p>
          )) : <p>Nicio modificare din panou încă. Tot ce e în Brain vine din importul din {when(imp.at)}.</p>}
        </div>
        <div className="card">
          <h3>Presupuneri deschise <span className="muted small">· {ASSUMPTIONS.length}</span></h3>
          {ASSUMPTIONS.filter(a => a.id.startsWith('A')).map(a => <p key={a.id}><span className="tag grey">{a.id}</span> {a.assumed}</p>)}
        </div>
        <div className="card">
          <h3>Ce a semnalat importul <span className="muted small">· {imp.warnings.length}</span></h3>
          {imp.warnings.map((w, i) => <p key={i}>{w}</p>)}
        </div>
      </div>
    </>
  );
}
