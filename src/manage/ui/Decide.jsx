'use client';
// Legături de verificat: bifezi perechile și le confirmi sau le scoți în masă (o tranzacție, un eveniment)
import {useState} from 'react';

export default function Decide({group}) {
  const [sel, setSel] = useState(() => new Set(group.items.map((_, i) => i)));
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const toggle = i => setSel(s => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; });
  async function decide(decision) {
    setBusy(true);
    const pairs = [...sel].map(i => [group.items[i].src_id, group.items[i].dst_id]);
    const r = await fetch(`/api/manage/inferred/${encodeURIComponent(group.relation)}/`, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify({pairs, decision})});
    const j = await r.json().catch(() => ({}));
    setBusy(false);
    if (!r.ok) return setMsg(j.error ?? 'Eroare.');
    setMsg(`${j.changed} ${decision === 'confirm' ? 'confirmate' : 'scoase (ținute minte, nu vor mai fi propuse)'}.`);
    setTimeout(() => location.reload(), 900);
  }
  return (
    <div className="tbl" style={{padding: 0}}>
      {group.items.map((it, i) => (
        <label key={`${it.src_id}-${it.dst_id}`} className="lv-item">
          <input type="checkbox" checked={sel.has(i)} onChange={() => toggle(i)}/>
          <span><a href={`/manage/entitati/${group.source}/${it.src_id}/`}>{it.srcTitle}</a> <span className="muted">{group.verb}</span> <a href={`/manage/entitati/${group.target}/${it.dst_id}/`}>{it.dstTitle}</a><small>{it.note}</small></span>
          <span className="conf">{it.confidence != null ? `${Math.round(it.confidence * 100)}%` : '—'}</span>
        </label>
      ))}
      <div className="toolbar" style={{padding: '10px 12px', margin: 0, borderTop: '1px solid var(--line)'}}>
        <span className="grow muted small">{msg ?? `${sel.size} selectate`}</span>
        <button className="danger" disabled={busy || !sel.size} onClick={() => decide('dismiss')}>Scoate</button>
        <button className="primary" disabled={busy || !sel.size} onClick={() => decide('confirm')}>Confirmă</button>
      </div>
    </div>
  );
}
