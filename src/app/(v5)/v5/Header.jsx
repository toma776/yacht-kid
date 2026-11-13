'use client';
// Antetul v5: bară albă, fixă sus. Pe desktop, „Apartamente” și „Proiectul” deschid un panou pe toată lățimea
// (fotografii, suprafețe, prețuri); pe mobil, un meniu pe tot ecranul, cu grupurile desfăcute pe rând.
import {useEffect, useRef, useState} from 'react';
import {Icon} from '../../../site/ui/Icons.jsx';

const num = i => String(i + 1).padStart(2, '0');

function Langs({chrome}) {
  return (
    <nav className="h5-langs" aria-label={chrome.labels.limba ?? 'Limba'}>
      {['ro', 'en'].map(l => <a key={l} href={chrome.alternates[l]} hrefLang={l} aria-current={l === chrome.lang ? 'true' : undefined}>{l.toUpperCase()}</a>)}
    </nav>
  );
}

function Panel({item, id, open, onClose}) {
  const units = item.mega === 'locuinte';
  return (
    <div className="h5-panel" id={id} data-open={open || undefined} inert={!open}>
      <div className="h5-wrap h5-panel-in">
        <div className="h5-panel-intro">
          <p className="v5-eyebrow">{item.eyebrow}</p>
          <p className="h5-panel-title">{item.title}</p>
          {item.more?.href && <a className="h5-more" href={item.more.href} onClick={onClose}>{units ? 'Toate apartamentele' : 'Despre proiect'} <Icon id="arrow" size={16}/></a>}
        </div>
        <ul className={`h5-cards${units ? ' h5-cards--units' : ''}`}>
          {item.children.map((c, i) => (
            <li key={c.href}><a className="h5-card" href={c.href} onClick={onClose}>
              <span className="h5-card-img">{c.image && <img src={c.image} alt="" loading="lazy" decoding="async"/>}</span>
              <span className="h5-card-meta">
                <span className="h5-num">{num(i)}</span>
                <b>{c.unit?.name ?? c.label}</b>
                {units && c.unit ? <small>{c.unit.area}<br/>{c.unit.price}</small> : <small>{c.desc}</small>}
              </span>
            </a></li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default function Header({chrome}) {
  const L = chrome.labels, f = chrome.firma;
  const items = chrome.header.filter(i => !i.cta);
  const visit = items.find(i => i.mega === 'locuinte')?.aside?.cta?.href ?? chrome.contactHref;
  const visitLabel = L['programeaza-vizionare'] ?? 'Programează o vizionare';
  const [open, setOpen] = useState(null);       // panoul deschis pe desktop (index)
  const [menu, setMenu] = useState(false);      // meniul pe mobil
  const [group, setGroup] = useState(0);        // grupul desfăcut în meniul pe mobil
  const [scrolled, setScrolled] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    const onKey = e => { if (e.key === 'Escape') { setOpen(null); setMenu(false); } };
    const onDown = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(null); };
    onScroll();
    window.addEventListener('scroll', onScroll, {passive: true});
    window.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onDown);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onDown);
    };
  }, []);
  useEffect(() => { document.documentElement.classList.toggle('v5-lock', menu); }, [menu]);

  const close = () => { setOpen(null); setMenu(false); };

  return (
    <header ref={ref} className="h5" data-raised={scrolled || open !== null || undefined}>
      <div className="h5-wrap h5-bar">
        <a className="h5-logo" href={chrome.home} aria-label={`YACHT KID, ${L['pagina-principala'] ?? 'pagina principală'}`}>
          <img src="/media/2/" alt="" width="275" height="168"/>
        </a>
        <nav className="h5-nav" aria-label={L['meniul-principal'] ?? 'Meniul principal'}>
          <ul>
            {items.map((it, i) => it.mega ? (
              <li key={i}>
                <button type="button" aria-expanded={open === i} aria-controls={`h5-p${i}`} onClick={() => setOpen(open === i ? null : i)}>
                  {it.label}<Icon id="chevron" size={12}/>
                </button>
              </li>
            ) : <li key={i}><a href={it.href}>{it.label}</a></li>)}
          </ul>
        </nav>
        <div className="h5-actions">
          <Langs chrome={chrome}/>
          {f && <a className="h5-phone" href={`tel:${f.phone}`}><Icon id="phone" size={16}/><span>{f.phoneLabel}</span></a>}
          <a className="v5-btn h5-cta" href={visit}>{visitLabel}</a>
          <button className="h5-burger" type="button" aria-expanded={menu} aria-controls="h5-mobile" onClick={() => { setMenu(!menu); setOpen(null); }}>
            <span/><span/><span className="v5-sr">{menu ? (L['inchide-meniul'] ?? 'Închide meniul') : (L.meniu ?? 'Meniu')}</span>
          </button>
        </div>
      </div>

      {items.map((it, i) => it.mega && <Panel key={i} item={it} id={`h5-p${i}`} open={open === i} onClose={close}/>)}
      <div className="h5-scrim" data-open={open !== null || undefined} onClick={() => setOpen(null)} aria-hidden="true"/>

      <div className="h5-mobile" id="h5-mobile" data-open={menu || undefined} inert={!menu} role="dialog" aria-modal="true" aria-label={L.meniu ?? 'Meniu'}>
        <div className="h5-mobile-scroll">
          {items.map((it, i) => it.mega ? (
            <section key={i} className="h5-m-group" data-open={group === i || undefined}>
              <button type="button" className="h5-m-head" aria-expanded={group === i} onClick={() => setGroup(group === i ? -1 : i)}>
                {it.label}<Icon id="chevron" size={16}/>
              </button>
              <ul className="h5-m-list">
                {it.children.map(c => (
                  <li key={c.href}><a href={c.href} onClick={close}>
                    <span className="h5-m-img">{c.image && <img src={c.image} alt="" loading="lazy"/>}</span>
                    <span><b>{c.unit?.name ?? c.label}</b><small>{c.unit && it.mega === 'locuinte' ? `${c.unit.area} · ${c.unit.price}` : c.desc}</small></span>
                  </a></li>
                ))}
              </ul>
            </section>
          ) : <a key={i} className="h5-m-link" href={it.href} onClick={close}>{it.label}<Icon id="arrow" size={16}/></a>)}
          <div className="h5-m-foot">
            <Langs chrome={chrome}/>
            {f && <address>{f.address}{f.schedule && <small>{f.schedule}</small>}</address>}
          </div>
        </div>
        <div className="h5-m-bar">
          <a className="v5-btn" href={visit} onClick={close}>{visitLabel}</a>
          {f && <a className="h5-m-ic" href={`tel:${f.phone}`} aria-label={`${L.telefon ?? 'Telefon'}: ${f.phoneLabel}`}><Icon id="phone" size={20}/></a>}
          {f && <a className="h5-m-ic" href={f.whatsapp} aria-label="WhatsApp"><Icon id="whatsapp" size={20}/></a>}
        </div>
      </div>
    </header>
  );
}
