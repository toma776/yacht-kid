// Ce nu se poate citi direct din site și a fost hotărât la analiză (docs/01-entitati.md). Tot ce vine de aici
// intră în Brain cu metoda „curated” și certitudinea „inferred”, ca să fie confirmat de un om în /manage.
// Valorile cifrelor nu stau aici: importul le caută în text și refuză o cifră pe care n-o găsește.

export const PARTNERS = [
  {name: 'Saint-Gobain', roles: ['furnizor'], aliases: []},
  {name: 'Reynaers', roles: ['furnizor'], aliases: []},
  {name: 'ISO CHEMIE', roles: ['furnizor'], aliases: ['ISO-Chemie']},
  {name: 'Barrisol', roles: ['furnizor'], aliases: ['Barisol']},
  {name: 'INCERC', roles: ['certificare'], aliases: ['Institutul de Cercetări în Construcții și Economia Construcțiilor']}
];

// Premiile, după articolul RO care le anunță (ID WordPress). Competiția și anul se verifică în titlu la import.
export const AWARDS = [
  {post: 1335, competition: 'Iconic Awards', year: 2025, result: 'castigator',
    distinction: {ro: 'Câștigător', en: 'Winner'}, category: {ro: 'Arhitectură – Rezidențial', en: 'Architecture – Residential'}},
  {post: 1085, competition: 'German Design Awards', year: 2025, result: 'distinctie',
    distinction: {ro: 'Excellent Architecture', en: 'Excellent Architecture'}, category: null},
  {post: 1199, competition: 'Saint-Gobain Trophy', year: 2024, result: 'distinctie',
    distinction: {ro: 'Premiul special al juriului', en: 'Special Jury Award'}, category: null},
  {post: 1100, competition: 'Built Design Awards', year: 2024, result: 'mentiune',
    distinction: {ro: 'Mențiune onorabilă', en: 'Honorable Mention'}, category: {ro: 'Design arhitectural – Rezidențial', en: 'Architectural Design – Residential'}},
  {post: 754, competition: 'Architecture Masterprize', year: 2024, result: 'mentiune', titleCheck: 'Premiu de Onoare',
    distinction: {ro: 'Honorable Mention', en: 'Honorable Mention'}, category: {ro: 'Architectural Design – Residential Architecture (Multi Unit)', en: 'Architectural Design – Residential Architecture (Multi Unit)'}},
  {post: 75, competition: 'SHARE Architecture Awards', year: 2024, result: 'lista-scurta',
    distinction: {ro: 'Lista scurtă', en: 'Shortlisted'}, category: null}
];

// Afacerile, după numele din cardul RO de pe /spatii-comerciale/ (ordinea cardurilor RO = ordinea EN)
export const BUSINESSES = {
  'MOB - Ministry of Beauty': {name: 'MOB – Ministry of Beauty', aliases: ['MOB', 'Ministry of Beauty'], service: {ro: 'salon de beauty', en: 'beauty salon'}},
  'AMCOR - Complete Dentistry': {name: 'AMCOR – Complete Dentistry', aliases: ['AMCOR', 'Amcor'], service: {ro: 'cabinet stomatologic', en: 'dental clinic'}},
  'FABRIQ': {name: 'FABRIQ', aliases: ['Fabriq'], service: {ro: 'cafenea', en: 'café'}},
  'Magazinul Froo': {name: 'Froo', aliases: ['Froo Store', 'Magazinul Froo'], service: {ro: 'minimarket', en: 'minimarket'}},
  'Florit Hot Pilates': {name: 'Florit Hot Pilates', aliases: ['Florit'], service: {ro: 'studio hot pilates', en: 'hot pilates studio'}},
  'TC Joyeria': {name: 'TC Joyeria', aliases: [], service: {ro: 'bijuterii și ceasuri', en: 'jewellery and watches'}, assume: 'A8'},
  'Ghost Agency': {name: 'Ghost Agency', aliases: [], service: {ro: 'agenție media', en: 'media agency'}, assume: 'A8'},
  'Cabinet de psihoterapie psihanalitică Aura Pavel': {name: 'Aura Pavel', aliases: ['Cabinetul Aura Pavel'], service: {ro: 'cabinet de psihoterapie', en: 'psychotherapy practice'}}
};

// Cifrele-cheie: jetonul, unitatea, eticheta și unde se verifică valoarea (pagina + expresia care o conține)
export const FACTS = [
  {token: 'parc', unit: 'm2', label: {ro: 'Parc cu acces direct', en: 'Park with direct access'},
    find: {page: '/', rx: /parc de ([\d.]+) m/}},
  {token: 'intretinere', unit: 'ron_m2', label: {ro: 'Cost de întreținere de la', en: 'Maintenance cost from'},
    find: {page: '/', rx: /doar (\d+(?:[.,]\d+)?) RON\/m/}},
  {token: 'seism', unit: 'procent', label: {ro: 'Accelerație seismică suportată peste cutremurul din 1977', en: 'Seismic acceleration withstood above the 1977 earthquake'},
    find: {page: '/tehnologie/', rx: /accelerati[ae] cu (\d+)% mai mare/}},
  {token: 'raspuns', unit: 'ore', label: {ro: 'Răspuns la cereri în maximum', en: 'Reply to requests within'},
    find: {page: '/multumim/', rx: /maxim (\d+) de ore/}}
];

// Etichetele interfeței: textul RO și EN, cum apar pe site. EN lipsă = textul EN nu există pe site.
export const LABELS = [
  {key: 'afla-mai-multe', ro: 'Află mai multe', en: 'Learn more'},
  {key: 'solicita-oferta', ro: 'Solicită ofertă', en: 'Get offer'},
  {key: 'contacteaza-ne', ro: 'Contactează-ne!', en: 'Contact us!'},
  {key: 'pagina-principala', ro: 'Pagina principală', en: null},
  {key: 'citeste-articolul', ro: 'Citește articolul', en: null}
];

// Paginile: șablonul după adresa RO (A4: paginile de campanie)
export const PAGE_TEMPLATES = {
  '/termeni-si-conditii/': 'legal', '/politica-de-confidentialitate/': 'legal', '/politica-cookies/': 'legal',
  '/prezentare/': 'landing', '/programeaza-o-vizionare/': 'landing', '/multumim/': 'multumim'
};

// Câmpurile cu același nume în formularele vechi: al doilea primește numele lui real
export const FORM_FIELD_RENAMES = {vizionare: {buget_estimativ: ['buget_estimativ', 'modalitate_achizitie']}};
// Câmpurile cu nume tehnic generat de Bricks, pe EN
export const FORM_FIELD_ALIASES = {'form-field-rwesjr': 'design_interior'};
