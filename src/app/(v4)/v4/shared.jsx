'use client';

import {useEffect} from 'react';

// Piesele comune paginilor v4: tile-ul (cu colțul lui rotunjit), bara de sus, tile-urile de contact și subsolul,
// plus mișcarea (apariție la scroll și paralaxă). Paginile doar le așază în grilă.

export const TEL = '+40 739 085 331';
export const TEL_HREF = 'tel:+40739085331';
export const MAIL = 'contact@yachtkid.ro';
export const WA = 'https://wa.me/40739085331';
export const ADDR = 'Str. Anton Holban 6, București 077190';
export const MAPS = 'https://www.google.com/maps/search/?api=1&query=Str.%20Anton%20Holban%206%2C%20Bucure%C8%99ti%20077190';
export const img = n => `/v4/img/${n}.jpg`;

export const CORNERS = ['tl', 'tr', 'br', 'bl'];
export const hash = s => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

// Raza crește cu suprafața tile-ului, ca un colț mic să nu „mănânce” un tile mic
export function cornerOf(k, c, r) {
  const h = hash(k);
  const area = c * r;
  const radii = area <= 3 ? [18, 28, 40] : area <= 8 ? [36, 56, 76] : [72, 104, 140];
  return {corner: CORNERS[h % 4], rad: radii[(h >>> 3) % 3]};
}

export function Tile({k, c = 3, r = 1, tone = 'w', image, alt = '', corner, rad, href, className = '', children, id, par = true, onClick, label}) {
  const auto = cornerOf(k, c, r);
  const cn = corner ?? auto.corner;
  const rd = rad ?? auto.rad;
  const style = {
    '--c': c, '--c6': Math.min(6, Math.max(2, Math.ceil(c / 2))), '--c2': c <= 3 ? 1 : 2,
    '--r': r, '--rad': `${rd}px`
  };
  const cls = ['tile', `tone-${image ? 'img' : tone}`, `k-${cn}`, image ? 'is-img' : null, href || onClick ? 'is-link' : null, className].filter(Boolean).join(' ');
  const inner = image ? (
    <>
      <img src={image} alt={alt} loading="lazy" decoding="async" data-par={par ? '' : undefined}/>
      {children ? <div className="tile-cap">{children}</div> : null}
    </>
  ) : children;
  if (href) return <a id={id} href={href} className={cls} style={style}>{inner}</a>;
  if (onClick) return <button type="button" id={id} className={cls} style={style} onClick={onClick} aria-label={label}>{inner}</button>;
  return <div id={id} className={cls} style={style}>{inner}</div>;
}

export const Arrow = () => (
  <svg className="arr" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

export const Eyebrow = ({children}) => <p className="eyebrow">{children}</p>;

export const APTS = [
  {n: '01', t: 'Apartamente 2 camere', mp: '61,9 – 66,24 m²', ter: '10,5 – 18,3 m²', pret: '210.000 €', href: '/v4/apartamente-2-camere/'},
  {n: '02', t: 'Apartamente 3 camere', mp: '87,6 – 115,1 m²', ter: '24,8 – 55 m²', pret: '390.000 €', href: '/apartamente-3-camere/'},
  {n: '03', t: 'Apartamente 4 camere', mp: '136 – 186,8 m²', ter: '35 – 115 m²', pret: '690.000 €', href: '/apartamente-4-camere/'},
  {n: '04', t: 'Apartamente tip duplex', mp: '219 – 246 m²', ter: '66 – 110 m²', pret: '1.495.000 €', href: '/duplex/'}
];

const NAV = [['Apartamente', '#apartamente'], ['Despre', '#despre'], ['Locație', '#locatie'], ['Tehnologie', '#tehnologie'], ['Contact', '#contact']];

// base: prefixul ancorelor de homepage ('' pe homepage, '/v4/' pe subpagini; #contact există pe fiecare pagină)
export function Bar({base = ''}) {
  return (
    <header className="bar">
      <a className="logo" href={base || '#top'} aria-label="YACHT KID, pagina principală">YACHT<span> KID</span></a>
      <nav className="bar-nav" aria-label="Secțiuni">
        {NAV.map(([t, h]) => <a key={h} href={h === '#contact' ? h : base + h}>{t}</a>)}
      </nav>
      <a className="bar-tel" href={TEL_HREF}>{TEL}</a>
      <a className="btn btn--navy bar-cta" href="/programeaza-o-vizionare/">Programează o vizionare</a>
    </header>
  );
}

export function ContactTiles({tip = ''}) {
  const onSubmit = e => {
    e.preventDefault();
    e.currentTarget.querySelector('.form-note').textContent = 'Simulare: formularul din v4 nu trimite date. Ne poți scrie direct pe WhatsApp sau la telefon.';
  };
  return (
    <>
    {/* ——— Contact ——— */}
    <Tile k="ct-head" id="contact" c={6} r={2} tone="w" className="head">
      <Eyebrow>Contact</Eyebrow>
      <h2>Hai să facem primul pas spre locuința ta de vis!</h2>
      <p className="lead">Fie că îți dorești să programezi o vizionare, să primești detalii suplimentare sau pur și simplu să descoperi de ce Yacht KID este alegerea perfectă pentru tine, suntem la un click distanță.</p>
    </Tile>
    <Tile k="ct-form" c={6} r={4} tone="g1" className="form-tile">
      <form onSubmit={onSubmit} noValidate>
        <h3>Formular contact</h3>
        <p className="hint">* Câmpuri obligatorii; restul sunt opționale.</p>
        <label className="span2">Nume complet *<input name="name" autoComplete="name"/></label>
        <label>Email<input name="email" type="email" autoComplete="email"/></label>
        <label>Telefon<input name="phone" type="tel" autoComplete="tel"/></label>
        <p className="hint span2">Lasă-ne un telefon sau o adresă de email, cum preferi să te contactăm. E suficient unul.</p>
        <label>Tip apartament <em>opțional</em>
          <select name="tip" defaultValue={tip}><option value="">Ce tip de apartament doriți?</option>{APTS.map(a => <option key={a.n}>{a.t}</option>)}</select>
        </label>
        <label>Doriți design de interior? <em>opțional</em>
          <select name="design" defaultValue=""><option value="">Selectați o opțiune</option><option>Da, vreau design interior</option><option>Nu doresc design de interior</option></select>
        </label>
        <label className="span2">Informații suplimentare <em>opțional</em><textarea name="info" rows={3}/></label>
        <label className="check span2"><input type="checkbox" name="consent"/> <span>Sunt de acord cu prelucrarea datelor personale, conform <a href="/politica-de-confidentialitate/">politicii de confidențialitate</a>.</span></label>
        <div className="span2 form-foot"><button className="btn btn--navy" type="submit">Trimite solicitare <Arrow/></button></div>
        <p className="form-note span2" aria-live="polite"/>
      </form>
    </Tile>
    <Tile k="ct-mail" c={3} tone="g2" href={`mailto:${MAIL}`} className="chan"><p className="lbl">Email</p><p className="val">{MAIL}</p></Tile>
    <Tile k="ct-tel" c={3} tone="w" href={TEL_HREF} className="chan"><p className="lbl">Telefon</p><p className="val">{TEL}</p></Tile>
    <Tile k="ct-wa" c={3} tone="w" href={WA} className="chan"><p className="lbl">WhatsApp</p><p className="val">Scrie-ne pe WhatsApp</p></Tile>
    <Tile k="ct-adr" c={3} tone="g3" href={MAPS} className="chan"><p className="lbl">Adresă</p><p className="val">{ADDR}</p></Tile>
    </>
  );
}

export function FooterTiles({base = ''}) {
  return (
    <>
    {/* ——— Subsol, tot din tile-uri ——— */}
    <Tile k="ft-brand" c={4} r={2} tone="g2" className="ft-brand">
      <p className="logo logo--lg">YACHT<span> KID</span></p>
      <p>Descoperă locuința care îți schimbă perspectiva asupra luxului.</p>
      <div className="actions">
        <a className="btn btn--navy" href="#contact">Solicită ofertă <Arrow/></a>
        <a className="btn btn--line" href="/spatii-comerciale/#contact">Spațiu pentru afacerea ta <Arrow/></a>
      </div>
    </Tile>
    <Tile k="ft-ct" c={3} r={2} tone="w" className="ft-col">
      <h3>Contact</h3>
      <ul><li><a href={TEL_HREF}>{TEL}</a></li><li><a href={`mailto:${MAIL}`}>{MAIL}</a></li><li><a href={WA}>Scrie-ne pe WhatsApp</a></li></ul>
      <p className="lbl">Program</p><p>Luni – Vineri: 09:00 – 17:00</p>
    </Tile>
    <Tile k="ft-of" c={2} r={2} tone="g1" className="ft-col">
      <h3>Birou de vânzări</h3>
      <address>Str. Anton Holban 6<br/>București 077190</address>
      <ul className="soc">
        <li><a href="https://www.facebook.com/YachtKidProperties">Facebook</a></li>
        <li><a href="https://www.instagram.com/yachtkid.properties/">Instagram</a></li>
        <li><a href="https://www.linkedin.com/company/yacht-kid/">LinkedIn</a></li>
      </ul>
    </Tile>
    <Tile k="ft-ap" c={3} r={2} tone="w" className="ft-col">
      <h3>Apartamente</h3>
      <ul>{APTS.map(a => <li key={a.n}><a href={a.href}>{a.t}</a></li>)}<li><a href="/spatii-comerciale/">Spații comerciale</a></li></ul>
    </Tile>
    <Tile k="ft-pr" c={3} r={2} tone="g1" className="ft-col">
      <h3>Proiectul</h3>
      <ul><li><a href={base + '#despre'}>Despre noi</a></li><li><a href="/tehnologie/">Tehnologie</a></li><li><a href="/comunitate/">Comunitate</a></li><li><a href="/blog/">Blog</a></li><li><a href="/contact/">Contact</a></li></ul>
    </Tile>
    <Tile k="ft-lg" c={4} r={2} tone="w" className="ft-col">
      <h3>Informații legale</h3>
      <ul>
        <li><a href="/politica-de-confidentialitate/">Politica de confidențialitate</a></li>
        <li><a href="/politica-cookies/">Politica de cookie-uri</a></li>
        <li><a href="/termeni-si-conditii/">Termeni și condiții</a></li>
        <li><a href="https://anpc.ro">ANPC</a></li>
        <li><a href="https://anpc.ro/ce-este-sal/">Soluționarea alternativă a litigiilor</a></li>
        <li><a href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=RO">Soluționarea online a litigiilor</a></li>
      </ul>
    </Tile>
    <Tile k="ft-i" c={5} r={2} image={img(64)} alt="Benzile fațadei pe cer alb"/>
    <Tile k="ft-co" c={12} tone="g2" className="ft-co">
      <p>© 2026 YACHT KID · KID PROJECT DESIGN S.R.L. · CUI RO38632756 · J2017020922403 · Sediu social: Intrarea Chefalului nr. 12H, etaj 7, ap. 22, camera 4, Sector 2, București, cod poștal 020333</p>
      <p className="langs"><a href="/">RO</a> · <a href="/en/">EN</a> · <a href="#top">Sus ↑</a></p>
    </Tile>
    </>
  );
}

export function useMotion() {
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('v4-js');
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Tile-urile apar pe rând când intră în ecran
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); }
    }), {rootMargin: '0px 0px -6% 0px'});
    document.querySelectorAll('.v4 .tile').forEach(t => io.observe(t));

    if (reduce) return () => io.disconnect();

    // Paralaxă: hero-ul se mișcă mai lent decât pagina; imaginile din tile-uri alunecă ușor în ramă
    const hero = document.querySelector('.hero-img');
    const pars = [...document.querySelectorAll('.v4 img[data-par]')];
    let raf = 0;
    const tick = () => {
      raf = 0;
      const vh = innerHeight;
      if (hero) {
        const y = Math.min(scrollY, vh * 1.2);
        hero.style.transform = `translate3d(0, ${y * 0.38}px, 0) scale(${1.08 + y / vh * 0.06})`;
      }
      for (const el of pars) {
        const b = el.parentElement.getBoundingClientRect();
        if (b.bottom < -100 || b.top > vh + 100) continue;
        const p = (b.top + b.height / 2 - vh / 2) / vh;
        el.style.transform = `translate3d(0, ${p * -9}%, 0)`;
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    addEventListener('scroll', on, {passive: true});
    addEventListener('resize', on);
    return () => { io.disconnect(); removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
}
