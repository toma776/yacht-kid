// Harta 3D din secțiunea Locație: MapLibre GL + plăcile vectoriale OpenFreeMap (fără cheie, fără cost), cu stil
// propriu în culorile brandului. Datele (punctele de interes, distanțele, traseele pe jos, conturul clădirii) vin din
// harta/locatie.json, generat de scripts/harta-locatie.mjs. Se încarcă doar când secțiunea se apropie de ecran;
// până atunci, și pe dispozitivele fără WebGL, rămâne imaginea desenată a hărții.
const MAPLIBRE = 'https://unpkg.com/maplibre-gl@4.7.1/dist/maplibre-gl';
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

const C = {
  land: '#1c2f5e', landDeep: '#172752', water: '#101d42', park: '#1d4250', parkLine: '#26586a',
  minor: '#2b4382', secondary: '#3a5597', primary: '#4c68ad', motorway: '#5d79bd', rail: '#33498a',
  building: '#2a4282', buildingTop: '#34508f', label: '#a9b8e6', halo: '#172752', coral: '#e8895c', white: '#ffffff'
};
const ICONS = {
  metro: '<path d="M6 17V7l6 6 6-6v10"/>',
  mall: '<path d="M5 9h14l-1 10H6zM9 9V7a3 3 0 0 1 6 0v2"/>',
  shop: '<path d="M4 10h16M5 10l1-4h12l1 4M6 10v9h12v-9M10 19v-5h4v5"/>',
  park: '<path d="M12 21v-6M7 15h10l-5-9zM8.5 11h7"/>',
  gym: '<path d="M4 9v6M7 7v10M17 7v10M20 9v6M7 12h10"/>',
  cafe: '<path d="M5 9h11v5a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4zM16 10h2a2 2 0 0 1 0 4h-2M8 4v2M11 4v2"/>'
};
const fmtDist = m => (m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace('.', ',')} km`);

// Stilul: doar straturile de care avem nevoie, din schema OpenMapTiles a OpenFreeMap
function style() {
  const road = (id, classes, color, w) => ({id, type: 'line', source: 'omt', 'source-layer': 'transportation',
    filter: ['all', ['match', ['get', 'class'], classes, true, false], ['!=', ['get', 'brunnel'], 'tunnel']],
    layout: {'line-cap': 'round', 'line-join': 'round'},
    paint: {'line-color': color, 'line-width': ['interpolate', ['exponential', 1.5], ['zoom'], 12, w[0], 16, w[1], 18, w[2]]}});
  return {
    version: 8,
    glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    sources: {omt: {type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '<a href="https://openfreemap.org" target="_blank" rel="noopener">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/" target="_blank" rel="noopener">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">© OpenStreetMap</a>'}},
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

function webgl() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl2') || c.getContext('webgl')); } catch { return false; }
}
function load(url, tag) {
  return new Promise((ok, fail) => {
    const el = document.createElement(tag);
    if (tag === 'script') { el.src = url; el.async = true; } else { el.rel = 'stylesheet'; el.href = url; }
    el.onload = ok; el.onerror = fail; document.head.append(el);
  });
}

function pin(poi, onOpen) {
  const el = document.createElement('button');
  el.type = 'button';
  el.className = 'map-pin';
  el.setAttribute('aria-label', `${poi.name}, ${fmtDist(poi.distance_m)}, ${poi.walk_min} minute pe jos`);
  el.innerHTML = `<span class="map-pin-dot"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[poi.icon] ?? ICONS.park}</svg></span><span class="map-pin-label">${poi.name}</span>`;
  el.addEventListener('mouseenter', () => onOpen(poi, false));
  el.addEventListener('focus', () => onOpen(poi, false));
  el.addEventListener('click', e => { e.stopPropagation(); onOpen(poi, true); });
  return el;
}

function card(poi, home) {
  const dir = mode => `https://www.google.com/maps/dir/?api=1&origin=${home.lat},${home.lng}&destination=${poi.lat},${poi.lng}&travelmode=${mode}`;
  return `<div class="map-card">
    <p class="map-card-kind">${poi.kind}</p>
    <p class="map-card-name">${poi.name}</p>
    <p class="map-card-dist">${fmtDist(poi.distance_m)} de YACHT KID</p>
    <dl class="map-card-times">
      <div><dt>Pe jos</dt><dd>${poi.walk_min} min</dd></div>
      <div><dt>Cu mașina</dt><dd>${poi.drive_min} min</dd></div>
    </dl>
    <a class="map-card-link" href="${dir('walking')}" target="_blank" rel="noopener">Traseu în Google Maps</a>
  </div>`;
}

// Lista de sub hartă: numele și minutele pe jos; apare și fără WebGL, iar cu harta, fiecare buton o deschide
function list(figure, pois) {
  const ul = figure.parentElement.querySelector('[data-poi-list]');
  if (!ul) return;
  ul.innerHTML = [...pois].sort((a, b) => a.walk_min - b.walk_min).map(p =>
    `<li><button type="button" data-poi="${p.id}" aria-pressed="false"><span class="poi-ic"><svg viewBox="0 0 24 24" aria-hidden="true">${ICONS[p.icon] ?? ICONS.park}</svg></span><span class="poi-name">${p.name}</span><span class="poi-time num">${p.walk_min} min</span></button></li>`).join('');
}

async function init(figure, data) {
  await Promise.all([load(`${MAPLIBRE}.css`, 'link'), load(`${MAPLIBRE}.js`, 'script')]);
  const {home, pois} = data;
  const canvas = figure.querySelector('.map-canvas');
  const center = [home.lng, home.lat];
  const map = new maplibregl.Map({
    container: canvas, style: style(), center, zoom: reduced ? 15.4 : 13.2, pitch: reduced ? 55 : 0, bearing: reduced ? -18 : 0,
    maxZoom: 18, minZoom: 12, maxPitch: 70, cooperativeGestures: true, attributionControl: {compact: true},
    maxBounds: [[home.lng - .06, home.lat - .04], [home.lng + .06, home.lat + .04]]
  });
  map.addControl(new maplibregl.NavigationControl({visualizePitch: true}), 'top-right');
  // Numele pinilor doar de aproape: la zoom mic, punctele vecine (Floreasca) și-ar suprapune etichetele
  const labels = () => canvas.classList.toggle('show-labels', map.getZoom() >= 15);
  map.on('zoom', labels);
  labels();

  map.on('load', () => {
    // Clădirea YACHT KID: conturul real, ridicat la înălțimea ei, alb, cu bază coral
    // Aceeași clădire există și în plăcile OpenFreeMap, cu aceeași înălțime: volumul nostru e cu 4% mai larg și cu 2 m
    // mai înalt, ca să o învelească, altfel cele două se amestecă (z-fighting)
    const ring = home.footprint.coordinates[0];
    const [cx, cy] = ring.reduce(([x, y], p) => [x + p[0] / ring.length, y + p[1] / ring.length], [0, 0]);
    const shell = {type: 'Polygon', coordinates: [ring.map(([x, y]) => [cx + (x - cx) * 1.04, cy + (y - cy) * 1.04])]};
    map.addSource('home', {type: 'geojson', data: {type: 'Feature', geometry: shell, properties: {}}});
    map.addLayer({id: 'home-3d', type: 'fill-extrusion', source: 'home',
      paint: {'fill-extrusion-color': C.white, 'fill-extrusion-height': home.levels * 3.2 + 2, 'fill-extrusion-base': 0, 'fill-extrusion-opacity': 1}});
    map.addLayer({id: 'home-line', type: 'line', source: 'home', paint: {'line-color': C.coral, 'line-width': 2.5}});
    // Traseul pe jos spre punctul ales
    map.addSource('route', {type: 'geojson', data: {type: 'FeatureCollection', features: []}});
    map.addLayer({id: 'route', type: 'line', source: 'route', layout: {'line-cap': 'round', 'line-join': 'round'},
      paint: {'line-color': C.coral, 'line-width': 4, 'line-dasharray': [0, 2]}});
    figure.classList.add('is-ready');
  });
  map.on('error', e => { if (!figure.classList.contains('is-ready')) console.warn('Harta:', e.error?.message); });

  // Pinul YACHT KID
  const homeEl = document.createElement('div');
  homeEl.className = 'map-home';
  homeEl.innerHTML = '<span class="map-home-label">Anton Holban 6</span><span class="map-home-pin"><img src="/wp-content/uploads/2024/10/yacht_kid_logo_white.png" alt="YACHT KID"></span>';
  new maplibregl.Marker({element: homeEl, anchor: 'bottom'}).setLngLat(center).addTo(map);

  // Fișa punctului de interes; „fixată” la click/atingere, trecătoare la hover
  // Fișa stă mereu deasupra pinului; la încadrare (fitBounds) îi lăsăm sus tot spațiul de care are nevoie
  const popup = new maplibregl.Popup({closeButton: true, closeOnClick: false, anchor: 'bottom', offset: [0, -52], maxWidth: '260px', className: 'map-popup'});
  let pinned = false;
  const chips = [...figure.parentElement.querySelectorAll('[data-poi]')];
  const open = (poi, fix) => {
    pinned = fix || pinned && popup.isOpen();
    popup.setLngLat([poi.lng, poi.lat]).setHTML(card(poi, home)).addTo(map);
    map.getSource('route')?.setData({type: 'Feature', properties: {}, geometry: {type: 'LineString', coordinates: poi.walk_route ?? [center, [poi.lng, poi.lat]]}});
    chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.poi === poi.id)));
    if (fix) {
      const b = (poi.walk_route ?? [center, [poi.lng, poi.lat]]).reduce((bb, p) => bb.extend(p), new maplibregl.LngLatBounds(center, center));
      const h = canvas.clientHeight, w = canvas.clientWidth;
      map.fitBounds(b, {padding: {top: Math.min(240, h - 100), bottom: 40, left: Math.min(100, w * .2), right: Math.min(100, w * .2)}, maxZoom: 16.2, pitch: 55, duration: reduced ? 0 : 1200});
    }
  };
  const close = () => {
    if (pinned) return;
    popup.remove();
    map.getSource('route')?.setData({type: 'FeatureCollection', features: []});
    chips.forEach(c => c.setAttribute('aria-pressed', 'false'));
  };
  popup.on('close', () => { pinned = false; map.getSource('route')?.setData({type: 'FeatureCollection', features: []}); chips.forEach(c => c.setAttribute('aria-pressed', 'false')); });
  for (const poi of pois) {
    const el = pin(poi, open);
    el.addEventListener('mouseleave', close);
    el.addEventListener('blur', close);
    new maplibregl.Marker({element: el, anchor: 'bottom'}).setLngLat([poi.lng, poi.lat]).addTo(map);
  }
  chips.forEach(c => c.addEventListener('click', () => { const poi = pois.find(p => p.id === c.dataset.poi); if (poi) open(poi, true); }));

  // Intrarea: camera coboară în perspectivă spre clădire, o singură dată, când harta e pe ecran
  if (!reduced) {
    const io = new IntersectionObserver(([e]) => {
      if (!e.isIntersecting) return;
      io.disconnect();
      const go = () => map.flyTo({center, zoom: 15.6, pitch: 58, bearing: -22, duration: 3600, curve: 1.2, essential: true});
      map.loaded() ? go() : map.once('load', go);
    }, {threshold: .5});
    io.observe(figure);
  }
}

// Pornește când secțiunea se apropie de ecran; harta doar dacă există WebGL
const figure = document.querySelector('[data-map]');
if (figure) {
  const io = new IntersectionObserver(async ([e]) => {
    if (!e.isIntersecting) return;
    io.disconnect();
    try {
      const data = await (await fetch(figure.dataset.map)).json();
      list(figure, data.pois);
      if (webgl()) await init(figure, data);
      else figure.parentElement.querySelector('[data-poi-list]')?.classList.add('is-static');
    } catch (err) { console.warn('Harta 3D nu s-a încărcat, rămâne imaginea:', err); }
  }, {rootMargin: '600px 0px'});
  io.observe(figure);
}
