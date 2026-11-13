// Textele interfeței v5 care nu sunt (încă) în `etichete`: aceleași chei pe ambele limbi, ca RO și EN să meargă împreună.
// Tot ce e conținut (titluri, descrieri, meniuri, cifre) vine din Brain, pe limbă.
export const T = {
  ro: {
    skip: 'Sari la conținut',
    allApartments: 'Toate apartamentele',
    aboutProject: 'Despre proiect',
    watchFilm: 'Vezi filmul',
    filmLabel: 'Filmul YACHT KID',
    close: 'Închide',
    from: 'de la',
    priceFrom: 'Preț de la',
    baths: 'Băi',
    floor: 'Etaj',
    rooms: n => `${n} camere`,
    duplex: 'Duplex',
    viewType: name => `Vezi ${name.toLowerCase()}`,
    visit: 'Programează o vizionare',
    collectionEyebrow: 'Apartamente',
    collectionHeading: 'Colecția de Apartamente',
    city: null,
    placeholder: 'Următoarele secțiuni vin aici.'
  },
  en: {
    skip: 'Skip to content',
    allApartments: 'All apartments',
    aboutProject: 'About the project',
    watchFilm: 'Watch the film',
    filmLabel: 'The YACHT KID film',
    close: 'Close',
    from: 'from',
    priceFrom: 'Price from',
    baths: 'Bathrooms',
    floor: 'Floor',
    // Pe site-ul EN tipurile se numesc după dormitoare („1 Bedroom Apartment” = 2 camere)
    rooms: n => `${n - 1} bedroom${n - 1 === 1 ? '' : 's'}`,
    duplex: 'Duplex',
    viewType: name => `View ${name}`,
    visit: 'Schedule a viewing',
    collectionEyebrow: 'Apartments',
    collectionHeading: 'The Apartment Collection',
    city: 'Bucharest',
    placeholder: 'The next sections go here.'
  }
};

// Funcțiile nu trec din server în componentele client: acestea primesc textele gata calculate
export const plain = t => Object.fromEntries(Object.entries(t).filter(([, v]) => typeof v !== 'function'));
