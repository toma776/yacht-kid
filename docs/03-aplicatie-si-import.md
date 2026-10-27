# Yacht Kid — aplicația Next.js, baza și importul

**Pașii 4 și 5 din checklist (§6) · 27 octombrie 2026 · pornește din [02-registru.md](02-registru.md)**

## Baza: Turso / libSQL

**Decis pe 27.10.2026.** Brain-ul rămâne pe SQLite, ca nucleul standardului: aceeași schemă (Anexa B), aceleași teste și același client în ambele medii.

| Mediu | Unde stă baza | Configurare |
|---|---|---|
| Local | `data/brain.db` (fișier, în afara git) | niciuna |
| Vercel | Turso | `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN` |

`src/core/db.mjs` alege singur. Pe Vercel, fără `TURSO_DATABASE_URL`, refuză să pornească, în loc să scrie într-un fișier care dispare la următoarea cerere.

Alternativa respinsă: Supabase (deja instalat în echipa DWF). Ar fi cerut un generator de schemă pentru Postgres și ne-ar fi depărtat de nucleul SQLite al standardului.

### Ce ai de făcut pe Vercel (proiectul `yacht-kid`, echipa DWF)

1. **Instalează integrarea Turso** din Vercel Marketplace pe proiectul `yacht-kid` și creează o bază. Integrarea pune singură `TURSO_DATABASE_URL` și `TURSO_AUTH_TOKEN`. Instalarea înseamnă acceptarea termenilor Turso, deci o faci tu.
2. **Adaugă `CRON_SECRET`** în variabilele proiectului: o valoare lungă, aleatoare.
3. **Primul import se face pe Vercel.** Pe o bază goală, ruta de cron importă singură snapshot-ul din repo. E de ajuns un clic pe **Run** la Settings → Cron Jobs, sau așteptarea rulării de la 03:00. După primul import, ruta nu mai importă nimic. Alternativa locală e `npm run import:turso`, cu `TURSO_DATABASE_URL` și `TURSO_AUTH_TOKEN` în `.env.local`.
4. **Fișierele media** nu sunt încă pe Vercel. Propunerea: Vercel Blob, la pasul site-ului. Până atunci, `/media/<id>/` dă 404 pe Vercel.

**De verificat la prima rulare pe Turso:** local, cheile străine sunt verificate (`PRAGMA foreign_keys = ON`, testat și în tranzacție). Pe Turso, prin HTTP, nu am putut verifica încă. Testul se rulează pe baza din Turso imediat după ce există.

## Aplicația Next.js

Next.js 16.4.1, App Router, fără TypeScript, aceleași module `.mjs` ca registrul și importul.

| Rută | Ce face |
|---|---|
| `src/app/(ro)/[[...path]]` | site-ul în română, fără prefix; `<html lang="ro">` |
| `src/app/(en)/en/[[...path]]` | site-ul în engleză, sub `/en/`; `<html lang="en">` |
| `src/app/(manage)/manage` | Panoul și listele pe tipuri; `no-store`; deschis **doar pe localhost** până există autentificarea |
| `src/app/media/[id]` | fișierele media după ID; local din snapshot |
| `src/app/api/manage/cron/tick/` | ruta pentru Vercel Cron, protejată cu `CRON_SECRET`; sarcinile spun deocamdată „neimplementat” |

Cum se randează o pagină:
- **Adresa → entitatea** se calculează din registru (`public.path`), deci nu există nicio listă de rute întreținută de mână.
- **Contextul urmărit** (`src/site/context.mjs`) e singurul drum spre bază. Pe site ajunge doar ce e publicat și are traducere în limba paginii, iar dintre legături doar cele confirmate.
- **O listă fără `scope` sau `fields` aruncă o eroare** (§3.2).
- **Fiecare citire devine o dependență**, cu componenta și motivul ei. Dependențele se adună, dar **nu se scriu încă** în `page_deps`: asta vine cu propagarea (§3.5).
- **Textul bogat** conține doar trimiteri (`data-ref`, `data-media`) și jetoane (`{telefon}`, `{adresa}`, `{nr_premii}`). Ele se rezolvă la afișare, în limba paginii.
- **hreflang și comutatorul de limbă** vin din entitate: aceeași entitate, câte o adresă pe limbă.
- `trailingSlash: true` păstrează adresele vechi, iar o adresă fără bară e redirecționată.

**Pe calculatorul tău:** politica Windows (Application Control) blochează binarul nativ SWC al Next.js, deci Turbopack nu pornește. Local se folosește webpack: `npx next dev --webpack`, configurat și în `.claude/launch.json`. Pe Vercel (Linux) build-ul e cel obișnuit.

```bash
npm install
npm run import
npx next dev --webpack
```

## Importul (`npm run import`)

`src/import/run.mjs` citește doar `reference/` (snapshot-ul și rapoartele analizei), fără rețea, și scrie totul într-o singură tranzacție. Pe datele reale durează sub o secundă.

**Regulile §1.3, toate acoperite de teste:**

| Regulă | Cum |
|---|---|
| ID-uri deterministe | cheie naturală → ID în `import_keys` (`wp:page:42`, `media:<sha1>`, `afacere:fabriq`); două baze goale primesc aceleași ID-uri |
| Reimportul actualizează | aceleași chei, același număr de rânduri, nicio legătură dublată |
| O tranzacție | totul sau nimic; o eroare anulează tot |
| Proveniență pe fiecare câmp | 2.700+ rânduri; fiecare înregistrare are cel puțin o sursă |
| Verificare dus-întors | 48 de texte bogate (articole, pagini legale), 0 diferențe |
| Refuză peste editări | o modificare făcută de un om în `audit_log` oprește importul; `--overwrite-edits` îl lasă să ruleze |
| Relațiile deduse | intră ca `inferred`, cu dovadă și încredere; o decizie umană rămâne, iar o legătură respinsă nu revine |

**Bilingv:** perechile RO ↔ EN devin aceeași entitate. Perechile fără hreflang (confidențialitate, cookies) au fost unite după structura comună. Cifrele se scriu o singură dată, iar textele au câte o traducere pe limbă, cu ID-ul WordPress al fiecărei limbi.

**Ce conține baza după import:**

| Tip | Câte | Note |
|---|---|---|
| Media | 343 | 354 de fișiere folosite; 11 erau copii identice (aceeași amprentă) și au fost unite (§3.9) |
| Articole | 26 | 16 cu EN, 10 doar RO (A3); 12 legături deduse spre locuințe, 6 spre afaceri, 6 spre premii |
| Pagini | 13 | 3 legale cu text; restul cu titlu și SEO, fără secțiuni |
| Tipuri de locuințe | 5 | fișa tehnică comparată RO/EN; 150 de imagini de galerie (confirmate: sunt pe pagină) |
| Testimoniale | 54 | 12 afișate, 39 ciorne fără text, 3 citate anonime cu traducerea EN |
| Afaceri | 8 | din cardurile RO/EN; 2 membri Community Card |
| Premii | 6 | `{nr_premii}` dă 5, ca textul de pe site (T2) |
| Avantaje / Tehnologii | 18 / 6 | titlurile RO și EN aliniate pe poziție |
| Cifre-cheie | 4 | valoarea e căutată în text; o cifră negăsită nu se importă |
| Restul | | Date firmă, 5 parteneri, 2 categorii, 3 niveluri de card, 2 formulare, 2 meniuri, 53 de redirecționări, 5 etichete |

Tot ce a fost hotărât de mână stă în `src/import/curated.mjs` și intră cu certitudinea `inferred`, ca să fie confirmat în /manage.

### Ce a găsit importul (de lămurit)

Raportul complet e în `reference/analysis/import-report.json`, iar avertismentele apar și în /manage.

1. **Prețul duplexului:** RO 1.495.000 €, EN 1.450.000 €. S-a importat varianta RO (A1), „unverified”, cu ambele surse.
2. **39 de testimoniale nu au text nicăieri public:** API-ul e gol, iar pagina proprie nu are citatul. Sunt ciorne, iar textul trebuie cerut clientului.
3. **Formularul de vizionare are două câmpuri cu același nume** (`buget_estimativ`). Pe site-ul vechi, modalitatea de achiziție suprascrie bugetul la trimitere. În Brain, al doilea câmp se numește `modalitate_achizitie`.
4. **Meniul EN din subsol trimite la pagina RO** `/apartamente-3-camere/`. Ca trimitere spre entitate, se afișează automat adresa EN.
5. **Politica de cookies:** adresa de email e ascunsă de Complianz cu un `ex.com` invizibil. Curățarea îl scoate, altfel ar fi rămas `contact@ex.comyachtkid.ro`.
6. **Imagini fără text alternativ:** 60 de imagini folosite n-au `alt` în RO și niciuna n-are în EN.
7. **O imagine dintr-un articol vine de pe `dev.sota360.ro`** (serverul de dezvoltare al agenției vechi) și nu e în bibliotecă.
8. **Beneficiile pe niveluri Gold / Platinum / Diamond** nu apar pe site.
9. **Date lipsă în EN:** adresa (cu greșeala „Stree”) nu s-a importat, iar programul nu există în EN.

## Ce urmează

1. **Secțiunile paginilor.** Felurile din registru (`hero`, `avantaje`, `fisa-tehnica`…) se mapează la secțiunile Bricks. Cele 11 blocuri de contact identice devin componenta comună `#layout:contact`. Paginile compuse au deocamdată doar titlu.
2. **Nucleul:** store, propagarea (`change_events` → `affected()` → `page_deps`, `scan`), autentificarea pentru /manage. Avem nevoie de acces la `stefanmorariu/oxxygene-brain` sau la nucleul pentru Next.js.
3. **Diferențe față de standard, de închis:**
   - `permanentRedirect` din Next.js trimite 308, nu 301 (pentru Google sunt echivalente);
   - Vercel Cron rulează deocamdată o dată pe zi (`vercel.json`), sigur pe orice plan; pe planul Pro poate rula la fiecare minut, cum cere §3.7.
