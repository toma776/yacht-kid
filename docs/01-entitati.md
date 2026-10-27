# Yacht Kid — documentul de entități

**Etapa 1 din checklist (§6, pasul 2) · 27 octombrie 2026 · după standardul Brain /manage v1**

Documentul spune ce tipuri de informații are site-ul yachtkid.ro, de unde vin, cum se leagă și ce trebuie lămurit înainte de registru. Totul pornește din snapshot-ul din 27.10.2026 (`reference/snapshot/`) și din rapoartele din `reference/analysis/`. Fiecare cifră de mai jos se poate verifica acolo.

**Site-ul e bilingv (RO + EN) din prima zi.** Regula din §1.10 e deci obligatorie pentru noi:
- textele se traduc, în `<tabel>_translations`, cu slug unic pe limbă;
- cifrele, prețurile, imaginile și legăturile se scriu o singură dată, pe entitate, și se propagă în ambele limbi;
- perechea RO ↔ EN e aceeași entitate (același ID), nu două pagini legate prin adresă.

Jumătate din problemele găsite mai jos vin tocmai din faptul că site-ul vechi ține fiecare limbă ca o copie separată.

---

## 1. Ce e site-ul vechi

| | |
|---|---|
| Platformă | WordPress 7.1.3 + Bricks (machetă în post meta, nu în `content`), Polylang (RO implicit, EN sub `/en/`), Yoast, Complianz, HubSpot, GTM4WP, SiteGround Optimizer |
| Adrese descărcate | 157 (156 × 200, 1 × 301): 32 de pagini, 42 de articole, 51 de pagini de testimonial, 7 arhive de categorie, 2 de autor, 20 de șabloane Bricks publice |
| API | `pages` 34, `posts` 42, `testimonial` 51, `media` 576 (din 591 raportate), `categories` 4, `users` 3; meniurile cer autentificare (401), deci le-am luat din HTML |
| Media | 576 de fișiere, 683 MB, toate descărcate; 354 folosite, 222 nefolosite, 62 de imagini folosite fără `alt`, 17 grupuri de fișiere identice |
| Linkuri interne | 1.033 ok, 1 redirecționare (lipsește bara de la final), 0 rupte |
| Antet / subsol | câte o variantă pe limbă (2 + 2), deci se pot face componente comune |

**De reținut pentru import:** paginile Bricks au `content` gol în API, iar testimonialele la fel. Sursa reală e HTML-ul randat. Doar articolele și paginile legale au textul în API.

---

## 2. Bilingv: ce am găsit

Raport: `analysis/bilingual.json`, `analysis/translations.json`.

| Constatare | Detaliu | Cum o închide Brain-ul |
|---|---|---|
| **33 de perechi RO ↔ EN** legate prin hreflang, simetrice | toate paginile principale și 16 articole | aceeași entitate, două traduceri |
| **Prețul duplexului diferă între limbi** | RO „de la 1.495.000 € + TVA”, EN „from 1.450.000 € + VAT” | prețul e un câmp ne-traductibil, scris o dată |
| Adresa diferă între limbi | RO „Str. Anton Holban 6, București 077190”; EN „Anton Holban **Stree**, no. 6, Bucharest” (greșeală de tipar, fără cod poștal) | adresa vine din Date firmă; doar eticheta se traduce |
| Programul lipsește în EN | RO „Luni – Vineri: 09:00 – 17:00”; în EN nu apare deloc | câmp traductibil în Date firmă |
| Text netradus pe paginile EN | introducerea formularului de contact, „Citește articolul”, firul de navigare „Pagina principală” | etichetele interfeței stau într-un dicționar pe limbă; „De făcut” semnalează câmpurile fără traducere |
| **Pagini fără pereche** | 10 articole RO din octombrie 2026 fără EN; `/prezentare/` și `/programeaza-o-vizionare/` doar RO | traducerea lipsă apare în „De făcut”; pagina EN nu se publică fără text |
| **Perechi nelegate** | `/politica-de-confidentialitate/` ↔ `/en/privacy-policy/`, `/politica-cookies/` ↔ `/en/cookie-policy/` există, dar fără hreflang | la import le unim într-o singură entitate |
| Denumiri diferite pentru același tip | RO „2 / 3 / 4 camere” = EN „1 / 2 / 3 bedroom” | e corect (camere = dormitoare + living); EN se calculează din `rooms − 1`, nu se scrie de mână |
| Opțiunile formularului, scrise separat pe limbă | RO „Apartament 2 camere…”, EN „1 Bedroom Apartments…”; un câmp EN are numele tehnic `form-field-rwesjr` în loc de `design_interior` | opțiunile vin din entitatea „Tipuri de locuințe”, deci sunt mereu aceleași în ambele limbi |
| Testimoniale | aceleași 12 texte în română apar și pe `/en/testimonials/` | un testimonial păstrează limba originală; traducerea e opțională și marcată ca atare (nu modificăm citatele clienților) |

**Regula generală pentru Yacht Kid:** orice câmp care conține o cifră, un preț, o suprafață, o dată, un telefon, o adresă sau o imagine e ne-traductibil. Un câmp traductibil care conține o cifră e semnalat la salvare (`validate`), ca să nu mai apară diferențe ca la duplex.

---

## 3. Tipurile propuse

Categoriile din hartă: **Proiect**, **Imobiliar**, **Comunitate**, **Conținut**, **Site**.

Coloana „Trad.” arată ce câmpuri se traduc. Tot restul e scris o singură dată.

### 3.1 Proiect

| Tip (`key`) | Ce conține | Câte | Trad. | Sursa în site-ul vechi |
|---|---|---|---|---|
| **`firma`** — Date firmă (`singleton`, `noStatus`) | denumire legală KID PROJECT DESIGN S.R.L., CUI RO38632756, Nr. Reg. Com. J2017020922403, sediul social (Intrarea Chefalului nr. 12H…, 020333), adresa proiectului (Str. Anton Holban 6, București 077190), telefon, email, program, rețele sociale | 1 | program, eticheta adresei | `/termeni-si-conditii/`, `/contact/`, subsol |
| **`cifre`** — Cifre-cheie | valoare + unitate + etichetă: parc 10.000 m², întreținere 6 RON/m², rezistență seismică +50%, livrare în 24 h. Fiecare devine jeton: `{parc}`, `{intretinere}` | ~6 | eticheta | text scris de mână pe 5–24 de pagini |
| **`avantaje`** — Avantaje și facilități | titlu, text scurt, iconiță, grup („Avantaje”, „Confort și siguranță”): piscine private, pază 24/7, promenadă, izolare fonică… | ~14 | titlu, text | homepage, `/prezentare/` |
| **`tehnologii`** — Tehnologie | titlu, descriere, imagine; legat de furnizor: structură post-tensionată, panouri prefabricate (patent, INCERC), poliuree, robot de curățenie, ferestre Saint-Gobain, tâmplărie Reynaers, parchet triplu stratificat, fațadă HPL | ~10 | titlu, descriere | `/tehnologie/`, `/prezentare/` |
| **`parteneri`** — Furnizori și instituții (`mentions`) | Saint-Gobain, Reynaers, ISO CHEMIE, Barrisol, INCERC (rol: furnizor / certificare / organizator de premiu) | ~6 | rolul | menționați în 2–16 pagini |
| **`premii`** — Premii (`mentions`) | competiția, anul, distincția, categoria, linkul oficial, insigna | 6 | distincția, categoria | 6 articole |

**Premiile găsite:** Iconic Awards 2025 (câștigător), German Design Awards 2025 (Excellent Architecture), Built Design Awards 2024 (mențiune onorabilă), Architecture Masterprize 2024 (Honorable Mention), Saint-Gobain Trophy 2024 (premiul special al juriului), SHARE Architecture Awards 2024 (lista scurtă).

Textul „premiat la **5** competiții” corespunde, dacă lista scurtă SHARE nu se numără. În Brain, numărul devine jetonul `{nr_premii}` = numărul premiilor publicate cu distincția „câștigat”. Un premiu nou schimbă singur textul de pe toate paginile (standard §3.2, dependență `query`).

### 3.2 Imobiliar

| Tip | Ce conține | Câte | Trad. |
|---|---|---|---|
| **`locuinte`** — Tipuri de locuințe (`approval`) | `kind` (apartament / duplex / spațiu comercial), `rooms`, suprafață min–max, etaje min–max, băi min–max, terasă min–max, balcon, **preț de la** (EUR, fără TVA), galerie (media, ordonată), video | 5 | nume, slug, introducere, descriere, SEO |
| **`niveluri-card`** — Niveluri Community Card | Gold / Platinum / Diamond, legat de tipurile de locuință („adaptate tipului de locuință”) | 3 | nume, beneficii |

Fișele tehnice extrase (`analysis/apartments.json`) sunt identice în RO și EN, **cu excepția prețului duplexului**:

| Tip | Suprafață | Etaj | Băi | Terasă | Preț de la |
|---|---|---|---|---|---|
| 2 camere / 1-bedroom | 61,9 – 66,24 m² | 1 – 8 | 1 | 10,5 – 18,3 m² | 210.000 € + TVA |
| 3 camere / 2-bedroom | 87,6 – 115,1 m² | 1 – 8 | 2 | 24,8 – 55 m² | 390.000 € + TVA |
| 4 camere / 3-bedroom | 136 – 186,8 m² | 1 – 8 | 3 | 35 – 115 m² | 690.000 € + TVA |
| Duplex | 219 – 246 m² | 6 – 7 | 3 – 4 | 66 – 110 m² | **1.495.000 / 1.450.000** € + TVA |
| Spațiu comercial | 88,2 – 171,8 m² | parter | — | 57,5 – 66 m² | 350.000 € + TVA |

Un tip de locuință are deja propria pagină, deci `public.path` = `/apartamente-<n>-camere/` (RO) și `/en/<n-1>-bedroom-apartment/` (EN). `linkFields: ['name', 'slug', 'price_from']`, pentru că numele și prețul apar în carduri și în meniuri.

Prețul e informația cea mai sensibilă de pe site, așa că tipul are `approval: true`.

**Recomandat, de lămurit cu clientul:** o entitate `unitati` (fiecare apartament, cu etaj, suprafață, stare disponibil / rezervat / vândut). Atunci „de la 210.000 €” și intervalele de suprafață se **calculează** din unitățile disponibile, iar textul „Ultimele apartamente disponibile!” de pe homepage devine adevărat automat. Site-ul vechi nu are această informație.

### 3.3 Comunitate

| Tip | Ce conține | Câte | Trad. |
|---|---|---|---|
| **`afaceri`** — Afaceri din comunitate (`mentions`, `aliases`) | nume, domeniu, logo, site, stare (deschis / în curând), data deschiderii, membru Community Card | 8 | domeniul, descrierea scurtă |
| **`testimoniale`** — Testimoniale | autor (sau „Rezident YACHT KID”), text, limba originală, sursa, data, afișat pe pagina Testimoniale (da/nu), ordine | 51 + 3 citate | traducere opțională, marcată |

**Afacerile găsite:** MOB – Ministry of Beauty, AMCOR – Complete Dentistry, FABRIQ (Specialty Coffee & Gin Bar), Froo, Florit Hot Pilates, Cabinetul Aura Pavel, TC Joyeria, Ghost Agency. Ultimele două nu au articol.

Pe homepage, lista „cafenea, magazin alimentar, salon, clinică stomatologică **în curs de deschidere**, studio de hot pilates” e scrisă de mână și a rămas în urmă: AMCOR e anunțat ca deschis din februarie 2025. În Brain, lista se generează din `afaceri` (dependență `query`), cu domeniul fiecărei afaceri.

**Testimoniale:**
- Din 51 de testimoniale, doar 12 apar pe `/testimoniale/`, în ambele limbi și cu același text românesc.
- Celelalte 39 au doar o pagină proprie, `/testimonial/<nume>/`: subțire, fără pereche EN, fără valoare SEO.
- Propunere: fără pagină proprie (301 spre `/testimoniale/`) și câmpul „afișat” pentru alegere.
- Cele 3 citate „Rezident YACHT KID” sunt **copii**, repetate pe `/comunitate/`, `/en/community/`, `/prezentare/` și `/programeaza-o-vizionare/`. Devin 3 testimoniale anonime, trimise din secțiuni (principiul 2).

### 3.4 Conținut

| Tip | Ce conține | Câte | Trad. |
|---|---|---|---|
| **`articole`** — Blog (`mentions` în texte) | data, autor, categorie, imagine principală, text bogat | 42 de pagini = 26 de articole (16 în ambele limbi, 10 doar RO) | titlu, slug, rezumat, text, SEO |
| **`categorii`** | Noutăți / News, Premii / Awards | 2 (4 termeni WP) | nume, slug |
| **`pagini`** — Pagini compuse | adresă, șablon, secțiuni ordonate | 16 perechi + 2 doar RO | titlu, slug, SEO |
| **`sectiuni`** (`hub: false`) | `kind` + câmpuri care trimit la entități | ~90 | textele proprii |

**Felurile de secțiuni** (`kind`), extrase din structura Bricks: `hero` (titlu, text, imagine/video), `text`, `fisa-tehnica` (din `locuinte`), `alte-locuinte`, `avantaje`, `tehnologii`, `afaceri`, `premii`, `testimoniale`, `cifre`, `galerie`, `video`, `articole-recente`, `formular`, `cta`.

**Componentele comune** (`#layout:`): antet (meniul), subsol, secțiunea „Hai să facem primul pas” (identică pe 11 pagini, cu formular), bara mobilă de contact, fereastra „Programează o vizionare”.

**Relațiile articolelor:**

| Articolul → | Relația | Cum se deduce la import |
|---|---|---|
| `afaceri` | „anunță deschiderea” | numele afacerii în titlu → `inferred`, cu fragmentul |
| `premii` | „anunță premiul” | categoria Premii + numele competiției → `inferred` |
| `locuinte` | „vorbește despre” | „spațiu comercial”, „duplex” în text → `inferred`, sub prag |
| `articole` | linkurile din text | `data-ref` (rezolvat, confirmat) |

**Dublură probabilă:** „Cum alegi ansamblul rezidențial potrivit lângă Lacul Tei: **5** criterii” (14.10) și „… **7** criterii” (15.10) se canibalizează. Regula `duplicates` pe articole (titlu fără cifre + aceleași cuvinte) le prinde; decizia de unire e a clientului.

### 3.5 Site

| Tip | Note |
|---|---|
| **`meniuri`** | antet (11 elemente + „Solicită ofertă”), subsol; un meniu pe limbă, elemente `ref:<tip>:<id>` |
| **`formulare`** | contact (nume, email, telefon, tip locuință, design interior, mesaj, acord) și vizionare (+ perioada, modalitatea de plată). Opțiunile „tip locuință” vin din `locuinte`. Câmpurile au aceleași nume tehnice în ambele limbi. |
| **`cereri`** (`operational`) | solicitările trimise; azi pleacă spre HubSpot și email (FluentSMTP). **De lămurit:** ținem copia în Brain? |
| **`media`** | 576 de fișiere; `alt` e **traductibil** (o imagine, două texte alternative) |
| **`redirectari`** | 301 din adresele vechi: `/testimonial/*`, `/?p=<id>`, `/wp-content/uploads/*`, `/category/*/page/*`, `/author/*` |
| Pagini legale | Termeni, Confidențialitate, Cookies: `pagini` cu șablonul `legal` și text bogat (nu un tip separat). Datele firmei din ele devin jetoane (`{cui}`, `{sediu}`), ca să nu mai poată diferi de Date firmă. |

---

## 4. Harta relațiilor

```
                                    ┌──────────────┐
                 ┌── are nivelul ──▶│ niveluri-card│◀── e partener în ──┐
                 │                  └──────────────┘                    │
          ┌──────┴─────┐                                         ┌──────┴─────┐
          │  locuinte  │◀── vorbește despre ──┐       ┌─ anunță ─▶│  afaceri   │
          └──────┬─────┘                      │       │           └────────────┘
       galerie   │                      ┌─────┴───────┴┐
                 ▼                      │   articole   │── anunță ──▶┌──────────┐
          ┌────────────┐                └──────┬───────┘             │  premii  │
          │   media    │◀── imagine ───────────┘ │ categorie         └────┬─────┘
          └────────────┘                         ▼                organizat│de
                 ▲                        ┌────────────┐                  ▼
                 │                        │ categorii  │           ┌────────────┐
          ┌──────┴─────┐── furnizat de ──────────────────────────▶│ parteneri  │
          │ tehnologii │                                           └────────────┘
          └────────────┘
  pagini ─▶ sectiuni ─▶ (locuinte · avantaje · tehnologii · afaceri · premii · testimoniale · cifre · articole · formulare)
  firma, cifre ──▶ jetoane în orice text ({telefon}, {email}, {adresa}, {program}, {parc}, {intretinere}, {nr_premii})
```

| Relație | Fel | Deținută de | `rel` / `inverseLabel` | Opțiuni |
|---|---|---|---|---|
| locuinte → media | `refs` | locuinte.galerie | „are imaginea” / „Locuințe” | `ordered` |
| locuinte → niveluri-card | `ref` | locuinte.nivel_card | „primește nivelul” / „Locuințe” | — |
| niveluri-card → afaceri | `refs` | niveluri-card.parteneri | „include partenerul” / „Niveluri card” | `attrs: [beneficiu]` |
| articole → afaceri | `refs` | articole.afaceri | „anunță” / „Articole” | dedus la import |
| articole → premii | `refs` | articole.premii | „anunță premiul” / „Articole” | dedus la import |
| articole → locuinte | `refs` | articole.locuinte | „vorbește despre” / „Articole” | dedus, sub prag |
| articole → categorii | `ref` | articole.categorie | „e în” / „Articole” | `required` |
| premii → parteneri | `ref` | premii.organizator | „organizat de” / „Premii” | `only: rol = organizator` |
| tehnologii → parteneri | `refs` | tehnologii.furnizori | „furnizat de” / „Tehnologii” | `only: rol ∈ furnizor, certificare` |
| sectiuni → (orice) | `refs` | sectiuni.<câmp> | după `kind` | `kinds` |

Nicio relație nu e `sensitive` din natura datelor (nu avem medici sau prețuri pe relații). Sensibil e **prețul**, de aceea aprobarea stă pe tipul `locuinte`.

---

## 5. Valorile scrise de mână → jetoane

Raport: `analysis/values.json`.

| Valoare | Apare în | Variante | Devine |
|---|---|---|---|
| Telefon 0739 085 331 | 23 de pagini | „+40 739 085 331” ×20, „+40 739-085-331” ×6, `tel:+40739085331` ×3 | `{telefon}` |
| contact@yachtkid.ro | 21 de pagini | — | `{email}` |
| Str. Anton Holban 6, București 077190 | 8 pagini + 4 forme diferite (inclusiv EN „Stree”) | 5 formulări | `{adresa}` |
| 10.000 mp / 10,000 sqm | 29 de pagini | două scrieri pe limbă | `{parc}`, formatat după limbă |
| 6 RON/m² | homepage, 4 secțiuni „Doar 6 RON/m²…” | — | `{intretinere}` |
| „cinci / 5 competiții” | 3 pagini | — | `{nr_premii}`, calculat |
| Prețurile „de la … € + TVA” | 10 pagini | RO/EN diferit la duplex | câmpul `price_from` al tipului, prin secțiunea `fisa-tehnica` |

Formatarea cifrelor ține de limbă: RO `10.000 m²`, `1.495.000 €`; EN `10,000 sqm`, `€1,495,000`. Valoarea e una; afișarea se face în context, după limba paginii.

---

## 6. Copii care devin trimiteri

Raport: `analysis/repeated.json` (56 de paragrafe repetate, 29 de secțiuni Bricks comune).

| Ce se repetă | Unde | În Brain |
|---|---|---|
| Blocul de contact „Hai să facem primul pas…” + formular | 11 pagini (RO + EN) | componentă comună `#layout:contact` |
| Lista „Citește mai multe despre YachtKID” | 42 de articole | secțiunea `articole-recente`, calculată (`query` cu scope pe categorie) |
| „Doar 6 RON/m² — un cost de întreținere…” | 4 pagini | secțiunea `cifre` cu jetonul `{intretinere}` |
| „Descoperă și alte tipuri de apartamente…” | 4 pagini de tip | secțiunea `alte-locuinte` (toate tipurile, fără cel curent) |
| Citatele „Rezident YACHT KID” | 4 pagini | testimoniale anonime, trimise |
| Cardurile afacerilor (logo, domeniu, link) | `/spatii-comerciale/`, `/community-card-concept/` + EN | secțiunea `afaceri`, filtrată (toate / membri card) |
| Opțiunile „tip apartament” din formular | formularele de pe 14 pagini | din `locuinte` |

---

## 7. Paginile noului site

| RO | EN | Proprietar / sursă | Note |
|---|---|---|---|
| `/` | `/en/` | pagini | secțiuni: hero, avantaje, alte-locuinte, cifre, tehnologii, contact |
| `/apartamente-2-camere/` … `/duplex/` | `/en/1-bedroom-apartment/` … `/en/duplex-apartments/` | `locuinte` (pagină proprie) | 4 + 4 |
| `/spatii-comerciale/` | `/en/commercial-spaces/` | `locuinte` (kind comercial) + secțiunea afaceri | |
| `/tehnologie/` | `/en/technology/` | pagini | secțiunea tehnologii |
| `/comunitate/` | `/en/community/` | pagini | |
| `/community-card-concept/` | `/en/community-card/` | pagini + `niveluri-card` | slug RO de corectat (de lămurit) |
| `/blog/`, `/category/noutati/`, `/category/premii/` | `/en/blog-news/`, `/en/category/news/`, `/en/category/awards/` | `categorii` | |
| `/<slug-articol>/` | `/en/<slug>/` | `articole` | adrese păstrate la rădăcină, ca acum |
| `/testimoniale/` | `/en/testimonials/` | pagini + testimoniale | |
| `/contact/`, `/multumim/` | `/en/contact-us/`, `/en/thank-you-multumim/` | pagini | |
| `/prezentare/`, `/programeaza-o-vizionare/` | — (doar RO) | pagini | pagini de campanie? De lămurit dacă rămân doar RO |
| `/termeni-si-conditii/`, `/politica-de-confidentialitate/`, `/politica-cookies/` | echivalentele EN | pagini legale | perechile de confidențialitate și cookies trebuie legate |

Adresele vechi se păstrează exact, inclusiv bara de la final (§3.8). Adresele care dispar primesc 301 (secțiunea 3.5, `redirectari`).

---

## 8. De lămurit cu clientul

1. **Prețul duplexului:** 1.495.000 € (RO) sau 1.450.000 € (EN)?
2. **Unități individuale:** există o listă de apartamente cu stare (disponibil / rezervat / vândut)? Dacă da, prețurile „de la” și intervalele se calculează.
3. **Articolele doar RO** (10, din octombrie 2026): le traducem în EN sau rămân doar în română?
4. **`/prezentare/` și `/programeaza-o-vizionare/`:** sunt pagini de campanie? Au nevoie de EN?
5. **Cele 39 de testimoniale neafișate:** le afișăm, le ascundem sau le ștergem? Paginile `/testimonial/<nume>/` pot primi 301?
6. **Articolele „Lacul Tei”** (5 criterii vs 7 criterii): le unim?
7. **Textul de pe homepage** spune că clinica stomatologică e „în curs de deschidere”, deși AMCOR e anunțat din februarie 2025. Confirmăm că afacerile sunt toate deschise?
8. **TC Joyeria și Ghost Agency:** sunt deschise? Au site / logo?
9. **Cererile din formulare:** le păstrăm și în Brain, pe lângă HubSpot?
10. **Media:** cele 222 de fișiere nefolosite (din 683 MB) se importă sau rămân doar în snapshot?

---

## 9. Ce urmează

1. Răspunsurile de la secțiunea 8.
2. **Nucleul.** Standardul cere pornirea din nucleul comun; contul GitHub `toma776` nu are acces la `stefanmorariu/oxxygene-brain` și nici la celelalte repouri din Anexa A. În plus, oxxygene e pe ramura Node, iar noi am ales Next.js. Avem nevoie de acces sau de nucleul pentru Next.js.
3. Registrul (`src/registry/entities.mjs`) din secțiunile 3 și 4, cu `translatable: true` pe câmpuri și cu tabelele `_translations` generate.
4. Importul (§1.3, pasul 3), din snapshot, cu ID-uri deterministe (`page_<wpId>`, `media_<sha1>`), cu perechile RO/EN unite pe aceeași entitate și cu proveniență pe fiecare câmp.

### Cum se reface analiza

```bash
node scripts/crawl.mjs            # snapshot: API, sitemap-uri, HTML (reluabil)
node scripts/crawl.mjs --media    # + fișierele media (683 MB)
node scripts/analyze.mjs          # rapoartele din reference/analysis/
```

Rapoartele: `summary`, `pages`, `translations`, `bilingual`, `layout`, `links`, `media`, `values`, `apartments`, `mentions`, `testimonials`, `posts`, `repeated`, `forms`.
