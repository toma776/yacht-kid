# Yacht Kid — registrul entităților

**Pasul 3 din checklist (§6) · 27 octombrie 2026 · pornește din [01-entitati.md](01-entitati.md)**

Registrul e singurul loc în care se declară un tip (principiul 9). Din el se generează schema bazei, traducerile, relațiile și inversele lor, adresele pe limbă și jetoanele. Testele verifică registrul, schema și această documentație.

## Fișierele

| Fișier | Ce conține |
|---|---|
| `src/registry/entities.mjs` | cele 20 de tipuri, cu câmpurile, relațiile, regulile de validare și jetoanele |
| `src/registry/langs.mjs` | limbile (RO implicit, EN sub `/en/`), adresele pe limbă, formatarea cifrelor și a banilor |
| `src/registry/assumptions.mjs` | presupunerile pentru întrebările deschise (tabelul de mai jos) |
| `src/registry/derive.mjs` | ce se deduce: `RELATION_TYPES`, `inverseRelations`, `publicPaths`, `TOKENS`, `LINK_REF`, `checkRegistry()` |
| `src/core/schema.mjs` | schema SQLite generată din registru + tabelele sistemului (Anexa B); migrarea doar adaugă |
| `db/schema.sql` | schema scrisă pe disc (`npm run schema`), ca să se vadă în git; testul pică dacă nu e la zi |
| `test/registry.test.mjs` | testele (`npm test`) |

Registrul e `.mjs`, fără dependențe, ca să-l folosească la fel aplicația Next.js, importul și scripturile.

## Convențiile proprii, peste standard

- **`translatable: true`** pe un câmp = câmpul stă în `<tabel>_translations`, câte un rând pe limbă, cu cheia (`entity_id`, `lang`).
  - Slug-ul e unic pe limbă, nu global.
  - `source_fp` ține amprenta textului RO din momentul traducerii. Când textul RO se schimbă, traducerea apare „învechită” (§1.10).
  - **Nu se pot traduce** cifrele, banii, datele, opțiunile, imaginile, legăturile, telefonul și emailul. `checkRegistry()` refuză un astfel de câmp, ca să nu se mai repete diferența de preț de la duplex.
- **ID-ul din WordPress stă pe traducere** (`legacy_id`), pentru că diferă pe limbă: pagina RO 42 are perechea EN 473.
- **`public.path(rec, lang, tr)`** primește traducerea. Fără traducere într-o limbă, nu există pagină în acea limbă (presupunerile A3, A4).
- **`tokens`**: jetoanele pe care le oferă un tip, cu formatare după limbă.
  - Date firmă: `{telefon}`, `{email}`, `{adresa}`, `{program}`, `{cui}`, `{reg_com}`, `{sediu}`, `{firma}`.
  - Cifre-cheie: fiecare înregistrare e un jeton (`{parc}`, `{intretinere}`).
  - Premii: `{nr_premii}`, calculat (T2).
- **`assume`** pe un tip, un câmp sau un jeton îl leagă de o presupunere. Când clientul răspunde, presupunerea se scoate, iar testul arată ce a rămas nelegat.

## Tipurile

| Tip | Tabel | Ce se traduce | Opțiuni |
|---|---|---|---|
| `firma` | company | program, forma adresei | singleton, fără stare |
| `cifre` | facts | eticheta, textul după valoare | fără stare |
| `avantaje` | features | titlu, text | |
| `tehnologii` | technologies | titlu, rezumat, descriere | |
| `parteneri` | partners | descriere | mențiuni |
| `premii` | awards | distincția, categoria | mențiuni, dubluri (competiție + an) |
| `locuinte` | unit_types | nume, slug, introducere, descriere, SEO | **aprobare**, pagină proprie |
| `niveluri-card` | card_tiers | beneficii | fără stare |
| `afaceri` | businesses | domeniu, serviciu, descriere | mențiuni, aliasuri |
| `testimoniale` | testimonials | rolul, traducerea opțională a citatului | fără pagină proprie |
| `articole` | posts | titlu, slug, rezumat, text, SEO | pagină proprie, dubluri după titlu |
| `categorii` | categories | nume, slug, descriere, SEO | pagină proprie |
| `pagini` | pages | titlu, slug, text, SEO | pagină proprie, compusă din secțiuni |
| `sectiuni` | sections | supratitlu, titlu, text, butoane | `hub: false` |
| `meniuri` | menus | elementele (câte o listă pe limbă) | fără stare |
| `formulare` | forms | etichetele câmpurilor, introducerea, butonul | fără stare |
| `cereri` | leads | — | operațional |
| `media` | media | text alternativ, legendă | fără stare |
| `redirectari` | redirects | — | fără stare |
| `etichete` | labels | textul | fără stare |

**Relațiile:** 31 în total. 12 sunt multiple (`rel_<tabel>_<câmp>`, cu stare, încredere, sursă și atribute), iar 19 sunt chei străine (N:1, inclusiv imaginile). Lista completă e în `RELATION_TYPES`.

Pe scurt:
- `articole` → `afaceri`, `premii`, `locuinte`, `categorii`;
- `locuinte` → galeria (media) și nivelul de card;
- `niveluri-card` → `afaceri` (cu atributul „beneficiu”);
- `premii` → organizatorul, iar `tehnologii` → furnizorii (`parteneri`, filtrați după rol);
- `pagini` → `sectiuni` → orice tip afișat;
- `formulare` → pagina de mulțumire; `cereri` → formularul și tipul de locuință.

## Presupunerile

Construite pentru întrebările din [01-entitati.md, secțiunea 8](01-entitati.md#8-de-lămurit-cu-clientul). Fiecare are și efectul unui răspuns diferit (`ifOther` în `assumptions.mjs`); niciuna nu cere schimbarea schemei, cu excepția A2.

| ID | Întrebarea | Ce am presupus | Unde |
|---|---|---|---|
| A1 | 8.1 | Duplexul costă 1.495.000 € + TVA (varianta RO). Importul o marchează „unverified”, cu ambele surse. | `locuinte.price_from` |
| A2 | 8.2 | Nu avem unități individuale; intervalele și „prețul de la” se scriu pe tip. Răspuns diferit = tipul nou `unitati`. | `locuinte` |
| A3 | 8.3 | Articolele doar RO rămân doar RO; fără traducere, fără pagină EN. | `articole` |
| A4 | 8.4 | `/prezentare/` și `/programeaza-o-vizionare/` sunt pagini de campanie doar RO. | `pagini` |
| A5 | 8.5 | Testimonialele nu au pagină proprie (301 spre `/testimoniale/`); 12 afișate, 39 ascunse. | `testimoniale` |
| A6 | 8.6 | Articolele „Lacul Tei” se importă separat; regula de dublură le propune spre unire. | `articole.duplicates` |
| A7 | 8.7 | Toate afacerile sunt deschise; lista de pe homepage se generează din `afaceri`. | `afaceri.state` |
| A8 | 8.8 | TC Joyeria și Ghost Agency sunt deschise; fără logo și site, „unverified”. | `afaceri` |
| A9 | 8.9 | Cererile se păstrează în Brain, apoi se trimit spre HubSpot. | `cereri` |
| A10 | 8.10 | Se importă doar cele 354 de fișiere folosite. | `media` |
| T1 | tehnic | Baza e SQLite: node:sqlite local, libSQL/Turso pe Vercel. | `src/core/schema.mjs` |
| T2 | tehnic | `{nr_premii}` numără premiile fără lista scurtă: 5, ca textul actual. | `premii.tokens` |
| T3 | tehnic | Adresele vechi se păstrează exact, inclusiv `/community-card-concept/` ↔ `/en/community-card/`. | `pagini` |

## Ce verifică testele

`npm test`, pe node:sqlite, fără rețea:

- registrul e valid: chei, ținte, categorii, `linkFields`, opțiuni, câmpuri care nu se pot traduce, jetoane unice, presupuneri cunoscute;
- schema rulează de două ori fără erori, `db/schema.sql` e la zi, iar o coloană nouă din registru se adaugă singură;
- bilingv:
  - aceeași entitate are două traduceri;
  - slug-ul e unic pe limbă;
  - o limbă necunoscută e refuzată;
  - prețul există o singură dată;
  - adresele vechi ies exact la fel;
  - formatarea dă `1.495.000 €` / `€1,495,000`;
- validarea tipului de locuință: intervale inversate și „2 camere” tradus greșit ca „2-bedroom”;
- cheile străine: o categorie folosită nu se șterge; galeria se golește în cascadă;
- jetoanele `{adresa}` și `{nr_premii}`;
- documentația: fiecare presupunere e în acest fișier, iar fiecare tip din 01-entitati.md e în registru (principiul 21 din §4).

## Ce nu e încă aici

- **Nucleul** (store, context urmărit, sync, /manage). Standardul cere să pornim din nucleul comun, iar contul `toma776` nu are acces la `stefanmorariu/oxxygene-brain`. Tabelele sistemului din `schema.mjs` urmează Anexa B; cele marcate „ca în nucleu” (users, sessions, backups…) sunt scrise de noi și trebuie comparate cu nucleul când îl avem.
- **Aplicația Next.js.** Registrul nu depinde de ea; o adăugăm la pasul 5 (site-ul public), odată cu alegerea bazei pe Vercel (T1).
- **Importul** (pasul 4): din `reference/snapshot/`, cu perechile RO/EN unite pe aceeași entitate, ID-uri deterministe, proveniență pe fiecare câmp și presupunerile A1, A5, A8 și A10 aplicate.
