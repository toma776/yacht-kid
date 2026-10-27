// Lista unui tip: titlul în fiecare limbă, starea și traducerile lipsă (§1.10: traducerea lipsă se vede pe entitate).
import {notFound} from 'next/navigation';
import {getDb, all} from '../../../../../core/db.mjs';
import {entity, hasStatus, hasTranslations, field, outgoingRelations, inverseRelations} from '../../../../../registry/derive.mjs';
import {columnOf} from '../../../../../core/schema.mjs';
import {LANGS} from '../../../../../registry/langs.mjs';

export default async function Lista({params}) {
  const {tip} = await params;
  const e = entity(tip);
  if (!e) notFound();
  const db = await getDb();
  const titleField = field(tip, e.title);
  const tr = hasTranslations(tip);
  const titles = {};
  if (tr && titleField.translatable)
    for (const r of await all(db, `SELECT entity_id, lang, "${e.title}" t FROM "${e.table}_translations"`)) (titles[r.entity_id] ??= {})[r.lang] = r.t;
  const rows = await all(db, `SELECT * FROM "${e.table}" ORDER BY id`);
  const rels = [...outgoingRelations(tip), ...inverseRelations(tip)];
  return (
    <>
      <p><a href="/manage/">← Panou</a></p>
      <h1>{e.label} <span className="muted">({rows.length})</span></h1>
      <p className="muted">Tabel <code>{e.table}</code>{tr ? <> · traduceri în <code>{e.table}_translations</code></> : null}{e.approval ? ' · publicarea cere aprobare' : ''}</p>
      <div className="scroll"><table>
        <thead><tr><th>ID</th>{titleField.translatable ? LANGS.map(l => <th key={l}>{e.title} ({l.toUpperCase()})</th>) : <th>{e.title}</th>}{hasStatus(tip) && <th>Stare</th>}</tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.id}>
            <td>{r.id}</td>
            {titleField.translatable
              ? LANGS.map(l => <td key={l} className={titles[r.id]?.[l] ? '' : 'warn'}>{titles[r.id]?.[l] ?? 'fără traducere'}</td>)
              : <td>{r[columnOf(titleField)] ?? <span className="bad">gol</span>}</td>}
            {hasStatus(tip) && <td>{r.status}</td>}
          </tr>))}
        </tbody>
      </table></div>
      <h2>Relații</h2>
      <ul>{rels.map(r => <li key={r.id}><code>{r.id}</code> {r.source === tip ? `${r.verb ?? ''} → ${entity(r.target).label}` : `← ${entity(r.source).label} (${r.inverseLabel})`} <span className="muted">{r.cardinality}, {r.storage}</span></li>)}</ul>
    </>
  );
}
