'use client';
// Harta 3D din secțiunea Locație (secțiune text cu „Harta 3D”): MapLibre GL + plăcile vectoriale OpenFreeMap (fără cheie, fără cost),
// cu stil propriu în culorile brandului. Datele vin din Brain ca props: `home` din Date firmă (coordonate, conturul și
// etajele clădirii), `pois` din Repere (distanțe, minute, traseul pe jos — calculate de scripts/harta-locatie.mjs).
// Harta se încarcă doar când secțiunea se apropie de ecran; până atunci, și fără WebGL, rămâne imaginea `fallback`.
// Lista de sub hartă e randată mereu (și fără WebGL), iar cu harta, fiecare buton o deschide.
import {useEffect, useRef, useState} from 'react';
import 'maplibre-gl/dist/maplibre-gl.css';
import '../styles/map.css';

const C = {
  land: '#1c2f5e', landDeep: '#172752', water: '#101d42', park: '#1d4250',
  minor: '#2b4382', secondary: '#3a5597', primary: '#4c68ad', motorway: '#5d79bd', rail: '#33498a',
  building: '#2a4282', buildingTop: '#34508f', label: '#a9b8e6', halo: '#172752', coral: '#e8895c', white: '#ffffff'
};
export const POI_ICONS = {
  metro: 'M6 17V7l6 6 6-6v10',
  mall: 'M5 9h14l-1 10H6zM9 9V7a3 3 0 0 1 6 0v2',
  shop: 'M4 10h16M5 10l1-4h12l1 4M6 10v9h12v-9M10 19v-5h4v5',
  park: 'M12 21v-6M7 15h10l-5-9zM8.5 11h7',
  gym: 'M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10',
  cafe: 'M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2M8 4v2M11 4v2'
};
const L = {
  ro: {walk: 'Pe jos', drive: 'Cu mașina', from: 'de YACHT KID', route: 'Traseu în Google Maps', region: 'Hartă 3D interactivă a zonei', near: 'În apropiere, pe jos', min: 'min'},
  en: {walk: 'Walking', drive: 'By car', from: 'from YACHT KID', route: 'Directions in Google Maps', region: 'Interactive 3D map of the area', near: 'Nearby, on foot', min: 'min'}
};
const fmtDist = (m, lang) => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', lang === 'en' ? '.' : ',')} km`);
const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({'&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;'})[c]);
const svg = d => `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="${d}"/></svg>`;

// Stilul: doar straturile de care avem nevoie, din schema OpenMapTiles a OpenFreeMap
function mapStyle() {
  const road = (id, classes, color, w) => ({id, type: 'line', source: 'omt', 'source-layer': 'transportation',
    filter: ['all', ['match', ['get', 'class'], classes, true, false], ['!=', ['get', 'brunnel'], 'tunnel']],
    layout: {'line-cap': 'round', 'line-join': 'round'},
    paint: {'line-color': color, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, w[0], 16, w[1], 18, w[2]]}});
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {omt: {type: 'vector', url: 'https://tiles.openfreemap.org/planet',
      attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>'}},
    layers: [
      {id: 'bg', type: 'background', paint: {'background-color': C.land}},
      {id: 'landuse', type: 'fill', source: 'omt', 'source-layer': 'landuse', paint: {'fill-color': C.landDeep, 'fill-opacity': .5}},
      {id: 'park', type: 'fill', source: 'omt', 'source-layer': 'park', paint: {'fill-color': C.park}},
      {id: 'green', type: 'fill', source: 'omt', 'source-layer': 'landcover', filter: ['match', ['get', 'class'], ['grass', 'wood'], true, false], paint: {'fill-color': C.park, 'fill-opacity': .8}},
      {id: 'water', type: 'fill', source: 'omt', 'source-layer': 'water', filter: ['!=', ['get', 'brunnel'], 'tunnel'], paint: {'fill-color': C.water}},
      {id: 'water-edge', type: 'line', source: 'omt', 'source-layer': 'water', paint: {'line-color': '#24407e', 'line-width': 1}},
      road('road-minor', ['minor', 'service'], C.minor, [.4, 2.5, 8]),
      road('road-secondary', ['secondary', 'tertiary'], C.secondary, [.8, 4, 12]),
      road('road-primary', ['primary', 'trunk'], C.primary, [1.2, 6, 16]),
      road('road-motorway', ['motorway'], C.motorway, [1.4, 7, 18]),
      {id: 'rail', type: 'line', source: 'omt', 'source-layer': 'transportation', filter: ['==', ['get', 'class'], 'rail'], paint: {'line-color': C.rail, 'line-width': 1.2, 'line-dasharray': [2, 2]}},
      {id: 'buildings', type: 'fill-extrusion', source: 'omt', 'source-layer': 'building', minzoom: 13.5, filter: ['!', ['has', 'hide_3d']],
        paint: {'fill-extrusion-color': ['interpolate', ['linear'], ['get', 'render_height'], 0, C.building, 40, C.buildingTop],
          'fill-extrusion-height': ['get', 'render_height'], 'fill-extrusion-base': ['get', 'render_min_height'], 'fill-extrusion-opacity': .88}},
      {id: 'road-names', type: 'symbol', source: 'omt', 'source-layer': 'transportation_name', minzoom: 14,
        filter: ['match', ['get', 'class'], ['primary', 'secondary', 'tertiary', 'trunk', 'minor'], true, false],
        layout: {'symbol-placement': 'line', 'text-field': ['get', 'name'], 'text-font': ['Noto Sans Regular'], 'text-size': 11, 'text-letter-spacing': .04},
        paint: {'text-color': C.label, 'text-halo-color': C.halo, 'text-halo-width': 1.4}},
      {id: 'water-names', type: 'symbol', source: 'omt', 'source-layer': 'water_name',
        layout: {'text-field': ['get', 'name'], 'text-font': ['Noto Sans Italic'], 'text-size': 13, 'text-letter-spacing': .08},
        paint: {'text-color': '#7f95d4', 'text-halo-color': C.water, 'text-halo-width': 1}}
    ]
  };
}

const hasWebgl = () => {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
};

export default function LocationMap({home, pois, lang = 'ro', fallback, logo}) {
  const t = L[lang] ?? L.ro;
  const figure = useRef(null), canvas = useRef(null), api = useRef(null);
  const [ready, setReady] = useState(false);
  const [active, setActive] = useState(null);
  const sorted = [...pois].sort((a, b) => a.walk_min - b.walk_min);

  useEffect(() => {
    if (!hasWebgl() || !figure.current) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    let map, cancelled = false, flyIo;
    const center = [home.lng, home.lat];

    const start = async () => {
      const maplibregl = (await import('maplibre-gl')).default;
      if (cancelled) return;
      map = new maplibregl.Map({
        container: canvas.current, style: mapStyle(), center, zoom: reduced ? 15.4 : 13.2, pitch: reduced ? 55 : 0, bearing: reduced ? -18 : 0,
        maxZoom: 18, minZoom: 12, maxPitch: 70, cooperativeGestures: true, attributionControl: {compact: true},
        maxBounds: [[home.lng - .06, home.lat - .04], [home.lng + .06, home.lat + .04]]
      });
      map.addControl(new maplibregl.NavigationControl({visualizePitch: true}), 'top-right');
      // Numele pinilor doar de aproape: la zoom mic, punctele vecine și-ar suprapune etichetele
      const labels = () => canvas.current?.classList.toggle('show-labels', map.getZoom() >= 15);
      map.on('zoom', labels); labels();

      map.on('load', () => {
        // Aceeași clădire există și în plăcile OpenFreeMap, cu aceeași înălțime: volumul nostru e cu 4% mai larg și cu 2 m
        // mai înalt, ca să o învelească, altfel cele două se amestecă (z-fighting)
        if (home.footprint) {
          const ring = home.footprint.coordinates[0];
          const [cx, cy] = ring.reduce(([x, y], p) => [x + p[0] / ring.length, y + p[1] / ring.length], [0, 0]);
          const shell = {type: 'Polygon', coordinates: [ring.map(([x, y]) => [cx + (x - cx) * 1.04, cy + (y - cy) * 1.04])]};
          map.addSource('home', {type: 'geojson', data: {type: 'Feature', geometry: shell, properties: {}}});
          map.addLayer({id: 'home-3d', type: 'fill-extrusion', source: 'home',
            paint: {'fill-extrusion-color': C.white, 'fill-extrusion-height': (home.levels || 10) * 3.2 + 2, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 1}});
          map.addLayer({id: 'home-line', type: 'line', source: 'home', paint: {'line-color': C.coral, 'line-width': 2.5}});
        }
        map.addSource('route', {type: 'geojson', data: {type: 'FeatureCollection', features: []}});
        map.addLayer({id: 'route', type: 'line', source: 'route', layout: {'line-cap': 'round', 'line-join': 'round'},
          paint: {'line-color': C.coral, 'line-width': 4, 'line-dasharray': [0, 2]}});
        setReady(true);
      });

      // Pinul YACHT KID
      const homeEl = document.createElement('div');
      homeEl.className = 'map-home';
      homeEl.innerHTML = `<span class="map-home-label">${esc(home.label)}</span><span class="map-home-pin"><img src="${esc(logo)}" alt="YACHT KID"></span>`;
      new maplibregl.Marker({element: homeEl, anchor: 'bottom'}).setLngLat(center).addTo(map);

      // Fișa: deasupra pinului; „fixată” la click/atingere, trecătoare la hover
      const popup = new maplibregl.Popup({closeButton: true, closeOnClick: false, anchor: 'bottom', offset: [0, -52], maxWidth: '260px', className: 'map-popup'});
      let pinned = false;
      const card = p => {
        const dir = `https://www.google.com/maps/dir/?api=1&origin=${home.lat},${home.lng}&destination=${p.lat},${p.lng}&travelmode=walking`;
        return `<div class="map-card"><p class="map-card-kind">${esc(p.kind)}</p><p class="map-card-name">${esc(p.name)}</p>
          <p class="map-card-dist">${fmtDist(p.distance_m, lang)} ${t.from}</p>
          <dl class="map-card-times"><div><dt>${t.walk}</dt><dd>${p.walk_min} ${t.min}</dd></div><div><dt>${t.drive}</dt><dd>${p.drive_min} ${t.min}</dd></div></dl>
          <a class="map-card-link" href="${dir}" target="_blank" rel="noopener">${t.route}</a></div>`;
      };
      const clearRoute = () => map.getSource('route')?.setData({type: 'FeatureCollection', features: []});
      const open = (p, fix) => {
        pinned = fix || (pinned && popup.isOpen());
        popup.setLngLat([p.lng, p.lat]).setHTML(card(p)).addTo(map);
        const line = p.walk_route?.length ? p.walk_route : [center, [p.lng, p.lat]];
        map.getSource('route')?.setData({type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: line}});
        setActive(p.id);
        if (fix) {
          const b = line.reduce((bb, q) => bb.extend(q), new maplibregl.LngLatBounds(center, center));
          const h = canvas.current.clientHeight, w = canvas.current.clientWidth;
          map.fitBounds(b, {padding: {top: Math.min(240, h - 100), bottom: 40, left: Math.min(100, w * .2), right: Math.min(100, w * .2)},
            maxZoom: 16.2, pitch: 55, duration: reduced ? 0 : 1200});
        }
      };
      const close = () => { if (pinned) return; popup.remove(); clearRoute(); setActive(null); };
      popup.on('close', () => { pinned = false; clearRoute(); setActive(null); });

      for (const p of pois) {
        const el = document.createElement('button');
        el.type = 'button';
        el.className = 'map-pin';
        el.setAttribute('aria-label', `${p.name}, ${fmtDist(p.distance_m, lang)}, ${p.walk_min} ${t.min}`);
        el.innerHTML = `<span class="map-pin-dot">${svg(POI_ICONS[p.icon] ?? POI_ICONS.park)}</span><span class="map-pin-label">${esc(p.name)}</span>`;
        el.addEventListener('mouseenter', () => open(p, false));
        el.addEventListener('focus', () => open(p, false));
        el.addEventListener('mouseleave', close);
        el.addEventListener('blur', close);
        el.addEventListener('click', e => { e.stopPropagation(); open(p, true); });
        new maplibregl.Marker({element: el, anchor: 'bottom'}).setLngLat([p.lng, p.lat]).addTo(map);
      }
      api.current = {open: id => { const p = pois.find(x => x.id === id); if (p) open(p, true); }};

      // Intrarea: camera coboară în perspectivă spre clădire, o singură dată, când harta e pe ecran
      if (!reduced) {
        flyIo = new IntersectionObserver(([e]) => {
          if (!e.isIntersecting) return;
          flyIo.disconnect();
          const go = () => map.flyTo({center, zoom: 15.6, pitch: 58, bearing: -22, duration: 3600, curve: 1.2, essential: true});
          map.loaded() ? go() : map.once('load', go);
        }, {threshold: .5});
        flyIo.observe(figure.current);
      }
    };

    // Încărcarea: abia când secțiunea se apropie de ecran
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      start().catch(err => console.warn('Harta 3D nu s-a încărcat, rămâne imaginea:', err));
    }, {rootMargin: '600px 0px'});
    io.observe(figure.current);
    return () => { cancelled = true; io.disconnect(); flyIo?.disconnect(); map?.remove(); api.current = null; };
  }, [home, pois, lang, logo, t]);

  return (
    <div className="location-visual">
      <figure ref={figure} className={`frame location-map${ready ? ' is-ready' : ''}`}>
        {fallback && <img className="map-fallback" src={fallback.src} alt={fallback.alt ?? ''} loading="lazy" width={fallback.width} height={fallback.height}/>}
        <div ref={canvas} className="map-canvas" role="region" aria-label={t.region}/>
      </figure>
      <ul className={`poi-list${ready ? '' : ' is-static'}`} aria-label={t.near}>
        {sorted.map(p => (
          <li key={p.id}>
            <button type="button" aria-pressed={active === p.id} onClick={() => api.current?.open(p.id)}>
              <span className="poi-ic"><svg viewBox="0 0 24 24" aria-hidden="true"><path d={POI_ICONS[p.icon] ?? POI_ICONS.park}/></svg></span>
              <span className="poi-name">{p.name}</span>
              <span className="poi-time num">{p.walk_min} {t.min}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
