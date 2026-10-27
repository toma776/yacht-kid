// Panoul: tipurile cu cifrele lor, starea traducerilor și a provenienței, presupunerile deschise și ultimul import.
import {getDb, all, one} from '../../../core/db.mjs';
import {ENTITIES, CATEGORIES} from '../../../registry/entities.mjs';
import {ASSUMPTIONS} from '../../../registry/assumptions.mjs';
import {hasStatus, hasTranslations} from '../../../registry/derive.mjs';
import {LANGS} from '../../../registry/langs.mjs';

async function stats(db, e) {
  const total = (await one(db, `SELECT count(*) n FROM "${e.table}"`)).n;
  const published = hasStatus(e.key) ? (await one(db, `SELECT count(*) n FROM "${e.table}" WHERE status = 'published'`)).n : null;
  const tr = {};
  if (hasTranslations(e.key)) for (const l of LANGS) tr[l] = (await one(db, `SELECT count(*) n FROM "${e.table}_translations" WHERE lang = ?`, [l])).n;
  const cert = Object.fromEntries((await all(db, 'SELECT certainty, count(*) n FROM provenance WHERE entity = ? GROUP BY certainty', [e.key])).map(r => [r.certainty, r.n]));
  return {total, published, tr, cert};
}

export default async function Panou() {
  const db = await getDb();
  const rows = await Promise.all(ENTITIES.map(async e => ({e, s: await stats(db, e)})));
  const lastImport = await one(db, `SELECT * FROM change_events WHERE action = 'import' ORDER BY id DESC LIMIT 1`);
  const report = lastImport ? JSON.parse(lastImport.payload ?? '{}') : null;
  return (
    <>
      <h1>Panou</h1>
      {!lastImport && <p className="warn">Baza e goală. Rulează <code>npm run import</code>.</p>}
      {lastImport && <p className="muted">Ultimul import: {lastImport.at} · eveniment {lastImport.status === 'pending' ? 'în așteptarea primei scanări' : lastImport.status}</p>}

      <h2>Entități</h2>
      <div className="scroll"><table>
        <thead><tr><th>Tip</th><th className="num">Total</th><th className="num">Publicate</th>{LANGS.map(l => <th key={l} className="num">Traduceri {l.toUpperCase()}</th>)}<th>Proveniență</th></tr></thead>
        <tbody>{CATEGORIES.flatMap(c => rows.filter(r => r.e.category === c.key).map(({e, s}) => (
          <tr key={e.key}>
            <td><a href={`/manage/entitati/${e.key}/`}>{e.label}</a> <span className="muted">{c.label}</span></td>
            <td className="num">{s.total}</td>
            <td className="num">{s.published ?? '—'}</td>
            {LANGS.map(l => <td key={l} className={`num ${hasTranslations(e.key) && s.tr[l] < s.total ? 'warn' : ''}`}>{hasTranslations(e.key) ? s.tr[l] : '—'}</td>)}
            <td>{Object.entries(s.cert).map(([k, n]) => <span key={k} className={k === 'confirmed' ? 'ok' : k === 'unrecoverable' ? 'bad' : 'warn'}>{k} {n} </span>)}</td>
          </tr>)))}
        </tbody>
      </table></div>

      {report?.warnings?.length > 0 && <>
        <h2>Ce a semnalat importul</h2>
        <ul>{report.warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
      </>}

      <h2>Presupuneri deschise</h2>
      <table>
        <thead><tr><th>ID</th><th>Ce am presupus</th><th>Unde</th></tr></thead>
        <tbody>{ASSUMPTIONS.map(a => <tr key={a.id}><td>{a.id}</td><td>{a.assumed}</td><td><code>{a.where}</code></td></tr>)}</tbody>
      </table>
    </>
  );
}
