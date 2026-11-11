// Homepage-ul în ordinea întrebărilor unui cumpărător: ce este → ce apartamente sunt → cum e viața aici → unde e →
// cum e construit → cine o confirmă → următorul pas. Nicio secțiune și niciun text nu se șterg; avantajele se împart:
//   · „Avantaje” (#4) rămâne la experiența de zi cu zi: piscinele private, promenada, locația aerisită, paza;
//     spațiile comerciale ies de aici, fiindcă „Despre” (#3) le enumeră deja pe toate;
//   · „Confort și siguranță” (#8, Tehnologie) primește construcția: patentul fațadelor, materialele, izolația fonică și
//     etanșarea (care o înlocuiește pe „Izolare fonică”, aceeași idee, mai puțin precisă).
// Prin store (istoric, eveniment, proveniență). Se poate rula din nou.
//   node scripts/homepage-traseu.mjs                               (local)
//   node --env-file=.env.turso.local scripts/homepage-traseu.mjs   (Turso)
import {openDb, prepare, all} from '../src/core/db.mjs';
import {saveEntity} from '../src/core/store.mjs';

const HOME = 3;
// hero · apartamente · despre · avantaje · locație · tehnologie · premii · testimoniale · contact
const ORDER = [1, 5, 3, 4, 7, 8, 19, 30, 10];
const ADVANTAGES = {section: 4, features: [7, 3, 5, 4]};
const TECHNOLOGY = {section: 8, features: [1, 2, 11, 13, 14, 15, 16, 18]};
const opts = {user: 'Homepage'};
const db = await prepare(openDb());

const now = (await all(db, 'SELECT dst_id FROM rel_pages_sections WHERE src_id = ? ORDER BY position', [HOME])).map(r => r.dst_id);
if ([...now].sort().join() !== [...ORDER].sort().join()) throw new Error(`Secțiunile homepage-ului s-au schimbat (${now.join(', ')}); verifică ORDER.`);
await saveEntity(db, 'pagini', HOME, {links: {sections: ORDER}}, opts);
console.log(`  ✓ ordinea homepage-ului: ${ORDER.join(' → ')}`);

for (const {section, features} of [ADVANTAGES, TECHNOLOGY]) {
  await saveEntity(db, 'sectiuni', section, {links: {features}}, opts);
  console.log(`  ✓ secțiunea #${section}: avantajele ${features.join(', ')}`);
}
db.close();
