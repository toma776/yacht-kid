import {getDb} from '../../../core/db.mjs';
import {createContext} from '../../../site/context.mjs';
import {loadChrome} from '../../../site/chrome.mjs';
import {loadHero} from './data.mjs';
import V5 from './V5';

export const metadata = {
  title: 'YACHT KID · v5',
  description: 'Propunere de homepage v5.',
  robots: {index: false, follow: false}
};

// Rama (meniu, subsol, contact) vine din Brain, ca pe site: aceleași meniuri „antet” și „subsol”, aceleași Date firmă
export default async function Page() {
  const ctx = createContext(await getDb(), 'ro');
  const chrome = await loadChrome(ctx, {ro: '/v5/', en: '/en/'});
  const hero = await loadHero(ctx, chrome.labels);
  return <V5 chrome={chrome} hero={hero}/>;
}
