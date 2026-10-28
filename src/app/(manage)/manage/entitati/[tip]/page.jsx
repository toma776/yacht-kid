// Lista unui tip: rânduri cu imagine, titlul în RO și EN, starea, limbile, legăturile de verificat.
// Filtrele (?f=) sunt cele din „De făcut”: ciorne, fără EN, traduceri învechite, de verificat.
import {notFound} from 'next/navigation';
import {getDb} from '../../../../../core/db.mjs';
import {entity, hasStatus, hasTranslations, outgoingRelations, inverseRelations} from '../../../../../registry/derive.mjs';
import {CATEGORIES} from '../../../../../registry/entities.mjs';
import {listRows} from '../../../../../manage/data.mjs';
import ListFilter from '../../../../../manage/ui/ListFilter.jsx';
import NewButton from '../../../../../manage/ui/NewButton.jsx';
import Approve from '../../../../../manage/ui/Approve.jsx';

const FILTERS = [['', 'Toate'], ['de-aprobat', 'De aprobat'], ['publicate', 'Publicate'], ['ciorne', 'Ciorne'], ['fara-en', 'Fără EN'], ['invechite', 'EN învechit'], ['de-verificat', 'De verificat']];
const STATUS = {published: 'publicat', draft: 'ciornă', archived: 'arhivat'};
const initials = s => String(s ?? '?').replace(/[^\p{L}\p{N} ]/gu, '').split(/\s+/).filter(Boolean).map(x => x[0]).slice(0, 2).join('').toUpperCase();

export default async function Lista({params, searchParams}) {
  const {tip} = await params;
  const {f = ''} = await searchParams;
  const e = entity(tip);
  if (!e) notFound();
  const db = await getDb();
  const all = await listRows(db, tip);
  const PRED = {
    '': () => true, 'de-aprobat': r => r.pending, publicate: r => r.status === 'published', ciorne: r => r.status === 'draft',
    'fara-en': r => r.langs && !r.langs.includes('en'), invechite: r => r.outdated, 'de-verificat': r => r.inferred > 0
  };
  const rows = all.filter(PRED[f] ?? PRED['']);
  // Doar filtrele care au sens pentru tip și au cel puțin un rând
  const filters = FILTERS.map(([k, l]) => [k, l, all.filter(PRED[k]).length]).filter(([k, , n]) => !k || n);
  const rels = [...outgoingRelations(tip), ...inverseRelations(tip)].filter(r => r.target !== 'media' || r.cardinality === 'M:N');
  const canCreate = e.creatable !== false && !e.singleton;
  return (
    <>
      <div className="head">
        <div><div className="crumb"><a href="/manage/">manage</a> › <a href="/manage/entitati/">entități</a> › {CATEGORIES.find(c => c.key === e.category)?.label}</div>
          <h1><span style={{width: 12, height: 12, borderRadius: 4, background: e.color, display: 'inline-block'}}/>{e.label} <span className="muted small" style={{fontWeight: 400}}><span id="list-count">{rows.length}</span> din {all.length}</span></h1></div>
        <ListFilter placeholder={`Caută în ${e.label.toLowerCase()}…`}/>
        {canCreate && <NewButton tip={tip} label={`+ ${e.one}`}/>}
      </div>
      <p className="lead">
        Tabel <code>{e.table}</code>{hasTranslations(tip) && <> · texte în <code>{e.table}_translations</code> (RO, EN)</>}
        {e.approval && ' · publicarea cere aprobare'}{e.operational && ' · date de lucru'}
        {rels.length > 0 && <> · legat de {rels.map(r => entity(r.source === tip ? r.target : r.source).label.toLowerCase()).filter((x, i, a) => a.indexOf(x) === i).join(', ')}</>}
      </p>
      {filters.length > 1 && <div className="pills">{filters.map(([k, l, n]) => <a key={k} href={`?f=${k}`} className={f === k ? 'on' : ''}>{l} · {n}</a>)}</div>}
      <div className="rows">
        {rows.map(r => (
          <a key={r.id} className="row" href={`/manage/entitati/${tip}/${r.id}/`} data-search={`${r.title} ${r.titleEn ?? ''} ${r.meta.join(' ')} ${r.id}`}>
            {r.thumb ? <img className="av" src={r.thumb} alt="" loading="lazy"/> : <span className="av" style={{background: `color-mix(in srgb, ${e.color} 16%, var(--panel))`, color: e.color}}>{initials(r.title)}</span>}
            <div style={{minWidth: 0}}>
              <h3>{r.title}</h3>
              <div className="meta">
                {r.titleEn && r.titleEn !== r.title ? <>EN: {r.titleEn}{r.meta.length ? ' · ' : ''}</> : null}{r.meta.join(' · ')}
                {r.paths?.ro && <> · <span className="muted">{r.paths.ro}</span></>}
              </div>
            </div>
            <div className="acts">
              {r.inferred ? <span className="tag gold">{r.inferred} de verificat</span> : null}
              {r.langs && <span className="lang">{['ro', 'en'].map(l => <span key={l} className={!r.langs.includes(l) ? 'off' : l === 'en' && r.outdated ? 'old' : ''} title={!r.langs.includes(l) ? 'fără traducere' : l === 'en' && r.outdated ? 'traducere învechită' : 'tradus'}>{l.toUpperCase()}</span>)}</span>}
              {r.pending ? <><span className="tag gold">trimis din site</span><Approve tip={tip} id={r.id} set={e.approve.set}/></> : r.status && <span className={`st ${r.status}`}>{STATUS[r.status]}</span>}
            </div>
          </a>
        ))}
        {!rows.length && <div className="card empty"><b>Nimic aici</b>{f ? 'Niciun rând nu se potrivește filtrului.' : `${e.label}: nicio înregistrare încă.`}</div>}
      </div>
    </>
  );
}
