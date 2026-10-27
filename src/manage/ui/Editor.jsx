'use client';
// Editorul unei înregistrări. Câmpurile vin din registru (schema serializată pe server); salvarea trece prin store,
// care validează tot din nou. Câmpurile comune se scriu o dată; textele au câte o coloană pe limbă (§1.10).
import {useEffect, useMemo, useState} from 'react';

const LANGS = ['ro', 'en'];
const JSONISH = ['links', 'table', 'texts'];
const STATUS = [['draft', 'Ciornă'], ['published', 'Publicat'], ['archived', 'Arhivat']];

function Widget({f, value, onChange, options, lang, disabled}) {
  const id = `f-${f.key}-${lang ?? 'x'}`;
  const common = {id, disabled: disabled || f.readonly, 'aria-label': f.label};
  switch (f.type) {
    case 'textarea': return <textarea {...common} value={value ?? ''} onChange={e => onChange(e.target.value)} maxLength={f.max ?? undefined}/>;
    case 'richtext': return <textarea {...common} className="tall" value={value ?? ''} onChange={e => onChange(e.target.value)}/>;
    case 'boolean': return <label className="checks-r" style={{fontWeight: 400}}><label><input type="checkbox" {...common} checked={!!value} onChange={e => onChange(e.target.checked ? 1 : 0)}/>Da</label></label>;
    case 'select': return (
      <select {...common} value={value ?? ''} onChange={e => onChange(e.target.value || null)}>
        <option value="">—</option>{f.options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>);
    case 'multiselect': return (
      <div className="checks-r">{f.options.map(o => (
        <label key={o}><input type="checkbox" disabled={common.disabled} checked={(value ?? []).includes(o)} onChange={e => onChange(e.target.checked ? [...(value ?? []), o] : (value ?? []).filter(x => x !== o))}/>{o}</label>
      ))}</div>);
    case 'list': return <textarea {...common} value={(value ?? []).join('\n')} onChange={e => onChange(e.target.value.split('\n').map(s => s.trim()).filter(Boolean))} placeholder="câte unul pe rând"/>;
    case 'image': case 'ref': {
      const opts = options[f.target] ?? [];
      const cur = opts.find(o => o.id === value);
      const sel = <select {...common} value={value ?? ''} onChange={e => onChange(e.target.value ? Number(e.target.value) : null)}>
        <option value="">—</option>{opts.map(o => <option key={o.id} value={o.id}>{o.title} · #{o.id}</option>)}
      </select>;
      return f.type === 'image' ? <div className="img-pick">{cur?.thumb ? <img src={cur.thumb} alt=""/> : <span className="ph">fără</span>}{sel}</div> : sel;
    }
    case 'int': case 'number': case 'money':
      return <input {...common} inputMode="decimal" value={value ?? ''} onChange={e => onChange(e.target.value)}/>;
    default:
      if (JSONISH.includes(f.type)) return <JsonField common={common} value={value} onChange={onChange}/>;
      return <input {...common} type={f.type === 'email' ? 'email' : f.type === 'url' ? 'url' : 'text'} value={value ?? ''} onChange={e => onChange(e.target.value)} maxLength={f.max ?? undefined}/>;
  }
}

// Listele structurate (elementele unui meniu, etichetele unui formular) se editează ca JSON, cu verificare la tastare
function JsonField({common, value, onChange}) {
  const [txt, setTxt] = useState(() => JSON.stringify(value ?? [], null, 1));
  const [bad, setBad] = useState(false);
  return <>
    <textarea {...common} className="tall" value={txt} onChange={e => { setTxt(e.target.value); try { onChange(JSON.parse(e.target.value)); setBad(false); } catch { setBad(true); } }}/>
    {bad && <small className="err">JSON invalid: modificarea nu se trimite până nu e corect.</small>}
  </>;
}

function Links({f, items, onChange, options}) {
  const opts = options[f.target] ?? [];
  const byId = useMemo(() => new Map(opts.map(o => [o.id, o])), [opts]);
  const ids = items.map(i => i.id);
  return (
    <div className="rel">
      {items.map((it, i) => (
        <span key={it.id} className={it.status && it.status !== 'confirmed' ? 'inferred' : ''} title={it.status && it.status !== 'confirmed' ? `dedusă${it.confidence ? ` (${Math.round(it.confidence * 100)}%)` : ''}${it.note ? `: ${it.note}` : ''}` : 'confirmată'}>
          {f.target === 'media' && byId.get(it.id)?.thumb ? <img src={byId.get(it.id).thumb} alt="" style={{width: 22, height: 22, borderRadius: 4, objectFit: 'cover'}}/> : null}
          {byId.get(it.id)?.title ?? `#${it.id}`}
          {it.status && it.status !== 'confirmed' && <button type="button" title="Confirmă" onClick={() => onChange(items.map((x, k) => (k === i ? {...x, status: 'confirmed', confirm: true} : x)))}>✓</button>}
          <button type="button" title="Scoate" onClick={() => onChange(items.filter((_, k) => k !== i))}>✕</button>
        </span>
      ))}
      <select value="" onChange={e => e.target.value && onChange([...items, {id: Number(e.target.value), status: 'confirmed'}])}>
        <option value="">+ adaugă {f.label.toLowerCase()}…</option>
        {opts.filter(o => !ids.includes(o.id)).map(o => <option key={o.id} value={o.id}>{o.title}</option>)}
      </select>
    </div>
  );
}

export default function Editor({tip, schema, initial, links: initialLinks, options, status: initialStatus, hasStatus, updatedAt, approval, missing}) {
  const [base, setBase] = useState(initial.base);
  const [tr, setTr] = useState(initial.tr);
  const [links, setLinks] = useState(initialLinks);
  const [status, setStatus] = useState(initialStatus);
  const [version, setVersion] = useState(updatedAt);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [errors, setErrors] = useState({});
  const [dirty, setDirty] = useState(false);

  const kind = tip === 'sectiuni' ? base.kind : null;
  const visible = f => !f.intern && (!f.kinds || !kind || f.kinds.includes(kind));
  const common = schema.filter(f => !f.translatable && f.type !== 'refs' && visible(f));
  const texts = schema.filter(f => f.translatable && visible(f));
  const rels = schema.filter(f => f.type === 'refs' && visible(f));
  const internal = schema.filter(f => f.intern);

  const touch = fn => (...a) => { setDirty(true); setMsg(null); fn(...a); };
  const setB = touch((k, v) => setBase(b => ({...b, [k]: v})));
  const setT = touch((l, k, v) => setTr(t => ({...t, [l]: {...t[l], [k]: v}})));
  const setL = touch((k, v) => setLinks(x => ({...x, [k]: v})));

  async function save() {
    setBusy(true); setMsg(null); setErrors({});
    const body = {
      base: Object.fromEntries(common.filter(f => !f.readonly).map(f => [f.key, base[f.key]])),
      tr: Object.fromEntries(LANGS.map(l => [l, Object.fromEntries(texts.filter(f => !f.readonly).map(f => [f.key, tr[l]?.[f.key]]).filter(([k, v]) => v != null && v !== '' || (initial.tr[l]?.[k] ?? null) !== null))]).filter(([, v]) => Object.keys(v).length)),
      links: Object.fromEntries(rels.map(f => [f.key, (links[f.key] ?? []).map(i => (i.confirm ? {id: i.id, confirm: true} : i.id))])),
      status: hasStatus ? status : undefined, expectedUpdatedAt: version
    };
    const r = await fetch(`/api/manage/entities/${tip}/${initial.id}/`, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify(body)});
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) {
      setMsg({bad: true, text: j.error ?? 'Nu s-a putut salva.'});
      setErrors(Object.fromEntries((j.errors ?? []).map(e => [`${e.lang ?? ''}${e.field}`, e.message])));
      return;
    }
    setVersion(j.updated_at); setDirty(false);
    setMsg({text: j.changed?.length ? `Salvat: ${j.changed.length} ${j.changed.length === 1 ? 'modificare' : 'modificări'}. Pe site se vede imediat.${j.warnings?.length ? ' Atenție: ' + j.warnings.map(w => w.message).join(' ') : ''}` : 'Nimic de salvat.'});
    if (j.changed?.length) setTimeout(() => location.reload(), 900);
  }

  useEffect(() => {
    const k = e => { if ((e.ctrlKey || e.metaKey) && e.key === 's') { e.preventDefault(); if (!busy) save(); } };
    const leave = e => { if (dirty) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('keydown', k); window.addEventListener('beforeunload', leave);
    return () => { window.removeEventListener('keydown', k); window.removeEventListener('beforeunload', leave); };
  });

  const label = (f, lang) => (
    <label htmlFor={`f-${f.key}-${lang ?? 'x'}`}>{f.label}{f.required && <span className="req" title="obligatoriu la publicare">*</span>}
      {f.assume && <span className="tag gold" title="construit pe o presupunere încă nevalidată">{f.assume}</span>}
      {f.currency && <span className="muted small">{f.currency}</span>}</label>
  );
  const err = k => errors[k] && <small className="err">{errors[k]}</small>;

  return (
    <form onSubmit={e => { e.preventDefault(); save(); }}>
      {common.length > 0 && (
        <div className="fs">
          <h4>Comun · scris o singură dată, la fel în ambele limbi</h4>
          <div className="f2">
            {common.map(f => (
              <div key={f.key} className={`f ${errors[f.key] ? 'has-err' : ''}`} style={['richtext', 'textarea', 'links', 'table', 'multiselect', 'list'].includes(f.type) ? {gridColumn: '1 / -1'} : null}>
                {label(f)}<Widget f={f} value={base[f.key]} onChange={v => setB(f.key, v)} options={options}/>
                {f.help && <small>{f.help}</small>}{err(f.key)}
              </div>
            ))}
          </div>
        </div>
      )}
      {texts.filter(f => !f.readonly).length > 0 && (
        <div className="fs">
          <h4>Texte · câte unul pe limbă {missing.en && <span className="tag warn">EN lipsă</span>}{missing.outdated && <span className="tag warn">EN învechit: RO s-a schimbat după traducere</span>}</h4>
          {texts.filter(f => !f.readonly).map(f => (
            <div key={f.key} className="f">
              {label(f)}
              <div className="bi">
                {LANGS.map(l => (
                  <div key={l} className={errors[`${l}${f.key}`] ? 'f has-err' : ''}>
                    <span className="lh">{l.toUpperCase()}{!(tr[l]?.[f.key]) && <span className="tag grey">gol</span>}</span>
                    <Widget f={f} lang={l} value={tr[l]?.[f.key]} onChange={v => setT(l, f.key, v)} options={options}/>
                    {err(`${l}${f.key}`)}
                  </div>
                ))}
              </div>
              {f.help && <small>{f.help}</small>}
            </div>
          ))}
        </div>
      )}
      {rels.length > 0 && (
        <div className="fs">
          <h4>Legături <span className="muted" style={{textTransform: 'none', letterSpacing: 0}}>· conturul punctat = dedusă, nu apare pe site până nu e confirmată</span></h4>
          {rels.map(f => <div key={f.key} className="f">{label(f)}<Links f={f} items={links[f.key] ?? []} onChange={v => setL(f.key, v)} options={options}/>{f.help && <small>{f.help}</small>}</div>)}
        </div>
      )}
      {internal.length > 0 && (
        <div className="fs">
          <h4>Intern · doar pentru Brain</h4>
          <div className="f2">{internal.map(f => <div key={f.key} className="f"><label>{f.label}</label><input disabled value={(f.translatable ? LANGS.map(l => tr[l]?.[f.key] != null ? `${l.toUpperCase()}: ${tr[l][f.key]}` : null).filter(Boolean).join(' · ') : base[f.key]) ?? '—'}/></div>)}</div>
        </div>
      )}
      <div className="stickybar">
        {hasStatus && (
          <select value={status ?? 'draft'} onChange={e => { setDirty(true); setStatus(e.target.value); }} aria-label="Starea">
            {STATUS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        )}
        <span style={msg?.bad ? {color: 'var(--bad)'} : null}>{msg?.text ?? (dirty ? 'Modificări nesalvate · Ctrl+S' : approval ? 'Tipul cere aprobare la publicare (rolurile vin cu autentificarea).' : 'Salvarea se vede imediat pe site și intră în istoric.')}</span>
        <button type="submit" className="primary" disabled={busy}>{busy ? 'Se salvează…' : 'Salvează'}</button>
      </div>
    </form>
  );
}
