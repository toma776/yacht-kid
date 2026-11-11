'use client';

import {useEffect, useRef, useState} from 'react';

// Homepage v3: limbajul vizual vine direct din fațadă. Benzile albe continue ale balcoanelor devin
// elementul de bază al interfeței (hero, meniu, cifre, apartamente), colțurile se rotunjesc ca pe clădire,
// iar între benzi e mereu „sticlă”. Navy și coral, din brandbook, apar doar ca accente.

const TEL = '+40 739 085 331';
const TEL_HREF = 'tel:+40739085331';
const MAIL = 'contact@yachtkid.ro';
const WA = 'https://wa.me/40739085331';
const MAPS = 'https://www.google.com/maps/search/?api=1&query=Strada+Anton+Holban+6+Bucuresti';

const FLOORS = [
  {id: 'fatada', n: 'P', t: 'Fațada'},
  {id: 'manifest', n: '01', t: 'Proiectul'},
  {id: 'detalii', n: '02', t: 'Detalii'},
  {id: 'cifre', n: '03', t: 'În cifre'},
  {id: 'apartamente', n: '04', t: 'Apartamente'},
  {id: 'film', n: '05', t: 'Film'},
  {id: 'locatie', n: '06', t: 'Locație'},
  {id: 'contact', n: '07', t: 'Contact'}
];

const MENU = [
  {n: '01', t: 'Apartamente', s: '2, 3, 4 camere și duplex', href: '#apartamente', img: '/v3/fatada-5.jpg'},
  {n: '02', t: 'Proiectul', s: 'Arhitectură premiată, pe malul lacului', href: '#manifest', img: '/v3/fatada-1.jpg'},
  {n: '03', t: 'Tehnologie', s: 'Structură post-tensionată, fațadă brevetată', href: '/tehnologie/', img: '/v3/fatada-4.jpg'},
  {n: '04', t: 'Comunitate', s: 'Cafenea, minimarket, beauty, wellness', href: '/comunitate/', img: '/v3/fatada-3.jpg'},
  {n: '05', t: 'Spații comerciale', s: '88,2 – 171,8 m², cu terasă', href: '/spatii-comerciale/', img: '/v3/fatada-2.jpg'},
  {n: '06', t: 'Contact', s: 'Programează o vizionare', href: '#contact', img: '/v3/fatada-7.jpg'}
];

const DETALII = [
  {img: '/v3/fatada-1.jpg', t: 'Benzi continue', d: 'Fiecare etaj e încins de un balcon continuu: o singură linie albă, de la un capăt la altul.'},
  {img: '/v3/fatada-2.jpg', t: 'Colțuri fără muchii', d: 'Planșeele se rotunjesc la fiecare schimbare de direcție, ca o carenă de yacht.'},
  {img: '/v3/fatada-3.jpg', t: 'Fațadă cu patent de invenție', d: 'Sistemul de fațadă e brevetat: o soluție proprie, dezvoltată pentru YACHT KID.'},
  {img: '/v3/fatada-4.jpg', t: 'Sticlă pe toată lungimea', d: 'Parapete din sticlă de-a lungul balcoanelor: lumina intră, priveliștea rămâne.'},
  {img: '/v3/fatada-5.jpg', t: 'Materiale din yachting', d: 'Tehnologii și materiale de cea mai înaltă calitate, inspirate din industria yachtingului.'},
  {img: '/v3/fatada-7.jpg', t: 'Premiat de cinci ori', d: 'Recunoscut în cinci competiții internaționale de arhitectură, între 2024 și 2025.'}
];

const CIFRE = [
  {to: 10000, txt: '10.000', u: 'm²', l: 'parc, cu deschidere directă din ansamblu'},
  {to: 6, txt: '6', u: 'RON/m²', l: 'cost de întreținere, printre cele mai mici din București', pre: 'de la'},
  {to: 5, txt: '5', u: 'premii', l: 'în competiții internaționale de arhitectură'},
  {txt: 'Nr. 1', u: '', l: 'în izolație fonică și etanșare, pe piața din România'}
];

const APTS = [
  {k: '2', t: '2 camere', mp: '61,9 – 66,24', pret: '210.000', href: '/apartamente-2-camere/'},
  {k: '3', t: '3 camere', mp: '87,6 – 115,1', pret: '390.000', href: '/apartamente-3-camere/'},
  {k: '4', t: '4 camere', mp: '136 – 186,8', pret: '690.000', href: '/apartamente-4-camere/'},
  {k: 'D', t: 'Duplex', mp: '219 – 246', pret: '1.495.000', href: '/duplex/', s: 'pe două niveluri'}
];

const PREMII = ['Câștigător 2025', 'Excellent Architecture 2025', 'Premiul special al juriului 2024', 'Mențiune onorabilă 2024', 'Honorable Mention 2024'];

const PARTER = ['Cafenea cu livrare în apartament', 'Magazin alimentar', 'Salon premium de înfrumusețare', 'Studio de hot pilates', 'Clinică stomatologică, în curs de deschidere'];

const MANIFEST = 'YACHT KID e un ansamblu rezidențial de lux pe malul lacului, deschis către un parc de 10.000 m². Fiecare etaj se întinde ca o linie de orizont: balcoane continue, sticlă de la un capăt la altul și colțuri rotunjite ca o carenă.';
const MANIFEST_ACCENT = new Set(['orizont:', 'carenă.']);

function Logo({className}) {
  return (
    <svg className={className} viewBox="0 0 132 72" role="img" aria-label="YACHT KID">
      <text x="66" y="17" textAnchor="middle" textLength="124" lengthAdjust="spacingAndGlyphs" className="lg-y">YACHT</text>
      <g className="lg-w" fill="none" strokeWidth="2" strokeLinecap="round">
        <path d="M4 29 q7.75 -5 15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0"/>
        <path d="M4 36 q7.75 -5 15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0"/>
        <path d="M4 43 q7.75 -5 15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0 t15.5 0"/>
      </g>
      <text x="66" y="70" textAnchor="middle" textLength="124" lengthAdjust="spacingAndGlyphs" className="lg-k">KID</text>
    </svg>
  );
}

function Arrow() {
  return <svg className="ic" viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15M13 6l6 6-6 6" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/></svg>;
}

export default function V3() {
  const [menu, setMenu] = useState(false);
  const [hover, setHover] = useState(0);
  const [apt, setApt] = useState(0);
  const menuBtn = useRef(null);
  const firstLink = useRef(null);

  // Meniul: blochează derularea, Esc închide, focusul intră în meniu și revine pe buton
  useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('menu-open', menu);
    if (!menu) return;
    const t = setTimeout(() => firstLink.current?.focus({preventScroll: true}), 450);
    const onKey = e => { if (e.key === 'Escape') { setMenu(false); menuBtn.current?.focus(); } };
    addEventListener('keydown', onKey);
    return () => { clearTimeout(t); removeEventListener('keydown', onKey); };
  }, [menu]);

  useEffect(() => engine(), []);

  const go = () => setMenu(false);

  return (
    <>
      <a className="skip" href="#manifest">Sari la conținut</a>

      {/* Antetul: o bandă albă care, după primul ecran, se strânge într-o placă rotunjită */}
      <header className="hd" data-hd>
        <div className="hd-slab">
          <a href="#fatada" className="hd-logo" aria-label="YACHT KID, începutul paginii"><Logo className="logo"/></a>
          <nav className="hd-quick" aria-label="Rapid">
            <a href="#apartamente">Apartamente</a>
            <a href="#detalii">Arhitectura</a>
            <a href="#locatie">Locație</a>
          </nav>
          <div className="hd-right">
            <a className="hd-tel" href={TEL_HREF}>{TEL}</a>
            <a className="btn btn-coral hd-cta" href="#contact" data-magnet>Programează vizionare</a>
            <button ref={menuBtn} className={`burger${menu ? ' is-x' : ''}`} aria-expanded={menu} aria-controls="meniu" onClick={() => setMenu(m => !m)}>
              <span className="burger-t">{menu ? 'Închide' : 'Meniu'}</span>
              <span className="burger-i" aria-hidden="true"><i/><i/><i/></span>
            </button>
          </div>
        </div>
      </header>

      {/* Meniul: etajele clădirii. Fiecare intrare e o bandă care intră din dreapta și se retrage în trepte, ca fațada. */}
      <div id="meniu" className={`mn${menu ? ' is-open' : ''}`} aria-hidden={!menu} inert={!menu ? true : undefined}>
        <div className="mn-glass" aria-hidden="true"/>
        <aside className="mn-side">
          <div className="mn-window" aria-hidden="true">
            {MENU.map((m, i) => <img key={m.img} src={m.img} alt="" className={i === hover ? 'on' : ''}/>)}
            <span className="mn-window-cap">{MENU[hover].s}</span>
          </div>
          <div className="mn-contact">
            <p className="kicker">Showroom</p>
            <p>Str. Anton Holban 6, București 077190<br/>Luni – Vineri, 09:00 – 17:00</p>
            <p><a href={TEL_HREF}>{TEL}</a><br/><a href={`mailto:${MAIL}`}>{MAIL}</a></p>
            <a className="btn btn-coral" href="#contact" onClick={go}>Programează vizionare <Arrow/></a>
          </div>
        </aside>
        <nav className="mn-bands" aria-label="Principal">
          {MENU.map((m, i) => (
            <a key={m.n} ref={i === 0 ? firstLink : undefined} href={m.href} className="mn-band" style={{'--i': i}}
              onMouseEnter={() => setHover(i)} onFocus={() => setHover(i)} onClick={go}>
              <span className="mn-n">{m.n}</span>
              <span className="mn-t">{m.t}</span>
              <span className="mn-s">{m.s}</span>
              <Arrow/>
            </a>
          ))}
          <div className="mn-foot" style={{'--i': MENU.length}}>
            <a href="/category/premii/">Premii</a><a href="/testimoniale/">Testimoniale</a><a href="/blog/">Blog</a>
            <span className="mn-lang"><b>RO</b> <a href="/en/">EN</a></span>
          </div>
        </nav>
      </div>

      {/* Indicatorul de etaje: unde ești în pagină, ca într-un lift */}
      <nav className="floors" aria-label="Secțiuni">
        {FLOORS.map(f => (
          <a key={f.id} href={`#${f.id}`} data-floor={f.id}><span className="fl-n">{f.n}</span><span className="fl-t">{f.t}</span><i/></a>
        ))}
      </nav>

      <main>
        {/* P · Fațada. Benzile sunt desenate live: cursorul împinge colțurile, derularea le subțiază până rămâne clădirea reală. */}
        <section id="fatada" className="hero" aria-labelledby="hero-t">
          <div className="hero-pin">
            <svg className="hero-svg" aria-hidden="true">
              <g className="hero-photo"><image href="/v3/fatada-6.jpg" preserveAspectRatio="xMidYMid slice"/></g>
              <rect className="hero-tint"/>
              <path className="hero-sky"/>
              <g className="hero-bands"/>
            </svg>
            <div className="hero-copy">
              <p className="kicker hero-k"><span>Ansamblu rezidențial de lux</span><span>Malul lacului · București Nord</span></p>
              <h1 id="hero-t" className="hero-t">
                <span className="ln"><span>Un nou standard</span></span>
                <span className="ln"><span>de viață, trasat</span></span>
                <span className="ln"><span>în <em>linii continue.</em></span></span>
              </h1>
              <div className="hero-act">
                <a className="btn btn-navy" href="#apartamente" data-magnet>Descoperă apartamentele <Arrow/></a>
                <a className="btn btn-ghost" href="#film"><span className="play" aria-hidden="true"/>Vezi filmul</a>
              </div>
            </div>
            <p className="hero-cap"><span className="kicker">Fațada YACHT KID</span>Ce ai văzut până acum era chiar ea: balcoane continue, colțuri rotunjite, sticlă între etaje.</p>
            <a className="hero-scroll" href="#manifest"><span>Derulează</span><i aria-hidden="true"/></a>
          </div>
        </section>

        {/* 01 · Manifestul: textul se aprinde cuvânt cu cuvânt pe măsură ce cobori */}
        <section id="manifest" className="mf" aria-label="Despre YACHT KID">
          <div className="wrap">
            <p className="kicker" data-rv>Despre proiect</p>
            <p className="mf-t">
              {MANIFEST.split(' ').map((w, i) => <span key={i} className={`mf-w${MANIFEST_ACCENT.has(w) ? ' acc' : ''}`}>{w} </span>)}
            </p>
            <div className="mf-cols">
              <div data-rv><span className="mf-n">01</span><h2>Locație și investiție</h2><p>O poziție exclusivistă, la câțiva pași de apă, cu un potențial constant de creștere a cererii și o valoare solidă pe termen lung.</p></div>
              <div data-rv style={{'--d': '90ms'}}><span className="mf-n">02</span><h2>Locuințe și comunitate</h2><p>Apartamente moderne, inclusiv locuințe cu piscine private, și o comunitate întreagă la parter: cafenea, magazin, beauty și wellness.</p></div>
              <div data-rv style={{'--d': '180ms'}}><span className="mf-n">03</span><h2>Lux fără costuri ascunse</h2><p>Construit la cele mai înalte standarde, cu unele dintre cele mai reduse costuri de mentenanță din București: de la 6 RON/m².</p></div>
            </div>
          </div>
        </section>

        {/* 02 · Detaliile fațadei, pe orizontală. O bandă albă continuă leagă fotografiile, ca balconul care leagă camerele. */}
        <section id="detalii" className="gl" aria-labelledby="gl-t">
          <div className="gl-pin">
            <div className="gl-head">
              <p className="kicker">Arhitectura</p>
              <h2 id="gl-t" className="h2">Detaliile care fac fațada de neconfundat.</h2>
              <p className="gl-count"><span data-gl-i>01</span> / {String(DETALII.length).padStart(2, '0')}</p>
            </div>
            <div className="gl-track" data-gl-track>
              <svg className="gl-band" aria-hidden="true"><path className="gl-band-sh"/><path className="gl-band-mn"/></svg>
              {DETALII.map((d, i) => (
                <figure key={d.img} className={`gl-panel ${i % 2 ? 'lo' : 'hi'}`} data-gl-panel>
                  <div className="gl-img"><img src={d.img} alt={d.t} loading={i > 1 ? 'lazy' : undefined}/></div>
                  <figcaption><span className="gl-n">{String(i + 1).padStart(2, '0')}</span><strong>{d.t}</strong><span>{d.d}</span></figcaption>
                </figure>
              ))}
              <div className="gl-end">
                <p className="h3">Premiat la 5 competiții internaționale de renume.</p>
                <a className="link" href="/category/premii/">Vezi premiile <Arrow/></a>
              </div>
            </div>
          </div>
        </section>

        {/* 03 · Cifrele, ca etaje retrase în trepte */}
        <section id="cifre" className="cf" aria-labelledby="cf-t">
          <div className="wrap cf-head">
            <p className="kicker" data-rv>În cifre</p>
            <h2 id="cf-t" className="h2" data-rv style={{'--d': '80ms'}}>Patru motive, etaj cu etaj.</h2>
          </div>
          <div className="cf-stack">
            {CIFRE.map((c, i) => (
              <div key={c.l} className="cf-slab" style={{'--i': i}} data-rv>
                <p className="cf-v">
                  {c.pre && <small>{c.pre}</small>}
                  <span className="cf-num" data-count={c.to || undefined}>{c.txt}</span>
                  {c.u && <span className="cf-u">{c.u}</span>}
                </p>
                <p className="cf-l">{c.l}</p>
              </div>
            ))}
          </div>
        </section>

        {/* 04 · Apartamentele: patru benzi, una se deschide. Duplexul ocupă două etaje. */}
        <section id="apartamente" className="ap" aria-labelledby="ap-t">
          <div className="wrap ap-grid">
            <div className="ap-intro">
              <p className="kicker" data-rv>Colecția de apartamente</p>
              <h2 id="ap-t" className="h2" data-rv style={{'--d': '80ms'}}>Alege-ți etajul.</h2>
              <p className="lead" data-rv style={{'--d': '140ms'}}>Design modern, finisaje de înaltă clasă și confort, într-o experiență superioară de locuire. Apartamentele de la parter au piscine private.</p>
              <div className="ap-window" data-rv style={{'--d': '200ms'}}>
                <video muted loop playsInline preload="none" poster="/video/prezentare-yacht-kid-residence.jpg" data-autoplay>
                  <source src="/video/prezentare-yacht-kid-residence-720.mp4" type="video/mp4"/>
                </video>
                <span className="ap-window-cap">YACHT KID Residence · film</span>
              </div>
            </div>
            <div className="ap-stack" role="tablist" aria-label="Tipuri de apartamente" aria-orientation="vertical">
              {APTS.map((a, i) => {
                const on = i === apt;
                return (
                  <div key={a.k} className={`ap-slab${on ? ' on' : ''}${a.k === 'D' ? ' dx' : ''}`} style={{'--i': i}}>
                    <button role="tab" id={`ap-tab-${i}`} aria-selected={on} aria-controls={`ap-p-${i}`} className="ap-tab"
                      onClick={() => setApt(i)} onMouseEnter={() => setApt(i)}>
                      <span className="ap-k">{a.k}</span>
                      <span className="ap-t">{a.t}</span>
                      <span className="ap-mp">{a.mp} m²</span>
                    </button>
                    <div id={`ap-p-${i}`} role="tabpanel" aria-labelledby={`ap-tab-${i}`} className="ap-panel" hidden={!on}>
                      <span className="ap-big" aria-hidden="true">{a.k}</span>
                      <dl>
                        <div><dt>Suprafață</dt><dd>{a.mp} m²</dd></div>
                        <div><dt>Preț</dt><dd>de la {a.pret} € <small>+ TVA</small></dd></div>
                        {a.s && <div><dt>Configurație</dt><dd>{a.s}</dd></div>}
                      </dl>
                      <a className="btn btn-navy" href={a.href}>Vezi apartamentele <Arrow/></a>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* Premiile: o bandă care curge mai repede când derulezi mai repede */}
        <section className="aw" aria-label="Premii">
          <div className="aw-band">
            <div className="aw-track" data-marquee>
              {[0, 1].map(k => (
                <div className="aw-set" key={k} aria-hidden={k === 1}>
                  {PREMII.map(p => <span key={p}>{p}<i/></span>)}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 05 · Filmul: fereastra se deschide pe măsură ce cobori, până devine tot ecranul */}
        <section id="film" className="fm" aria-label="Film de prezentare">
          <div className="fm-pin">
            <div className="fm-frame" data-fm-frame>
              <video muted loop playsInline preload="none" poster="/video/yacht-kid-lifestyle.jpg" data-autoplay>
                <source src="/video/yacht-kid-lifestyle-720.mp4" type="video/mp4"/>
              </video>
            </div>
            <p className="fm-t" data-fm-t><span>Lumină.</span> <span>Linie.</span> <span>Lac.</span></p>
          </div>
        </section>

        {/* 06 · Locația: cele trei linii de apă din logo, vii */}
        <section id="locatie" className="lc" aria-labelledby="lc-t">
          <svg className="waves" aria-hidden="true" preserveAspectRatio="none"><path/><path/><path/></svg>
          <div className="wrap lc-grid">
            <div>
              <p className="kicker" data-rv>Locație</p>
              <h2 id="lc-t" className="h2" data-rv style={{'--d': '80ms'}}>Pe malul lacului, cu deschidere către parc.</h2>
              <p className="lead" data-rv style={{'--d': '140ms'}}>În nordul capitalei, cu acces rapid la parcuri, centre comerciale, restaurante de top și săli de fitness. Totul, la câțiva pași de apă.</p>
              <a className="link" href={MAPS} target="_blank" rel="noopener" data-rv style={{'--d': '200ms'}}>Str. Anton Holban 6, București <Arrow/></a>
            </div>
            <div className="lc-floor" data-rv style={{'--d': '120ms'}}>
              <p className="lc-floor-h"><span>P</span> La parter, pentru rezidenți</p>
              <ul>{PARTER.map((p, i) => <li key={p} style={{'--i': i}}>{p}</li>)}</ul>
              <p className="lc-floor-h"><span>+</span> În jurul clădirii</p>
              <ul className="lc-more"><li>Parc de 10.000 m²</li><li>Promenadă publică</li><li>Pază 24/7, camere CCTV</li></ul>
            </div>
          </div>
        </section>

        {/* 07 · Contact: pagina albă coboară în trepte în navy, ca planșeul care se întoarce după colț */}
        <section id="contact" className="ct" aria-labelledby="ct-t">
          <svg className="ct-edge" viewBox="0 0 1440 160" preserveAspectRatio="none" aria-hidden="true">
            <path d="M0 0 H520 C600 0 620 120 700 120 H1440 V160 H0 Z"/>
          </svg>
          <div className="wrap ct-grid">
            <div>
              <p className="kicker kicker-coral" data-rv>Vizionare</p>
              <h2 id="ct-t" className="ct-t" data-rv style={{'--d': '80ms'}}>Hai să facem primul pas spre locuința ta de vis.</h2>
              <p className="ct-sub" data-rv style={{'--d': '140ms'}}>Experimentează un nou standard de viață.</p>
              <div className="ct-act" data-rv style={{'--d': '200ms'}}>
                <a className="btn btn-coral btn-lg" href="/programeaza-o-vizionare/" data-magnet>Programează vizionare <Arrow/></a>
                <a className="btn btn-line" href="/contact/">Solicită ofertă</a>
              </div>
            </div>
            <dl className="ct-info" data-rv style={{'--d': '160ms'}}>
              <div><dt>Telefon</dt><dd><a href={TEL_HREF}>{TEL}</a></dd></div>
              <div><dt>Email</dt><dd><a href={`mailto:${MAIL}`}>{MAIL}</a></dd></div>
              <div><dt>WhatsApp</dt><dd><a href={WA} target="_blank" rel="noopener">Scrie-ne pe WhatsApp</a></dd></div>
              <div><dt>Showroom</dt><dd>Str. Anton Holban 6, București 077190<br/>Luni – Vineri, 09:00 – 17:00</dd></div>
            </dl>
          </div>
          <footer className="ft wrap">
            <Logo className="logo logo-neg"/>
            <nav aria-label="Subsol">
              <a href="/apartamente-2-camere/">Apartamente</a><a href="/spatii-comerciale/">Spații comerciale</a><a href="/tehnologie/">Tehnologie</a>
              <a href="/comunitate/">Comunitate</a><a href="/blog/">Blog</a><a href="/politica-de-confidentialitate/">Confidențialitate</a>
              <a href="/politica-cookies/">Cookie-uri</a><a href="/termeni-si-conditii/">Termeni</a>
            </nav>
            <p className="ft-legal">© 2026 YACHT KID · KID PROJECT DESIGN S.R.L. · CUI RO38632756 · J2017020922403</p>
          </footer>
        </section>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------------------------------------ */
/* Motorul de mișcare: o singură buclă rAF citește derularea și cursorul și actualizează doar ce e în ecran. */

const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
const easeOut = t => 1 - Math.pow(1 - t, 3);
const f1 = n => Math.round(n * 10) / 10;

// Offset paralel al unei polilinii (spre normala din dreapta sensului de mers), cu colțuri în unghi
function offsetPts(pts, d) {
  const n = pts.length, N = [];
  for (let i = 0; i < n - 1; i++) {
    const dx = pts[i + 1][0] - pts[i][0], dy = pts[i + 1][1] - pts[i][1], l = Math.hypot(dx, dy) || 1;
    N.push([-dy / l, dx / l]);
  }
  return pts.map((p, i) => {
    if (i === 0) return [p[0] + N[0][0] * d, p[1] + N[0][1] * d];
    if (i === n - 1) return [p[0] + N[n - 2][0] * d, p[1] + N[n - 2][1] * d];
    const a = N[i - 1], b = N[i];
    let mx = a[0] + b[0], my = a[1] + b[1];
    const ml = Math.hypot(mx, my) || 1; mx /= ml; my /= ml;
    const k = d / Math.max(mx * a[0] + my * a[1], .25);
    return [p[0] + mx * k, p[1] + my * k];
  });
}

// Polilinie cu colțuri rotunjite (aproximare de arc cu Bézier cubic), raze diferite pe fiecare colț
function roundPath(pts, radii) {
  let d = `M${f1(pts[0][0])} ${f1(pts[0][1])}`;
  for (let i = 1; i < pts.length - 1; i++) {
    const p = pts[i - 1], v = pts[i], q = pts[i + 1];
    const l1 = Math.hypot(v[0] - p[0], v[1] - p[1]) || 1, l2 = Math.hypot(q[0] - v[0], q[1] - v[1]) || 1;
    const r = Math.min(radii[i] ?? radii, l1 * .5, l2 * .5);
    const a = [v[0] - (v[0] - p[0]) / l1 * r, v[1] - (v[1] - p[1]) / l1 * r];
    const b = [v[0] + (q[0] - v[0]) / l2 * r, v[1] + (q[1] - v[1]) / l2 * r];
    const k = .552;
    d += ` L${f1(a[0])} ${f1(a[1])} C${f1(a[0] + (v[0] - a[0]) * k)} ${f1(a[1] + (v[1] - a[1]) * k)} ${f1(b[0] + (v[0] - b[0]) * k)} ${f1(b[1] + (v[1] - b[1]) * k)} ${f1(b[0])} ${f1(b[1])}`;
  }
  const z = pts[pts.length - 1];
  return d + ` L${f1(z[0])} ${f1(z[1])}`;
}

function engine() {
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const NS = 'http://www.w3.org/2000/svg';
  const off = [];
  const on = (el, ev, fn, o) => { el.addEventListener(ev, fn, o); off.push(() => el.removeEventListener(ev, fn, o)); };

  let W = innerWidth, H = innerHeight, sy = scrollY, prevSy = sy, vel = 0, raf = 0, last = performance.now();
  const t0 = last;
  const mouse = {x: 0, y: 0, sx: 0, sy: 0};
  const tops = {};

  /* ---------- Hero ---------- */
  const hero = $('#fatada'), svg = $('.hero-svg'), sky = $('.hero-sky'), gBands = $('.hero-bands');
  const photo = $('.hero-photo'), image = $('.hero-photo image'), tint = $('.hero-tint');
  const copy = $('.hero-copy'), cap = $('.hero-cap'), scrollHint = $('.hero-scroll');
  let bands = [], g = 60, base = [], cross = [], heroDirty = true, built = reduce;
  const BUILD = 1500;

  function heroPts(p) {
    const mx = mouse.sx, my = mouse.sy, sink = p * H * .1;
    if (W < 760) {
      return [[.03 * W, -.3 * H], [.07 * W + mx * 6, .76 * H + sink], [.9 * W + mx * 6, .76 * H + sink + my * 6], [.97 * W, .56 * H + sink], [1.4 * W, .5 * H + sink]];
    }
    return [
      [.19 * W + mx * .012 * W, -.3 * H],
      [.32 * W + mx * .03 * W, .7 * H + my * .025 * H + sink],
      [.82 * W + mx * .025 * W, .7 * H + my * .04 * H + sink],
      [.885 * W + mx * .01 * W, .4 * H + sink * .6],
      [1.35 * W, .33 * H + sink * .6]
    ];
  }

  function buildBands() {
    g = clamp(H * .072, 30, 76);
    const n = Math.ceil(Math.max(.42 * W, .45 * H) / g) + 2;
    gBands.textContent = '';
    bands = [];
    for (let i = 0; i < n; i++) {
      const grp = document.createElementNS(NS, 'g');
      const mk = c => { const p = document.createElementNS(NS, 'path'); p.setAttribute('class', c); p.setAttribute('pathLength', '1'); grp.append(p); return p; };
      bands.push({grp, sh: mk('b-sh'), ed: mk('b-ed'), mn: mk('b-mn'), hl: mk('b-hl')});
      gBands.append(grp);
    }
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    image.setAttribute('width', W); image.setAttribute('height', H);
    tint.setAttribute('width', W); tint.setAttribute('height', H);
    heroDirty = true;
  }

  function drawHero(now) {
    const p = clamp(sy / Math.max(1, hero.offsetHeight - H));
    const e = easeIO(p);
    base = heroPts(e);
    cross = base.map((v, i) => {
      if (i === 0 || i === base.length - 1) return 0;
      const a = [v[0] - base[i - 1][0], v[1] - base[i - 1][1]], b = [base[i + 1][0] - v[0], base[i + 1][1] - v[1]];
      return Math.sign(a[0] * b[1] - a[1] * b[0]);
    });
    const R0 = g * 1.9, tf = lerp(.8, 0, e);
    const el = now - t0;
    let building = false;

    // Cerul: zona din interiorul „bolului”, unde stă titlul
    const skyD = roundPath(base, base.map(() => R0));
    sky.setAttribute('d', `${skyD} L${f1(1.4 * W)} ${f1(-.4 * H)} L${f1(base[0][0])} ${f1(-.4 * H)} Z`);
    sky.style.opacity = String(1 - easeIO(clamp((p - .35) / .5)));

    bands.forEach((b, i) => {
      const d = i * g + g * .5;
      const pts = offsetPts(base, d);
      const radii = cross.map(c => Math.max(g * .35, R0 - c * d));
      const path = roundPath(pts, radii);
      let k = 1;
      if (!built) {
        k = easeOut(clamp((el - 120 - i * 85) / BUILD));
        if (k < 1) building = true;
      }
      const th = g * tf * (built ? 1 : .35 + .65 * k);
      if (th < .4) { b.grp.style.display = 'none'; return; }
      b.grp.style.display = '';
      const dash = built || k >= 1 ? 'none' : `${k} 2`;
      for (const s of [b.sh, b.ed, b.mn, b.hl]) { s.setAttribute('d', path); s.style.strokeDasharray = dash; }
      b.sh.style.strokeWidth = th; b.sh.setAttribute('transform', `translate(0 ${f1(th * .22)})`);
      b.ed.style.strokeWidth = th + 1.5;
      b.mn.style.strokeWidth = th;
      b.hl.style.strokeWidth = th * .42; b.hl.setAttribute('transform', `translate(0 ${f1(-th * .2)})`);
    });
    if (!built && !building && el > 300) built = true;

    // Sticla dintre benzi: la început palidă, apoi lasă să se vadă clădirea reală
    const intro = reduce ? 1 : easeOut(clamp((el - 600) / 1400));
    tint.style.opacity = String(lerp(1, .55, intro) * (1 - e));
    photo.setAttribute('transform', `translate(${f1(-mouse.sx * 14)} ${f1(-mouse.sy * 10)}) scale(${f1((1.08 - .08 * e) * 1000) / 1000})`);
    photo.style.transformOrigin = 'center';

    copy.style.transform = `translate3d(0, ${f1(-p * H * .18)}px, 0)`;
    copy.style.opacity = String(1 - clamp(p * 2.2));
    cap.style.opacity = String(clamp((p - .62) / .25));
    cap.style.transform = `translate3d(0, ${f1((1 - clamp((p - .62) / .25)) * 30)}px, 0)`;
    scrollHint.style.opacity = String(1 - clamp(p * 5));
    return building;
  }

  /* ---------- Manifest ---------- */
  const mfWords = $$('.mf-w'), mfText = $('.mf-t');
  let mfLit = -1;
  function drawManifest() {
    const r = mfText.getBoundingClientRect();
    const p = clamp((H * .82 - r.top) / (r.height + H * .25));
    const lit = Math.round(p * mfWords.length);
    if (lit === mfLit) return;
    mfLit = lit;
    mfWords.forEach((w, i) => w.classList.toggle('lit', i < lit));
  }

  /* ---------- Galeria orizontală ---------- */
  const gl = $('#detalii'), track = $('[data-gl-track]'), panels = $$('[data-gl-panel]');
  const glBand = $('.gl-band'), glMain = $('.gl-band-mn'), glSh = $('.gl-band-sh'), glI = $('[data-gl-i]');
  let glDist = 0, glLen = 0, glIdx = -1;
  function layoutGallery() {
    track.style.transform = 'none';
    const tw = track.scrollWidth;
    glDist = Math.max(0, tw - W);
    gl.style.height = `${glDist + H}px`;
    const tr = track.getBoundingClientRect();
    glBand.setAttribute('width', tw); glBand.setAttribute('height', tr.height);
    glBand.setAttribute('viewBox', `0 0 ${tw} ${tr.height}`);
    // Banda trece prin spatele fiecărei fotografii, la înălțimea ei, și coboară/urcă în diagonală între ele
    const cs = panels.map(p => { const r = p.querySelector('.gl-img').getBoundingClientRect(); return {l: r.left - tr.left, r: r.right - tr.left, y: r.top - tr.top + r.height * .62}; });
    const pts = [[-40, cs[0].y]];
    cs.forEach(c => { pts.push([c.l + 20, c.y]); pts.push([c.r - 20, c.y]); });
    pts.push([tw + 40, cs[cs.length - 1].y]);
    const r = Math.min(110, W * .08);
    const d = roundPath(pts, r);
    glMain.setAttribute('d', d); glSh.setAttribute('d', d);
    glLen = glMain.getTotalLength();
    glMain.style.strokeDasharray = glSh.style.strokeDasharray = `${glLen} ${glLen}`;
  }
  function drawGallery() {
    const top = tops.detalii;
    const p = clamp((sy - top) / Math.max(1, glDist));
    track.style.transform = `translate3d(${f1(-p * glDist)}px,0,0)`;
    const draw = clamp(p * 1.05 + .12);
    glMain.style.strokeDashoffset = glSh.style.strokeDashoffset = String(glLen * (1 - draw));
    panels.forEach(pn => {
      const r = pn.getBoundingClientRect();
      const c = (r.left + r.width / 2 - W / 2) / W;
      pn.style.setProperty('--px', f1(c * -7) + '%');
    });
    const idx = Math.min(panels.length - 1, Math.round(p * (panels.length - 1)));
    if (idx !== glIdx) { glIdx = idx; glI.textContent = String(idx + 1).padStart(2, '0'); }
  }

  /* ---------- Film ---------- */
  const fm = $('#film'), frame = $('[data-fm-frame]'), fmT = $('[data-fm-t]');
  function drawFilm() {
    const p = clamp((sy - tops.film) / Math.max(1, fm.offsetHeight - H));
    const e = easeIO(clamp(p / .7));
    const ix = lerp(W < 760 ? .07 * W : .26 * W, 0, e), iy = lerp(.2 * H, 0, e), r = lerp(W < 760 ? 120 : 220, 0, e);
    frame.style.clipPath = `inset(${f1(iy)}px ${f1(ix)}px round ${f1(r)}px)`;
    frame.style.setProperty('--z', String(lerp(1.18, 1, e)));
    const words = fmT.children;
    for (let i = 0; i < words.length; i++) words[i].classList.toggle('on', p > .42 + i * .1);
  }

  /* ---------- Valurile ---------- */
  const lc = $('#locatie'), waveSvg = $('.waves'), waves = $$('.waves path');
  function drawWaves(now) {
    const r = lc.getBoundingClientRect();
    if (r.bottom < 0 || r.top > H) return;
    const w = W, h = r.height;
    waveSvg.setAttribute('viewBox', `0 0 ${w} ${h}`);
    const t = now / 1000;
    const mxPx = (mouse.x * .5 + .5) * w;
    waves.forEach((pa, k) => {
      const y0 = h * (.78 + k * .055);
      let d = '';
      for (let x = -20; x <= w + 20; x += 18) {
        const near = Math.exp(-Math.pow((x - mxPx) / (w * .18), 2));
        const a = 7 + near * 16 * (mouse.inside ? 1 : 0);
        const y = y0 + Math.sin(x / 95 + t * 1.1 + k * .9) * a + Math.sin(x / 41 - t * .7) * 2;
        d += (d ? ' L' : 'M') + f1(x) + ' ' + f1(y);
      }
      pa.setAttribute('d', d);
    });
  }

  /* ---------- Premiile ---------- */
  const mq = $('[data-marquee]');
  let mqX = 0;
  function drawMarquee(dt) {
    const half = mq.scrollWidth / 2;
    mqX -= (40 + Math.min(900, Math.abs(vel) * 9)) * dt / 1000;
    if (mqX <= -half) mqX += half;
    mq.style.transform = `translate3d(${f1(mqX)}px,0,0)`;
  }

  /* ---------- Antet și etaje ---------- */
  const hd = $('[data-hd]'), floorLinks = $$('[data-floor]');
  let curFloor = '';
  function drawChrome() {
    hd.classList.toggle('is-slab', sy > H * .6);
    hd.classList.toggle('is-dark', sy + 60 > tops.contact);
    let cur = FLOORS[0].id;
    for (const f of FLOORS) if (tops[f.id] <= sy + H * .45) cur = f.id;
    if (cur !== curFloor) {
      curFloor = cur;
      floorLinks.forEach(a => a.classList.toggle('on', a.dataset.floor === cur));
    }
    document.documentElement.classList.toggle('on-dark', sy + H * .5 > tops.contact);
  }

  /* ---------- Layout ---------- */
  function measure() {
    W = innerWidth; H = innerHeight;
    buildBands();
    layoutGallery();
    for (const f of FLOORS) { const el = document.getElementById(f.id); tops[f.id] = el.getBoundingClientRect().top + scrollY; }
    mfLit = -1;
  }

  /* ---------- Bucla ---------- */
  function frameLoop(now) {
    const dt = Math.min(64, now - last); last = now;
    sy = scrollY;
    vel = lerp(vel, sy - prevSy, .2); prevSy = sy;
    const k = 1 - Math.pow(.001, dt / 1000);
    const pmx = mouse.sx, pmy = mouse.sy;
    mouse.sx = lerp(mouse.sx, mouse.x, k * .9); mouse.sy = lerp(mouse.sy, mouse.y, k * .9);
    const mouseMoved = Math.abs(mouse.sx - pmx) + Math.abs(mouse.sy - pmy) > .0005;

    if (sy < hero.offsetHeight && (heroDirty || mouseMoved || !built || sy !== heroSy)) {
      drawHero(now);
      heroDirty = false;
      heroSy = sy;
    }
    drawManifest();
    if (sy + H > tops.detalii - 50 && sy < tops.detalii + glDist + H) drawGallery();
    if (sy + H > tops.film && sy < tops.film + fm.offsetHeight) drawFilm();
    if (!reduce) { drawWaves(now); drawMarquee(dt); }
    drawChrome();
    raf = requestAnimationFrame(frameLoop);
  }
  let heroSy = -1;

  /* ---------- Evenimente ---------- */
  on(window, 'pointermove', e => {
    mouse.x = e.clientX / W * 2 - 1; mouse.y = e.clientY / H * 2 - 1;
    const r = lc.getBoundingClientRect(); mouse.inside = e.clientY > r.top && e.clientY < r.bottom;
  }, {passive: true});
  let rT = 0;
  on(window, 'resize', () => { clearTimeout(rT); rT = setTimeout(measure, 120); });
  const ro = new ResizeObserver(() => { clearTimeout(rT); rT = setTimeout(measure, 120); });
  ro.observe(document.body);
  off.push(() => ro.disconnect());

  // Apariții la intrarea în ecran
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { e.target.classList.add('in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -8% 0px'});
  $$('[data-rv]').forEach(el => io.observe(el));
  off.push(() => io.disconnect());

  // Contoare
  const cio = new IntersectionObserver(es => es.forEach(e => {
    if (!e.isIntersecting) return;
    cio.unobserve(e.target);
    const el = e.target, to = +el.dataset.count, start = performance.now(), dur = 1600;
    if (reduce) return;
    const tick = n => {
      const t = easeOut(clamp((n - start) / dur));
      el.textContent = Math.round(to * t).toLocaleString('ro-RO');
      if (t < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }), {threshold: .6});
  $$('[data-count]').forEach(el => cio.observe(el));
  off.push(() => cio.disconnect());

  // Video doar cât e în ecran
  const vio = new IntersectionObserver(es => es.forEach(e => {
    const v = e.target;
    if (e.isIntersecting && !reduce) { v.preload = 'auto'; v.play().catch(() => {}); } else v.pause();
  }), {threshold: .15});
  $$('[data-autoplay]').forEach(v => vio.observe(v));
  off.push(() => vio.disconnect());

  // Butoane magnetice: urmăresc discret cursorul, doar pe dispozitive cu mouse
  if (!reduce && matchMedia('(hover: hover)').matches) {
    $$('[data-magnet]').forEach(b => {
      on(b, 'pointermove', e => {
        const r = b.getBoundingClientRect();
        b.style.transform = `translate(${f1((e.clientX - r.left - r.width / 2) * .22)}px, ${f1((e.clientY - r.top - r.height / 2) * .3)}px)`;
      });
      on(b, 'pointerleave', () => { b.style.transform = ''; });
    });
  }

  measure();
  document.documentElement.classList.add('v3-ready');
  if (reduce) { built = true; }
  raf = requestAnimationFrame(frameLoop);

  return () => { cancelAnimationFrame(raf); clearTimeout(rT); off.forEach(f => f()); document.documentElement.classList.remove('v3-ready'); };
}
