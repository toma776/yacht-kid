// Homepage-ul v5, pe o limbă: aceeași funcție servește /v5/ (RO) și /en/v5/ (EN), ca cele două să rămână identice.
// Rama (meniu, subsol, contact) și secțiunile vin din Brain, pe limba cerută.
import {getDb} from '../../../core/db.mjs';
import {createContext} from '../../../site/context.mjs';
import {loadChrome} from '../../../site/chrome.mjs';
import {loadHero, loadCollection, loadProject, loadFeatures} from './data.mjs';
import {T, plain} from './i18n.mjs';
import V5 from './V5';

export const PATHS = {ro: '/v5/', en: '/en/v5/'};

export const metadataFor = lang => ({
  title: 'YACHT KID · v5',
  description: lang === 'en' ? 'Homepage proposal v5.' : 'Propunere de homepage v5.',
  robots: {index: false, follow: false},
  alternates: {languages: {ro: PATHS.ro, en: PATHS.en}}
});

export async function renderV5(lang) {
  const ctx = createContext(await getDb(), lang);
  const chrome = await loadChrome(ctx, PATHS);
  chrome.home = PATHS[lang];
  chrome.t = plain(T[lang]);
  const visit = chrome.header.find(i => i.mega === 'locuinte')?.aside?.cta?.href ?? chrome.contactHref;
  const [hero, collection, project, features] = await Promise.all([
    loadHero(ctx, chrome.labels), loadCollection(ctx, chrome.labels, visit, T[lang]), loadProject(ctx, chrome), loadFeatures(ctx)
  ]);
  return <V5 chrome={chrome} hero={hero} collection={collection} project={project} features={features}/>;
}
