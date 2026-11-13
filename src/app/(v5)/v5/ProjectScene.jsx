'use client';
// Scena „Despre YACHT KID”: clădirea în 3D, desenată din conturul ei real (Date firmă → conturul și etajele clădirii),
// pe un canvas 2D, fără biblioteci. Secțiunea rămâne pe ecran cât derulezi prin ea: clădirea pornește ca plan văzut de
// sus, se ridică etaj cu etaj (planșee albe cu margine rotunjită, sticlă între ele, ca fațada) și se rotește încet;
// textul trece prin trei momente: titlul, citatul, cifrele capitolelor.
// Fără mișcare (cerută de sistem): clădirea e desenată o dată, întreagă, iar cele trei texte stau unul sub altul.
import {useEffect, useRef} from 'react';
import {Words, Waves} from './parts';

const D = Math.PI / 180, FLOOR = 3.2, SLAB = 0.85, OVER = 1.6;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = t => t * t * (3 - 2 * t), easeOut = t => 1 - (1 - t) ** 3, lerp = (a, b, t) => a + (b - a) * t;
const mix = (a, b, t) => `rgb(${a.map((v, i) => Math.round(lerp(v, b[i], t))).join(',')})`;
const SLAB_DARK = [176, 188, 212], SLAB_LIGHT = [255, 255, 255], GLASS_DARK = [24, 42, 92], GLASS_LIGHT = [92, 122, 196];

// Conturul împins în afară cu d metri (planșeul iese peste fațadă, ca balcoanele)
function offsetRing(pts, d, sign) {
  const n = pts.length;
  return pts.map((p, i) => {
    const a = pts[(i - 1 + n) % n], b = pts[(i + 1) % n];
    const l1 = Math.hypot(p[0] - a[0], p[1] - a[1]) || 1, l2 = Math.hypot(b[0] - p[0], b[1] - p[1]) || 1;
    const n1 = [(p[1] - a[1]) / l1 * sign, -(p[0] - a[0]) / l1 * sign], n2 = [(b[1] - p[1]) / l2 * sign, -(b[0] - p[0]) / l2 * sign];
    let bx = n1[0] + n2[0], by = n1[1] + n2[1];
    const l = Math.hypot(bx, by) || 1; bx /= l; by /= l;
    const k = d / Math.max(.4, bx * n1[0] + by * n1[1]);
    return [p[0] + bx * k, p[1] + by * k];
  });
}

function modelOf({points, levels}) {
  let area = 0;
  for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sign = area > 0 ? 1 : -1;
  return {ring: points, slab: offsetRing(points, OVER, sign), shadow: offsetRing(points, 7, sign), sign, levels,
    R: Math.max(...points.map(p => Math.hypot(p[0], p[1]))) + OVER};
}

function draw(ctx, w, h, m, p, sway) {
  ctx.clearRect(0, 0, w, h);
  const wide = w >= 1024, vh = Math.min(h, innerHeight);
  const phi = lerp(90, 27, ease(clamp(p / .3))) * D;                    // de sus (plan) → înclinat
  const theta = (lerp(-30, 38, p) + sway) * D;                          // rotația lentă
  const build = (m.levels + 1) * ease(clamp((p - .05) / .45));          // câte etaje s-au ridicat (ultimul: acoperișul)
  const s = Math.min(wide ? w * .5 : w, (wide ? vh : vh * .52) * 1.3) / (m.R * (wide ? 2.05 : 2.45));
  const cx = wide ? w * .71 : w / 2;
  const sp = Math.sin(phi), cp = Math.cos(phi), cos = Math.cos(theta), sin = Math.sin(theta);
  const cy = (wide ? vh * .55 : vh * .33) + Math.min(build, m.levels) * FLOOR / 2 * cp * s;
  const P = (x, y, z) => { const xr = x * cos - y * sin, yr = x * sin + y * cos; return [cx + xr * s, cy - (yr * sp + z * cp) * s, yr]; };
  const poly = (pts, z) => { ctx.beginPath(); pts.forEach((q, i) => { const [X, Y] = P(q[0], q[1], z); i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath(); };

  // Umbra de pe sol și planul clădirii (conturul rămâne dedesubt, tot mai discret)
  ctx.save();
  ctx.shadowColor = 'rgba(4, 8, 22, .55)'; ctx.shadowBlur = 46 * s / 3; ctx.fillStyle = 'rgba(8, 14, 34, .5)';
  ctx.globalAlpha = clamp(build / 2); poly(m.shadow, 0); ctx.fill();
  ctx.restore();
  ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]); ctx.strokeStyle = `rgba(255, 255, 255, ${lerp(.8, .16, clamp(build / 3))})`;
  poly(m.ring, 0); ctx.stroke(); ctx.setLineDash([]);

  // O prismă: fețele laterale care privesc spre cameră, de la cea mai îndepărtată; apoi capacul
  const prism = (pts, z0, z1, dark, light, top, alpha) => {
    ctx.globalAlpha = alpha;
    const faces = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = (b[1] - a[1]) / l * m.sign, ny = -(b[0] - a[0]) / l * m.sign;
      if (nx * sin + ny * cos >= 0) continue;                             // fața e pe partea cealaltă
      const A0 = P(a[0], a[1], z0), B0 = P(b[0], b[1], z0);
      faces.push({d: (A0[2] + B0[2]) / 2, q: [A0, B0, P(b[0], b[1], z1), P(a[0], a[1], z1)], shade: clamp(.55 - .45 * (nx * cos - ny * sin))});
    }
    faces.sort((u, v) => v.d - u.d);
    for (const f of faces) {
      ctx.fillStyle = ctx.strokeStyle = mix(dark, light, f.shade);
      ctx.beginPath(); f.q.forEach(([X, Y], i) => i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)); ctx.closePath();
      ctx.fill(); ctx.lineWidth = .7; ctx.stroke();                       // linia acoperă rostul dintre fețe
    }
    if (top) { ctx.fillStyle = top; poly(pts, z1); ctx.fill(); ctx.strokeStyle = 'rgba(32, 54, 108, .22)'; ctx.lineWidth = 1; ctx.stroke(); }
  };

  for (let i = 0; i <= m.levels; i++) {
    const f = clamp(build - i);
    if (f <= 0) break;
    const z = i * FLOOR + (1 - easeOut(f)) * 9;                           // etajul coboară la locul lui
    prism(m.slab, z, z + SLAB, SLAB_DARK, SLAB_LIGHT, i === m.levels ? '#f4f6fa' : '#ffffff', f);
    if (i < m.levels) prism(m.ring, z + SLAB, z + FLOOR, GLASS_DARK, GLASS_LIGHT, null, f * .96);
  }
  ctx.globalAlpha = 1;
}

export default function ProjectScene({data, building, t}) {
  const root = useRef(null), canvas = useRef(null);

  useEffect(() => {
    const el = root.current, cv = canvas.current;
    if (!el || !cv || !building) return;
    const m = modelOf(building), ctx = cv.getContext('2d');
    const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let w = 0, h = 0, p = still ? .72 : 0, mouse = 0, sway = 0, raf = 0, visible = false, last = '';

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
    const frame = now => {
      raf = 0;
      progress();
      sway += (mouse * 7 - sway) * .06;
      const idle = still ? 0 : Math.sin(now * .0005) * 1.6;
      const key = `${p.toFixed(4)}|${sway.toFixed(2)}|${idle.toFixed(2)}|${w}|${h}`;
      if (key !== last) { last = key; draw(ctx, w, h, m, p, sway + idle); }
      if (visible && !still) raf = requestAnimationFrame(frame);
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(frame); };
    const onMove = e => { mouse = (e.clientX / innerWidth - .5) * 2; };
    const onResize = () => { size(); last = ''; kick(); };
    const io = new IntersectionObserver(([e]) => { visible = e.isIntersecting; if (visible) kick(); }, {rootMargin: '200px 0px'});

    // Pânza își schimbă mărimea și fără resize de fereastră (scena devine „lipită” când pornește mișcarea)
    const ro = new ResizeObserver(onResize);
    size(); progress(); draw(ctx, w, h, m, p, 0);
    io.observe(el); ro.observe(cv);
    addEventListener('scroll', kick, {passive: true});
    addEventListener('resize', onResize);
    if (!still) el.addEventListener('pointermove', onMove);
    return () => { io.disconnect(); ro.disconnect(); removeEventListener('scroll', kick); removeEventListener('resize', onResize); el.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
  }, [building]);

  const stats = data.chapters.map(c => c.stat).filter(Boolean);
  return (
    <div className="s5" ref={root} data-step="0">
      <div className="s5-pin">
        {building && <canvas ref={canvas} className="s5-canvas" role="img" aria-label={t.model3d}/>}
        <div className="h5-wrap s5-copy">
          <div className="s5-slides">
            <div className="s5-slide" data-i="0">
              <p className="v5-eyebrow s5-eyebrow">{data.eyebrow}</p>
              <h2 className="s5-title" id="p5-title" data-rv="words"><Words text={data.heading}/></h2>
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
