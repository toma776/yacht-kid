'use client';

import {useEffect} from 'react';

// Homepage v4: totul e un tile. Tile-urile sunt albe sau gri, despărțite de o linie navy subțire,
// și au fiecare câte un singur colț rotunjit, ca un planșeu al fațadei. Poziția colțului și raza nu urmează
// o regulă vizibilă (vin dintr-un hash al cheii tile-ului, deci sunt stabile între server și client).
// Imaginile sunt și ele tile-uri, cu aceeași regulă a colțului. Conținutul e cel din homepage-ul actual.

const TEL = '+40 739 085 331';
const TEL_HREF = 'tel:+40739085331';
const MAIL = 'contact@yachtkid.ro';
const WA = 'https://wa.me/40739085331';
const ADDR = 'Str. Anton Holban 6, București 077190';
const MAPS = 'https://www.google.com/maps/search/?api=1&query=Str.%20Anton%20Holban%206%2C%20Bucure%C8%99ti%20077190';
const img = n => `/v4/img/${n}.jpg`;

const CORNERS = ['tl', 'tr', 'br', 'bl'];
const hash = s => {
  let h = 2166136261;
  for (const ch of s) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return h >>> 0;
};

// Raza crește cu suprafața tile-ului, ca un colț mic să nu „mănânce” un tile mic
function cornerOf(k, c, r) {
  const h = hash(k);
  const area = c * r;
  const radii = area <= 3 ? [18, 28, 40] : area <= 8 ? [36, 56, 76] : [72, 104, 140];
  return {corner: CORNERS[h % 4], rad: radii[(h >>> 3) % 3]};
}

function Tile({k, c = 3, r = 1, tone = 'w', image, alt = '', corner, rad, href, className = '', children, id, par = true}) {
  const auto = cornerOf(k, c, r);
  const cn = corner ?? auto.corner;
  const rd = rad ?? auto.rad;
  const style = {
    '--c': c, '--c6': Math.min(6, Math.max(2, Math.ceil(c / 2))), '--c2': c <= 3 ? 1 : 2,
    '--r': r, '--rad': `${rd}px`
  };
  const cls = ['tile', `tone-${image ? 'img' : tone}`, `k-${cn}`, image ? 'is-img' : null, href ? 'is-link' : null, className].filter(Boolean).join(' ');
  const inner = image ? (
    <>
      <img src={image} alt={alt} loading="lazy" decoding="async" data-par={par ? '' : undefined}/>
      {children ? <div className="tile-cap">{children}</div> : null}
    </>
  ) : children;
  if (href) return <a id={id} href={href} className={cls} style={style}>{inner}</a>;
  return <div id={id} className={cls} style={style}>{inner}</div>;
}

const Arrow = () => (
  <svg className="arr" viewBox="0 0 24 24" width="18" height="18" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>
);

const Eyebrow = ({children}) => <p className="eyebrow">{children}</p>;

const APTS = [
  {n: '01', t: 'Apartamente 2 camere', mp: '61,9 – 66,24 m²', ter: '10,5 – 18,3 m²', pret: '210.000 €', href: '/apartamente-2-camere/'},
  {n: '02', t: 'Apartamente 3 camere', mp: '87,6 – 115,1 m²', ter: '24,8 – 55 m²', pret: '390.000 €', href: '/apartamente-3-camere/'},
  {n: '03', t: 'Apartamente 4 camere', mp: '136 – 186,8 m²', ter: '35 – 115 m²', pret: '690.000 €', href: '/apartamente-4-camere/'},
  {n: '04', t: 'Apartamente tip duplex', mp: '219 – 246 m²', ter: '66 – 110 m²', pret: '1.495.000 €', href: '/duplex/'}
];

const POI = [
  ['Lacul Tei', 4], ['World Class Caro', 9], ['Kaufland', 10], ['Metrou Pipera', 12],
  ['Promenada Mall', 16], ['Fratellini Bistro', 19], ['Parcul Verdi', 19], ['Clubul Pescariu Sports & SPA', 20]
];

const PREMII = [
  {y: '2025', t: 'Iconic Awards', d: 'Câștigător · Arhitectură – Rezidențial', href: '/yacht-kid-premiat-la-iconic-awards-2025-castigator-la-categoria-arhitectura-rezidential/'},
  {y: '2025', t: 'German Design Awards', d: 'Excellent Architecture', href: '/yacht-kid-castiga-distinctia-excellent-architecture-la-german-design-awards-2025/'},
  {y: '2024', t: 'Saint-Gobain Trophy', d: 'Premiul special al juriului', href: '/yacht-kid-obtine-premiul-special-la-saint-gobain-trophy-2024/'},
  {y: '2024', t: 'Built Design Awards', d: 'Mențiune onorabilă · Design arhitectural – Rezidențial', href: '/yacht-kid-mentiune-onorabila-in-design-arhitectural-rezidential-la-built-design-awards-2024/'},
  {y: '2024', t: 'Architecture Masterprize', d: 'Honorable Mention · Architectural Design – Residential Architecture (Multi Unit)', href: '/premiu-de-onoare-pentru-inovatie-in-arhitectura/'}
];

const QUOTES = [
  'Am fost atrași de designul modern și de calitatea construcției, dar ceea ce ne-a cucerit cu adevărat la YACHT KID este comunitatea. Oamenii sunt deschiși și primitori, iar faptul că avem la câțiva pași tot ce ne trebuie – de la cafenele, la zone de relaxare – ne face să ne simțim ca într-un loc perfect gândit pentru familie.',
  'De când ne-am mutat la YACHT KID, viața noastră s-a schimbat în bine. Comunitatea este unită și plină de oameni prietenoși, iar facilitățile din apropiere – supermarketuri, spații verzi și locuri de joacă moderne – fac totul incredibil de convenabil.',
  'YACHT KID este cu adevărat o comunitate premium. De la arhitectură și finisaje, până la facilitățile comune bine întreținute și serviciile de calitate, fiecare detaliu este atent gândit. Este o plăcere să numim acest loc acasă.'
];

const NAV = [['Apartamente', '#apartamente'], ['Despre', '#despre'], ['Locație', '#locatie'], ['Tehnologie', '#tehnologie'], ['Contact', '#contact']];

function useMotion() {
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

export default function V4() {
  useMotion();
  const onSubmit = e => {
    e.preventDefault();
    e.currentTarget.querySelector('.form-note').textContent = 'Simulare: formularul din v4 nu trimite date. Ne poți scrie direct pe WhatsApp sau la telefon.';
  };

  return (
    <>
      <header className="bar">
        <a className="logo" href="#top" aria-label="YACHT KID, începutul paginii">YACHT<span> KID</span></a>
        <nav className="bar-nav" aria-label="Secțiuni">
          {NAV.map(([t, h]) => <a key={h} href={h}>{t}</a>)}
        </nav>
        <a className="bar-tel" href={TEL_HREF}>{TEL}</a>
        <a className="btn btn--navy bar-cta" href="/programeaza-o-vizionare/">Programează o vizionare</a>
      </header>

      <main id="top" className="grid">
        {/* ——— Hero: imaginea fațadei, cu paralaxă ——— */}
        <div className="tile tone-img hero k-bl" style={{'--c': 12, '--c6': 6, '--c2': 2, '--r': 1, '--rad': '160px'}}>
          <img className="hero-img" src="/v4/hero.jpg" alt="Fațada YACHT KID: balcoane albe continue, cu colțuri rotunjite" fetchPriority="high"/>
          <div className="hero-copy">
            <Eyebrow>Pe malul lacului · Nordul Bucureștiului</Eyebrow>
            <h1>Diminețile încep pe malul lacului</h1>
            <p className="hero-sub">Descoperă locuința care îți schimbă perspectiva asupra luxului.</p>
            <div className="actions">
              <a className="btn btn--navy" href="#apartamente">Vezi apartamentele <Arrow/></a>
              <a className="btn btn--line" href="/programeaza-o-vizionare/">Programează o vizionare <Arrow/></a>
            </div>
          </div>
        </div>

        <Tile k="d1" c={3} tone="w"><p className="lbl">Suprafețe de la</p><p className="big">61,9<small> m²</small></p></Tile>
        <Tile k="d2" c={3} tone="g1"><p className="lbl">Prețuri de la</p><p className="big">210.000 €<small> + TVA</small></p></Tile>
        <Tile k="d3" c={3} tone="w"><p className="lbl">Parc cu acces direct, pe malul Lacului Tei</p><p className="big">10.000<small> m²</small></p></Tile>
        <Tile k="d4" c={3} tone="g2"><p className="lbl">Rezistență seismică peste cutremurul din 1977</p><p className="big">+50<small> %</small></p></Tile>

        {/* ——— Apartamente ——— */}
        <Tile k="apt-head" id="apartamente" c={5} r={2} tone="w" className="head">
          <Eyebrow>Apartamente</Eyebrow>
          <h2>Colecția de Apartamente</h2>
          <p>Descoperă colecția noastră de apartamente de lux, unde designul modern, finisajele de înaltă clasă și confortul excepțional se îmbină pentru a crea o experiență superioară de locuire.</p>
        </Tile>
        <Tile k="apt-i1" c={4} r={2} image={img(44)} alt="Fațada ondulată YACHT KID"/>
        <Tile k="apt-i2" c={3} r={2} image={img(18)} alt="Balcoane curbe pe cer albastru"/>
        {APTS.map((a, i) => (
          <Tile key={a.n} k={`apt-${a.n}`} c={3} r={2} tone={['g1', 'w', 'g2', 'g3'][i]} href={a.href} className="apt">
            <span className="num">{a.n}</span>
            <h3>{a.t}</h3>
            <dl>
              <div><dt>Suprafață</dt><dd>{a.mp}</dd></div>
              <div><dt>Terasă</dt><dd>{a.ter}</dd></div>
              <div><dt>Preț de la</dt><dd>{a.pret}<small> + TVA</small></dd></div>
            </dl>
            <span className="go">Vezi apartamentele <Arrow/></span>
          </Tile>
        ))}

        {/* Interludiu de imagini */}
        <Tile k="s1" c={4} r={2} image={img('01')} alt="Colț de fațadă pe cer alb"/>
        <Tile k="s2" c={2} r={2} image={img(43)} alt="Detaliu de balcoane"/>
        <Tile k="s3" c={3} r={2} image={img(16)} alt="Apa piscinei"/>
        <Tile k="s4" c={3} r={2} image={img('05')} alt="Benzile albe ale fațadei"/>

        {/* ——— Despre ——— */}
        <Tile k="ab-i" c={7} r={3} image={img(13)} alt="Ansamblul YACHT KID"/>
        <Tile k="ab-head" id="despre" c={5} r={2} tone="w" className="head">
          <Eyebrow>Despre YACHT KID</Eyebrow>
          <h2>Un ansamblu rezidențial de lux, pe malul lacului, deschis către parc.</h2>
        </Tile>
        <Tile k="ab-st" c={5} r={1} tone="g1">
          <p className="statement">Fiecare aspect al execuției YACHT KID reflectă un angajament fără compromis față de calitate, design inteligent și o experiență de locuire superioară, oferind un produs de top, unic pe piață.</p>
        </Tile>
        <Tile k="ch1" c={4} r={2} tone="w" className="chapter">
          <span className="num">01</span><h3>Locație și investiție</h3>
          <p>YACHT KID este un ansamblu rezidențial de lux, conceput pentru a oferi atât un stil de viață excepțional, cât și o valoare investițională solidă pe termen lung. Situat într-o locație exclusivistă pe malul lacului, la doar câțiva pași de apă și cu deschidere directă către un parc de 10.000 m², proiectul beneficiază de o poziționare de top și de un potențial constant de creștere a cererii.</p>
        </Tile>
        <Tile k="ch2" c={5} r={2} tone="g2" className="chapter">
          <span className="num">02</span><h3>Locuințe și comunitate</h3>
          <p>Dezvoltarea oferă o colecție de apartamente moderne, inclusiv locuințe exclusive cu piscine private, construite cu tehnologii avansate și materiale de cea mai înaltă calitate, inspirate din industria yachtingului. Rezidenții beneficiază de o comunitate complet integrată, cu cafenea la parter și livrare direct în apartamente, magazin alimentar, salon premium de înfrumusețare, clinică stomatologică și studio de hot pilates, toate concepute pentru confort maxim și comoditate zilnică.</p>
        </Tile>
        <Tile k="ab-i2" c={3} r={2} image={img(46)} alt="Piscina din curtea interioară"/>
        <Tile k="ch3" c={5} r={2} tone="w" className="chapter">
          <span className="num">03</span><h3>Lux și eficiență</h3>
          <p>Premiat în cadrul a 5 competiții internaționale de renume și construit la cele mai înalte standarde de calitate, YACHT KID se remarcă prin echilibrul său unic între lux și eficiența costurilor. În ciuda poziționării sale de top, proiectul oferă unele dintre cele mai reduse costuri de mentenanță din București, începând de la doar 6 RON/m², asigurând cheltuieli optimizate post-achiziție și o performanță investițională solidă.</p>
        </Tile>
        <Tile k="ab-ron" c={3} r={2} tone="g3" href="#contact" className="kpi">
          <p className="lbl">Mentenanță de la</p>
          <p className="big">6<small> RON/m²</small></p>
          <span className="go">Solicită ofertă <Arrow/></span>
        </Tile>
        <Tile k="ab-i3" c={4} r={2} image={img(30)} alt="Fațada privită de jos"/>

        {/* ——— Avantaje ——— */}
        <Tile k="adv-head" c={4} r={2} tone="g1" className="head">
          <Eyebrow>Avantaje</Eyebrow>
          <h2>Detalii care definesc o altă clasă de locuire.</h2>
        </Tile>
        <Tile k="adv-i1" c={4} r={2} image={img(17)} alt="Piscină privată exterioară"/>
        <Tile k="adv1" c={4} tone="w" className="row"><span className="num">01</span><div><h3>Apartamente cu piscine private</h3><p>Patru piscine private exterioare, cu vedere spre lac.</p></div></Tile>
        <Tile k="adv2" c={4} tone="g2" className="row"><span className="num">02</span><div><h3>Promenadă publică</h3><p>Promenadă pietonală pe malul lacului, în parcul de 10.000 m².</p></div></Tile>
        <Tile k="adv3" c={3} tone="w" className="row"><span className="num">03</span><div><h3>Locație aerisită</h3><p>Între Lacul Tei, Lacul Floreasca și Parcul Verdi, în nordul Bucureștiului.</p></div></Tile>
        <Tile k="adv-i2" c={5} r={2} image={img(20)} alt="Piscină cu gazon și scară"/>
        <Tile k="adv-i3" c={4} r={2} image={img(40)} alt="Intrarea YACHT KID"/>
        <Tile k="adv4" c={3} tone="g1" className="row"><span className="num">04</span><div><h3>Pază 24/7, camere CCTV</h3><p>Pază permanentă și supraveghere video în spațiile rezidențiale și comune.</p></div></Tile>

        {/* ——— Locație ——— */}
        <Tile k="loc-i" c={6} r={3} image={img(62)} alt="Ansamblul YACHT KID, cu grădina și piscina"/>
        <Tile k="loc-head" id="locatie" c={6} r={1} tone="w" className="head">
          <Eyebrow>Locație</Eyebrow>
          <h2>Locație premium pe malul lacului, cu deschidere către parc</h2>
        </Tile>
        <Tile k="loc-b1" c={3} r={1} tone="g1"><p>Amplasat în zona de nord a capitalei, YACHT KID oferă acces rapid la diverse parcuri, centre comerciale, restaurante de top, săli de fitness și multe altele.</p></Tile>
        <Tile k="loc-b2" c={3} r={1} tone="w"><p>Ansamblul beneficiază de toate facilitățile necesare pentru un stil de viață modern și confortabil, fiind poziționat ideal pentru a îmbina eleganța cu comoditatea zilnică.</p></Tile>
        <Tile k="loc-addr" c={3} r={1} tone="g2" href={MAPS} className="addr">
          <p className="lbl">Adresă</p><address>{ADDR}</address><span className="go">Deschide în Google Maps <Arrow/></span>
        </Tile>
        <Tile k="loc-cta" c={3} r={1} tone="w" href="#contact" className="cta">
          <span className="go big-go">Solicită ofertă <Arrow/></span>
        </Tile>
        {POI.map(([t, m], i) => (
          <Tile key={t} k={`poi-${i}`} c={i % 4 === 1 || i % 4 === 2 ? 3 : 3} tone={['w', 'g1', 'w', 'g2', 'g1', 'w', 'g2', 'w'][i]} className="poi">
            <p className="big">{m}<small> min</small></p><p className="lbl">{t}</p>
          </Tile>
        ))}

        {/* ——— Tehnologie ——— */}
        <Tile k="th-head" id="tehnologie" c={5} r={2} tone="w" className="head">
          <Eyebrow>Tehnologie</Eyebrow>
          <h2>Confort și siguranță</h2>
          <p className="lead">Finisajele moderne, materialele de calitate superioară și tehnologia de ultimă generație reprezintă elemente esențiale în decizia de a achiziționa un apartament la YACHT KID.</p>
        </Tile>
        <Tile k="th-i1" c={4} r={3} image={img(53)} alt="Panourile prefabricate ale fațadei"/>
        <Tile k="th-body" c={3} r={2} tone="g1" href="/tehnologie/" className="body">
          <p>Clădirea este realizată cu cele mai bune materiale și proiectată pentru a oferi o experiență de locuire la un standard ridicat, remarcabilă prin detalii rafinate și design unic. Aceasta garantează nu doar confort și siguranță, ci și economii semnificative la facturile individuale și colective pentru utilități.</p>
          <span className="go">Descoperă Yacht KID Technology <Arrow/></span>
        </Tile>
        <Tile k="th1" c={5} tone="g2" className="row"><span className="num">01</span><div><h3>Patent de invenție pentru fațade</h3><p>Panouri prefabricate cu patent propriu, testate la INCERC la aer, apă, vânt și seism.</p></div></Tile>
        <Tile k="th2" c={3} tone="w" className="row"><span className="num">02</span><div><h3>Materiale premium</h3><p>Sticlă Saint-Gobain, tâmplărie din aluminiu Reynaers și parchet triplu stratificat.</p></div></Tile>
        <Tile k="th3" c={4} tone="w" className="row"><span className="num">03</span><div><h3>Izolație fonică și etanșare</h3><p>Ferestre Saint-Gobain și o anvelopă etanșă, testată la INCERC.</p></div></Tile>
        {['Consum redus de energie', 'Protecție împotriva incendiilor', 'Protecție împotriva condensului', 'Izolare termică'].map((t, i) => (
          <Tile key={t} k={`thx-${i}`} c={2} tone={['g1', 'w', 'g2', 'g1'][i]} className="mini"><span className="num">0{i + 4}</span><h3>{t}</h3></Tile>
        ))}
        <Tile k="thx-4" c={2} r={2} tone="g3" className="mini"><span className="num">08</span><h3>Eficiență energetică ridicată</h3></Tile>
        <Tile k="th-i2" c={5} r={2} image={img(54)} alt="Linia curbă a fațadei pe cer alb"/>
        <Tile k="th-i3" c={5} r={2} image={img(63)} alt="Benzile fațadei, cotite"/>

        {/* ——— Premii ——— */}
        <Tile k="aw-head" c={3} r={2} tone="g2" className="head">
          <Eyebrow>Recunoaștere internațională</Eyebrow>
          <h2>Premiat la 5 competiții internaționale de renume</h2>
        </Tile>
        {PREMII.map((p, i) => (
          <Tile key={p.t} k={`aw-${i}`} c={3} tone={['w', 'g1', 'w', 'g1', 'w'][i]} href={p.href} className="award">
            <span className="num">{p.y}</span><h3>{p.t}</h3><p>{p.d}</p><Arrow/>
          </Tile>
        ))}
        <Tile k="aw-i" c={3} image={img(34)} alt="Colțul rotunjit al clădirii"/>

        {/* ——— Testimoniale ——— */}
        <Tile k="tm-head" c={3} r={2} tone="w" className="head">
          <Eyebrow>Testimoniale</Eyebrow>
          <h2>Ce spun cei care au ales YACHT KID</h2>
        </Tile>
        <Tile k="tm-1" c={5} r={2} tone="g1" className="quote"><blockquote>„{QUOTES[0]}”</blockquote><p className="who">Rezident YACHT KID · Membru al comunității</p></Tile>
        <Tile k="tm-i" c={4} r={2} image={img(59)} alt="Grădina și piscina dintre clădiri"/>
        <Tile k="tm-2" c={6} r={1} tone="w" className="quote"><blockquote>„{QUOTES[1]}”</blockquote><p className="who">Rezident YACHT KID · Membru al comunității</p></Tile>
        <Tile k="tm-3" c={6} r={1} tone="g2" className="quote"><blockquote>„{QUOTES[2]}”</blockquote><p className="who">Rezident YACHT KID · Membru al comunității</p></Tile>

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
              <select name="tip" defaultValue=""><option value="">Ce tip de apartament doriți?</option>{APTS.map(a => <option key={a.n}>{a.t}</option>)}</select>
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
          <ul><li><a href="#despre">Despre noi</a></li><li><a href="/tehnologie/">Tehnologie</a></li><li><a href="/comunitate/">Comunitate</a></li><li><a href="/blog/">Blog</a></li><li><a href="/contact/">Contact</a></li></ul>
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
      </main>
    </>
  );
}
