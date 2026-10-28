'use client';
// „Aprobă”: publică o ciornă venită din site (entity.approve) și aplică ce cere tipul (approve.set), apoi reîncarcă
import {useState} from 'react';

export default function Approve({tip, id, set = {}}) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState(null);
  async function approve(e) {
    e.preventDefault();
    e.stopPropagation();
    setBusy(true);
    const r = await fetch(`/api/manage/entities/${tip}/${id}/`, {method: 'PUT', headers: {'content-type': 'application/json'}, body: JSON.stringify({status: 'published', base: set})});
    const j = await r.json().catch(() => ({}));
    if (!r.ok) { setBusy(false); return setErr(j.error ?? 'Eroare.'); }
    location.reload();
  }
  return (
    <>
      {err && <span className="tag warn" title={err}>nu s-a aprobat</span>}
      <button type="button" className="primary" disabled={busy} onClick={approve}>{busy ? 'Se aprobă…' : 'Aprobă'}</button>
    </>
  );
}
