'use client';
// Scena „Despre YACHT KID”: clădirea în 3D (building3d.mjs), desenată din conturul ei real. Secțiunea rămâne pe ecran
// cât derulezi prin ea, în două timpi:
//  1. clădirea pornește ca plan văzut de sus și se ridică etaj cu etaj, în lumina dimineții;
//  2. ziua trece: soarele își parcurge drumul real de pe cer (București, 21 iunie), fațadele se luminează pe rând și
//     umbra clădirii se mută pe sol, de la răsărit spre apus; sus, arcul soarelui și ora.
// Textul trece prin trei momente: titlul, citatul, cifrele capitolelor.
// Fără mișcare (cerută de sistem): clădirea e desenată o dată, întreagă, la amiază, iar textele stau unul sub altul.
import {useEffect, useRef} from 'react';
import {Waves} from './parts';
import {D, FLOOR, clamp, lerp, ease, modelOf, sunAt, renderBuilding} from './building3d.mjs';

// Ziua de vară, în ore solare (12 = soarele la sud): de puțin după răsărit până puțin înainte de apus. La București,
// pe 21 iunie, ceasul (ora de vară) e cu ~1 h 17 min înaintea orei solare.
const DAWN = 5.2, DUSK = 19, RISE = 4.3, SET = 19.7, CLOCK = 1.29, BUILT = .3;
const clock = solar => { const t = solar + CLOCK, h = Math.floor(t), m = Math.floor((t - h) * 60); return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`; };

function draw(ctx, w, h, m, p, sway, label) {
  ctx.clearRect(0, 0, w, h);
  const wide = w >= 1024, vh = Math.min(h, innerHeight);
  const day = clamp((p - BUILT) / (1 - BUILT)), solar = lerp(DAWN, DUSK, day), sun = sunAt(solar);
  const phi = lerp(90, 27, ease(clamp(p / BUILT))) * D;                  // de sus (plan) → înclinat
  const theta = (lerp(-30, 24, p) + sway) * D;                           // rotația lentă
  const build = (m.levels + 1) * ease(clamp((p - .04) / (BUILT - .04))); // câte etaje s-au ridicat (ultimul: acoperișul)
  const s = Math.min(wide ? w * .5 : w, (wide ? vh : vh * .52) * 1.3) / (m.R * (wide ? 2.05 : 2.45));
  const cx = wide ? w * .71 : w / 2;
  const cy = (wide ? vh * .57 : vh * .36) + Math.min(build, m.levels) * FLOOR / 2 * Math.cos(phi) * s;
  renderBuilding(ctx, m, {cx, cy, s, phi, theta, build, sun, shadow: true, outline: lerp(.8, .14, clamp(build / 3))});

  // Arcul soarelui și ora, deasupra clădirii: apar după ce clădirea e ridicată
  const a = clamp((p - BUILT + .03) / .06);
  if (a > 0) {
    const ax = cx, ay = wide ? vh * .2 : vh * .1, rx = wide ? 120 : 92, ry = wide ? 44 : 34;
    const f = clamp((solar - RISE) / (SET - RISE)), ang = Math.PI * (1 - f);
    ctx.globalAlpha = a;
    ctx.strokeStyle = 'rgba(255, 255, 255, .28)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.ellipse(ax, ay, rx, ry, 0, Math.PI, 0); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(ax - rx - 14, ay); ctx.lineTo(ax + rx + 14, ay); ctx.stroke();
    const sx = ax + Math.cos(ang) * rx, sy = ay - Math.sin(ang) * ry, warm = clamp(1 - sun.el / (38 * D));
    ctx.fillStyle = `rgb(255, ${Math.round(lerp(255, 206, warm))}, ${Math.round(lerp(255, 152, warm))})`;
    ctx.shadowColor = ctx.fillStyle; ctx.shadowBlur = 18;
    ctx.beginPath(); ctx.arc(sx, sy, 5.5, 0, Math.PI * 2); ctx.fill(); ctx.shadowBlur = 0;
    ctx.textAlign = 'center'; ctx.fillStyle = '#fff';
    ctx.font = `500 ${wide ? 17 : 15}px Montserrat, system-ui, sans-serif`;
    ctx.fillText(clock(solar), ax, ay + 26);
    ctx.fillStyle = 'rgba(255, 255, 255, .55)'; ctx.font = '600 10px Montserrat, system-ui, sans-serif';
    try { ctx.letterSpacing = '2px'; } catch {}
    ctx.fillText(label.toUpperCase(), ax, ay + 44);
    try { ctx.letterSpacing = '0px'; } catch {}
    ctx.globalAlpha = 1;
  }
}

export default function ProjectScene({data, building, t}) {
  const root = useRef(null), canvas = useRef(null);

  useEffect(() => {
    const el = root.current, cv = canvas.current;
    if (!el || !cv || !building) return;
    const m = modelOf(building), ctx = cv.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, p = still ? .62 : 0, mouse = 0, sway = 0, raf = 0, visible = false, last = '';

    const size = () => {
      const r = cv.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      w = r.width; h = r.height; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const progress = () => {
      if (still) return;
      const r = el.getBoundingClientRect();
      p = clamp(-r.top / Math.max(1, r.height - innerHeight));
      const step = p < .34 ? '0' : p < .68 ? '1' : '2';
      if (el.dataset.step !== step) el.dataset.step = step;
    };
    const frame = () => {
      raf = 0;
      progress();
      sway += (mouse * 6 - sway) * .06;
      const key = `${p.toFixed(4)}|${sway.toFixed(2)}|${w}|${h}`;
      if (key !== last) { last = key; draw(ctx, w, h, m, p, sway, t.daylight); }
      if (visible && !still && Math.abs(mouse * 6 - sway) > .02) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const onMove = e => { mouse = (e.clientX / innerWidth - .5) * 2; kick(); };
    const onResize = () => { size(); last = ''; kick(); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, {rootMargin: '200px 0px'});
    // Pânza își schimbă mărimea și fără resize de fereastră (scena devine „lipită” când pornește mișcarea)
    const ro = new ResizeObserver(onResize);

    size(); progress(); draw(ctx, w, h, m, p, 0, t.daylight);
    io.observe(el); ro.observe(cv);
    addEventListener('scroll', kick, {passive: true});
    addEventListener('resize', onResize);
    if (!still) el.addEventListener('pointermove', onMove);
    document.fonts?.ready.then(() => { last = ''; kick(); });           // ora, cu fontul paginii
    return () => { io.disconnect(); ro.disconnect(); removeEventListener('scroll', kick); removeEventListener('resize', onResize); el.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [building, t.daylight]);

  const stats = data.chapters.map(c => c.stat).filter(Boolean);
  return (
    <div className="s5" ref={root} data-step="0">
      <div className="s5-pin">
        {building && <canvas ref={canvas} className="s5-canvas" role="img" aria-label={t.model3d}/>}
        <div className="h5-wrap s5-copy">
          <div className="s5-slides">
            <div className="s5-slide" data-i="0">
              <p className="v5-eyebrow s5-eyebrow">{data.eyebrow}</p>
              <h2 className="s5-title" id="p5-title">{data.heading}</h2>
            </div>
            {data.quote && (
              <blockquote className="s5-slide s5-quote" data-i="1"><p>{data.quote}</p></blockquote>
            )}
            {stats.length > 0 && (
              <ul className="s5-slide s5-stats" data-i="2">
                {stats.map(s => <li key={s.label}>{s.value && <b>{s.value}</b>}<span>{s.label}</span></li>)}
              </ul>
            )}
          </div>
          <div className="s5-pips" aria-hidden="true"><span/><span/><span/></div>
        </div>
        <Waves className="s5-waves"/>
      </div>
    </div>
  );
}
