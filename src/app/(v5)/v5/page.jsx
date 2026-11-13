import {getDb} from '../../../core/db.mjs';
import {createContext} from '../../../site/context.mjs';
import {loadChrome} from '../../../site/chrome.mjs';
import V5 from './V5';

export const metadata = {
  title: 'YACHT KID · v5',
  description: 'Propunere de homepage v5.',
  robots: {index: false, follow: false}
};

// Rama (meniu, subsol, contact) vine din Brain, ca pe site: aceleași meniuri „antet” și „subsol”, aceleași Date firmă
export default async function Page() {
  const chrome = await loadChrome(createContext(await getDb(), 'ro'), {ro: '/v5/', en: '/en/'});
  return <V5 chrome={chrome}/>;
}
