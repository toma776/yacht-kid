'use client';
// Turul prin apartament: piesa centrală a homepage-ului v5. Alegi tipul de apartament și treci din cameră în cameră,
// cu fotografiile reale ale fiecărui spațiu. Secțiunea rămâne pe ecran cât derulezi: camera următoare se deschide ca
// o ușă în mijlocul celei în care ești (un gol care se lărgește), în timp ce camera curentă se apropie, ca la un pas
// înainte. În dreapta, traseul camerelor (click = mergi direct acolo); jos, numele camerei și datele tipului.
// Fără mișcare (cerută de sistem sau fără script): camerele sunt o grilă simplă de fotografii cu nume.
import {useEffect, useRef, useState} from 'react';
import {Icon} from '../../../site/ui/Icons.jsx';

const num = i => String(i + 1).padStart(2, '0');
const clamp = v => Math.min(1, Math.max(0, v)), ease = t => t * t * (3 - 2 * t);
// Cât din drumul dintre două camere e „mers” până începe să se deschidă ușa următoarei
const REST = .42;

export default function Tour({data, t}) {
  const [ti, setTi] = useState(0), [active, setActive] = useState(0);
  const root = useRef(null), jump = useRef(false);
  const type = data?.types[ti], rooms = type?.rooms ?? [], n = rooms.length;

  useEffect(() => {
    const el = root.current;
    if (!el || n < 2 || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    // La schimbarea tipului intri pe ușa noului apartament: turul pornește din prima cameră
    if (jump.current) { jump.current = false; window.scrollTo({top: el.getBoundingClientRect().top + window.scrollY, behavior: 'instant'}); }
    const figs = [...el.querySelectorAll('.r5-room')];
    let raf = 0;
    const frame = () => {
      raf = 0;
      const r = el.getBoundingClientRect(), vh = innerHeight;
      if (r.bottom < -vh || r.top > 2 * vh) return;
      const P = clamp(-r.top / Math.max(1, r.height - vh)) * (n - 1);
      const open = i => i === 0 ? 1 : ease(clamp((P - (i - 1) - REST) / (1 - REST)));
      figs.forEach((f, i) => {
        const o = open(i), z = i < n - 1 ? open(i + 1) : 0;
        f.style.setProperty('--o', o.toFixed(4));
        f.style.setProperty('--z', z.toFixed(4));
        f.style.visibility = o <= 0 || z >= 1 ? 'hidden' : 'visible';   // doar camera curentă și cea care se deschide
      });
      el.style.setProperty('--p', (P / (n - 1)).toFixed(4));
      const a = Math.min(n - 1, Math.floor(P + (1 - REST) / 2));
      setActive(prev => prev === a ? prev : a);
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame();
    addEventListener('scroll', on, {passive: true});
    addEventListener('resize', on);
    return () => { removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, [ti, n]);

  if (!type) return null;

  const goTo = i => {
    const el = root.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    window.scrollTo({top: r.top + window.scrollY + (r.height - innerHeight) * (i / Math.max(1, n - 1)), behavior: 'smooth'});
  };
  const pickType = i => { if (i !== ti) { jump.current = true; setActive(0); setTi(i); } };

  return (
    <section className="r5" id="tur" ref={root} style={{'--n': n}} aria-labelledby="r5-title">
      <div className="r5-pin">
        <div className="r5-rooms" key={type.id}>
          {rooms.map((room, i) => (
            <figure key={room.key} className="r5-room" style={{'--o': i === 0 ? 1 : 0}}>
              <img src={room.image.src} srcSet={room.image.srcSet} sizes="100vw" alt={room.alt} loading={i === 0 ? 'eager' : 'lazy'} decoding="async"/>
              <figcaption>{room.label}</figcaption>
            </figure>
          ))}
        </div>
        <div className="r5-shade" aria-hidden="true"/>

        <div className="h5-wrap r5-top">
          <p className="v5-eyebrow r5-eyebrow">{t.tourEyebrow}</p>
          <h2 className="r5-title" id="r5-title">{t.tourHeading}</h2>
          <div className="r5-types" role="group" aria-label={t.tourTypes}>
            {data.types.map((x, i) => (
              <button key={x.id} type="button" aria-pressed={i === ti} onClick={() => pickType(i)}>{x.short}</button>
            ))}
          </div>
        </div>

        <div className="r5-now" aria-live="polite">
          <span className="r5-count">{num(active)} <i>/ {num(n - 1)}</i></span>
          <span className="r5-names">
            {rooms.map((room, i) => <b key={room.key} data-on={i === active || undefined} aria-hidden={i !== active}>{room.label}</b>)}
          </span>
          <span className="r5-hint" data-on={active === 0 || undefined}>{t.tourHint}</span>
        </div>

        <ol className="r5-route" aria-label={t.tourRoute}>
          {rooms.map((room, i) => (
            <li key={room.key} data-on={i === active || undefined} data-done={i < active || undefined}>
              <button type="button" onClick={() => goTo(i)} aria-current={i === active ? 'step' : undefined}>
                <span>{room.label}</span><i aria-hidden="true"/>
              </button>
            </li>
          ))}
        </ol>

        <div className="r5-sum">
          <p className="r5-sum-name">{type.name}</p>
          <p className="r5-sum-meta">{[type.area, type.price].filter(Boolean).join(' · ')}</p>
          <a className="v5-btn v5-btn--light" href={type.href}>{type.viewLabel} <Icon id="arrow" size={16}/></a>
        </div>
      </div>
    </section>
  );
}
