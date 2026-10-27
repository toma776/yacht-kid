// Testimonialele stau doar pe pagina Comunitate; pagina separată /testimoniale/ nu mai există.
//   1. pagina Testimoniale (#13) trece în arhivă
//   2. adresele ei (/testimoniale/, /en/testimonials/) primesc 301 spre Comunitate
//   3. redirecționările vechilor pagini de testimonial (/testimonial/<nume>/) duc direct la Comunitate, fără lanț
// Totul prin store (istoric, eveniment, proveniență), cu autorul „Testimoniale”. Se poate rula din nou.
//   node scripts/testimoniale-in-comunitate.mjs                               (local)
//   node --env-file=.env.turso.local scripts/testimoniale-in-comunitate.mjs   (Turso)
import {openDb, prepare, one, all} from '../src/core/db.mjs';
import {saveEntity, createEntity} from '../src/core/store.mjs';

const PAGE = 13, TARGET = 'ref:pagini:8';
const OLD = `ref:pagini:${PAGE}`;
const opts = {user: 'Testimoniale'};
const db = await prepare(openDb());

const page = await one(db, 'SELECT status FROM pages WHERE id = ?', [PAGE]);
if (page && page.status !== 'archived') await saveEntity(db, 'pagini', PAGE, {status: 'archived'}, opts);
console.log(`  ✓ pagina #${PAGE}: ${page ? 'arhivată' : 'nu există'}`);

for (const from of ['/testimoniale/', '/en/testimonials/']) {
  const r = await one(db, 'SELECT id, to_ref, code FROM redirects WHERE from_path = ?', [from]);
  if (!r) await createEntity(db, 'redirectari', {base: {from_path: from, to_ref: TARGET, code: '301'}}, opts);
  else if (r.to_ref !== TARGET || r.code !== '301') await saveEntity(db, 'redirectari', r.id, {base: {to_ref: TARGET, to_path: null, code: '301'}}, opts);
  console.log(`  ✓ ${from} → 301 ${TARGET}`);
}

const old = await all(db, 'SELECT id FROM redirects WHERE to_ref = ?', [OLD]);
for (const r of old) await saveEntity(db, 'redirectari', r.id, {base: {to_ref: TARGET}}, opts);
console.log(`  ✓ ${old.length} redirecționări /testimonial/<nume>/ mutate spre ${TARGET}`);
db.close();
