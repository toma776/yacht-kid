'use client';
// „+ Tip nou”: creează o ciornă goală și deschide fișa ei
import {useState} from 'react';

export default function NewButton({tip, label}) {
  const [busy, setBusy] = useState(false);
  async function create() {
    setBusy(true);
    const r = await fetch(`/api/manage/entities/${tip}/`, {method: 'POST', headers: {'content-type': 'application/json'}, body: '{}'});
    const j = await r.json().catch(() => ({}));
    if (r.ok) location.href = `/manage/entitati/${tip}/${j.id}/`;
    else { setBusy(false); alert(j.error ?? 'Nu s-a putut crea.'); }
  }
  return <button className="primary" onClick={create} disabled={busy}>{busy ? 'Se creează…' : label}</button>;
}
