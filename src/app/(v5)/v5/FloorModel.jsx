'use client';
// Selectorul de etaje din colecția de apartamente: același model 3D al clădirii, mic, în care se aprind etajele pe
// care se află tipul ales (din Brain: etajul minim și maxim al tipului; 0 = parter). Restul etajelor rămân stinse.
// La schimbarea tipului, etajele se aprind lin și clădirea face o mică mișcare; cu „mișcare redusă”, direct.
import {useEffect, useRef} from 'react';
import {D, FLOOR, modelOf, sunAt, renderBuilding} from './building3d.mjs';

export default function FloorModel({building, floors, label}) {
  const cv = useRef(null), S = useRef({}).current;
  const lo = floors?.[0], hi = floors?.[1];

  useEffect(() => {
    const c = cv.current;
    if (!c || !building) return;
    const m = modelOf(building), ctx = c.getContext('2d'), sun = sunAt(14.5), phi = 25 * D;
    S.lit = Array(m.levels + 1).fill(0); S.target = S.lit.slice(); S.spin = 0; S.raf = 0;
    const draw = () => {
      const r = c.getBoundingClientRect(), dpr = Math.min(2, devicePixelRatio || 1);
      if (c.width !== Math.round(r.width * dpr) || c.height !== Math.round(r.height * dpr)) { c.width = Math.round(r.width * dpr); c.height = Math.round(r.height * dpr); }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, r.width, r.height);
      const s = Math.min(r.width, r.height * 1.4) / (m.R * 2.2);
      renderBuilding(ctx, m, {cx: r.width / 2, cy: r.height * .56 + m.levels * FLOOR / 2 * Math.cos(phi) * s, s, phi,
        theta: (-34 + S.spin) * D, build: m.levels + 1, sun, lit: i => S.lit[i]});
    };
    const tick = () => {
      let moving = false;
      S.lit = S.lit.map((v, i) => { const d = S.target[i] - v; if (Math.abs(d) > .01) { moving = true; return v + d * .16; } return S.target[i]; });
      if (Math.abs(S.spin) > .05) { S.spin *= .9; moving = true; } else S.spin = 0;
      draw();
      S.raf = moving ? requestAnimationFrame(tick) : 0;
    };
    S.draw = draw; S.kick = () => { if (!S.raf) S.raf = requestAnimationFrame(tick); };
    const ro = new ResizeObserver(draw);
    ro.observe(c); draw();
    return () => { ro.disconnect(); cancelAnimationFrame(S.raf); S.raf = 0; S.kick = S.draw = null; };
  }, [building, S]);

  useEffect(() => {
    if (!S.lit) return;
    S.target = S.lit.map((_, i) => lo != null && i >= lo && i <= (hi ?? lo) ? 1 : 0);
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { S.lit = S.target.slice(); S.draw?.(); return; }
    S.spin = 12; S.kick?.();
  }, [lo, hi, S]);

  if (!building || lo == null) return null;
  return (
    <div className="c5-floors">
      <canvas ref={cv} className="c5-floors-canvas"/>
      {label && <span className="c5-floors-label">{label}</span>}
    </div>
  );
}
