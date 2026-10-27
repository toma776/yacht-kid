// Punctele de interes din jurul YACHT KID, pentru harta 3D din secțiunea Locație (design/homepage/harta/).
// Coordonatele vin din OpenStreetMap (nodurile/căile notate mai jos); distanța și timpul pe jos și cu mașina sunt
// calculate pe străzile reale cu OSRM (routing.openstreetmap.de, FOSSGIS), împreună cu traseul pe jos (desenat la hover),
// iar conturul clădirii YACHT KID vine din Overpass, pentru volumul evidențiat; totul o singură dată, la rulare:
// harta citește doar fișierul generat, fără cereri de rutare de la vizitatori.
//   node scripts/harta-locatie.mjs
import {writeFileSync} from 'node:fs';

const UA = 'YachtKid-Brain/1.0 (toma@dwf.ro)';
const HOME = {name: 'YACHT KID', address: 'Str. Anton Holban 6, București', lat: 44.476062, lng: 26.114986, osm: 'way/1334250599'};
// icon: aceleași categorii ca pe harta desenată de pe site-ul vechi
const POIS = [
  {id: 'metrou-pipera', name: 'Metrou Pipera', kind: 'Transport', icon: 'metro', lat: 44.480613, lng: 26.116635, osm: 'node/255387575'},
  {id: 'promenada', name: 'Promenada Mall', kind: 'Cumpărături', icon: 'mall', lat: 44.478191, lng: 26.103413, osm: 'Nominatim: shop/mall'},
  {id: 'kaufland', name: 'Kaufland', kind: 'Cumpărături', icon: 'shop', lat: 44.477174, lng: 26.122570, osm: 'Nominatim: shop/supermarket'},
  {id: 'lacul-tei', name: 'Lacul Tei', kind: 'Natură', icon: 'park', lat: 44.472541, lng: 26.123240, osm: 'Nominatim: natural/water', walkTo: [44.4741, 26.1170]},
  {id: 'world-class-caro', name: 'World Class Caro', kind: 'Sport', icon: 'gym', lat: 44.474886, lng: 26.109926, osm: 'node/7009728958'},
  {id: 'pescariu', name: 'Clubul Pescariu Sports & SPA', kind: 'Sport', icon: 'gym', lat: 44.471806, lng: 26.110682, osm: 'way/23583384'},
  {id: 'fratellini', name: 'Fratellini Bistro', kind: 'Restaurant', icon: 'cafe', lat: 44.472328, lng: 26.105734, osm: 'Nominatim: amenity/restaurant'},
  {id: 'parcul-verdi', name: 'Parcul Verdi', kind: 'Natură', icon: 'park', lat: 44.470143, lng: 26.108052, osm: 'Nominatim: leisure/park'}
];

const route = async (profile, to) => {
  const url = `https://routing.openstreetmap.de/routed-${profile}/route/v1/driving/${HOME.lng},${HOME.lat};${to[1]},${to[0]}?overview=${profile === 'foot' ? 'simplified&geometries=geojson' : 'false'}`;
  const j = await (await fetch(url, {headers: {'user-agent': UA}})).json();
  if (j.code !== 'Ok') throw new Error(`${profile}: ${j.code}`);
  const r = j.routes[0];
  return {m: Math.round(r.distance), min: Math.max(1, Math.round(r.duration / 60)), line: r.geometry?.coordinates.map(([x, y]) => [+x.toFixed(6), +y.toFixed(6)])};
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

for (const p of POIS) {
  // Lacul: rutăm spre malul cel mai apropiat (walkTo), nu spre mijlocul apei
  const to = p.walkTo ?? [p.lat, p.lng];
  const foot = await route('foot', to); await sleep(800);
  const car = await route('car', to); await sleep(800);
  Object.assign(p, {distance_m: foot.m, walk_min: foot.min, drive_min: car.min, walk_route: foot.line});
  delete p.walkTo;
  console.log(`  ✓ ${p.name}: ${foot.m} m · ${foot.min} min pe jos · ${car.min} min cu mașina`);
}
// Conturul clădirii (calea OSM a lui HOME), ca poligon GeoJSON; înălțimea din building:levels (~3,2 m pe etaj)
const ov = await (await fetch('https://overpass-api.de/api/interpreter', {method: 'POST', headers: {'user-agent': UA, 'content-type': 'application/x-www-form-urlencoded'},
  body: 'data=' + encodeURIComponent('[out:json];way(${HOME.osm.split("/")[1]});out geom tags;')})).json();
const way = ov.elements[0];
HOME.levels = +way.tags['building:levels'] || 10;
HOME.footprint = {type: 'Polygon', coordinates: [way.geometry.map(p => [+p.lon.toFixed(7), +p.lat.toFixed(7)])]};
console.log(`  ✓ clădirea: ${way.geometry.length} puncte, ${HOME.levels} etaje`);
const out = {generated: new Date().toISOString().slice(0, 10), source: 'OpenStreetMap (ODbL) · rute OSRM, routing.openstreetmap.de', home: HOME, pois: POIS};
writeFileSync('design/homepage/harta/locatie.json', JSON.stringify(out, null, 1));
console.log('design/homepage/harta/locatie.json');
