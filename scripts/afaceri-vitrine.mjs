// Afacerile din comunitate ies din blog și primesc vitrina lor sub Spații comerciale (/spatii-comerciale/<afacere>/).
//   1. fiecare afacere cu articol primește slug, introducere, poveste, oferta, citat, copertă și galerie (RO și EN),
//      scrise din articolul care o anunța; fotografiile sunt cele din articol, deja în mediatecă
//   2. articolele lor trec în arhivă, iar adresele lor (RO și EN) primesc 301 spre vitrina afacerii
//   3. etichetele noi ale machetei (afacere-*), pe ambele limbi
// TC Joyeria și Ghost Agency nu au articol: rămân doar card, fără vitrină, până au conținut.
// Totul prin store (istoric, eveniment, proveniență), cu autorul „Vitrine afaceri”. Se poate rula din nou.
//   node scripts/afaceri-vitrine.mjs                               (local)
//   node --env-file=.env.turso.local scripts/afaceri-vitrine.mjs   (Turso)
import {openDb, prepare, one, all} from '../src/core/db.mjs';
import {saveEntity, createEntity} from '../src/core/store.mjs';
import {publicPath} from '../src/registry/derive.mjs';

const opts = {user: 'Vitrine afaceri'};
const db = await prepare(openDb());
const p = (...xs) => xs.map(x => `<p>${x}</p>`).join('');

// id afacere → articolul care o anunța, coperta, galeria (prima fotografie stă lângă poveste) și textele
const BUSINESSES = [
  {
    id: 1, post: 7, hero: 157, gallery: [158, 159, 160, 161, 156, 162, 163],
    ro: {
      slug: 'mob-ministry-of-beauty',
      description: 'Un salon gândit ca un ritual: coafură, culoare, manichiură și machiaj, într-un decor elegant, cu o echipă care lucrează pentru felul în care te simți, nu doar pentru cum arăți.',
      story: p(
        'MOB | Ministry of Beauty a pornit de la o idee simplă: vizita la salon poate fi mai mult decât un serviciu. Din ea s-a născut unul dintre cele mai deosebite saloane de înfrumusețare din țară, în care fiecare programare urmărește să depășească așteptările.',
        'Conceptul pune în centru încrederea în sine și exprimarea personalității: să fii cea mai bună versiune a ta. MOB adună o comunitate de femei pentru care frumusețea începe din interior, din felul în care se simt.',
        'Echipa are o experiență vastă și e mereu la curent cu tehnicile și tendințele din industrie. Salonul investește constant în servicii și lucrează cu produse de înaltă calitate și cu produse de culoare non-toxice, pentru o experiență fără compromisuri.',
        'La parterul YACHT KID, MOB îmbină frumusețea, relaxarea și confortul: la câțiva pași de casă pentru rezidenți și o destinație pentru clientele din tot nordul Bucureștiului.'),
      offer: [
        'Manichiură – de la îngrijirea clasică la cele mai noi tehnici',
        'Culoare și tunsoare – schimbări de stil gândite pentru fiecare clientă',
        'Coafură – de la look-ul de zi la ocaziile speciale',
        'Machiaj – impecabil, adaptat fiecărei ocazii',
        'Produse non-toxice – culoare și îngrijire de înaltă calitate'],
      quote: 'S-a înființat un nou minister. Fără politică, doar frumusețe.',
      quote_author: 'MOB | Ministry of Beauty',
      seo_title: 'MOB – Ministry of Beauty, salon de înfrumusețare la YACHT KID',
      seo_description: 'Salon de înfrumusețare exclusivist la parterul YACHT KID, în nordul Bucureștiului: coafură, culoare, manichiură și machiaj, cu produse non-toxice.'
    },
    en: {
      slug: 'mob-ministry-of-beauty',
      description: 'A salon designed as a ritual: hair, colour, nails and make-up in an elegant setting, with a team that works on how you feel, not just how you look.',
      story: p(
        'MOB | Ministry of Beauty began with a simple idea: a visit to the salon can be more than a service. It has grown into one of the country’s most distinguished beauty destinations, where every appointment aims to exceed expectations.',
        'The concept is built around self-confidence and individuality: being the best version of yourself. MOB brings together a community of women for whom beauty starts within, in the way they feel.',
        'The team brings extensive experience and stays ahead of the latest techniques and trends. The salon keeps investing in its services and works with high-quality products and non-toxic colour, for a beauty experience without compromise.',
        'On the YACHT KID ground floor, MOB brings beauty, relaxation and comfort together: steps from home for residents, and a destination for clients from all over northern Bucharest.'),
      offer: [
        'Nails – from classic care to the latest techniques',
        'Colour and cut – a change of style, designed for each client',
        'Hair styling – from everyday looks to special occasions',
        'Make-up – flawless, tailored to every occasion',
        'Non-toxic products – high-quality colour and care'],
      quote: 'A new ministry has been established. No politics, just pure beauty.',
      quote_author: 'MOB | Ministry of Beauty',
      seo_title: 'MOB – Ministry of Beauty, beauty salon at YACHT KID',
      seo_description: 'An exclusive beauty salon on the YACHT KID ground floor in northern Bucharest: hair, colour, nails and make-up, with non-toxic products.'
    }
  },
  {
    id: 2, post: 8, hero: 165, gallery: [166, 167, 168, 169, 170, 171, 328, 329],
    ro: {
      slug: 'amcor-complete-dentistry',
      description: 'O clinică stomatologică boutique, adusă la București de echipa Clinicii Rugină din Timișoara: tratamente personalizate, gândite pentru tot aparatul masticator, nu doar pentru un zâmbet frumos.',
      story: p(
        'După succesul Clinicii Rugină din Timișoara, echipa AMCOR a adus în capitală un concept boutique unic în București: tehnologie de ultimă oră și tratamente adaptate fiecărui pacient, într-o atmosferă modernă și relaxantă.',
        'Abordarea e completă. Medicii stomatologi, chirurgii și specialiștii în implantologie lucrează împreună și țin cont de fiecare componentă a aparatului masticator: dinți, oase, mușchi, țesuturi moi și articulații. Rezultatul sunt reabilitări orale estetice, dar și durabile.',
        'Clinica e și un centru de formare. Cursurile STRUCTURE, ADHESION și FULL CIRCLE îmbină teoria și practica, pe baza protocoalelor aplicate zilnic în clinică, și sunt disponibile acum și la București.'),
      offer: [
        'Natural – fiecare procedură respectă țesuturile naturale și sănătatea dentară pe termen lung',
        'Funcțional – echilibru între toate componentele aparatului masticator, pentru rezultate predictibile',
        'Estetic – forme dentare armonizate cu trăsăturile fiecărui pacient',
        'Reabilitări complexe și implanturi – planificate de o echipă multidisciplinară',
        'Albire dentară – un zâmbet luminos, cu aspect natural',
        'Cursuri pentru medici – STRUCTURE, ADHESION și FULL CIRCLE'],
      quote: 'Ne dorim ca fiecare pacient să obțină rezultate care să nu fie doar frumoase, dar și funcționale. Fiecare zâmbet pe care îl creăm este gândit în detaliu, în armonie cu trăsăturile fiecărei persoane, și să reziste în timp.',
      quote_author: 'Dr. Alex Rugină, coordonatorul echipei medicale AMCOR',
      seo_title: 'AMCOR – Complete Dentistry, clinică dentară la YACHT KID',
      seo_description: 'Clinică stomatologică boutique la parterul YACHT KID: reabilitări complexe, implanturi și albire, cu o abordare completă a aparatului masticator.'
    },
    en: {
      slug: 'amcor-complete-dentistry',
      description: 'A boutique dental clinic brought to Bucharest by the team behind Clinica Rugină in Timișoara: personalised treatment designed for the whole masticatory system, not just a beautiful smile.',
      story: p(
        'Following the success of Clinica Rugină in Timișoara, the AMCOR team has brought a boutique concept to the capital that is unique in Bucharest: the latest technology and treatment tailored to each patient, in a modern, relaxing setting.',
        'The approach is comprehensive. Dentists, surgeons and implantology specialists work together and consider every part of the masticatory system: teeth, bones, muscles, soft tissues and joints. The result is oral rehabilitation that looks good and lasts.',
        'The clinic is also a training centre. The STRUCTURE, ADHESION and FULL CIRCLE courses combine theory and hands-on practice based on the protocols used in the clinic every day, and are now available in Bucharest too.'),
      offer: [
        'Natural – every procedure preserves natural tissue and long-term dental health',
        'Functional – balance across the whole masticatory system, for predictable results',
        'Aesthetic – new dental forms in harmony with each patient’s features',
        'Complex rehabilitation and implants – planned by a multidisciplinary team',
        'Teeth whitening – a brighter, natural-looking smile',
        'Courses for dentists – STRUCTURE, ADHESION and FULL CIRCLE'],
      quote: 'We strive to create smiles that are not just beautiful, but also functional. Every smile we design is carefully tailored to the patient’s features and built to last.',
      quote_author: 'Dr. Alex Rugină, Head of the AMCOR Medical Team',
      seo_title: 'AMCOR – Complete Dentistry, dental clinic at YACHT KID',
      seo_description: 'A boutique dental clinic on the YACHT KID ground floor: complex rehabilitation, implants and whitening, with a complete approach to oral health.'
    }
  },
  {
    id: 3, post: 10, hero: 210, gallery: [201, 200, 202, 203, 204, 205, 208, 209, 207, 206, 199],
    ro: {
      slug: 'fabriq',
      description: 'Cafea de specialitate dimineața, gin premium și cocktailuri seara. Un bar de zi și de seară la parterul YACHT KID, cu aplicație proprie care livrează direct la ușa apartamentului.',
      story: p(
        'FABRIQ | Specialty Coffee & Gin Bar e locul în care vii pentru gust și rămâi pentru atmosferă. Dimineața, cafea de specialitate preparată cu grijă; seara, ginuri premium și cocktailuri inedite, într-un decor modern și primitor.',
        'Pentru rezidenți, FABRIQ are și o aplicație proprie: cu câteva atingeri comanzi cafeaua preferată, un panini proaspăt sau un cocktail, iar comanda vine direct la ușa apartamentului.',
        'O experiență de calitate, dar relaxată, cu o ospitalitate atentă la preferințele și ritmul fiecăruia: dimineața, seara, oricând.'),
      offer: [
        'Cafea de specialitate – preparată cu grijă, într-un spațiu modern și primitor',
        'Gin premium și cocktailuri – pentru serile în care vrei să te relaxezi și să socializezi',
        'Panini artizanali și patiserie – pentru un mic dejun târziu sau o pauză de prânz',
        'Aplicația FABRIQ – comenzi rapide, livrate la ușa apartamentului',
        'Ospitalitate atentă – adaptată preferințelor și ritmului tău'],
      quote: 'Cafea de specialitate dimineața. Gin premium și atmosferă relaxată seara.',
      quote_author: 'FABRIQ | Specialty Coffee & Gin Bar',
      seo_title: 'FABRIQ, Specialty Coffee & Gin Bar la YACHT KID',
      seo_description: 'Cafea de specialitate, gin premium și cocktailuri la parterul YACHT KID, cu aplicație proprie care livrează la ușa apartamentului.'
    },
    en: {
      slug: 'fabriq',
      description: 'Specialty coffee by day, premium gin and cocktails by night. An all-day bar on the YACHT KID ground floor, with its own app that delivers straight to your door.',
      story: p(
        'FABRIQ | Specialty Coffee & Gin Bar is where you come for the taste and stay for the atmosphere. Expertly brewed specialty coffee in the morning; premium gins and signature cocktails in the evening, in a modern, inviting space.',
        'For residents, FABRIQ also has its own app: a few taps and your favourite coffee, a fresh panini or a cocktail is delivered straight to your apartment door.',
        'A quality experience that stays relaxed, with attentive hospitality tuned to your preferences and pace: morning, evening, whenever.'),
      offer: [
        'Specialty coffee – expertly brewed in a modern, inviting space',
        'Premium gin and cocktails – for evenings when you want to relax and socialise',
        'Artisan paninis and pastries – for a late breakfast or a lunch break',
        'The FABRIQ app – quick orders, delivered to your door',
        'Attentive hospitality – tailored to your preferences and pace'],
      quote: 'Specialty coffee to kickstart your morning. Premium gin and the perfect vibe to relax in the evening.',
      quote_author: 'FABRIQ | Specialty Coffee & Gin Bar',
      seo_title: 'FABRIQ, Specialty Coffee & Gin Bar at YACHT KID',
      seo_description: 'Specialty coffee, premium gin and cocktails on the YACHT KID ground floor, with an app that delivers to your apartment door.'
    }
  },
  {
    id: 4, post: 14, hero: 179, logo: 240, gallery: [],
    ro: {
      slug: 'froo',
      description: 'Magazinul de proximitate de la parter: produse de bază, gustări, băuturi și preparate gata de consum, la câțiva pași de apartament. Simplu, rapid și convenabil.',
      story: p(
        'Froo este un concept modern de magazin de proximitate, gândit pentru cumpărături ușoare și rapide, aproape de casă.',
        'Pe rafturi găsești produse alimentare de bază, gustări, băuturi, preparate gata de consum și gama „Exclusiv la Froo”, aleasă pentru ritmul vieții urbane.',
        'Fie că e vorba de o cafea dimineața, un prânz rapid sau ce mai lipsește din casă, Froo le are pe toate într-un singur loc, la parterul YACHT KID. Rezidenții câștigă timp, iar ziua devine mai simplă.'),
      offer: [
        'Produse de bază – tot ce ai nevoie pentru acasă',
        'Gustări și băuturi – pentru orice moment al zilei',
        'Preparate gata de consum – pentru un prânz rapid',
        'Exclusiv la Froo – o gamă proprie, gândită pentru viața urbană'],
      seo_title: 'Froo, magazin de proximitate la YACHT KID',
      seo_description: 'Magazinul Froo de la parterul YACHT KID: produse de bază, gustări, băuturi și preparate gata de consum, la câțiva pași de casă.'
    },
    en: {
      slug: 'froo',
      description: 'The convenience store on the ground floor: groceries, snacks, drinks and ready-to-eat meals, a few steps from your apartment. Simple, quick and convenient.',
      story: p(
        'Froo is a modern proximity store concept, designed for easy, quick shopping close to home.',
        'On the shelves you’ll find everyday groceries, snacks, drinks, ready-to-eat meals and the “Exclusively at Froo” range, curated for busy urban lives.',
        'Whether it’s a morning coffee, a quick lunch or whatever is missing at home, Froo has it all in one place on the YACHT KID ground floor. Residents save time, and the day gets simpler.'),
      offer: [
        'Everyday groceries – everything you need at home',
        'Snacks and drinks – for any moment of the day',
        'Ready-to-eat meals – for a quick lunch',
        'Exclusively at Froo – an own range, made for city life'],
      seo_title: 'Froo, convenience store at YACHT KID',
      seo_description: 'The Froo store on the YACHT KID ground floor: groceries, snacks, drinks and ready-to-eat meals, a few steps from home.'
    }
  },
  {
    id: 5, post: 16, hero: 321, gallery: [323, 322, 325, 324],
    ro: {
      slug: 'florit-hot-pilates',
      description: 'Un studio de hot pilates cu health bar, inspirat din studiourile wellness din Londra, Paris, Viena și Marbella: mișcare, energie și o comunitate cu aceleași valori, în nordul Bucureștiului.',
      story: p(
        'Florit e gândit ca un loc în care rutina de zi cu zi include firesc sportul, relaxarea și momentele petrecute împreună. Studioul se adresează femeii moderne și active, care caută un echilibru natural între mișcare, energie și stil de viață.',
        'În centrul conceptului stă hot pilates: antrenament într-o sală cu temperatură ridicată și controlată, care activează musculatura în profunzime și susține tonifierea și flexibilitatea corpului.',
        'Designul e contemporan și elegant, inspirat din studiourile premium din Londra, Paris, Viena sau Marbella. Dincolo de clase, Florit vrea să fie un hub de comunitate, cu evenimente și colaborări dedicate unui stil de viață activ și echilibrat.'),
      offer: [
        'Hot pilates – antrenament într-o sală încălzită, pentru tonifiere și flexibilitate',
        'Clase de grup – mat pilates, în ritmul comunității',
        'Sesiuni private pe reformer – unu la unu, cu instructorul',
        'Health bar – băuturi și opțiuni sănătoase, înainte sau după antrenament',
        'Evenimente – colaborări dedicate unui stil de viață activ'],
      credits: 'Design interior: MladinDesignHouse',
      seo_title: 'Florit Hot Pilates, studio de pilates la YACHT KID',
      seo_description: 'Studio de hot pilates cu health bar la parterul YACHT KID: clase de grup de mat pilates și sesiuni private pe reformer, în nordul Bucureștiului.'
    },
    en: {
      slug: 'florit-hot-pilates',
      description: 'A hot pilates studio with a health bar, inspired by wellness studios in London, Paris, Vienna and Marbella: movement, energy and a like-minded community in northern Bucharest.',
      story: p(
        'Florit is designed as a place where everyday routines naturally include exercise, relaxation and time together. The studio is made for the modern, active woman looking for a natural balance between movement, energy and lifestyle.',
        'At the heart of the concept is hot pilates: a workout in a studio kept at a high, controlled temperature, which activates the muscles more deeply and supports toning and flexibility.',
        'The design is contemporary and elegant, inspired by premium studios in London, Paris, Vienna and Marbella. Beyond the classes, Florit aims to be a community hub, with events and collaborations dedicated to an active, balanced lifestyle.'),
      offer: [
        'Hot pilates – a heated-studio workout for toning and flexibility',
        'Group classes – mat pilates, at the community’s pace',
        'Private reformer sessions – one to one with the instructor',
        'Health bar – healthy drinks and options before or after your workout',
        'Events – collaborations dedicated to an active lifestyle'],
      credits: 'Interior design: MladinDesignHouse',
      seo_title: 'Florit Hot Pilates, pilates studio at YACHT KID',
      seo_description: 'A hot pilates studio with a health bar on the YACHT KID ground floor: group mat classes and private reformer sessions in northern Bucharest.'
    }
  },
  {
    id: 8, post: 11, hero: 211, gallery: [212],
    ro: {
      slug: 'aura-pavel',
      description: 'Un cabinet de psihoterapie psihanalitică gândit ca un refugiu pentru reflecție: un cadru sigur, în care gândurile nespuse și conflictele interioare pot fi, în sfârșit, puse în cuvinte.',
      story: p(
        'Într-un ritm care cere soluții rapide, nevoile emoționale sunt adesea amânate. Cabinetul Aurei Pavel pune în centru profunzimea, reflecția și sensul.',
        'Psihoterapia psihanalitică nu vine cu rețete rapide sau răspunsuri instantanee. Creează un cadru în care fiecare poveste personală e luată în serios, iar suferințele și conflictele interioare pot fi înțelese treptat, cu răbdare. În timp, ce părea fără ieșire poate deveni începutul unui drum nou.',
        'Aura Pavel este psiholog clinician și psihoterapeut cu formare psihanalitică și lucrează individual cu adolescenți și adulți. A publicat în volume colective sub egida Uniunii Scriitorilor din Galați și în colaborare cu Editura Universitară din București, explorând legătura dintre psihanaliză, scriitură și expresie personală.'),
      offer: [
        'Psihoterapie individuală – pentru adolescenți și adulți',
        'Abordare psihanalitică – un proces în profunzime, nu soluții rapide',
        'Un cadru sigur – conceput ca refugiu pentru reflecție și reconstrucție personală'],
      seo_title: 'Aura Pavel, cabinet de psihoterapie la YACHT KID',
      seo_description: 'Cabinet de psihoterapie psihanalitică la YACHT KID: psiholog clinician Aura Pavel, ședințe individuale pentru adolescenți și adulți.'
    },
    en: {
      slug: 'aura-pavel',
      description: 'A psychoanalytic psychotherapy practice designed as a refuge for reflection: a safe setting where unspoken thoughts and inner conflicts can finally find words.',
      story: p(
        'In a pace of life that demands quick fixes, emotional needs are often put off. Aura Pavel’s practice puts depth, reflection and meaning at the centre.',
        'Psychoanalytic psychotherapy offers no instant recipes or ready-made answers. It creates a space where each personal story is taken seriously, and where pain and inner conflict can be understood gradually, with patience. Over time, what felt like a dead end may become the beginning of a new path.',
        'Aura Pavel is a clinical psychologist and psychoanalytic psychotherapist, working individually with adolescents and adults. She has contributed to collective volumes published under the aegis of the Writers’ Union in Galați and with Universitară Publishing House in Bucharest, exploring the links between psychoanalysis, writing and personal expression.'),
      offer: [
        'Individual psychotherapy – for adolescents and adults',
        'A psychoanalytic approach – an in-depth process, not quick fixes',
        'A safe setting – designed as a refuge for reflection and personal growth'],
      seo_title: 'Aura Pavel, psychotherapy practice at YACHT KID',
      seo_description: 'A psychoanalytic psychotherapy practice at YACHT KID: clinical psychologist Aura Pavel, individual sessions for adolescents and adults.'
    }
  }
];

const LABELS = {
  'afacere-deja-in-comunitate': ['Deja în comunitate', 'Already in the community'],
  'afacere-domeniu': ['Domeniu', 'Field'],
  'afacere-unde': ['Unde', 'Where'],
  'afacere-parter': ['Parterul YACHT KID', 'YACHT KID ground floor'],
  'afacere-program': ['Program', 'Opening hours'],
  'afacere-deschis-din': ['Deschis din', 'Open since'],
  'afacere-partener': ['Partener', 'Partner'],
  'afacere-povestea': ['Povestea', 'The story'],
  'afacere-oferta': ['Ce găsești aici', 'What you’ll find'],
  'afacere-spatiul': ['Spațiul', 'The space'],
  'afacere-viziteaza': ['Vizitează', 'Visit'],
  'afacere-adresa': ['Adresa', 'Address'],
  'afacere-harta': ['Deschide în Google Maps', 'Open in Google Maps'],
  'afacere-contact': ['Contact', 'Contact'],
  'afacere-vecini': ['Vecinii din comunitate', 'Neighbours in the community'],
  'afacere-cta-eticheta': ['Spații comerciale', 'Commercial spaces'],
  'afacere-cta-titlu': ['Următoarea vitrină poate fi a ta', 'The next showcase could be yours'],
  'afacere-cta-text': [
    '{afacere} a ales parterul YACHT KID: clienți care locuiesc chiar deasupra, o promenadă pe malul lacului și o comunitate care își susține vecinii. Spațiile rămase sunt gândite pentru afaceri la fel de bune.',
    '{afacere} chose the YACHT KID ground floor: customers living right upstairs, a lakeside promenade and a community that supports its neighbours. The remaining spaces are designed for businesses just as good.'],
  'afacere-cta-buton': ['Vezi spațiile comerciale', 'See the commercial spaces']
};

for (const b of BUSINESSES) {
  // Adresele vechi ale articolului, cât încă e publicat (după arhivare, publicPath dă tot adresa, din slug)
  const trs = await all(db, 'SELECT lang, slug FROM posts_translations WHERE entity_id = ?', [b.post]);
  const base = {hero_image: b.hero, ...(b.logo ? {logo: b.logo} : {})};
  await saveEntity(db, 'afaceri', b.id, {base, tr: {ro: b.ro, en: b.en}, links: {gallery: b.gallery}}, opts);
  console.log(`  ✓ afacerea #${b.id}: vitrina ${publicPath('afaceri', {}, 'ro', b.ro)} (${b.gallery.length} fotografii)`);

  const post = await one(db, 'SELECT status FROM posts WHERE id = ?', [b.post]);
  if (post && post.status !== 'archived') await saveEntity(db, 'articole', b.post, {status: 'archived'}, opts);
  for (const t of trs) {
    const from = publicPath('articole', {}, t.lang, t);
    const to = `ref:afaceri:${b.id}`;
    const r = await one(db, 'SELECT id, to_ref, code FROM redirects WHERE from_path = ?', [from]);
    if (!r) await createEntity(db, 'redirectari', {base: {from_path: from, to_ref: to, code: '301'}}, opts);
    else if (r.to_ref !== to || r.code !== '301') await saveEntity(db, 'redirectari', r.id, {base: {to_ref: to, to_path: null, code: '301'}}, opts);
    console.log(`    ${from} → 301 ${to}`);
  }
}

for (const [key, [ro, en]] of Object.entries(LABELS)) {
  const l = await one(db, 'SELECT id FROM labels WHERE key = ?', [key]);
  if (l) await saveEntity(db, 'etichete', l.id, {tr: {ro: {text: ro}, en: {text: en}}}, opts);
  else await createEntity(db, 'etichete', {base: {key}, tr: {ro: {text: ro}, en: {text: en}}}, opts);
}
console.log(`  ✓ ${Object.keys(LABELS).length} etichete afacere-*`);
db.close();
