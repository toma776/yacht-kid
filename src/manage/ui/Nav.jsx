'use client';
// Meniul din stânga: grupurile și numărătorile vin de pe server, elementul activ din adresa curentă
import {usePathname} from 'next/navigation';

const ICONS = {
  panou: 'M4 13h6V4H4zM14 20h6v-9h-6zM14 4v4h6V4zM4 20h6v-4H4z',
  entitati: 'M12 3 3 8l9 5 9-5-9-5zM3 13l9 5 9-5M3 17.5l9 5 9-5',
  harta: 'M6 6a2 2 0 1 0 0 .01M18 6a2 2 0 1 0 0 .01M12 18a2 2 0 1 0 0 .01M7.6 7.2l3.2 9M16.4 7.2l-3.2 9M8 6h8',
  legaturi: 'M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1',
  modificari: 'M12 8v4l3 2M3.5 12a8.5 8.5 0 1 0 2.5-6M3 4v4h4',
  media: 'M4 5h16v14H4zM4 15l4-4 4 4 3-3 5 5M15 9.5a1.5 1.5 0 1 0 0 .01',
  cereri: 'M4 6h16v12H4zM4 7l8 6 8-6'
};

export default function Nav({groups}) {
  const path = usePathname();
  const active = href => (href === '/manage/' ? path === '/manage/' || path === '/manage' : path.startsWith(href));
  return (
    <nav>
      {groups.map(g => (
        <div key={g.title}>
          <span className="nav-h">{g.title}</span>
          {g.items.map(i => (
            <a key={i.href} href={i.href} className={active(i.href) ? 'active' : ''}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d={ICONS[i.icon]}/></svg>
              <span>{i.label}</span>
              {i.n ? <span className={`n ${i.warn ? 'warn' : ''}`}>{i.n}</span> : null}
            </a>
          ))}
        </div>
      ))}
    </nav>
  );
}
