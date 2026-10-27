// Media: biblioteca, cu textul alternativ pe fiecare limbă (o imagine, două texte, §1.10).
import {getDb} from '../../../../core/db.mjs';
import {mediaItems, mediaUrl} from '../../../../manage/data.mjs';
import ListFilter from '../../../../manage/ui/ListFilter.jsx';

const FILTERS = [['', 'Toate'], ['exterior', 'Foto exterior'], ['interior', 'Foto interior'], ['fara-alt', 'Fără alt RO'], ['fara-alt-en', 'Fără alt EN'], ['fara-etichete', 'Fără etichete'], ['video', 'Video și documente']];

export default async function Media({searchParams}) {
  const {f = ''} = await searchParams;
  const all = (await mediaItems(await getDb())).map(m => ({...m, tags: m.tags ? JSON.parse(m.tags) : []}));
  const isImg = m => m.mime.startsWith('image/');
  const PRED = {'': () => true, 'fara-alt': m => isImg(m) && !m.alt_ro, 'fara-alt-en': m => isImg(m) && !m.alt_en, video: m => !isImg(m),
    exterior: m => m.tags.includes('exterior'), interior: m => m.tags.includes('interior'), 'fara-etichete': m => isImg(m) && !m.tags.length};
  const items = all.filter(PRED[f] ?? PRED['']);
  return (
    <>
      <div className="head"><div><div className="crumb"><a href="/manage/">manage</a></div><h1>Media <span className="muted small" style={{fontWeight: 400}}><span id="list-count">{items.length}</span> din {all.length}</span></h1></div><ListFilter placeholder="Caută după nume, etichete sau descriere…"/></div>
      <div className="pills">{FILTERS.map(([k, l]) => <a key={k} href={`?f=${k}`} className={f === k ? 'on' : ''}>{l} · {all.filter(PRED[k]).length}</a>)}</div>
      <div className="media-grid">
        {items.map(m => (
          <a key={m.id} className="media-card" href={`/manage/entitati/media/${m.id}/`} data-search={`${m.filename} ${m.alt_ro ?? ''} ${m.alt_en ?? ''} ${m.tags.join(' ')} ${m.description_ro ?? ''}`}>
            {isImg(m) ? <img src={mediaUrl(m.id)} alt={m.alt_ro ?? ''} title={m.description_ro ?? undefined} loading="lazy"/> : <span className="ph">{m.mime.split('/')[1]?.toUpperCase()}</span>}
            <div>
              <b title={m.filename}>{m.filename.split('/').pop()}</b>
              <span>{m.width && m.height ? `${m.width}×${m.height} · ` : ''}{m.bytes ? `${Math.round(m.bytes / 1024)} KB` : ''}</span>
              {isImg(m) && <span className="lang"><span className={m.alt_ro ? '' : 'off'} title={m.alt_ro ?? 'fără text alternativ'}>RO</span><span className={m.alt_en ? '' : 'off'} title={m.alt_en ?? 'fără text alternativ'}>EN</span></span>}
              {m.tags.length > 0 && <span className="tags">{m.tags.slice(0, 6).map(t => <i key={t}>{t}</i>)}</span>}
            </div>
          </a>
        ))}
      </div>
    </>
  );
}
