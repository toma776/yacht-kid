'use client';

import {useEffect, useState} from 'react';
import {Tile, Arrow, Eyebrow, Bar, ContactTiles, FooterTiles, useMotion} from '../shared';

// Pagina „Apartamente 2 camere” în limbajul v4: aceleași tile-uri cu un colț rotunjit, fără linii.
// Conținutul e cel al paginii actuale (/apartamente-2-camere/); fotografiile vin din Brain (/media/…).

const media = (id, w = 1200) => `/media/${id}/?w=${w}`;

const FACTS = [
  ['Suprafață', '61,9 – 66,24', ' m²'], ['Etaj', '1 – 8', ''], ['Băi', '1', ''],
  ['Terasă', '10,5 – 18,3', ' m²'], ['Balcon', 'Da', ''], ['Preț de la', '210.000 €', ' + TVA']
];

// Fotografiile galeriei, cu dimensiunea tile-ului fiecăreia (coloane din 12; toate pe două rânduri)
const PHOTOS = [
  [214, 'Apartament cu 2 camere, living', 5], [218, 'Living modern cu canapea modulară, zonă de dining și ferestre largi', 3],
  [217, 'Living modern cu canapea, măsuțe rotunde și ferestre largi', 3], [120, 'Living modern cu canapea, masă de dining și mobilier închis', 6], [121, 'Living modern cu zonă de dining și bucătărie deschisă', 3],
  [122, 'Bucătărie modernă cu mobilier din lemn și blat negru', 5], [123, 'Bucătărie modernă cu mobilier din lemn, blat negru și cuptor încorporat', 3], [124, 'Hol de intrare cu ușă albă și pardoseală din lemn', 4],
  [125, 'Baie modernă cu finisaje marmură, toaletă suspendată și duș', 3], [126, 'Baie, detaliu de design interior', 4], [127, 'Lavoar alb cu baterie cromată într-o baie modernă', 5],
  [38, 'Cameră modernă de apartament cu parchet din lemn și ușă vitrată', 4], [37, 'Cameră goală cu parchet și ferestre mari către atrium', 3], [39, 'Cameră goală cu parchet deschis și ușă neagră', 3], [36, 'Panou negru de control inteligent montat pe perete', 2]
];

const OTHERS = [
  {t: 'Apartamente 3 camere', d: '87,6 – 115,1 m² · de la 390.000 € + TVA', href: '/apartamente-3-camere/', id: 248},
  {t: 'Apartamente 4 camere', d: '136 – 186,8 m² · de la 690.000 € + TVA', href: '/apartamente-4-camere/', id: 215},
  {t: 'Apartamente tip duplex', d: '219 – 246 m² · de la 1.495.000 € + TVA', href: '/duplex/', id: 280}
];

function Lightbox({at, setAt}) {
  const video = at === 'video';
  const n = PHOTOS.length;
  useEffect(() => {
    const key = e => {
      if (e.key === 'Escape') setAt(null);
      if (!video && e.key === 'ArrowRight') setAt(i => (i + 1) % n);
      if (!video && e.key === 'ArrowLeft') setAt(i => (i + n - 1) % n);
    };
    addEventListener('keydown', key);
    document.body.style.overflow = 'hidden';
    return () => { removeEventListener('keydown', key); document.body.style.overflow = ''; };
  }, [video, n, setAt]);
  return (
    <div className="lb" role="dialog" aria-modal="true" aria-label={video ? 'Video de prezentare' : 'Galerie foto'} onClick={e => { if (e.target === e.currentTarget) setAt(null); }}>
      <button className="lb-x" onClick={() => setAt(null)} aria-label="Închide">×</button>
      {video ? (
        <video className="lb-media" controls autoPlay playsInline poster="/video/prezentare-yacht-kid-residence.jpg">
          <source src="/video/prezentare-yacht-kid-residence-1080.mp4" type="video/mp4"/>
        </video>
      ) : (
        <>
          <button className="lb-nav lb-prev" onClick={() => setAt((at + n - 1) % n)} aria-label="Fotografia anterioară">‹</button>
          <img className="lb-media" src={media(PHOTOS[at][0], 1920)} alt={PHOTOS[at][1]}/>
          <button className="lb-nav lb-next" onClick={() => setAt((at + 1) % n)} aria-label="Fotografia următoare">›</button>
          <p className="lb-count">{at + 1} / {n}</p>
        </>
      )}
    </div>
  );
}

export default function Unit() {
  useMotion();
  const [at, setAt] = useState(null);

  return (
    <>
      <Bar base="/v4/"/>

      <main id="top" className="grid">
        {/* ——— Intro ——— */}
        <Tile k="u-intro" c={6} r={3} tone="w" className="head unit-intro">
          <nav className="crumbs" aria-label="Unde te afli">
            <a href="/v4/">Pagina principală</a><span>/</span><a href="/v4/#apartamente">Apartamente</a><span>/</span><b>Apartamente 2 camere</b>
          </nav>
          <Eyebrow>Apartamente</Eyebrow>
          <h1>Apartamente 2 camere</h1>
          <p className="lead">Descoperă colecția YACHT KID de apartamente cu două camere. Proiectate impecabil pentru persoane sau cupluri care doresc un mix perfect de lux și practică, unitățile rezidențiale oferă interioare moderne și cele mai noi tehnologii.</p>
          <div className="actions">
            <a className="btn btn--navy" href="#contact">Solicită ofertă <Arrow/></a>
            <a className="btn btn--line" href="/programeaza-o-vizionare/">Programează o vizionare <Arrow/></a>
          </div>
        </Tile>
        <div className="tile tone-img is-img unit-cover k-tr" style={{'--c': 6, '--c6': 6, '--c2': 2, '--r': 4, '--rad': '160px'}}>
          <img src={media(214, 1920)} alt="Apartamente 2 camere" fetchPriority="high" data-par=""/>
        </div>
        <Tile k="u-ron" c={3} tone="g2" className="kpi"><p className="lbl">Mentenanță de la doar</p><p className="big">6<small> RON/m²</small></p></Tile>
        <Tile k="u-index" c={3} tone="g1" className="index">
          <p className="lbl">Pe această pagină</p>
          <ul>
            <li><a href="#caracteristici">Caracteristici</a></li><li><a href="#galerie">Galerie (15)</a></li>
            <li><a href="#alte-apartamente">Alte apartamente</a></li><li><a href="#contact">Contact</a></li>
          </ul>
        </Tile>

        {/* ——— Specificații: câte una pe tile ——— */}
        {FACTS.map(([l, v, u], i) => (
          <Tile key={l} k={`u-f${i}`} c={2} tone={['w', 'g1', 'w', 'g2', 'g1', 'w'][i]} className="fact">
            <p className="lbl">{l}</p><p className="big">{v}{u ? <small>{u}</small> : null}</p>
          </Tile>
        ))}

        {/* ——— Caracteristici ——— */}
        <Tile k="u-ch" id="caracteristici" c={5} r={2} tone="w" className="head">
          <Eyebrow>Caracteristici</Eyebrow>
          <h2>Un stil de viață aspirațional într-o comunitate prosperă</h2>
        </Tile>
        <button type="button" className="tile tone-img is-img is-link video-tile k-bl" style={{'--c': 7, '--c6': 6, '--c2': 2, '--r': 4, '--rad': '120px'}} onClick={() => setAt('video')} aria-label="Vezi video de prezentare">
          <video autoPlay muted loop playsInline preload="metadata" poster="/video/prezentare-yacht-kid-residence.jpg">
            <source src="/video/prezentare-yacht-kid-residence-720.mp4" type="video/mp4"/>
          </video>
          <span className="play" aria-hidden="true"><svg viewBox="0 0 24 24" width="22" height="22"><path d="M8 5.5v13l11-6.500z" fill="currentColor"/></svg></span>
        </button>
        <Tile k="u-p1" c={5} tone="g1"><p>Amplasate strategic într-o zonă exclusivistă, la doar câțiva pași de lac, apartamentele cu două camere oferă acces rapid la o varietate mare de facilități, oferind mai mult decât o simplă reședință. Alegeți o unitate rezidențială care spune o poveste. Alegeți YACHT KID.</p></Tile>
        <Tile k="u-p2" c={5} tone="g2"><p>Achiziționarea unui apartament cu două camere la YACHT KID aduce beneficii notabile, combinând confortul locuirii cu facilități moderne, o poziționare excelentă în zona de nord a capitalei și economii considerabile la facturile individuale și comune pentru utilități.</p></Tile>

        {/* ——— Galerie: toate cele 15 fotografii, fiecare un tile ——— */}
        <Tile k="u-gh" id="galerie" c={4} r={2} tone="w" className="head">
          <Eyebrow>Galerie</Eyebrow>
          <h2>Apartamente 2 camere</h2>
          <p>15 fotografii. Apasă pe oricare pentru a o vedea mare.</p>
        </Tile>
        {PHOTOS.map(([id, alt, c], i) => (
          <Tile key={id} k={`u-g${id}`} c={c} r={2} image={media(id, c >= 5 ? 1200 : 828)} alt={alt} onClick={() => setAt(i)} label={`Deschide fotografia ${i + 1} din ${PHOTOS.length}: ${alt}`}/>
        ))}
        <Tile k="u-cta1" c={6} tone="g2" href="#contact" className="cta"><span className="go big-go">Solicită ofertă <Arrow/></span></Tile>
        <Tile k="u-cta2" c={6} tone="w" href="/programeaza-o-vizionare/" className="cta"><span className="go big-go">Programează o vizionare <Arrow/></span></Tile>

        {/* ——— Alte apartamente ——— */}
        <Tile k="u-oh" id="alte-apartamente" c={3} r={3} tone="g1" className="head">
          <Eyebrow>Apartamente</Eyebrow>
          <h2>Alte apartamente YACHT KID</h2>
          <p>Descoperă și alte tipuri de apartamente din cadrul YACHT KID, fiecare conceput pentru a oferi un echilibru între design, confort și spațiu.</p>
        </Tile>
        {OTHERS.map(o => <Tile key={o.id} k={`u-oi${o.id}`} c={3} r={2} image={media(o.id, 828)} alt={o.t} href={o.href}/>)}
        {OTHERS.map((o, i) => (
          <Tile key={o.id} k={`u-ot${o.id}`} c={3} tone={['w', 'g2', 'w'][i]} href={o.href} className="other">
            <h3>{o.t}</h3><p>{o.d}</p><span className="go">Vezi detalii <Arrow/></span>
          </Tile>
        ))}

        <ContactTiles tip="Apartamente 2 camere"/>
        <FooterTiles base="/v4/"/>
      </main>

      {at !== null ? <Lightbox at={at} setAt={setAt}/> : null}
    </>
  );
}
