// Homepage-ul v5, pe o limbă: aceeași funcție servește /v5/ (RO) și /en/v5/ (EN), ca cele două să rămână identice.
// Rama (meniu, subsol, contact) și secțiunile vin din Brain, pe limba cerută.
import {getDb} from '../../../core/db.mjs';
import {createContext} from '../../../site/context.mjs';
import {loadChrome} from '../../../site/chrome.mjs';
import {loadHero, loadCollection, loadProject, loadFeatures, loadAwards, loadLocation, loadViewing, loadContact} from './data.mjs';
import {T, plain} from './i18n.mjs';
import V5 from './V5';

export const PATHS = {ro: '/v5/', en: '/en/v5/'};

export const metadataFor = lang => ({
  title: 'YACHT KID · v5',
  description: lang === 'en' ? 'Homepage proposal v5.' : 'Propunere de homepage v5.',
  robots: {index: false, follow: false},
  alternates: {languages: {ro: PATHS.ro, en: PATHS.en}}
});

// Clădirea, pentru scena 3D: conturul din Date firmă (GeoJSON, lon/lat) adus în metri, în jurul centrului lui,
// cu nordul în sus; etajele din același loc. Fără contur, scena rămâne doar cu textul.
function buildingOf(f) {
  const ring = f?.building_footprint?.coordinates?.[0];
  if (!ring || ring.length < 4) return null;
  const k = Math.cos((f.latitude ?? ring[0][1]) * Math.PI / 180);
  const m = ring.slice(0, -1).map(([lng, lat]) => [lng * 111320 * k, lat * 110540]);
  const xs = m.map(p => p[0]), ys = m.map(p => p[1]);
  const cx = (Math.min(...xs) + Math.max(...xs)) / 2, cy = (Math.min(...ys) + Math.max(...ys)) / 2;
  return {points: m.map(([x, y]) => [+(x - cx).toFixed(2), +(y - cy).toFixed(2)]), levels: f.building_levels || 10};
}

export async function renderV5(lang) {
  const ctx = createContext(await getDb(), lang);
  const chrome = await loadChrome(ctx, PATHS);
  chrome.home = PATHS[lang];
  chrome.t = plain(T[lang]);
  const visit = chrome.header.find(i => i.mega === 'locuinte')?.aside?.cta?.href ?? chrome.contactHref;
  const [hero, collection, project, features, awards, location, viewing, contact] = await Promise.all([
    loadHero(ctx, chrome.labels), loadCollection(ctx, chrome.labels, visit, T[lang]), loadProject(ctx, chrome), loadFeatures(ctx), loadAwards(ctx), loadLocation(ctx),
    loadViewing(ctx), loadContact(ctx, chrome)
  ]);
  const building = buildingOf(chrome.firma);
  return <V5 chrome={chrome} hero={hero} building={building} collection={collection} project={project} features={features} awards={awards} location={location}
    viewing={viewing} contact={contact}/>;
}
