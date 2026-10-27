// Registrul entităților Yacht Kid (§1.1). Singurul loc în care se declară un tip: din el derivă tabelele,
// traducerile, relațiile, harta, „Unde apare”, jetoanele și protecția la ștergere (src/registry/derive.mjs,
// src/core/schema.mjs). Sursa deciziilor: docs/01-entitati.md.
//
// Convenții proprii, peste standard:
// - `translatable: true` pe un câmp = se ține în `<tabel>_translations`, câte un rând pe limbă (§1.10).
//   Cifrele, prețurile, datele, imaginile și legăturile nu se traduc niciodată (verificat în derive.mjs).
// - `public.path(rec, lang, tr)` primește și traducerea: fără traducere într-o limbă, nu există pagină în acea limbă.
// - `tokens` = valorile legate pe care tipul le oferă textelor ({telefon}, {nr_premii}); se formatează după limbă.
// - `assume: 'A1'` = câmp sau tip construit pe o presupunere încă nevalidată (src/registry/assumptions.mjs).
import {localPath} from './langs.mjs';

const T = {translatable: true};
// Hero-ul standard: titlul încape în 3 rânduri, subtitlul în 2 (măsurat pe homepage, 39 și 63 de caractere)
export const HERO_LIMITS = {heading: 42, text: 65};
const SEO = [
  {key: 'seo_title', label: 'Titlu SEO', type: 'text', max: 70, ...T},
  {key: 'seo_description', label: 'Descriere SEO', type: 'textarea', max: 170, ...T}
];
// ID-ul din WordPress diferă pe limbă (pagina RO 42, perechea EN 473), deci stă pe traducere.
const LEGACY = {key: 'legacy_id', label: 'ID în site-ul vechi', type: 'int', intern: true, readonly: true, ...T};
const slugPath = (...base) => (rec, lang, tr) => (tr?.slug ? localPath(lang, ...base, tr.slug) : null);

export const CATEGORIES = [
  {key: 'proiect', label: 'Proiect'},
  {key: 'imobiliar', label: 'Imobiliar'},
  {key: 'comunitate', label: 'Comunitate'},
  {key: 'continut', label: 'Conținut'},
  {key: 'site', label: 'Site'}
];

export const ENTITIES = [
  // ───────────── Proiect ─────────────
  {
    key: 'firma', table: 'company', label: 'Date firmă', one: 'Date firmă',
    category: 'proiect', color: '#1f2a44', icon: 'building', singleton: true, noStatus: true,
    title: 'legal_name',
    fields: [
      {key: 'legal_name', label: 'Denumire legală', type: 'text', required: true},
      {key: 'brand', label: 'Numele proiectului', type: 'text', required: true},
      {key: 'cui', label: 'CUI', type: 'text', required: true},
      {key: 'reg_com', label: 'Nr. Registrul Comerțului', type: 'text', required: true},
      {key: 'registered_office', label: 'Sediu social', type: 'text', required: true},
      {key: 'street', label: 'Adresa proiectului — stradă și număr', type: 'text', required: true},
      {key: 'city', label: 'Oraș', type: 'text', required: true},
      {key: 'postal_code', label: 'Cod poștal', type: 'text', required: true},
      {key: 'phone', label: 'Telefon', type: 'phone', required: true},
      {key: 'email', label: 'Email', type: 'email', required: true},
      {key: 'schedule', label: 'Program', type: 'text', ...T},
      {key: 'address_label', label: 'Adresa, cum se afișează', type: 'text', ...T,
       help: 'Doar forma; strada, orașul și codul vin din câmpurile de mai sus prin {adresa}.'},
      {key: 'social', label: 'Rețele sociale', type: 'links'},
      // Pentru harta 3D (secțiunile text cu „Harta 3D”): punctul proiectului și volumul clădirii, din OpenStreetMap (scripts/harta-locatie.mjs)
      {key: 'latitude', label: 'Latitudine', type: 'number', help: 'Punctul proiectului pe hartă (OpenStreetMap).'},
      {key: 'longitude', label: 'Longitudine', type: 'number'},
      {key: 'building_levels', label: 'Etaje', type: 'int', help: 'Înălțimea volumului de pe harta 3D (~3,2 m pe etaj).'},
      {key: 'building_footprint', label: 'Conturul clădirii', type: 'table', readonly: true, intern: true,
       help: 'Poligonul GeoJSON al clădirii din OpenStreetMap; se reface cu `npm run harta`.'}
    ],
    tokens: {
      telefon: {field: 'phone'}, email: {field: 'email'}, program: {field: 'schedule'},
      cui: {field: 'cui'}, reg_com: {field: 'reg_com'}, sediu: {field: 'registered_office'}, firma: {field: 'legal_name'},
      adresa: {format: (r, lang) => `${r.street}, ${lang === 'en' ? 'Bucharest' : r.city} ${r.postal_code}`}
    }
  },
  {
    key: 'cifre', table: 'facts', label: 'Cifre-cheie', one: 'Cifră-cheie',
    category: 'proiect', color: '#3d6fb6', icon: 'hash', noStatus: true,
    title: 'token',
    fields: [
      {key: 'token', label: 'Jeton', type: 'slug', required: true, unique: true, list: true, help: 'Numele din text: {parc}, {intretinere}.'},
      {key: 'value', label: 'Valoare', type: 'number', required: true, list: true},
      {key: 'unit', label: 'Unitate', type: 'select', options: ['m2', 'ron_m2', 'procent', 'ore', 'buc']},
      {key: 'label', label: 'Etichetă', type: 'text', required: true, ...T},
      {key: 'suffix', label: 'Text după valoare', type: 'text', ...T, help: 'De exemplu „peste normative”.'}
    ],
    // Fiecare înregistrare e un jeton propriu, formatat după limbă (10.000 m² / 10,000 sqm)
    tokens: {'*': {by: 'token', format: 'fact'}}
  },
  {
    key: 'avantaje', table: 'features', label: 'Avantaje și facilități', one: 'Avantaj',
    category: 'proiect', color: '#4f8fd6', icon: 'star', mentions: false,
    title: 'title',
    fields: [
      {key: 'title', label: 'Titlu', type: 'text', required: true, max: 120, list: true, ...T},
      {key: 'text', label: 'Text', type: 'textarea', max: 400, ...T},
      {key: 'icon', label: 'Iconiță', type: 'image'},
      {key: 'group', label: 'Grup', type: 'select', required: true, list: true, options: ['avantaje', 'confort', 'prezentare']}
    ]
  },
  {
    key: 'tehnologii', table: 'technologies', label: 'Tehnologie', one: 'Tehnologie',
    category: 'proiect', color: '#2e8b9a', icon: 'cpu', thumb: 'image',
    title: 'title',
    fields: [
      {key: 'title', label: 'Titlu', type: 'text', required: true, max: 120, list: true, ...T},
      {key: 'summary', label: 'Rezumat', type: 'textarea', max: 300, ...T},
      {key: 'description', label: 'Descriere', type: 'richtext', ...T},
      {key: 'image', label: 'Imagine', type: 'image'},
      {key: 'group', label: 'Grup', type: 'select', list: true, options: ['structura', 'anvelopa', 'interior', 'intretinere']},
      {key: 'suppliers', label: 'Furnizori și certificări', type: 'refs', target: 'parteneri', ordered: true,
       rel: 'e furnizată de', inverseLabel: 'Tehnologii', only: p => hasRole(p, 'furnizor', 'certificare')}
    ]
  },
  {
    // Punctele de interes din jurul proiectului, pentru harta 3D (secțiunile text cu „Harta 3D”). Coordonatele vin din OpenStreetMap;
    // distanța, minutele și traseul pe jos se calculează pe străzile reale cu OSRM (`npm run harta`), nu se scriu de mână.
    key: 'repere', table: 'places', label: 'Puncte de interes', one: 'Punct de interes',
    category: 'proiect', color: '#3a8f7b', icon: 'map-pin',
    title: 'name',
    fields: [
      {key: 'name', label: 'Nume', type: 'text', required: true, max: 80, list: true, ...T},
      {key: 'category_name', label: 'Categorie', type: 'text', max: 40, list: true, ...T, help: '„Transport”, „Cumpărături”, „Natură”.'},
      {key: 'icon', label: 'Pictogramă', type: 'select', required: true, options: ['metro', 'mall', 'shop', 'park', 'gym', 'cafe'], default: 'park'},
      {key: 'latitude', label: 'Latitudine', type: 'number', required: true},
      {key: 'longitude', label: 'Longitudine', type: 'number', required: true},
      {key: 'distance_m', label: 'Distanța pe jos (m)', type: 'int', readonly: true, list: true},
      {key: 'walk_min', label: 'Pe jos (min)', type: 'int', readonly: true, list: true},
      {key: 'drive_min', label: 'Cu mașina (min)', type: 'int', readonly: true},
      {key: 'walk_route', label: 'Traseul pe jos', type: 'table', readonly: true, intern: true, help: 'Coordonatele traseului, desenat pe hartă la hover.'},
      {key: 'osm', label: 'Sursa în OpenStreetMap', type: 'text', intern: true, readonly: true}
    ]
  },
  {
    key: 'parteneri', table: 'partners', label: 'Furnizori și instituții', one: 'Partener',
    category: 'proiect', color: '#6b7a8f', icon: 'handshake', thumb: 'logo', mentions: true,
    title: 'name',
    fields: [
      {key: 'name', label: 'Nume', type: 'text', required: true, max: 120, list: true},
      {key: 'aliases', label: 'Alte scrieri', type: 'list', help: 'Pentru detectarea în text: Barisol = Barrisol.'},
      {key: 'roles', label: 'Rol', type: 'multiselect', required: true, list: true, options: ['furnizor', 'certificare', 'organizator']},
      {key: 'url', label: 'Site', type: 'url'},
      {key: 'logo', label: 'Logo', type: 'image'},
      {key: 'description', label: 'Descriere', type: 'textarea', ...T}
    ]
  },
  {
    key: 'premii', table: 'awards', label: 'Premii', one: 'Premiu',
    category: 'proiect', color: '#c9a227', icon: 'award', thumb: 'badge', mentions: true, mentionName: 'competition',
    title: 'competition',
    fields: [
      {key: 'competition', label: 'Competiția', type: 'text', required: true, max: 120, list: true},
      {key: 'year', label: 'Anul', type: 'int', required: true, list: true},
      {key: 'result', label: 'Rezultat', type: 'select', required: true, list: true, options: ['castigator', 'distinctie', 'mentiune', 'lista-scurta']},
      {key: 'distinction', label: 'Distincția', type: 'text', required: true, ...T, help: 'De exemplu „Excellent Architecture”, „Honorable Mention”.'},
      {key: 'category_name', label: 'Categoria din competiție', type: 'text', ...T},
      {key: 'url', label: 'Pagina oficială', type: 'url'},
      {key: 'badge', label: 'Insigna', type: 'image', help: 'Sigiliul primit de proiect („Winner 2025”), de la organizator.'},
      {key: 'logo', label: 'Logo-ul competiției', type: 'image', help: 'Marca oficială a competiției, pentru banda de premii; se afișează monocrom.'},
      {key: 'organizer', label: 'Organizator', type: 'ref', target: 'parteneri', rel: 'e organizat de', inverseLabel: 'Premii organizate',
       only: p => hasRole(p, 'organizator')}
    ],
    duplicates: {same: ['competition', 'year']},
    tokens: {nr_premii: {count: r => r.result !== 'lista-scurta', assume: 'T2'}}
  },

  // ───────────── Imobiliar ─────────────
  {
    key: 'locuinte', table: 'unit_types', label: 'Tipuri de locuințe', one: 'Tip de locuință',
    category: 'imobiliar', color: '#0b6e4f', icon: 'home', thumb: 'hero_image', approval: true, assume: 'A2',
    title: 'name',
    public: {path: slugPath()},
    linkFields: ['name', 'slug', 'price_from', 'hero_image'],
    fields: [
      {key: 'name', label: 'Nume', type: 'text', required: true, max: 80, list: true, ...T},
      {key: 'slug', label: 'Identificator (adresă)', type: 'slug', from: 'name', required: true, ...T},
      {key: 'kind', label: 'Fel', type: 'select', required: true, list: true, options: ['apartament', 'duplex', 'comercial']},
      {key: 'rooms', label: 'Camere', type: 'int', min: 1, max: 8, list: true,
       help: 'Camere în sens românesc (dormitoare + living). EN afișează dormitoarele: camere − 1.'},
      {key: 'area_min', label: 'Suprafață de la (m²)', type: 'number', required: true},
      {key: 'area_max', label: 'Suprafață până la (m²)', type: 'number'},
      {key: 'floor_min', label: 'Etaj de la', type: 'int'},
      {key: 'floor_max', label: 'Etaj până la', type: 'int'},
      {key: 'baths_min', label: 'Băi de la', type: 'int'},
      {key: 'baths_max', label: 'Băi până la', type: 'int'},
      {key: 'terrace_min', label: 'Terasă de la (m²)', type: 'number'},
      {key: 'terrace_max', label: 'Terasă până la (m²)', type: 'number'},
      {key: 'balcony', label: 'Balcon', type: 'boolean'},
      {key: 'price_from', label: 'Preț de la (EUR, fără TVA)', type: 'money', currency: 'EUR', required: true, list: true, assume: 'A1'},
      {key: 'vat_excluded', label: 'Prețul nu include TVA', type: 'boolean', default: 1},
      {key: 'hero_image', label: 'Imagine principală', type: 'image'},
      {key: 'video', label: 'Video', type: 'image'},
      {key: 'gallery', label: 'Galerie', type: 'refs', target: 'media', ordered: true, owned: true,
       rel: 'are imaginea', inverseLabel: 'Galerii de locuințe'},
      {key: 'card_tier', label: 'Nivel Community Card', type: 'ref', target: 'niveluri-card',
       rel: 'primește nivelul', inverseLabel: 'Tipuri de locuințe'},
      {key: 'intro', label: 'Introducere', type: 'textarea', max: 600, ...T},
      {key: 'description', label: 'Descriere', type: 'richtext', ...T},
      {key: 'sections', label: 'Secțiuni', type: 'refs', target: 'sectiuni', ordered: true, owned: true,
       rel: 'e compusă din', inverseLabel: 'Tipuri de locuințe',
       help: 'Gol = pagina standard (fișă, descriere, galerie). Cu secțiuni, pagina e compusă ca homepage-ul (ex. Spații comerciale).'},
      ...SEO, LEGACY
    ],
    duplicates: {same: ['kind', 'rooms']},
    validate(rec, {tr} = {}) {
      const errors = [];
      for (const k of ['area', 'floor', 'baths', 'terrace'])
        if (rec[`${k}_min`] != null && rec[`${k}_max`] != null && rec[`${k}_min`] > rec[`${k}_max`])
          errors.push({field: `${k}_max`, message: 'Valoarea maximă e mai mică decât cea minimă.'});
      if (rec.kind === 'apartament' && !rec.rooms) errors.push({field: 'rooms', message: 'Un apartament are numărul de camere.'});
      // Denumirile EN folosesc dormitoarele: „2 camere” = „1-bedroom”. Prindem o traducere care a luat cifra românească.
      const en = tr?.en?.name;
      if (rec.kind === 'apartament' && rec.rooms && en && !en.includes(String(rec.rooms - 1)))
        errors.push({field: 'name', lang: 'en', message: `În EN, ${rec.rooms} camere = ${rec.rooms - 1} bedroom.`, level: 'warning'});
      return errors;
    }
  },
  {
    key: 'niveluri-card', table: 'card_tiers', label: 'Niveluri Community Card', one: 'Nivel card',
    category: 'imobiliar', color: '#8a6d3b', icon: 'credit-card', noStatus: true,
    title: 'name',
    fields: [
      {key: 'name', label: 'Nume', type: 'text', required: true, max: 40, list: true},
      {key: 'rank', label: 'Ordine', type: 'int', required: true, list: true},
      {key: 'benefits', label: 'Beneficii', type: 'list', ...T},
      {key: 'partners', label: 'Parteneri', type: 'refs', target: 'afaceri', ordered: true,
       rel: 'include partenerul', inverseLabel: 'Niveluri Community Card',
       only: a => !!a.card_member, attrs: [{key: 'benefit', label: 'Beneficiu', type: 'text'}]}
    ]
  },

  // ───────────── Comunitate ─────────────
  {
    key: 'afaceri', table: 'businesses', label: 'Afaceri din comunitate', one: 'Afacere',
    category: 'comunitate', color: '#d0643b', icon: 'store', thumb: 'image', mentions: true, aliases: 'aliases', assume: 'A8',
    title: 'name',
    linkFields: ['name', 'image', 'tagline', 'state'],
    fields: [
      {key: 'name', label: 'Nume', type: 'text', required: true, max: 120, list: true},
      {key: 'aliases', label: 'Alte nume', type: 'list', help: 'MOB = Ministry of Beauty; AMCOR = AMCOR Complete Dentistry.'},
      {key: 'tagline', label: 'Domeniu', type: 'text', max: 120, list: true, ...T, help: 'Ce apare sub nume: „Specialty Coffee & Gin Bar”.'},
      {key: 'service', label: 'Ce aduce comunității', type: 'text', max: 60, ...T,
       help: 'Forma scurtă din listele generate: „cafenea”, „clinică stomatologică”.'},
      {key: 'description', label: 'Descriere', type: 'textarea', ...T},
      {key: 'logo', label: 'Logo', type: 'image'},
      {key: 'image', label: 'Imagine', type: 'image', help: 'Imaginea din cardul afacerii.'},
      {key: 'website', label: 'Site', type: 'url'},
      {key: 'state', label: 'Stare', type: 'select', required: true, list: true, options: ['deschis', 'in-curand', 'inchis'], default: 'deschis', assume: 'A7'},
      {key: 'opened_on', label: 'Deschis din', type: 'date'},
      {key: 'card_member', label: 'Partener Community Card', type: 'boolean'}
    ],
    duplicates: {normalize: ['name', 'aliases']}
  },
  {
    key: 'testimoniale', table: 'testimonials', label: 'Testimoniale', one: 'Testimonial',
    category: 'comunitate', color: '#9b59b6', icon: 'quote', assume: 'A5',
    title: 'author',
    fields: [
      {key: 'author', label: 'Autor', type: 'text', required: true, max: 120, list: true, help: 'Pentru citatele anonime: „Rezident YACHT KID”.'},
      {key: 'anonymous', label: 'Anonim', type: 'boolean'},
      {key: 'role', label: 'Cine este', type: 'text', ...T, help: '„Membru al comunității”, „Proprietar”.'},
      {key: 'quote', label: 'Textul original', type: 'textarea', required: true,
       help: 'Așa cum l-a scris clientul. Nu se traduce și nu se corectează.'},
      {key: 'quote_lang', label: 'Limba textului original', type: 'select', required: true, options: ['ro', 'en'], default: 'ro'},
      {key: 'quote_translated', label: 'Traducere', type: 'textarea', ...T,
       help: 'Opțional. Pe site apare marcată ca traducere; lipsește = se afișează originalul.'},
      {key: 'source', label: 'Sursa', type: 'select', options: ['google', 'site', 'interviu', 'altul']},
      {key: 'given_on', label: 'Data', type: 'date'},
      {key: 'featured', label: 'Afișat pe pagina Testimoniale', type: 'boolean', list: true},
      LEGACY
    ]
  },

  // ───────────── Conținut ─────────────
  {
    key: 'articole', table: 'posts', label: 'Articole', one: 'Articol',
    category: 'continut', color: '#2f74c4', icon: 'file-text', thumb: 'image', assume: 'A3',
    title: 'title',
    // Articolele stau la rădăcină, ca pe site-ul vechi
    public: {path: slugPath()},
    linkFields: ['title', 'slug', 'image', 'published_at'],
    fields: [
      {key: 'title', label: 'Titlu', type: 'text', required: true, max: 200, list: true, ...T},
      {key: 'slug', label: 'Identificator (adresă)', type: 'slug', from: 'title', required: true, ...T},
      {key: 'category', label: 'Categorie', type: 'ref', target: 'categorii', required: true, list: true, rel: 'e în', inverseLabel: 'Articole'},
      {key: 'author', label: 'Autor', type: 'text', default: 'YachtKID'},
      {key: 'image', label: 'Imagine principală', type: 'image'},
      {key: 'excerpt', label: 'Rezumat', type: 'textarea', max: 400, ...T},
      {key: 'content', label: 'Text', type: 'richtext', required: true, ...T},
      {key: 'businesses', label: 'Afaceri', type: 'refs', target: 'afaceri', rel: 'anunță', inverseLabel: 'Articole'},
      {key: 'awards', label: 'Premii', type: 'refs', target: 'premii', rel: 'anunță premiul', inverseLabel: 'Articole'},
      {key: 'unit_types', label: 'Tipuri de locuințe', type: 'refs', target: 'locuinte', rel: 'vorbește despre', inverseLabel: 'Articole',
       threshold: 0.9},
      ...SEO, LEGACY
    ],
    duplicates: {similar: ['title'], ignoreDigits: true, assume: 'A6'}
  },
  {
    key: 'categorii', table: 'categories', label: 'Categorii', one: 'Categorie',
    category: 'continut', color: '#5d8fd1', icon: 'folder', noStatus: true,
    title: 'name',
    public: {path: slugPath('category')},
    linkFields: ['name', 'slug'],
    fields: [
      {key: 'name', label: 'Nume', type: 'text', required: true, max: 60, list: true, ...T},
      {key: 'slug', label: 'Identificator (adresă)', type: 'slug', from: 'name', required: true, ...T},
      {key: 'description', label: 'Descriere', type: 'textarea', ...T},
      ...SEO, LEGACY
    ]
  },
  {
    key: 'pagini', table: 'pages', label: 'Pagini', one: 'Pagină',
    category: 'continut', color: '#1d5fa8', icon: 'layout', assume: ['T3', 'A4'],
    title: 'title',
    // Slug gol = prima pagină a limbii (/ și /en/)
    public: {path: (rec, lang, tr) => (tr && tr.slug != null ? localPath(lang, tr.slug) : null)},
    linkFields: ['title', 'slug'],
    fields: [
      {key: 'title', label: 'Titlu', type: 'text', required: true, max: 160, list: true, ...T},
      {key: 'slug', label: 'Identificator (adresă)', type: 'slug', from: 'title', ...T, help: 'Gol doar pentru prima pagină.'},
      {key: 'template', label: 'Șablon', type: 'select', required: true, list: true,
       options: ['standard', 'legal', 'landing', 'multumim'], default: 'standard'},
      {key: 'sections', label: 'Secțiuni', type: 'refs', target: 'sectiuni', ordered: true, owned: true,
       rel: 'e compusă din', inverseLabel: 'Pagini'},
      {key: 'body', label: 'Text', type: 'richtext', ...T, help: 'Pentru paginile legale; celelalte folosesc secțiuni.'},
      {key: 'noindex', label: 'Fără indexare', type: 'boolean'},
      ...SEO, LEGACY
    ]
  },
  {
    key: 'sectiuni', table: 'sections', label: 'Secțiuni', one: 'Secțiune',
    category: 'continut', color: '#7fa7d9', icon: 'rows', hub: false, noStatus: true,
    title: 'heading',
    fields: [
      {key: 'kind', label: 'Fel', type: 'select', required: true, list: true, options: [
        'hero', 'text', 'fisa-tehnica', 'alte-locuinte', 'avantaje', 'tehnologii', 'afaceri', 'premii',
        'testimoniale', 'cifre', 'galerie', 'video', 'articole', 'formular', 'cta', 'card-niveluri']},
      {key: 'anchor', label: 'Ancoră', type: 'slug'},
      {key: 'eyebrow', label: 'Supratitlu', type: 'text', ...T},
      {key: 'heading', label: 'Titlu', type: 'text', ...T},
      {key: 'text', label: 'Text', type: 'richtext', ...T},
      {key: 'buttons', label: 'Butoane', type: 'links', ...T},
      {key: 'image', label: 'Imagine', type: 'image', kinds: ['hero', 'text', 'cta']},
      // Harta 3D pe o secțiune text (Locație): un câmp nou, nu un fel nou de secțiune — o coloană se adaugă sigur pe
      // orice bază (ALTER), pe când o opțiune nouă în `kind` ar cere reconstruirea tabelului (regula CHECK)
      {key: 'show_map', label: 'Harta 3D', type: 'boolean', kinds: ['text'],
       help: 'În locul imaginii din dreapta: harta 3D cu punctele de interes. Imaginea rămâne până se încarcă harta și pe dispozitivele fără WebGL.'},
      {key: 'places', label: 'Puncte de interes', type: 'refs', target: 'repere', ordered: true, kinds: ['text'],
       rel: 'arată pe hartă', inverseLabel: 'Secțiuni', help: 'Pentru Harta 3D. Gol = toate punctele de interes publicate.'},
      {key: 'video', label: 'Video', type: 'image', kinds: ['hero', 'video']},
      {key: 'unit_type', label: 'Tipul de locuință', type: 'ref', target: 'locuinte', kinds: ['fisa-tehnica'],
       rel: 'arată fișa', inverseLabel: 'Secțiuni'},
      {key: 'features', label: 'Avantaje', type: 'refs', target: 'avantaje', ordered: true, kinds: ['avantaje'], rel: 'arată', inverseLabel: 'Secțiuni'},
      {key: 'technologies', label: 'Tehnologii', type: 'refs', target: 'tehnologii', ordered: true, kinds: ['tehnologii'], rel: 'arată', inverseLabel: 'Secțiuni'},
      {key: 'facts', label: 'Cifre', type: 'refs', target: 'cifre', ordered: true, kinds: ['cifre', 'hero'], rel: 'arată', inverseLabel: 'Secțiuni'},
      {key: 'testimonials', label: 'Testimoniale', type: 'refs', target: 'testimoniale', ordered: true, kinds: ['testimoniale'],
       rel: 'citează', inverseLabel: 'Secțiuni', help: 'Gol = toate cele cu „Afișat pe pagina Testimoniale”.'},
      {key: 'gallery', label: 'Galerie', type: 'refs', target: 'media', ordered: true, owned: true, kinds: ['galerie'],
       rel: 'are imaginea', inverseLabel: 'Galerii'},
      // Un câmp, nu o opțiune nouă în `variant`: o opțiune nouă ar schimba regula CHECK (reconstruirea tabelului)
      {key: 'strip', label: 'Bandă îngustă', type: 'boolean', kinds: ['galerie'],
       help: 'Fotografiile pătrate, pe un singur rând, derulat de vizitator (fără mișcare automată). Fiecare se deschide mare la clic.'},
      // Listele calculate: secțiunea spune doar regula, lista vine din Brain (dependență `query` cu scope, §3.2)
      {key: 'business_filter', label: 'Ce afaceri', type: 'select', options: ['toate', 'membri-card'], kinds: ['afaceri']},
      {key: 'post_category', label: 'Din categoria', type: 'ref', target: 'categorii', kinds: ['articole'],
       rel: 'listează articolele din', inverseLabel: 'Secțiuni'},
      {key: 'limit', label: 'Câte', type: 'int', kinds: ['articole', 'premii', 'afaceri']},
      {key: 'form', label: 'Formular', type: 'ref', target: 'formulare', kinds: ['formular', 'cta'], rel: 'conține formularul', inverseLabel: 'Secțiuni'},
      {key: 'video_start', label: 'Video: pornește de la (secunde)', type: 'int', min: 0, kinds: ['hero'],
       help: 'Același video poate deschide pagini diferite din momente diferite.'},
      {key: 'variant', label: 'Aspect', type: 'select', options: ['ecran', 'card'], kinds: ['hero', 'testimoniale'],
       help: 'Hero: „ecran” = video/fotografie pe tot ecranul; „card” = fotografie într-un card, cu cifre și broșura (homepage). Testimoniale: „card” = câte un card mare, cu pagini 1, 2, 3…'},
      {key: 'brochure', label: 'Broșura (PDF)', type: 'image', kinds: ['hero'], help: 'Pentru aspectul „card”: descărcare, WhatsApp, email.'}
    ],
    // Standardul hero-ului (homepage, Tehnologie, Comunitate, Spații comerciale): un ecran, titlul în cel mult 3 rânduri,
    // subtitlul în cel mult 2. Textele mai lungi întind hero-ul peste ecran, deci se opresc aici.
    // Se refuză doar limba salvată acum; o altă limbă prea lungă e doar avertisment (nu blochează o corectură în RO)
    validate(rec, {tr, changed} = {}) {
      if (rec.kind !== 'hero') return [];
      const plain = h => (h ?? '').replace(/<[^>]+>/g, ' ').replace(/&[a-z#0-9]+;/gi, ' ').replace(/\s+/g, ' ').trim();
      const errors = [];
      for (const [lang, t] of Object.entries(tr ?? {})) {
        const level = !changed || changed.includes(lang) ? 'error' : 'warning';
        if (plain(t.heading).length > HERO_LIMITS.heading)
          errors.push({field: 'heading', lang, level, message: `Titlul hero-ului (${lang}) are cel mult ${HERO_LIMITS.heading} de caractere (3 rânduri).`});
        if (plain(t.text).length > HERO_LIMITS.text)
          errors.push({field: 'text', lang, level, message: `Subtitlul hero-ului (${lang}) are cel mult ${HERO_LIMITS.text} de caractere (2 rânduri); restul textului merge în secțiunea următoare.`});
      }
      return errors;
    }
  },

  // ───────────── Site ─────────────
  {
    key: 'meniuri', table: 'menus', label: 'Meniuri', one: 'Meniu',
    category: 'site', color: '#555e6c', icon: 'menu', noStatus: true,
    title: 'name',
    fields: [
      {key: 'name', label: 'Nume', type: 'text', required: true, list: true},
      {key: 'location', label: 'Loc', type: 'select', required: true, unique: true, list: true, options: ['antet', 'subsol', 'subsol-legal', 'mobil']},
      // Fiecare limbă are lista ei (etichetele diferă), dar destinațiile sunt trimiteri `ref:<tip>:<id>`
      {key: 'items', label: 'Elemente', type: 'links', ...T}
    ]
  },
  {
    key: 'formulare', table: 'forms', label: 'Formulare', one: 'Formular',
    category: 'site', color: '#a35d00', icon: 'inbox', noStatus: true,
    title: 'name',
    fields: [
      {key: 'name', label: 'Nume', type: 'text', required: true, list: true},
      {key: 'handle', label: 'Cheie', type: 'slug', required: true, unique: true},
      // Structura e una pentru ambele limbi (aceleași nume tehnice); doar etichetele se traduc
      {key: 'fields', label: 'Câmpuri', type: 'table', required: true,
       columns: ['name', 'type', 'required', 'options_from', 'options'],
       help: '`options_from: locuinte` = opțiunile vin din tipurile de locuințe publicate.'},
      {key: 'field_labels', label: 'Etichetele câmpurilor', type: 'table', columns: ['name', 'label', 'placeholder', 'options'], ...T},
      {key: 'intro', label: 'Text înainte de formular', type: 'textarea', ...T},
      {key: 'submit_label', label: 'Butonul', type: 'text', ...T},
      {key: 'success_page', label: 'Pagina de mulțumire', type: 'ref', target: 'pagini', rel: 'trimite spre', inverseLabel: 'Formulare'},
      {key: 'notify', label: 'Trimite la', type: 'list'},
      {key: 'hubspot_form', label: 'Formular HubSpot', type: 'text', intern: true}
    ],
    validate(rec, {tr} = {}) {
      const names = new Set((rec.fields ?? []).map(f => f.name));
      const errors = [];
      for (const [lang, t] of Object.entries(tr ?? {}))
        for (const l of t.field_labels ?? [])
          if (!names.has(l.name)) errors.push({field: 'field_labels', lang, message: `Eticheta „${l.name}” nu are câmp.`});
      return errors;
    }
  },
  {
    key: 'cereri', table: 'leads', label: 'Cereri', one: 'Cerere',
    category: 'site', color: '#b5651d', icon: 'mail', noStatus: true, operational: true, creatable: false, assume: 'A9',
    title: 'name',
    fields: [
      {key: 'form', label: 'Formular', type: 'ref', target: 'formulare', required: true, list: true, rel: 'vine din', inverseLabel: 'Cereri', owned: true},
      {key: 'lang', label: 'Limba', type: 'select', required: true, list: true, options: ['ro', 'en']},
      {key: 'page_path', label: 'Pagina', type: 'text'},
      {key: 'name', label: 'Nume', type: 'text', list: true},
      {key: 'email', label: 'Email', type: 'email', list: true},
      {key: 'phone', label: 'Telefon', type: 'phone'},
      {key: 'unit_type', label: 'Tip de locuință', type: 'ref', target: 'locuinte', rel: 'întreabă de', inverseLabel: 'Cereri', owned: true},
      {key: 'answers', label: 'Răspunsuri', type: 'table'},
      {key: 'consent', label: 'Acord prelucrare date', type: 'boolean', required: true},
      {key: 'delivery', label: 'Trimitere', type: 'select', options: ['in-asteptare', 'trimis', 'esuat'], default: 'in-asteptare', list: true},
      {key: 'delivery_error', label: 'Eroare', type: 'text', readonly: true}
    ]
  },
  {
    key: 'media', table: 'media', label: 'Media', one: 'Fișier',
    category: 'site', color: '#888888', icon: 'image', noStatus: true, assume: 'A10',
    title: 'filename',
    fields: [
      {key: 'filename', label: 'Fișier', type: 'text', required: true, list: true},
      {key: 'sha1', label: 'Amprenta', type: 'text', required: true, unique: true, readonly: true},
      {key: 'mime', label: 'Tip', type: 'text', required: true, readonly: true, list: true},
      {key: 'width', label: 'Lățime', type: 'int', readonly: true},
      {key: 'height', label: 'Înălțime', type: 'int', readonly: true},
      {key: 'bytes', label: 'Mărime', type: 'int', readonly: true},
      // Doar pentru video: generate de `npm run video` din original (scripts/video.mjs)
      {key: 'duration', label: 'Durată (s)', type: 'number', readonly: true},
      {key: 'poster', label: 'Cadru de previzualizare', type: 'url', readonly: true, help: 'Imaginea afișată până pornește video-ul.'},
      {key: 'renditions', label: 'Versiuni pentru web', type: 'table', readonly: true,
        columns: ['quality', 'file', 'width', 'height', 'bytes', 'kbps'],
        help: 'Video-ul comprimat pentru site: 1080p pentru desktop, 720p pentru mobil și fundaluri. Originalul rămâne neschimbat.'},
      {key: 'alt', label: 'Text alternativ', type: 'text', max: 200, ...T, help: 'Aceeași imagine, câte un text pe limbă.'},
      {key: 'caption', label: 'Legendă', type: 'text', ...T},
      {key: 'description', label: 'Descriere', type: 'textarea', ...T, help: 'Ce se vede în fotografie, pentru căutare și pentru alegerea imaginii.'},
      {key: 'tags', label: 'Etichete', type: 'list', help: 'Cuvinte-cheie în română: exterior, living, bucătărie, lac…'},
      {key: 'legacy_url', label: 'Adresa în site-ul vechi', type: 'url', intern: true, readonly: true},
      {key: 'legacy_id', label: 'ID în site-ul vechi', type: 'int', intern: true, readonly: true}
    ]
  },
  {
    key: 'redirectari', table: 'redirects', label: 'Redirecționări', one: 'Redirecționare',
    category: 'site', color: '#999999', icon: 'corner-up-right', noStatus: true,
    title: 'from_path',
    // §3.4: schimbarea destinației reface paginile ale căror linkuri trec prin redirecționare
    linkFields: ['from_path', 'to_path', 'to_ref'],
    fields: [
      {key: 'from_path', label: 'De la', type: 'text', required: true, unique: true, list: true},
      {key: 'to_ref', label: 'Spre entitate', type: 'text', help: '`ref:pagini:12` — rezistă la schimbarea adresei (§3.8).'},
      {key: 'to_path', label: 'Spre adresă', type: 'text', list: true},
      {key: 'code', label: 'Cod', type: 'select', options: ['301', '302', '410'], default: '301'},
      {key: 'origin', label: 'Creată de', type: 'select', options: ['automat', 'import', 'manual'], readonly: true}
    ],
    validate: rec => (!rec.to_ref && !rec.to_path && rec.code !== '410' ? [{field: 'to_path', message: 'Lipsește destinația.'}] : [])
  },
  {
    key: 'etichete', table: 'labels', label: 'Etichete interfață', one: 'Etichetă',
    category: 'site', color: '#aaaaaa', icon: 'type', noStatus: true,
    title: 'key',
    fields: [
      {key: 'key', label: 'Cheie', type: 'slug', required: true, unique: true, list: true, help: '„citeste-articolul”, „pagina-principala”.'},
      {key: 'text', label: 'Text', type: 'text', required: true, list: true, ...T}
    ]
  }
];

function hasRole(rec, ...roles) {
  const r = Array.isArray(rec.roles) ? rec.roles : JSON.parse(rec.roles ?? '[]');
  return roles.some(x => r.includes(x));
}
