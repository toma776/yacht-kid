'use client';
// Meniul secundar din Branding: capitolele brandbook-ului, cu paginile lor
import {usePathname} from 'next/navigation';

export default function BrandNav({sections}) {
  const path = usePathname();
  const groups = [...new Set(sections.map(s => s.grup))];
  return (
    <nav className="bb-nav" aria-label="Capitolele brandbook-ului">
      {groups.map(g => (
        <div key={g} style={{display: 'contents'}}>
          <span className="h">{g}</span>
          {sections.filter(s => s.grup === g).map(s => {
            const href = `/manage/branding/${s.slug ? `${s.slug}/` : ''}`;
            const on = s.slug ? path.startsWith(href) : path === '/manage/branding/' || path === '/manage/branding';
            const p = s.pagini;
            return <a key={s.slug} href={href} className={on ? 'on' : ''}>{s.titlu}{p.length ? <small>{p.length > 1 ? `p. ${p[0]}–${p[p.length - 1]}` : `p. ${p[0]}`}</small> : null}</a>;
          })}
        </div>
      ))}
    </nav>
  );
}
