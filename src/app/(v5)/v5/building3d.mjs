// Clădirea YACHT KID în 3D, pe un canvas 2D, fără biblioteci: conturul real (Date firmă), etajele ca planșee albe cu
// margine rotunjită și sticlă între ele, luminate de soare după poziția lui reală pe cer. Folosit de scena „Despre”
// (ProjectScene: lumina zilei, umbra pe sol) și de selectorul de etaje din colecție (FloorModel).
// Axe: x = est, y = nord, z = sus, în metri, în jurul centrului clădirii.

export const D = Math.PI / 180, FLOOR = 3.2, SLAB = 0.85, OVER = 1.6;
export const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const ease = t => t * t * (3 - 2 * t);
export const easeOut = t => 1 - (1 - t) ** 3;
const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
const rgb = c => `rgb(${Math.round(c[0])},${Math.round(c[1])},${Math.round(c[2])})`;

const SLAB_SHADE = [112, 128, 170], GLASS_SHADE = [18, 32, 74], GLASS_SUN = [118, 150, 226];
const DIM_SLAB = [58, 76, 128], DIM_GLASS = [26, 42, 92];
const SUN_HIGH = [255, 255, 255], SUN_LOW = [255, 206, 152];        // la amiază alb, la răsărit și apus cald

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

export function modelOf({points, levels}) {
  let area = 0;
  for (let i = 0; i < points.length; i++) { const a = points[i], b = points[(i + 1) % points.length]; area += a[0] * b[1] - b[0] * a[1]; }
  const sign = area > 0 ? 1 : -1;
  return {ring: points, slab: offsetRing(points, OVER, sign), sign, levels, height: levels * FLOOR + SLAB,
    R: Math.max(...points.map(p => Math.hypot(p[0], p[1]))) + OVER};
}

// Poziția soarelui la ora solară dată (12 = amiaza solară), pentru latitudinea clădirii și declinația zilei
// (23,44° = solstițiul de vară, 21 iunie). az: de la nord, în sensul acelor de ceas; v: direcția spre soare.
export function sunAt(solarHour, latDeg = 44.476, declDeg = 23.44) {
  const lat = latDeg * D, decl = declDeg * D, H = (solarHour - 12) * 15 * D;
  const el = Math.asin(Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(H));
  const az = Math.atan2(Math.sin(H), Math.cos(H) * Math.sin(lat) - Math.tan(decl) * Math.cos(lat)) + Math.PI;
  return {el, az, v: [Math.sin(az) * Math.cos(el), Math.cos(az) * Math.cos(el), Math.sin(el)]};
}

// Desenează clădirea. o: cx, cy (centrul pe sol, pe ecran), s (px pe metru), phi (înălțimea camerei: 90° = de sus),
// theta (rotația), build (câte etaje sunt ridicate; levels + 1 = cu acoperiș), sun (din sunAt), shadow (umbra pe sol),
// outline (cât de vizibil e planul punctat), lit(i) → 0…1 (etajul i aprins sau stins; lipsă = toate aprinse).
export function renderBuilding(ctx, m, o) {
  const {cx, cy, s, phi, theta, build, sun} = o;
  const sp = Math.sin(phi), cp = Math.cos(phi), cos = Math.cos(theta), sin = Math.sin(theta);
  const P = (x, y, z) => { const xr = x * cos - y * sin, yr = x * sin + y * cos; return [cx + xr * s, cy - (yr * sp + z * cp) * s, yr]; };
  const path = pts => { ctx.beginPath(); pts.forEach(([X, Y], i) => i ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y)); ctx.closePath(); };
  const poly = (pts, z, dx = 0, dy = 0) => path(pts.map(q => P(q[0] + dx, q[1] + dy, z)));
  const warm = clamp(1 - sun.el / (38 * D)), sunCol = mix(SUN_HIGH, SUN_LOW, warm);
  const built = Math.min(build, m.levels + 1) / (m.levels + 1);

  // Umbra pe sol: conturul clădirii, dus pe direcția opusă soarelui cu înălțimea ridicată / tan(înălțimea soarelui)
  if (o.shadow && built > 0) {
    const len = Math.min(m.height * built / Math.tan(Math.max(sun.el, 4 * D)), m.R * 2.4), h = Math.hypot(sun.v[0], sun.v[1]) || 1;
    const dx = -sun.v[0] / h * len, dy = -sun.v[1] / h * len;
    ctx.globalAlpha = clamp(build / 2) * lerp(.55, .9, clamp(sun.el / (30 * D)));
    ctx.fillStyle = ctx.strokeStyle = 'rgb(11, 19, 46)'; ctx.lineWidth = 1;
    poly(m.slab, 0); ctx.fill(); poly(m.slab, 0, dx, dy); ctx.fill();
    for (let i = 0; i < m.slab.length; i++) {
      const a = m.slab[i], b = m.slab[(i + 1) % m.slab.length];
      path([P(a[0], a[1], 0), P(b[0], b[1], 0), P(b[0] + dx, b[1] + dy, 0), P(a[0] + dx, a[1] + dy, 0)]); ctx.fill(); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  }
  if (o.outline > 0) {
    ctx.lineWidth = 1.2; ctx.setLineDash([6, 5]); ctx.strokeStyle = `rgba(255, 255, 255, ${o.outline})`;
    poly(m.ring, 0); ctx.stroke(); ctx.setLineDash([]);
  }

  // O prismă: fețele laterale care privesc spre cameră, de la cea mai îndepărtată; apoi capacul
  const prism = (pts, z0, z1, shade, dim, top, alpha, lit) => {
    ctx.globalAlpha = alpha;
    const faces = [];
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i], b = pts[(i + 1) % pts.length], l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = (b[1] - a[1]) / l * m.sign, ny = -(b[0] - a[0]) / l * m.sign;
      if (nx * sin + ny * cos >= 0) continue;                             // fața e pe partea cealaltă
      const A0 = P(a[0], a[1], z0), B0 = P(b[0], b[1], z0);
      const sunlit = clamp((nx * sun.v[0] + ny * sun.v[1]) * 1.2);       // cât bate soarele pe fața asta
      faces.push({d: (A0[2] + B0[2]) / 2, q: [A0, B0, P(b[0], b[1], z1), P(a[0], a[1], z1)], b: .3 + .7 * sunlit});
    }
    faces.sort((u, v) => v.d - u.d);
    for (const f of faces) {
      ctx.fillStyle = ctx.strokeStyle = rgb(mix(dim, mix(shade, top ? sunCol : mix(GLASS_SUN, sunCol, .25), f.b), lit));
      path(f.q); ctx.fill(); ctx.lineWidth = .7; ctx.stroke();           // linia acoperă rostul dintre fețe
    }
    if (top) {
      ctx.fillStyle = rgb(mix(dim, mix(SLAB_SHADE, sunCol, .62 + .38 * Math.sqrt(Math.max(0, sun.v[2]))), lit));
      poly(pts, z1); ctx.fill(); ctx.strokeStyle = 'rgba(32, 54, 108, .22)'; ctx.lineWidth = 1; ctx.stroke();
    }
  };

  for (let i = 0; i <= m.levels; i++) {
    const f = clamp(build - i);
    if (f <= 0) break;
    const z = i * FLOOR + (1 - easeOut(f)) * 9;                           // etajul coboară la locul lui
    const lit = o.lit ? clamp(o.lit(i)) : 1;
    prism(m.slab, z, z + SLAB, SLAB_SHADE, DIM_SLAB, true, f, lit);
    if (i < m.levels) prism(m.ring, z + SLAB, z + FLOOR, GLASS_SHADE, DIM_GLASS, false, f * .97, lit);
  }
  ctx.globalAlpha = 1;
}
