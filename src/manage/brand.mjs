// Identitatea vizuală Yacht Kid, extrasă din „Yacht KID Brand Identity UPDATED.pdf” (25 de pagini, 1920×1080).
// Textele brandbook-ului sunt păstrate în original (en) și traduse (ro). Ce nu scrie în brandbook, dar s-a
// măsurat din PDF sau s-a observat în machete, e marcat cu `sursa: 'măsurat'` / `sursa: 'observat'`.
// Imaginile sunt în public/brand/ (decupate din PDF), în afara git: brandbook-ul clientului nu ajunge în repo-ul public.

export const BRANDBOOK = {
  fisier: 'Yacht KID Brand Identity UPDATED.pdf',
  titlu: 'Visual language',
  subtitlu: 'YACHT KID',
  pagini: 25,
  format: '1920 × 1080 (prezentare)',
  img: n => `/brand/pagini/pagina-${String(n).padStart(2, '0')}.jpg`
};

// Capitolele, în ordinea brandbook-ului; fiecare are ruta lui în /manage/branding/
export const SECTIUNI = [
  {slug: '', titlu: 'Prezentare', pagini: [1], grup: 'Brandbook'},
  {slug: 'logo', titlu: 'Logo', pagini: [2, 3, 4], grup: 'Identitate'},
  {slug: 'variante', titlu: 'Variante de logo', pagini: [5, 6, 7], grup: 'Identitate'},
  {slug: 'culori', titlu: 'Culori', pagini: [8], grup: 'Identitate'},
  {slug: 'tipografie', titlu: 'Tipografie', pagini: [9], grup: 'Identitate'},
  {slug: 'semnalistica', titlu: 'Semnalistică', pagini: [10, 11], grup: 'Aplicații'},
  {slug: 'papetarie', titlu: 'Papetărie', pagini: [12, 13, 14, 15], grup: 'Aplicații'},
  {slug: 'outdoor', titlu: 'Outdoor și afișaj', pagini: [16, 17, 18, 19, 20, 21, 22], grup: 'Aplicații'},
  {slug: 'digital', titlu: 'Digital', pagini: [23, 24, 25], grup: 'Aplicații'},
  {slug: 'pagini', titlu: 'Toate paginile', pagini: [], grup: 'Sursa'}
];
export const sectiune = slug => SECTIUNI.find(s => s.slug === slug);

export const LOGO = {
  principiu: [
    {en: 'Minimalist designs favor clean, bold, and simple compositions with only one or two colors.',
      ro: 'Designul minimalist preferă compoziții curate, puternice și simple, cu una sau două culori.'},
    {en: 'It is essentially a creative recipe that removes fancy embellishments.',
      ro: 'E, în esență, o rețetă creativă care renunță la înfloriturile decorative.'}
  ],
  intro: {en: 'The logo consists of three key elements:', ro: 'Logo-ul e format din trei elemente:'},
  elemente: [
    {img: '/brand/element-yacht.png', nume: 'YACHT', en: 'The first element represents the name of the project;', ro: 'Primul element reprezintă numele proiectului.'},
    {img: '/brand/element-apa.png', nume: 'Elementul de apă', en: 'The second element is the water element that represents the lake;', ro: 'Al doilea element este elementul de apă, care reprezintă lacul.'},
    {img: '/brand/element-kid.png', nume: 'KID', en: 'The third element is the original KID logo itself.', ro: 'Al treilea element este logo-ul KID original.'}
  ],
  versiuni: [
    {img: '/brand/logo-negativ.png', nume: 'Negativ', fundal: '#20366C', descriere: 'Alb pe navy; apa în albastru deschis. Versiunea de pe coperta brandbook-ului (pagina 2) și de pe firmă, cărți de vizită, coperta paginii de Facebook.', pagina: 2},
    {img: '/brand/logo-pozitiv.png', nume: 'Pozitiv', fundal: '#FFFFFF', descriere: 'Navy pe alb; apa în periwinkle (#8397E5). Pentru fundaluri deschise: foaia cu antet, afișe, site (pagina 4).', pagina: 4}
  ],
  constructie: [
    'YACHT: litere subțiri, extinse, pe toată lățimea logo-ului.',
    'Trei linii de valuri, de aceeași lățime cu cuvintele, între YACHT și KID.',
    'KID: litere groase, extinse, aceeași lățime; dă greutatea compoziției.',
    'Compoziție centrată, în bloc, aproape pătrată.'
  ]
};

// Variantele A–F (paginile 6 și 7). Brandbook-ul le dă doar literele; descrierile sunt observate din desen.
export const VARIANTE = [
  {id: 'A', descriere: 'Cu silueta iahtului: catarg, punte în trepte și carenă în formă de V; YACHT KID încadrat între linii orizontale.'},
  {id: 'B', descriere: 'Logo-ul principal: YACHT, trei linii de valuri, KID. Aceeași compoziție ca pe paginile 2 și 4.', principal: true},
  {id: 'C', descriere: 'Orizontală: un simbol pătrat cu trei valuri care îl traversează în diagonală, cu YACHT KID în dreapta.'},
  {id: 'D', descriere: 'Silueta iahtului fără carenă; valurile trec sub KID.'},
  {id: 'E', descriere: 'Ca B, cu „CH” din YACHT desenat ca două săgeți (cârmă/direcție).'},
  {id: 'F', descriere: 'Fără apă: YACHT cu „CH” în săgeți, în albastru deschis, deasupra lui KID.'}
].map(v => ({...v, negativ: `/brand/varianta-${v.id}-negativ.png`, pozitiv: `/brand/varianta-${v.id}-pozitiv.png`}));

export const CULORI = {
  primare: [
    {nume: 'Navy', hex: '#20366C', rgb: '32 54 108', rol: 'Culoarea brandului: fundaluri, logo-ul pozitiv, titluri.'},
    {nume: 'Antracit', hex: '#24262E', rgb: '36 38 46', rol: 'Neutrul închis: text, fundaluri închise.'}
  ],
  secundare: [
    {nume: 'Periwinkle', culori: [{hex: '#8397E5', rgb: '131 151 229'}, {hex: '#9CB0FE', rgb: '156 176 254'}], rol: 'Elementul de apă din logo, accente pe navy.'},
    {nume: 'Coral', culori: [{hex: '#E8895C', rgb: '232 137 92'}, {hex: '#F9AB86', rgb: '249 171 134'}], rol: 'Subtitluri și butoane (în machete: „Sub headline”, butonul site-ului).'},
    {nume: 'Gri', culori: [{hex: '#D8DADB', rgb: '216 218 219'}, {hex: '#FBFBFB', rgb: '251 251 251'}], rol: 'Fundaluri deschise, separatoare.'}
  ],
  gradiente: [
    {nume: 'Bronze', de: '#EC9065', la: '#F5A57F', sursa: 'măsurat'},
    {nume: 'Gold', de: '#C39754', la: '#EFE094', sursa: 'măsurat'}
  ],
  fundalBrandbook: '#F1F1F0'
};

export const TIPOGRAFIE = {
  familie: 'Montserrat',
  greutati: [
    {nume: 'Montserrat Bold', greutate: 700, specimen: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz'},
    {nume: 'Montserrat Regular', greutate: 400, specimen: 'Aa Bb Cc Dd Ee Ff Gg Hh Ii Jj Kk Ll Mm Nn Oo Pp Qq Rr Ss Tt Uu Vv Ww Xx Yy Zz'}
  ],
  ierarhie: [
    {rol: 'Headline', regula: 'Bold. 5% LS', greutate: 700, spatiere: '0.05em', culoare: '#20366C', mostra: 'Headline'},
    {rol: 'Sub headline', regula: 'Light. 0% LS', greutate: 300, spatiere: '0', culoare: '#E8895C', mostra: 'Sub headline'},
    {rol: 'Text', regula: 'Light, corp mic, navy', greutate: 300, spatiere: '0', culoare: '#20366C', sursa: 'observat',
      mostra: 'Arcu bibendum at varius vel pharetra vel turpis. Eros donec ac odio tempor orci dapibus. Aliquet enim tortor at auctor urna nunc id cursus. Eleifend quam adipiscing vitae proin sagittis nisl rhoncus mattis. Consectetur libero id faucibus nisl tincidunt. Amet consectetur adipiscing elit ut aliquam purus sit amet luctus. Aliquam ut porttitor leo a diam. Mollis aliquam ut porttitor leo a diam sollicitudin tempor. Felis imperdiet proin fermentum leo vel orci porta non. Dictum varius duis at consectetur lorem. Viverra maecenas accumsan lacus vel.'}
  ],
  nota: '„LS” = letter spacing (spațierea literelor). Brandbook-ul nu dă mărimile corpurilor de literă.'
};

// Aplicațiile (paginile 10–25), cu ce arată fiecare machetă
export const APLICATII = {
  semnalistica: {
    intro: 'Firma luminoasă, pătrată, montată în consolă pe fațadă.',
    pagini: [
      {n: 10, titlu: 'Firmă în consolă (studio)', detalii: ['Fond navy, chenar alb subțire la interior.', 'Logo-ul principal (B) în negativ, centrat, cu apa în periwinkle.']},
      {n: 11, titlu: 'Firmă în consolă (pe clădire)', detalii: ['Aceeași firmă, în context urban: se vede de la distanță datorită contrastului navy / alb.']}
    ]
  },
  papetarie: {
    intro: 'Cărți de vizită, foaie cu antet, plicuri, carnet, tub pentru planuri.',
    pagini: [
      {n: 12, titlu: 'Cărți de vizită — verso', detalii: ['Fond navy plin, logo-ul negativ centrat, fără alt text.']},
      {n: 13, titlu: 'Set de papetărie', detalii: ['Foaie cu antet în două versiuni: navy cu text alb și albă cu text navy; logo-ul sus, stânga.', 'Plic DL alb cu clapa navy; pe spate, o linie de valuri ca element grafic.', 'Carte de vizită navy.']},
      {n: 14, titlu: 'Set de papetărie 2', detalii: ['Cărți de vizită navy și albe, carnet cu spirală și copertă navy, foaie cu antet cu textură.', 'Tub pentru planuri cu logo-ul repetat ca model.']},
      {n: 15, titlu: 'Cărți de vizită — față', detalii: ['Albe, cu nume în navy Bold și funcția în coral.', 'Bogdan Ghiță — CEO / Founder; Răzvan Ghiță — CEO / Founder.', 'Telefon: +40 0724 077 077 · contact@yachtkid.ro · Strada Anton Holban nr. 6.', 'Cod QR în navy, în stânga.']}
    ]
  },
  outdoor: {
    intro: 'Același șablon pe toate formatele: bloc navy sus cu yachtkid.ro, titlu alb Bold și subtitlu coral, fotografie, bandă albă jos cu logo-ul pozitiv, linii de valuri verticale pe margine.',
    pagini: [
      {n: 16, titlu: 'Citylight (interior)', detalii: ['Format vertical, randarea clădirii în mijloc.']},
      {n: 17, titlu: 'Billboard orizontal (pasaj)', detalii: ['Bloc navy cu valuri orizontale, titlu și subtitlu coral în stânga; fotografie de interior în dreapta; logo negativ jos, stânga.']},
      {n: 18, titlu: 'Citylight în parc', detalii: ['Același șablon vertical, în exterior.']},
      {n: 19, titlu: 'Stație de autobuz', detalii: ['Afiș vertical în stație, iluminat noaptea.']},
      {n: 20, titlu: 'Citylight noaptea', detalii: ['Contrastul navy / alb rămâne lizibil în lumină slabă.']},
      {n: 21, titlu: 'Panou stradal', detalii: ['Format vertical mare, pe trotuar.']},
      {n: 22, titlu: 'Afișe pe fațadă', detalii: ['Un afiș orizontal și unul vertical cu fotografii de interior; titlu pe două rânduri.']}
    ]
  },
  digital: {
    intro: 'Rețele sociale și site.',
    pagini: [
      {n: 23, titlu: 'Instagram', detalii: ['Avatar: logo-ul negativ pe cerc navy.', 'Postare cu randarea clădirii; story cu valuri albe verticale și caseta de întrebare.', 'Grila profilului alternează fotografii și carduri cu text pe navy și periwinkle.']},
      {n: 24, titlu: 'Facebook', detalii: ['Copertă navy cu titlu alb și subtitlu coral, valuri verticale în dreapta.', 'Avatar ca pe Instagram; postări cu randări.']},
      {n: 25, titlu: 'Site', detalii: ['Hero cu randarea clădirii pe tot ecranul, logo-ul negativ sus, stânga; meniu Home · Contact · Register.', 'Titlu Bold alb cu o subliniere coral; buton coral „Get to know us”.', 'Pe mobil: secțiune navy cu un cuvânt evidențiat în coral; valuri orizontale ca decor.']}
    ]
  }
};

// Ce am găsit comparând brandbook-ul cu site-ul și cu Brain-ul
export const OBSERVATII = [
  {nivel: 'mare', text: 'Telefonul de pe cărțile de vizită (+40 0724 077 077, pagina 15) diferă de cel de pe site și din Date firmă (+40 739 085 331). De lămurit care e corect.'},
  {nivel: 'mediu', text: 'Coralul e culoarea butoanelor și a subtitlurilor în machete (paginile 16–25), dar site-ul actual nu-l folosește: butoanele sunt albe sau navy.'},
  {nivel: 'mic', text: 'Brandbook-ul nu spune când se folosește fiecare variantă de logo (A–F), nici spațiul minim din jurul logo-ului sau mărimea minimă.'},
  {nivel: 'mic', text: 'Gradientele Bronze și Gold nu au coduri în brandbook; valorile de aici sunt măsurate din PDF.'},
  {nivel: 'ok', text: 'Site-ul actual folosește deja Montserrat și navy-ul #20366C, ca în brandbook.'}
];
