// Formularele cu efort minim pentru un prim contact: obligatorii rămân doar numele, un canal de contact (telefon SAU
// email, la alegere; regula „măcar unul” o aplică ui/Sections.jsx când ambele sunt opționale), data la vizionare și
// acordul pentru date. Tipul de apartament, designul interior, mesajul, intervalul, modalitatea de achiziție, domeniul și
// scopul (spații comerciale) devin opționale; din etichetele lor dispare steluța. Mesajul pentru formularele care încă
// nu trimit devine unul pentru vizitator, nu pentru echipă. Prin store (istoric, eveniment, proveniență); se poate rula din nou.
//   node scripts/formulare-simple.mjs                               (local)
//   node --env-file=.env.turso.local scripts/formulare-simple.mjs   (Turso)
import {openDb, prepare, one} from '../src/core/db.mjs';
import {saveEntity} from '../src/core/store.mjs';

const KEEP = {contact: ['name', 'consent'], vizionare: ['name', 'data_vizionare', 'consent'], comercial: ['name', 'consent']};
const PENDING = {
  ro: 'Trimiterea online nu este încă activă, așa că solicitarea nu a plecat. Datele tale rămân completate; ne poți contacta direct acum:',
  en: 'Online sending is not active yet, so your request has not been sent. Your details stay filled in; you can reach us directly now:'
};
const opts = {user: 'Formulare'};
const db = await prepare(openDb());

for (const [handle, keep] of Object.entries(KEEP)) {
  const f = await one(db, 'SELECT id, fields FROM forms WHERE handle = ?', [handle]);
  if (!f) { console.log(`  – ${handle}: nu există`); continue; }
  const fields = JSON.parse(f.fields).map(x => ({...x, required: keep.includes(x.name)}));
  const tr = {};
  for (const lang of ['ro', 'en']) {
    const t = await one(db, 'SELECT field_labels FROM forms_translations WHERE entity_id = ? AND lang = ?', [f.id, lang]);
    if (!t?.field_labels) continue;
    tr[lang] = {field_labels: JSON.parse(t.field_labels).map(l => ({...l, placeholder: l.placeholder ? l.placeholder.replace(/\s*\*$/, '') : l.placeholder}))};
  }
  await saveEntity(db, 'formulare', f.id, {base: {fields}, tr}, opts);
  console.log(`  ✓ ${handle}: obligatorii ${fields.filter(x => x.required).map(x => x.name).join(', ')}`);
}

const label = await one(db, `SELECT id FROM labels WHERE key = 'formular-in-lucru'`);
if (label) await saveEntity(db, 'etichete', label.id, {tr: {ro: {text: PENDING.ro}, en: {text: PENDING.en}}}, opts);
console.log('  ✓ mesajul pentru formularele care nu trimit încă');
db.close();
