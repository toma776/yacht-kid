// Presupunerile făcute în registru pentru întrebările încă deschise (docs/01-entitati.md, secțiunea 8).
// Fiecare are un ID folosit în registru (`assume: 'A1'`), ca /manage să le poată arăta în „De făcut”
// și ca testele să verifice că documentația le numește pe toate. Când clientul răspunde, presupunerea
// se scoate de aici și din registru, iar testul arată ce a rămas nelegat.
export const ASSUMPTIONS = [
  {id: 'A1', question: 8.1, where: 'locuinte.price_from',
    assumed: 'Prețul duplexului e 1.495.000 € + TVA (varianta RO, limba implicită). Importul îl scrie cu certitudinea „unverified” și cu ambele surse.',
    ifOther: 'Se schimbă o singură valoare; ambele limbi o preiau.'},
  {id: 'A2', question: 8.2, where: 'locuinte',
    assumed: 'Nu avem unități individuale. Intervalele (suprafață, etaj, băi, terasă) și „prețul de la” se scriu de mână pe tipul de locuință.',
    ifOther: 'Se adaugă tipul `unitati` (modul), iar câmpurile de interval devin calculate.'},
  {id: 'A3', question: 8.3, where: 'articole',
    assumed: 'Articolele doar RO rămân doar RO. Un articol fără traducere EN nu are pagină EN și nu apare în listele EN.',
    ifOther: 'Traducerea se adaugă pe aceeași entitate; pagina EN apare la publicare.'},
  {id: 'A4', question: 8.4, where: 'pagini',
    assumed: '/prezentare/ și /programeaza-o-vizionare/ sunt pagini de campanie doar RO (șablonul `landing`).',
    ifOther: 'La fel ca A3: traducerea EN pe aceeași entitate.'},
  {id: 'A5', question: 8.5, where: 'testimoniale',
    assumed: 'Testimonialele nu au pagină proprie; /testimonial/<nume>/ primește 301 spre /testimoniale/. Cele 12 afișate azi au `featured = 1`, celelalte 39 se importă cu `featured = 0`.',
    ifOther: 'Se schimbă doar `featured`; dacă vor pagini proprii, se adaugă `public.path`.'},
  {id: 'A6', question: 8.6, where: 'articole.duplicates',
    assumed: 'Cele două articole „Cum alegi … Lacul Tei” (5 și 7 criterii) se importă separat; regula de dublură le propune spre unire, fără să le unească.',
    ifOther: 'Unirea se face din /manage (store.merge), cu 301 de pe adresa scoasă.'},
  {id: 'A7', question: 8.7, where: 'afaceri.state',
    assumed: 'Toate afacerile anunțate prin articole sunt deschise. Lista de pe homepage („clinică … în curs de deschidere”) se generează din `afaceri`, nu se mai scrie de mână.',
    ifOther: 'Se schimbă `state` pe afacerea respectivă.'},
  {id: 'A8', question: 8.8, where: 'afaceri',
    assumed: 'TC Joyeria și Ghost Agency sunt deschise; se importă fără logo și fără site, cu certitudinea „unverified”.',
    ifOther: 'Se completează sau se arhivează.'},
  {id: 'A9', question: 8.9, where: 'cereri',
    assumed: 'Cererile din formulare se păstrează și în Brain (tipul operațional `cereri`), apoi se trimit spre HubSpot.',
    ifOther: 'Tipul `cereri` se scoate; formularul trimite direct.'},
  {id: 'A10', question: 8.10, where: 'media',
    assumed: 'Se importă doar fișierele folosite (354). Celelalte 222 rămân doar în snapshot.',
    ifOther: 'Importul primește lista suplimentară.'},
  // Presupuneri tehnice, nu întrebări pentru client
  {id: 'T1', question: null, where: 'src/core/schema.mjs',
    assumed: 'Decis pe 27.10.2026: baza e SQLite prin libSQL (local: fișierul data/brain.db; pe Vercel: Turso). Schema urmează Anexa B. Rămâne de verificat pe Turso că cheile străine sunt aplicate.',
    ifOther: 'Pe Postgres se schimbă generatorul de schemă, nu registrul.'},
  {id: 'T2', question: null, where: 'premii.tokens.nr_premii',
    assumed: '„Premiat la 5 competiții” numără premiile publicate, fără lista scurtă (SHARE Architecture Awards 2024). Azi dă 5, ca textul de pe site.',
    ifOther: 'Se schimbă filtrul jetonului.'},
  {id: 'T3', question: null, where: 'pagini',
    assumed: 'Adresele vechi se păstrează exact, inclusiv /community-card-concept/ (RO) ↔ /en/community-card/ (EN).',
    ifOther: 'Schimbarea slug-ului creează singură 301 (§3.8).'}
];

export const assumption = id => ASSUMPTIONS.find(a => a.id === id);
