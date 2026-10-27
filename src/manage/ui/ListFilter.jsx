'use client';
// Căutarea în lista unui tip: ascunde rândurile care nu conțin textul căutat (fără diacritice)
import {useEffect, useState} from 'react';

const fold = s => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function ListFilter({placeholder = 'Caută…'}) {
  const [q, setQ] = useState('');
  useEffect(() => {
    let shown = 0;
    for (const row of document.querySelectorAll('[data-search]')) {
      const hit = !q || fold(row.dataset.search).includes(fold(q));
      row.hidden = !hit;
      if (hit) shown++;
    }
    const c = document.getElementById('list-count');
    if (c) c.textContent = String(shown);
  }, [q]);
  return <input type="search" value={q} onChange={e => setQ(e.target.value)} placeholder={placeholder} style={{width: 280, maxWidth: '100%'}} autoFocus/>;
}
