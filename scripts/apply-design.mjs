// Designul aprobat (design/homepage), scris în Brain: meniurile cu plăci, secțiunile homepage-ului, etichetele
// interfeței, imaginile de copertă ale tipurilor de locuințe. Totul trece prin store (istoric, eveniment, proveniență),
// cu autorul „Design”. Traducerile EN care nu existau pe site-ul vechi sunt scrise de AI și marcate „inferred”.
//   node scripts/apply-design.mjs            (local)
//   node --env-file=.env.local scripts/apply-design.mjs   (Turso)
// Se poate rula din nou: înregistrările create sunt ținute minte în `meta` (design:<cheie> → id) și doar se actualizează.
import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {openDb, prepare, one, all} from '../src/core/db.mjs';
import {saveEntity, createEntity} from '../src/core/store.mjs';

const USER = 'Design', AI = 'Design · traducere AI';
const db = await prepare(openDb());
const now = new Date().toISOString();

const idBySlug = async (table, slug, lang = 'ro') => (await one(db, `SELECT entity_id id FROM "${table}_translations" WHERE lang = ? AND slug = ?`, [lang, slug]))?.id;
const idByTitle = async (table, col, text) => (await one(db, `SELECT entity_id id FROM "${table}_translations" WHERE lang = 'ro' AND "${col}" = ?`, [text]))?.id;
const meta = async k => Number((await one(db, 'SELECT value FROM meta WHERE key = ?', [`design:${k}`]))?.value) || null;
const setMeta = (k, v) => db.execute({sql: 'INSERT OR REPLACE INTO meta (key, value) VALUES (?, ?)', args: [`design:${k}`, String(v)]});

// O înregistrare a designului: creată o dată, apoi actualizată. `ai` = câmpurile EN traduse de AI.
async function upsert(key, metaKey, {base = {}, tr = {}, links, status, ai = {}}) {
  let id = await meta(metaKey);
  if (!id) { id = await createEntity(db, key, {}, {user: USER}); await setMeta(metaKey, id); }
  await saveEntity(db, key, id, {base, tr, links, status}, {user: USER});
  if (Object.keys(ai).length) await saveEntity(db, key, id, {tr: {en: ai}}, {user: AI});
  return id;
}

// ---------- 1. Imaginea lipsă din bibliotecă (piscina privată, capitolul 2 din Despre): era în snapshot, nefolosită pe site-ul vechi
async function ensureMedia(file, alt) {
  const exists = await one(db, 'SELECT id FROM media WHERE filename = ?', [file]);
  if (exists) return exists.id;
  const body = await readFile(join(process.cwd(), 'reference', 'snapshot', 'media', file));
  const sha = createHash('sha1').update(body).digest('hex');
  const size = (b => { for (let i = 2; i < b.length - 9;) { if (b[i] !== 0xff) { i++; continue; } const m = b[i + 1], len = b.readUInt16BE(i + 2); if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return [b.readUInt16BE(i + 7), b.readUInt16BE(i + 5)]; i += 2 + len; } return [null, null]; })(body);
  const tx = await db.transaction('write');
  try {
    const r = await tx.execute({sql: `INSERT INTO media (filename, sha1, mime, width, height, bytes, legacy_url, created_at, updated_at, created_by, updated_by) VALUES (?, ?, 'image/jpeg', ?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [file, sha, size[0], size[1], body.length, `https://yachtkid.ro/wp-content/uploads/${file}`, now, now, USER, USER]});
    const id = Number(r.lastInsertRowid);
    await tx.execute({sql: 'INSERT INTO media_translations (entity_id, lang, alt, updated_at) VALUES (?, ?, ?, ?)', args: [id, 'ro', alt, now]});
    await tx.execute({sql: 'INSERT OR IGNORE INTO import_keys (entity, natural_key, entity_id, at) VALUES (?, ?, ?, ?)', args: ['media', `media:${sha}`, id, now]});
    const src = await tx.execute({sql: `INSERT INTO sources (kind, url, title, method, snapshot_file, status, created_at) VALUES ('site', ?, ?, 'download', ?, 200, ?) ON CONFLICT (url) DO UPDATE SET title = excluded.title RETURNING id`,
      args: [`https://yachtkid.ro/wp-content/uploads/${file}`, file, `snapshot/media/${file}`, now]});
    for (const f of ['filename', 'sha1', 'mime']) await tx.execute({sql: `INSERT OR REPLACE INTO provenance (entity, entity_id, field, lang, source_id, method, certainty, created_at) VALUES ('media', ?, ?, '', ?, 'download', 'confirmed', ?)`, args: [id, f, src.rows[0].id, now]});
    await tx.execute({sql: `INSERT INTO audit_log (at, user_name, action, entity, entity_id, label, changes) VALUES (?, ?, 'create', 'media', ?, ?, '{}')`, args: [now, USER, id, file]});
    await tx.commit();
    return id;
  } catch (e) { await tx.rollback(); throw e; }
}
const pool = await ensureMedia('2024/10/YachtKID-Exterior-v12313.jpg', 'Piscina privată a unui apartament de la parter, sub balcoanele în val');

// ---------- 2. ID-urile din Brain pe care le folosește designul
const P = {
  home: await idBySlug('pages', ''), blog: await idBySlug('pages', 'blog'), contact: await idBySlug('pages', 'contact'),
  tehnologie: await idBySlug('pages', 'tehnologie'), comunitate: await idBySlug('pages', 'comunitate'), testimoniale: await idBySlug('pages', 'testimoniale'),
  vizionare: await idBySlug('pages', 'programeaza-o-vizionare'), privacy: await idBySlug('pages', 'politica-de-confidentialitate'),
  cookies: await idBySlug('pages', 'politica-cookies'), terms: await idBySlug('pages', 'termeni-si-conditii')
};
const U = Object.fromEntries((await all(db, `SELECT id, kind, rooms FROM unit_types`)).map(u => [u.kind === 'apartament' ? `ap${u.rooms}` : u.kind, u.id]));
const premii = await idBySlug('categories', 'premii');
const F = Object.fromEntries((await all(db, 'SELECT id, token FROM facts')).map(f => [f.token, f.id]));
const contactForm = (await one(db, `SELECT id FROM forms WHERE handle = 'contact'`)).id;
const ref = (k, id, hash = '') => `ref:${k}:${id}${hash}`;
for (const [k, v] of Object.entries({...P, ...U, premii, contactForm})) if (!v) throw new Error(`Lipsește ${k} în Brain`);

// ---------- 3. Copertele tipurilor de locuințe (imaginile din mega meniu și din colecție)
const COVERS = {ap2: '2025/09/apartament-2-camere_SNY5891-Edit.webp', ap3: '2026/02/cover-2-camere-yacht-kid-v2.webp', ap4: '2025/09/apartamente-4-camere_SNY5815-Edit.webp', duplex: '2026/02/duplex-apartament-cover-image-edit-2026.webp'};
for (const [k, file] of Object.entries(COVERS)) {
  const m = await one(db, 'SELECT id FROM media WHERE filename = ?', [file]);
  if (m) await saveEntity(db, 'locuinte', U[k], {base: {hero_image: m.id}}, {user: USER});
}
const mediaId = async file => (await one(db, 'SELECT id FROM media WHERE filename = ?', [file]))?.id;
const M = {facade: await mediaId('2024/10/YachtKID-Exterior-51.jpg'), colaj: await mediaId('2024/10/colaj-yacht-kid-resize-_0001_colaj-yacht-kid-00003.jpg'),
  curte: await mediaId('2024/10/poza-yacht-website-v1-final.jpg'), premiu: await mediaId('2024/10/yacht-kid-premiu-masterprize.jpg'),
  piscina: await mediaId('2025/02/Poza-Colaj-3-edit-v1.jpg'), heroImg: await mediaId('2024/10/homapage-hero-section-1-edit-scaled-1.jpg'),
  lifestyle: await mediaId('2024/10/homepage-hero-section.jpg'), hartaRo: await mediaId('2025/01/ro-yacht-kid-harta.jpg'), hartaEn: await mediaId('2025/01/en-yacht-kid-harta-v2.jpg'),
  video: await mediaId('2026/09/Video-Yacht-Kid-Iunie-26-H264.mp4')};

// ---------- 4. Etichetele interfeței (RO / EN)
const LABELS = {
  'solicita-oferta': ['Solicită ofertă', 'Get offer'], 'programeaza-vizionare': ['Programează vizionare', 'Schedule a viewing'],
  meniu: ['Meniu', 'Menu'], 'inchide-meniul': ['Închide meniul', 'Close menu'], 'meniul-principal': ['Meniul principal', 'Main menu'], limba: ['Limba', 'Language'],
  'pagina-principala': ['Pagina principală', 'Home'], telefon: ['Telefon', 'Phone'], adresa: ['Adresă', 'Address'],
  'scrie-ne-whatsapp': ['Scrie-ne pe WhatsApp', 'Message us on WhatsApp'], 'subsol-titlu': ['Experimentează un nou standard de viață.', 'Experience a new standard of living.'],
  'subsol-tagline': ['Descoperă locuința care îți schimbă perspectiva asupra luxului.', 'Discover the home that changes your perspective on luxury.'],
  'vizitati-ne': ['Vizitează-ne', 'Visit us'], 'deschide-maps': ['Deschide în Google Maps', 'Open in Google Maps'], program: ['Program', 'Opening hours'],
  'sediu-social': ['Sediu social', 'Registered office'], sus: ['Sus', 'Top'], 'contact-rapid': ['Contact rapid', 'Quick contact'], 'retele-sociale': ['Rețele sociale', 'Social media'],
  'sari-la-continut': ['Sari la conținut', 'Skip to content'], 'de-la': ['de la', 'from'], tva: ['+ TVA', '+ VAT'], 'afla-mai-multe': ['Află mai multe', 'Learn more'],
  'citeste-articolul': ['Citește articolul', 'Read article'], apartamente: ['Apartamente', 'Apartments'], suprafata: ['Suprafață', 'Area'], etaj: ['Etaj', 'Floor'],
  bai: ['Băi', 'Bathrooms'], terasa: ['Terasă', 'Terrace'], balcon: ['Balcon', 'Balcony'], da: ['Da', 'Yes'], 'pret-de-la': ['Preț de la', 'Starting from'],
  'formular-contact': ['Formular contact', 'Contact form'], trimite: ['Trimite solicitare', 'Send request'],
  'formular-comercial': ['Cerere pentru spațiu comercial', 'Commercial space enquiry'],
  'acord-date': ['Sunt de acord cu prelucrarea datelor personale, conform politicii de confidențialitate.', 'I agree to the processing of personal data, according to the privacy policy.'],
  'formular-in-lucru': ['Formularul nu trimite încă date: trimiterea vine cu cererile din Brain.', 'The form does not send data yet: sending comes with the requests in the Brain.']
};
for (const [key, [ro, en]] of Object.entries(LABELS)) {
  // Eticheta se creează cu textul RO în aceeași salvare (textul e obligatoriu)
  const existing = (await one(db, 'SELECT id FROM labels WHERE key = ?', [key]))?.id;
  const id = existing ?? await upsert('etichete', `eticheta:${key}`, {base: {key}, tr: {ro: {text: ro}}});
  if (existing) await saveEntity(db, 'etichete', id, {tr: {ro: {text: ro}}}, {user: USER});
  await saveEntity(db, 'etichete', id, {tr: {en: {text: en}}}, {user: AI});
}

// ---------- 5. Date firmă: programul în EN (nu exista pe site-ul vechi); cifrele cu etichetele din design
await saveEntity(db, 'firma', (await one(db, 'SELECT id FROM company')).id, {tr: {en: {schedule: 'Monday – Friday: 09:00 – 17:00'}}}, {user: AI});
await saveEntity(db, 'cifre', F.parc, {tr: {ro: {label: 'Acces direct la un parc de {parc}'}}}, {user: USER});
await saveEntity(db, 'cifre', F.parc, {tr: {en: {label: 'Direct access to a {parc} park'}}}, {user: AI});
await saveEntity(db, 'cifre', F.intretinere, {tr: {ro: {label: 'Cost de întreținere minim: doar {intretinere}'}}}, {user: USER});
await saveEntity(db, 'cifre', F.intretinere, {tr: {en: {label: 'Ultra-low maintenance cost: only {intretinere}'}}}, {user: AI});
const typo = await idByTitle('features', 'title', 'Protecție impotriva incendiilor');
if (typo) await saveEntity(db, 'avantaje', typo, {tr: {ro: {title: 'Protecție împotriva incendiilor'}}}, {user: USER});

// ---------- 6. Meniurile: antetul cu două plăci, subsolul pe coloane
const menuId = async loc => (await one(db, 'SELECT id FROM menus WHERE location = ?', [loc])).id;
const MENU = {
  ro: {
    antet: [
      {label: 'Apartamente', mega: 'locuinte', eyebrow: 'Colecția de apartamente', title: 'Designul modern, finisajele de înaltă clasă și confortul, într-o experiență superioară de locuire.',
        more: {label: 'Descoperă colecția', to: ref('pagini', P.home, '#apartamente')},
        aside: {eyebrow: 'Vizionare', title: 'Programează vizionare!', cta: {label: 'Programează', to: ref('pagini', P.vizionare)}},
        children: [{to: ref('locuinte', U.ap2), short: '2 camere'}, {to: ref('locuinte', U.ap3), short: '3 camere'}, {to: ref('locuinte', U.ap4), short: '4 camere'}, {to: ref('locuinte', U.duplex), short: 'Duplex'}]},
      {label: 'Proiectul', mega: 'proiect', eyebrow: 'Proiectul', title: 'Un ansamblu premiat internațional, pe malul lacului, cu tot ce ai nevoie la parter.',
        more: {label: 'Despre YACHT KID', to: ref('pagini', P.home, '#despre')},
        children: [
          {label: 'Tehnologie', to: ref('pagini', P.tehnologie), desc: 'Structură post-tensionată, fațadă cu patent propriu, consum redus.', short: 'Structură, fațadă, eficiență', image: M.facade, icon: 'facade'},
          {label: 'Comunitate', to: ref('pagini', P.comunitate), desc: 'Cafenea, minimarket, beauty și wellness, chiar la parter.', short: 'Tot ce ai nevoie, la parter', image: M.colaj, icon: 'community'},
          {label: 'Spații comerciale', to: ref('locuinte', U.comercial), desc: 'Spații cu terasă, la parterul ansamblului, pentru afaceri premium.', short: 'Pentru afaceri premium', image: M.curte, icon: 'shop'},
          {label: 'Premii', to: ref('categorii', premii), desc: 'Premiat la {nr_premii} competiții internaționale de arhitectură.', short: '{nr_premii} competiții internaționale', image: M.premiu, icon: 'award'}
        ]},
      {label: 'Blog', to: ref('pagini', P.blog)},
      {label: 'Contact', to: ref('pagini', P.contact)},
      {label: 'Solicită ofertă', to: ref('pagini', P.home, '#contact'), cta: true}
    ],
    subsol: [
      {label: 'Apartamente', children: [
        {label: 'Apartamente 2 camere', to: ref('locuinte', U.ap2)}, {label: 'Apartamente 3 camere', to: ref('locuinte', U.ap3)},
        {label: 'Apartamente 4 camere', to: ref('locuinte', U.ap4)}, {label: 'Apartamente tip duplex', to: ref('locuinte', U.duplex)}, {label: 'Spații comerciale', to: ref('locuinte', U.comercial)}]},
      {label: 'Proiectul', children: [
        {label: 'Despre noi', to: ref('pagini', P.home, '#despre')}, {label: 'Tehnologie', to: ref('pagini', P.tehnologie)}, {label: 'Premii', to: ref('categorii', premii)},
        {label: 'Comunitate', to: ref('pagini', P.comunitate)}, {label: 'Testimoniale', to: ref('pagini', P.testimoniale), mobile: true}, {label: 'Blog', to: ref('pagini', P.blog)}, {label: 'Contact', to: ref('pagini', P.contact)}]},
      {label: 'Informații legale', legal: true, children: [
        {label: 'Politica de confidențialitate', to: ref('pagini', P.privacy)}, {label: 'Politica de cookie-uri', to: ref('pagini', P.cookies)}, {label: 'Termeni și condiții', to: ref('pagini', P.terms)},
        {label: 'ANPC', to: 'https://anpc.ro'}, {label: 'Soluționarea alternativă a litigiilor', to: 'https://anpc.ro/ce-este-sal/'},
        {label: 'Soluționarea online a litigiilor', to: 'https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=RO'}]}
    ]
  },
  en: {
    antet: [
      {label: 'Apartments', mega: 'locuinte', eyebrow: 'Apartments collection', title: 'Modern design, high-end finishes and comfort, in a superior living experience.',
        more: {label: 'Discover the collection', to: ref('pagini', P.home, '#apartamente')},
        aside: {eyebrow: 'Viewing', title: 'Schedule a viewing!', cta: {label: 'Contact us', to: ref('pagini', P.contact)}},
        children: [{to: ref('locuinte', U.ap2), short: '1 bedroom'}, {to: ref('locuinte', U.ap3), short: '2 bedrooms'}, {to: ref('locuinte', U.ap4), short: '3 bedrooms'}, {to: ref('locuinte', U.duplex), short: 'Duplex'}]},
      {label: 'The project', mega: 'proiect', eyebrow: 'The project', title: 'An internationally awarded development on the lakeshore, with everything you need on the ground floor.',
        more: {label: 'About YACHT KID', to: ref('pagini', P.home, '#despre')},
        children: [
          {label: 'Technology', to: ref('pagini', P.tehnologie), desc: 'Post-tensioned structure, patented facade, low energy use.', short: 'Structure, facade, efficiency', image: M.facade, icon: 'facade'},
          {label: 'Community', to: ref('pagini', P.comunitate), desc: 'Café, minimarket, beauty and wellness, right on the ground floor.', short: 'Everything you need, downstairs', image: M.colaj, icon: 'community'},
          {label: 'Commercial spaces', to: ref('locuinte', U.comercial), desc: 'Ground-floor spaces with terraces, for premium businesses.', short: 'For premium businesses', image: M.curte, icon: 'shop'},
          {label: 'Awards', to: ref('categorii', premii), desc: 'Awarded at {nr_premii} international architecture competitions.', short: '{nr_premii} international competitions', image: M.premiu, icon: 'award'}
        ]},
      {label: 'Blog', to: ref('pagini', P.blog)},
      {label: 'Contact', to: ref('pagini', P.contact)},
      {label: 'Get offer', to: ref('pagini', P.home, '#contact'), cta: true}
    ],
    subsol: [
      {label: 'Apartments', children: [
        {label: '1 Bedroom Apartments', to: ref('locuinte', U.ap2)}, {label: '2 Bedroom Apartments', to: ref('locuinte', U.ap3)},
        {label: '3 Bedroom Apartments', to: ref('locuinte', U.ap4)}, {label: 'Duplex apartments', to: ref('locuinte', U.duplex)}, {label: 'Commercial spaces', to: ref('locuinte', U.comercial)}]},
      {label: 'The project', children: [
        {label: 'About us', to: ref('pagini', P.home, '#despre')}, {label: 'Technology', to: ref('pagini', P.tehnologie)}, {label: 'Awards', to: ref('categorii', premii)},
        {label: 'Community', to: ref('pagini', P.comunitate)}, {label: 'Testimonials', to: ref('pagini', P.testimoniale), mobile: true}, {label: 'Blog', to: ref('pagini', P.blog)}, {label: 'Contact', to: ref('pagini', P.contact)}]},
      {label: 'Legal information', legal: true, children: [
        {label: 'Privacy policy', to: ref('pagini', P.privacy)}, {label: 'Cookie policy', to: ref('pagini', P.cookies)}, {label: 'Terms and conditions', to: ref('pagini', P.terms)},
        {label: 'ANPC', to: 'https://anpc.ro'}, {label: 'Alternative dispute resolution', to: 'https://anpc.ro/ce-este-sal/'},
        {label: 'Online dispute resolution', to: 'https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=RO'}]}
    ]
  }
};
for (const loc of ['antet', 'subsol']) {
  const id = await menuId(loc);
  await saveEntity(db, 'meniuri', id, {tr: {ro: {items: MENU.ro[loc]}}}, {user: USER});
  await saveEntity(db, 'meniuri', id, {tr: {en: {items: MENU.en[loc]}}}, {user: AI});
}

// ---------- 7. Secțiunile homepage-ului, în ordinea din design
const feat = async titles => Promise.all(titles.map(t => idByTitle('features', 'title', t)));
const btn = (label, to, extra = {}) => ({label, to, ...extra});
const fig = (media, alt, caption) => `<figure><img data-media="${media}" alt="${alt}"><figcaption>${caption}</figcaption></figure>`;
const SECTIONS = [
  {key: 'hero', kind: 'hero', base: {video: M.video, image: M.heroImg},
    ro: {eyebrow: 'Ultimele apartamente disponibile', heading: 'Experimentează un nou standard de viață', text: '<p>Descoperă locuința care îți schimbă perspectiva asupra luxului.</p>',
      buttons: [btn('Solicită ofertă', '#contact'), btn('Video de prezentare', '#video')]},
    en: {eyebrow: 'Last available apartments', heading: 'Experience a new standard of living', text: '<p>Discover the home that changes your perspective on luxury.</p>',
      buttons: [btn('Get offer', '#contact'), btn('Presentation video', '#video')]}},
  {key: 'cifre', kind: 'cifre', links: {facts: [F.parc, F.intretinere]},
    ro: {heading: 'YACHT KID în cifre', buttons: [{value: '{nr_premii}', label: 'Premiat la {nr_premii} competiții internaționale de renume'}, {value: 'Nr. 1', label: 'Izolație fonică și etanșare nr. 1 pe piață'}]},
    en: {heading: 'YACHT KID in figures', buttons: [{value: '{nr_premii}', label: '{nr_premii}× international award winner'}, {value: 'No. 1', label: 'Market-leading sound insulation & sealing'}]}},
  // Banda de premii (specificația din design/homepage, „2b. PREMII”): logo-urile vin din premii.logo, fără lista scurtă
  {key: 'premii', kind: 'premii', anchor: 'premii',
    ro: {eyebrow: 'Recunoaștere internațională', heading: 'Premiat la {nr_premii} competiții internaționale de renume', buttons: [btn('Vezi premiile', ref('categorii', premii))]},
    en: {buttons: [btn('See the awards', ref('categorii', premii))]},
    ai: {eyebrow: 'International recognition', heading: 'Awarded at {nr_premii} renowned international competitions'}},
  {key: 'despre', kind: 'text', anchor: 'despre',
    ro: {eyebrow: 'Despre YACHT KID', heading: 'Un ansamblu rezidențial de lux, pe malul lacului, deschis către parc.', buttons: [btn('Solicită ofertă', '#contact')],
      text: '<blockquote><p>Fiecare aspect al execuției YACHT KID reflectă un angajament fără compromis față de calitate, design inteligent și o experiență de locuire superioară, oferind un produs de top, unic pe piață.</p></blockquote>'
        + '<h3>Locație și investiție</h3><p>YACHT KID este un ansamblu rezidențial de lux, conceput pentru a oferi atât un stil de viață excepțional, cât și o valoare investițională solidă pe termen lung. Situat într-o locație exclusivistă pe malul lacului, la doar câțiva pași de apă și cu deschidere directă către un parc de {parc}, proiectul beneficiază de o poziționare de top și de un potențial constant de creștere a cererii.</p>'
        + fig(M.facade, 'Curtea interioară YACHT KID: benzile albe ale balcoanelor, cu colțuri rotunjite', '{parc} — parc cu deschidere directă')
        + '<h3>Locuințe și comunitate</h3><p>Dezvoltarea oferă o colecție de apartamente moderne, inclusiv locuințe exclusive cu piscine private, construite cu tehnologii avansate și materiale de cea mai înaltă calitate, inspirate din industria yachtingului. Rezidenții beneficiază de o comunitate complet integrată, cu cafenea la parter și livrare direct în apartamente, magazin alimentar, salon premium de înfrumusețare, clinică stomatologică și studio de hot pilates, toate concepute pentru confort maxim și comoditate zilnică.</p>'
        + fig(pool, 'Piscina privată a unui apartament de la parter, sub balcoanele în val', 'Piscine private — la apartamentele de la parter')
        + '<h3>Premii și costuri reduse</h3><p>Premiat în cadrul a {nr_premii} competiții internaționale de renume și construit la cele mai înalte standarde de calitate, YACHT KID se remarcă prin echilibrul său unic între lux și eficiența costurilor. În ciuda poziționării sale de top, proiectul oferă unele dintre cele mai reduse costuri de mentenanță din București, începând de la doar {intretinere}, asigurând cheltuieli optimizate post-achiziție și o performanță investițională solidă.</p>'
        + fig(M.premiu, 'Fațada YACHT KID, cu mențiunea de onoare Architecture MasterPrize 2024', '{intretinere} — cost de întreținere, de la')},
    en: {eyebrow: 'About YACHT KID', buttons: [btn('Get offer', '#contact')],
      text: '<blockquote><p>Every aspect of YACHT KID reflects an uncompromising commitment to quality, intelligent design, and a superior living experience, delivering a top-tier luxury product unlike any other on the market.</p></blockquote>'
        + '<h3>Location and investment</h3><p>Introducing YACHT KID, an exclusive luxury residential development designed to deliver both exceptional living and strong long-term investment value. Strategically positioned in a prime lakeside location, just steps from the water and directly overlooking a {parc} park, the development benefits from premium positioning and sustained demand potential.</p>'
        + fig(M.facade, 'The YACHT KID inner courtyard: the white balcony bands with rounded corners', '{parc} — park with direct access')
        + '<h3>Homes and community</h3><p>YACHT KID offers high-end apartments, including exclusive residences with private pools, built using advanced technologies and top-quality materials inspired by the yachting industry. Residents enjoy a fully integrated lifestyle ecosystem, featuring a ground-floor café with in-apartment delivery, a grocery store, a premium beauty salon, a top dental clinic and a hot pilates studio, all designed for maximum convenience and everyday comfort.</p>'
        + fig(pool, 'The private pool of a ground-floor apartment, beneath the wave-shaped balconies', 'Private pools — at the ground-floor apartments')
        + '<h3>Awards and low costs</h3><p>Awarded at {nr_premii} major international competitions and built to the highest construction standards, YACHT KID stands out through its unique balance of luxury and cost efficiency. Despite its high-end positioning, the development offers some of the lowest maintenance costs on the Bucharest market, starting from only {intretinere}, ensuring optimized post-purchase expenses and strong investment performance.</p>'
        + fig(M.premiu, 'The YACHT KID facade, with the Architecture MasterPrize 2024 honorable mention', '{intretinere} — maintenance cost, from')},
    ai: {heading: 'A luxury residential development on the lakeshore, open to the park.'}},
  {key: 'avantaje', kind: 'avantaje', anchor: 'avantaje',
    links: {features: await feat(['Patent de invenție pentru fațade', 'Materiale premium', 'Apartamente cu piscine private', 'Izolație fonică și etanșare nr. 1 pe piață', 'Promenadă publică', 'Locație aerisită', 'Pază 24/7, camere CCTV', 'Spații comerciale'])},
    ro: {eyebrow: 'Avantaje', heading: 'Detalii care definesc o altă clasă de locuire.'}, en: {}, ai: {eyebrow: 'Advantages', heading: 'Details that define a different class of living.'}},
  {key: 'colectie', kind: 'alte-locuinte', anchor: 'apartamente',
    ro: {eyebrow: 'Apartamente', heading: 'Colecția de Apartamente', text: '<p>Descoperă colecția noastră de apartamente de lux, unde designul modern, finisajele de înaltă clasă și confortul excepțional se îmbină pentru a crea o experiență superioară de locuire.</p>'},
    en: {eyebrow: 'Apartments', heading: 'Apartments Collection', text: '<p>Discover our exclusive collection of luxury apartments, where timeless design, high-end finishes, and exceptional comfort come together to create the ultimate living experience.</p>'}},
  // Galeria „arhitectura” (premiile cu trei fotografii) a ieșit de pe homepage: banda de premii spune deja asta.
  // Secțiunea rămâne în Brain, nelegată, și se poate pune înapoi din /manage.
  {key: 'locatie', kind: 'text', anchor: 'locatie',
    ro: {eyebrow: 'Locație', heading: 'Locație premium pe malul lacului, cu deschidere către parc', buttons: [btn('Solicită ofertă', '#contact')],
      text: '<p>Amplasat în zona de nord a capitalei, YACHT KID oferă acces rapid la diverse parcuri, centre comerciale, restaurante de top, săli de fitness și multe altele.</p><p>Ansamblul beneficiază de toate facilitățile necesare pentru un stil de viață modern și confortabil, fiind poziționat ideal pentru a îmbina eleganța cu comoditatea zilnică.</p><p>{adresa}</p>'
        + `<figure><img data-media="${M.hartaRo}" alt="Harta zonei: YACHT KID pe Str. Anton Holban 6, lângă Lacul Tei, Metrou Pipera, Promenada Mall, Kaufland, World Class Caro și Clubul Pescariu Sports &amp; SPA"></figure>`},
    en: {eyebrow: 'Location', heading: 'Parkfront & Lakeside Location', buttons: [btn('Get offer', '#contact')],
      text: '<p>Experience lakeside living in one of Bucharest’s most desired areas. Located in the northern part of the capital, YACHT KID offers easy access to parks, shopping centers, fine dining restaurants, fitness centers, and more.</p><p>This exclusive development is designed to provide a modern, comfortable lifestyle, perfectly blending luxury with everyday convenience.</p><p>{adresa}</p>'
        + `<figure><img data-media="${M.hartaEn}" alt="Area map: YACHT KID on Anton Holban 6 Street, near Lake Tei, Pipera metro, Promenada Mall, Kaufland, World Class Caro and Pescariu Sports &amp; SPA"></figure>`}},
  {key: 'confort', kind: 'avantaje', anchor: 'tehnologie',
    links: {features: await feat(['Consum redus de energie', 'Protecție impotriva incendiilor', 'Protecție împotriva incendiilor', 'Protecție împotriva condensului', 'Izolare termică', 'Izolare fonică', 'Eficiență energetică ridicată']).then(ids => ids.filter(Boolean))},
    ro: {eyebrow: 'Tehnologie', heading: 'Confort și siguranță', buttons: [btn('Descoperă Yacht KID Technology', ref('pagini', P.tehnologie))],
      text: '<p>Finisajele moderne, materialele de calitate superioară și tehnologia de ultimă generație reprezintă elemente esențiale în decizia de a achiziționa un apartament la YACHT KID.</p><p>Clădirea este realizată cu cele mai bune materiale și proiectată pentru a oferi o experiență de locuire la un standard ridicat, remarcabilă prin detalii rafinate și design unic. Aceasta garantează nu doar confort și siguranță, ci și economii semnificative la facturile individuale și colective pentru utilități.</p>'},
    en: {eyebrow: 'Technology', heading: 'Comfort and safety', buttons: [btn('Discover Yacht KID Technology', ref('pagini', P.tehnologie))],
      text: '<p>The modern finishes, high-quality materials, and innovative technology are essential factors when choosing to purchase a residential unit at YACHT KID.</p><p>The building is crafted with top-tier materials and designed to deliver an exceptional living experience, distinguished by unique design elements and refined details. This approach ensures not only comfort and safety, but also substantial savings on both individual and shared utility costs.</p>'}},
  {key: 'vizionare', kind: 'cta', anchor: 'vizionare', base: {image: M.lifestyle},
    ro: {eyebrow: 'Vizionare', heading: 'Programează vizionare!', buttons: [btn('Programează vizionare', ref('pagini', P.vizionare))]},
    en: {buttons: [btn('Contact us', ref('pagini', P.contact))]}, ai: {eyebrow: 'Viewing', heading: 'Schedule a viewing!'}},
  {key: 'contact', kind: 'formular', anchor: 'contact', base: {form: contactForm},
    ro: {eyebrow: 'Contact', heading: 'Hai să facem primul pas spre locuința ta de vis!', text: '<p>Fie că îți dorești să programezi o vizionare, să primești detalii suplimentare sau pur și simplu să descoperi de ce Yacht KID este alegerea perfectă pentru tine, suntem la un click distanță.</p>'},
    en: {eyebrow: 'Contact', heading: 'Let’s take the first step towards your dream home!', text: '<p>Whether you want to schedule a viewing, receive additional details or simply discover why Yacht KID is the perfect choice for you, we are just a click away.</p>'}}
];
const ids = [];
for (const s of SECTIONS) {
  const id = await upsert('sectiuni', `sectiune:${s.key}`, {base: {kind: s.kind, anchor: s.anchor ?? null, ...(s.base ?? {})}, tr: {ro: s.ro, en: s.en}, links: s.links, ai: s.ai ?? {}});
  ids.push(id);
}
await saveEntity(db, 'pagini', P.home, {links: {sections: ids}}, {user: USER});

// Pagina blogului: lista tuturor articolelor publicate (pe EN, doar cele traduse)
const blogList = await upsert('sectiuni', 'sectiune:blog-lista', {base: {kind: 'articole', anchor: null},
  tr: {ro: {eyebrow: 'Yacht KID', heading: 'Blog'}, en: {eyebrow: 'Yacht KID', heading: 'Blog'}}});
await saveEntity(db, 'pagini', P.blog, {links: {sections: [blogList]}}, {user: USER});

// ---------- 7b. Spații comerciale: pagina compusă cu blocurile din site-ul vechi (/spatii-comerciale/, /en/commercial-spaces/).
// Textele RO și EN sunt cele de pe site-ul vechi (nu traduceri AI); afacerile și fișa tehnică vin din Brain.
const lifestyleVideo = await mediaId('2024/11/Yacht-Kid-Lifestyle.mp4');
const BENEFITS = [
  [['O locație premium', 'O comunitate prosperă, situată într-o zonă exclusivistă.'], ['Strategic location', 'An innovative community in an exclusive district.']],
  [['Vizibilitate excelentă', 'Trafic pietonal intens, dar și auto, pentru acces facil al clienților.'], ['High Visibility', 'Strong pedestrian and vehicle traffic for maximum exposure.']],
  [['Spații flexibile', 'Posibilități variate de amenajare și compartimentare, adaptate nevoilor afacerii tale.'], ['Flexible Spaces', 'Customizable layouts tailored to your business needs.']],
  [['Investiție sigură și profitabilă', 'Randament atractiv, venit pasiv stabil și oportunități de creștere pe termen lung.'], ['Secure & Profitable Investment', 'Attractive returns, stable income, and long-term growth potential.']]
];
const benefits = [];
for (const [i, [[tRo, xRo], [tEn, xEn]]] of BENEFITS.entries())
  benefits.push(await upsert('avantaje', `avantaj:comercial-${i + 1}`, {base: {group: 'avantaje'}, status: 'published',
    tr: {ro: {title: tRo, text: xRo}, en: {title: tEn, text: xEn}}}));
// Introducerea lungă de pe site-ul vechi nu încape în hero (standardul: titlu 3 rânduri, subtitlu 2): deschide „De ce”
const WHY = {
  ro: '<p>Descoperă colecția de spații comerciale YACHT KID, proiectate pentru a-ți oferi flexibilitate maximă și adaptabilitate perfectă la nevoile afacerii tale. Fie că ești antreprenor în căutarea unui spațiu ideal sau investitor în căutarea unei oportunități sigure și profitabile, comunitatea YACHT KID îți oferă acces la una dintre cele mai dinamice și prospere zone ale capitalei.</p><p>Bucură-te de o investiție imobiliară sigură și rentabilă, într-o comunitate selectă, care îți garantează un randament atractiv și un venit pasiv stabil. Cu un design inovator, spații modernizate și o locație de excepție, YACHT KID este alegerea perfectă pentru cei care vor să își diversifice portofoliul și să își dezvolte afacerea într-un mediu exclusivist.</p><p>Indiferent dacă vrei să deschizi un magazin de lux, un showroom modern, un spațiu dedicat serviciilor premium, sau să faci o investiție sigură, aici găsești cadrul ideal pentru succes.</p><p>Alege un spațiu care îți crește afacerea și îți maximizează investiția. Alege YACHT KID.</p>',
  en: '<p>Discover the YACHT KID collection of commercial spaces, designed for maximum flexibility and seamless adaptability to your business needs. Whether you’re an entrepreneur searching for the perfect space or an investor looking for a secure and profitable opportunity, the YACHT KID Community offers access to one of the most dynamic and thriving areas in the capital.</p><p>Join an exclusive community that guarantees attractive returns and stable passive income. With innovative design, modernized spaces, and a premium location, YACHT KID is the ideal choice for those looking to diversify their portfolio and expand their business in a high-end environment.</p><p>Whether you’re planning to open a luxury boutique, an exclusive showroom, a premium service space, or secure a profitable investment, this is the perfect setting for success.</p><p>Choose a space that accelerates your business growth and maximizes your investment. Choose YACHT KID.</p>'
};
// Formularul pentru afaceri (nu pentru cei care caută un apartament): firmă, domeniu, suprafață, scop.
// Structura e una; etichetele EN sunt traduse de AI (de verificat), ca restul textelor noi.
const fl = (name, label, placeholder = null, options = null) => ({name, label, placeholder, options});
const businessForm = await upsert('formulare', 'formular:comercial', {
  base: {name: 'Formular spații comerciale', handle: 'comercial', success_page: await idBySlug('pages', 'multumim'), notify: [],
    fields: [
      {name: 'name', type: 'text', required: true}, {name: 'company', type: 'text', required: false},
      {name: 'email', type: 'email', required: true}, {name: 'phone', type: 'tel', required: true},
      {name: 'domeniu', type: 'select', required: true}, {name: 'suprafata', type: 'select', required: false},
      {name: 'scop', type: 'select', required: true},
      {name: 'mesaj', type: 'textarea', required: false}, {name: 'consent', type: 'checkbox', required: true}
    ].map(f => ({options_from: null, options: null, ...f}))},
  tr: {ro: {
    intro: 'Pentru antreprenori și investitori interesați de spațiile de la parterul YACHT KID.',
    submit_label: 'Trimite cererea',
    field_labels: [
      fl('name', 'Nume și prenume'), fl('company', 'Companie / brand'), fl('email', 'Email'), fl('phone', 'Telefon'),
      fl('domeniu', 'Domeniul afacerii', 'Alegeți domeniul', ['Retail / magazin', 'Cafenea, restaurant (HoReCa)', 'Beauty & wellness', 'Servicii medicale', 'Birou / servicii profesionale', 'Altul']),
      fl('suprafata', 'Suprafața dorită', 'Alegeți suprafața', ['Până la 100 m²', '100 – 150 m²', 'Peste 150 m²', 'Încă nu știu']),
      fl('scop', 'Vă interesează spațiul pentru', 'Alegeți o opțiune', ['Propria afacere', 'Investiție (închiriere)']),
      fl('mesaj', 'Spuneți-ne despre afacerea dumneavoastră'), fl('consent', 'Sunt de acord cu prelucrarea datelor personale, conform politicii de confidențialitate.')
    ]}},
  ai: {
    intro: 'For entrepreneurs and investors interested in the ground-floor spaces at YACHT KID.',
    submit_label: 'Send enquiry',
    field_labels: [
      fl('name', 'Full name'), fl('company', 'Company / brand'), fl('email', 'Email'), fl('phone', 'Phone'),
      fl('domeniu', 'Business sector', 'Choose a sector', ['Retail / shop', 'Café, restaurant (HoReCa)', 'Beauty & wellness', 'Medical services', 'Office / professional services', 'Other']),
      fl('suprafata', 'Preferred area', 'Choose an area', ['Up to 100 sqm', '100 – 150 sqm', 'Over 150 sqm', 'Not sure yet']),
      fl('scop', 'Interested in', 'Choose an option', ['Opening my own business', 'Investment (to let)']),
      fl('mesaj', 'Tell us about your business'), fl('consent', 'I agree to the processing of personal data, according to the privacy policy.')
    ]}
});

// Capitolele din „De ce”: paragrafele site-ului vechi, fiecare cu titlu (titlurile EN = AI) și o fotografie de la parter
const shop = async (file, alt) => `<figure><img data-media="${await mediaId(`2025/03/${file}`)}" alt="${alt}"></figure>`;
const CH_IMG = [
  await shop('spatii_comerciale_0703_2.jpg', 'Curtea interioară YACHT KID, cu spațiile comerciale la parter'),
  await shop('spatii_comerciale_0703_24.jpg', 'Clinica AMCOR – Complete Dentistry, deschisă la parterul YACHT KID'),
  await shop('spatii_comerciale_0703_8.jpg', 'Salonul MOB – Ministry of Beauty, la parterul YACHT KID')
];
const para = html => html.match(/<p>[\s\S]*?<\/p>/g);
const [whyRo, whyEn] = [para(WHY.ro), para(WHY.en)];
const CHAPTERS = {
  ro: `<blockquote><p>${whyRo[3].replace(/<\/?p>/g, '')}</p></blockquote>` +
    `<h3>Locație și oportunitate</h3>${whyRo[0]}${CH_IMG[0]}<h3>Investiție sigură și rentabilă</h3>${whyRo[1]}${CH_IMG[1]}<h3>Pentru orice tip de afacere</h3>${whyRo[2]}${CH_IMG[2]}`,
  en: `<blockquote><p>${whyEn[3].replace(/<\/?p>/g, '')}</p></blockquote>` +
    `<h3>Location and opportunity</h3>${whyEn[0]}${CH_IMG[0]}<h3>A safe, profitable investment</h3>${whyEn[1]}${CH_IMG[1]}<h3>Room for every kind of business</h3>${whyEn[2]}${CH_IMG[2]}`
};

const COMMERCIAL = [
  {key: 'comercial-hero', kind: 'hero', base: {video: lifestyleVideo, video_start: 0},
    ro: {eyebrow: 'Spații comerciale', heading: 'Afacerea ta, în nordul Bucureștiului',
      text: '<p>Spații flexibile, vizibile, într-o comunitate prosperă.</p>',
      buttons: [btn('Solicită ofertă', '#contact'), btn('Video de prezentare', '#video')]},
    en: {eyebrow: 'Commercial spaces', buttons: [btn('Get offer', '#contact'), btn('Presentation video', '#video')]},
    ai: {heading: 'Your business in northern Bucharest', text: '<p>Flexible, visible spaces in a thriving community.</p>'}},
  // „De ce”: textul lung, în capitole cu acordeon și fotografie (ca Despre pe homepage); fraza de final e citatul
  {key: 'comercial-de-ce', kind: 'text', anchor: 'de-ce',
    ro: {eyebrow: 'Spații comerciale', heading: 'De ce să alegi comunitatea Yacht Kid?', text: CHAPTERS.ro},
    en: {eyebrow: 'Commercial spaces', heading: 'Why Choose YACHT KID Community?', text: CHAPTERS.en}},
  {key: 'comercial-avantaje', kind: 'avantaje', anchor: 'avantaje', links: {features: benefits},
    ro: {eyebrow: 'Avantaje', heading: 'Ce câștigă afacerea ta', text: null}, en: {text: null},
    ai: {eyebrow: 'Advantages', heading: 'What your business gains'}},
  {key: 'comercial-fisa', kind: 'fisa-tehnica', anchor: 'caracteristici', base: {unit_type: U.comercial},
    ro: {eyebrow: 'Spații comerciale', heading: 'Caracteristici'}, en: {eyebrow: 'Commercial spaces', heading: 'Features'}},
  {key: 'comercial-branduri', kind: 'afaceri', anchor: 'branduri', base: {business_filter: 'toate'},
    ro: {eyebrow: 'Comunitate', heading: 'Branduri deja prezente în comunitatea Yacht Kid'},
    en: {eyebrow: 'Community', heading: 'Join Leading Brands Already at YACHT KID Community'}},
  {key: 'comercial-contact', kind: 'formular', anchor: 'contact', base: {form: businessForm},
    ro: {eyebrow: 'Contact', heading: 'Alege YACHT KID pentru afacerea ta!', text: '<p>Alege un spațiu care îți crește afacerea și îți maximizează investiția.</p>'},
    en: {eyebrow: 'Contact', heading: 'Choose YACHT KID', text: '<p>Choose a space that accelerates your business growth and maximizes your investment.</p>'}}
];
const commercialIds = [];
for (const s of COMMERCIAL)
  commercialIds.push(await upsert('sectiuni', `sectiune:${s.key}`, {base: {kind: s.kind, anchor: s.anchor ?? null, ...(s.base ?? {})}, tr: {ro: s.ro, en: s.en}, links: s.links, ai: s.ai ?? {}}));
// Descrierea rămâne textul „De ce” (importul lipise acolo și două texte de avantaje, fără titluri)
await saveEntity(db, 'locuinte', U.comercial, {links: {sections: commercialIds}, tr: {ro: {description: WHY.ro}, en: {description: WHY.en}}}, {user: USER});

// ---------- 7c. Hero-ul standard pe Tehnologie și Comunitate (ca pe homepage: un ecran, titlu 3 rânduri, subtitlu 2).
// Restul conținutului acestor pagini nu e încă importat; hero-ul e prima lor secțiune. EN = traducere AI.
const PAGE_HEROES = [
  {page: P.tehnologie, key: 'tehnologie-hero', video: await mediaId('2024/11/Prezentare-Yacht-KID.mp4'), start: 0,
    ro: {eyebrow: 'Tehnologie', heading: 'Siguranță construită în structură', text: '<p>Rezistă unei accelerații cu 50% peste cutremurul din ’77.</p>'},
    en: {eyebrow: 'Technology'}, ai: {heading: 'Safety built into the structure', text: '<p>Withstands 50% more acceleration than the 1977 earthquake.</p>'}},
  {page: P.comunitate, key: 'comunitate-hero', video: lifestyleVideo, start: 64,
    ro: {eyebrow: 'Comunitate', heading: 'Bine ai venit în comunitatea YACHT KID', text: '<p>Descoperă stilul de viață visat, chiar la tine acasă.</p>'},
    en: {eyebrow: 'Community'}, ai: {heading: 'Welcome to the YACHT KID community', text: '<p>Discover the lifestyle you dreamed of, right at home.</p>'}}
];
const heroIds = {};
for (const h of PAGE_HEROES) {
  heroIds[h.key] = await upsert('sectiuni', `sectiune:${h.key}`, {base: {kind: 'hero', anchor: null, video: h.video, video_start: h.start},
    tr: {ro: {...h.ro, buttons: [btn('Solicită ofertă', ref('pagini', P.contact)), btn('Video de prezentare', '#video')]},
      en: {...h.en, buttons: [btn('Get offer', ref('pagini', P.contact)), btn('Presentation video', '#video')]}}, ai: h.ai});
}
await saveEntity(db, 'pagini', P.tehnologie, {links: {sections: [heroIds['tehnologie-hero']]}}, {user: USER});

// ---------- 7d. Comunitate: conținutul paginii vechi (/comunitate/, /en/community/) în stilul nou — capitole cu fotografii,
// galeria de 10 fotografii, testimonialele rezidenților, vizionarea. Paragrafele RO/EN sunt de pe site-ul vechi;
// titlurile capitolelor și ale secțiunilor sunt noi (EN = AI).
const pic = async (file, alt) => `<figure><img data-media="${await mediaId(`2024/11/${file}`)}" alt="${alt}"></figure>`;
const COMMUNITY_CH = [
  [await pic('yacht-kid-comunitate-9.jpg', 'Living într-un apartament finalizat YACHT KID'),
    ['Un stil de viață modern', 'Descoperă colecția de apartamente finalizate, ce îmbină priveliști spectaculoase către lac, lux, confort și inovație, creând spații unde poți prospera și savura cele mai frumoase momente ale vieții.'],
    ['A modern way of living', 'Discover ready-to-move-in apartments that blend lake views, luxury, convenience, and innovation, creating environments where you can thrive and enjoy life’s best moments.']],
  [await pic('yacht-kid-apartamente-duplex-31.jpg', 'Fațada YACHT KID seara, cu balcoanele luminate'),
    ['Siguranță 24/7', 'Siguranța reprezintă o prioritate în COMUNITATEA YACHT KID. Cu securitate 24/7, oferim un mediu sigur și liniștit, pentru fiecare familie. Fiecare unitate rezidențială este realizată cu materiale premium și tehnologie de ultimă generație, pentru a asigura confort și eficiență excepționale. Astfel, rezidenții care s-au mutat deja în complex, se bucură de condiții ideale.'],
    ['24/7 safety', 'Safety represents a top priority at YACHT KID COMMUNITY. With 24/7 security, we provide a secure and peaceful environment for every family. Each residence is crafted with premium materials and cutting-edge technology to ensure exceptional comfort and efficiency. Therefore, residents who have already moved into the complex enjoy perfect conditions.']],
  [await pic('yacht-kid-comunitate-10.jpg', 'Lacul și parcul văzute de la YACHT KID'),
    ['Alei verzi, totul aproape', 'Cu doar câteva apartamente finalizate rămase, acum este momentul perfect pentru a vă alătura acestei comunități vii. Bucurați-vă de alei verzi, căi pietonale bine întreținute și acces rapid și ușor la toate facilitățile de care aveți nevoie. Fiecare detaliu este conceput cu o atenție deosebită, pentru a oferi un stil de viață confortabil, care respectă cele mai înalte standarde.'],
    ['Green walkways, everything close by', 'With just a few ready-to-move-in apartments left, now is the perfect time to join this lively neighborhood. Enjoy peaceful green walkways, well maintained pedestrian paths, and quick, easy access to every amenity you need. Every detail is thoughtfully designed to offer an ideal, comfortable lifestyle.']],
  [await pic('yacht-kid-comunitate-6.jpg', 'Spațiu de zi luminos, pe două niveluri'),
    ['Spații pentru întreaga familie', 'Imaginați-vă spații unde copiii se pot juca și râde, în timp ce părinții se relaxează într-un mediu calm și liniștit. COMUNITATEA YACHT KID vă pune la dispoziție toate acestea, fiind mai mult decât un simplu loc de trai, ci o comunitate prosperă.'],
    ['Room for the whole family', 'Imagine spaces where children can play and laugh, while parents relax in a calm and peaceful environment. YACHT KID COMMUNITY is more than just a place to live, it’s a welcoming community where you can feel connected and truly at home.']]
];
const chaptersHtml = (lang, statement) => `<blockquote><p>${statement}</p></blockquote>` +
  COMMUNITY_CH.map(([fig, ro, en]) => { const [t, p] = lang === 'ro' ? ro : en; return `<h3>${t}</h3><p>${p}</p>${fig}`; }).join('');
const communityGallery = [];
for (const n of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]) communityGallery.push(await mediaId(`2024/11/yacht-kid-comunitate-${n}.jpg`));
const residents = (await all(db, `SELECT id FROM testimonials WHERE anonymous = 1 AND quote IS NOT NULL ORDER BY id`)).map(r => r.id);
const COMMUNITY = [
  {key: 'comunitate-despre', kind: 'text', anchor: 'despre',
    ro: {eyebrow: 'Comunitate', heading: 'Mai mult decât un loc de trai',
      text: chaptersHtml('ro', 'COMUNITATEA YACHT KID oferă un stil de viață modern, unde tot ce ai nevoie este la doar un pas distanță.')},
    en: {eyebrow: 'Community', heading: 'More than just a place to live',
      text: chaptersHtml('en', 'Designed with a modern urban style for the future, YACHT KID COMMUNITY offers a premium lifestyle where everything you need is within reach.')}},
  {key: 'comunitate-galerie', kind: 'galerie', anchor: 'galerie', links: {gallery: communityGallery},
    ro: {eyebrow: 'Galerie', heading: 'Apartamente finalizate, gata de mutare'}, en: {eyebrow: 'Gallery'}, ai: {heading: 'Finished apartments, ready to move in'}},
  {key: 'comunitate-testimoniale', kind: 'testimoniale', anchor: 'testimoniale', links: {testimonials: residents},
    ro: {eyebrow: 'Testimoniale', heading: 'Alege o comunitate care spune o poveste', buttons: [btn('Toate testimonialele', ref('pagini', P.testimoniale))]},
    en: {eyebrow: 'Testimonials', heading: 'Choose a community that tells a story', buttons: [btn('All testimonials', ref('pagini', P.testimoniale))]}},
  {key: 'comunitate-vizionare', kind: 'cta', anchor: 'vizionare', base: {image: await mediaId('2024/11/yacht-kid-comunitate-edit-45-1.jpg')},
    ro: {eyebrow: 'Vizionare', heading: 'Descoperă stilul de viață visat în comunitatea YACHT KID.', buttons: [btn('Programează vizionare', ref('pagini', P.vizionare))]},
    en: {eyebrow: 'Viewing', heading: 'Discover your dream lifestyle at YACHT KID COMMUNITY', buttons: [btn('Schedule a viewing', ref('pagini', P.vizionare))]}}
];
const communityIds = [heroIds['comunitate-hero']];
for (const s of COMMUNITY)
  communityIds.push(await upsert('sectiuni', `sectiune:${s.key}`, {base: {kind: s.kind, anchor: s.anchor, ...(s.base ?? {})}, tr: {ro: s.ro, en: s.en}, links: s.links, ai: s.ai ?? {}}));
await saveEntity(db, 'pagini', P.comunitate, {links: {sections: communityIds}}, {user: USER});

// ---------- 8. Traducerile AI: proveniența devine „inferred”, de verificat de un om (§1.5)
await db.execute({sql: `UPDATE provenance SET certainty = 'inferred', method = 'ai-translation', verified_at = NULL, verified_by = NULL
  WHERE source_id = (SELECT id FROM sources WHERE url = ?)`, args: [`manual:${AI}`]});

const n = (await one(db, `SELECT count(*) n FROM audit_log WHERE user_name IN (?, ?)`, [USER, AI])).n;
console.log(`Design aplicat: ${SECTIONS.length} secțiuni pe homepage, meniurile antet și subsol (RO, EN), ${Object.keys(LABELS).length} etichete, copertele a ${Object.keys(COVERS).length} tipuri de locuințe. Istoric: ${n} rânduri de la „${USER}”.`);
db.close();
