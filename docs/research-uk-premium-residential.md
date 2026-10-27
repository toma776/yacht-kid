# Cercetare: site-uri de dezvoltări rezidențiale premium din Marea Britanie

Data verificării: 27 octombrie 2026. Am verificat 17 site-uri oficiale (Londra și Manchester) și am notat doar ce se vede pe ele. Unele unelte încărcate prin JavaScript (configuratoare, tabele de disponibilitate, tururi Matterport) pot exista fără să fi fost observate. Aprecierile de design sunt judecăți proprii, făcute din capturi de ecran și din analiza codului; pentru The Whiteley, Holland Park Gate și Holland Park Villas sunt deduse doar din cod (fonturi, biblioteci, structură), fără capturi.

**Reper pentru Yacht Kid:** site static, în RO și EN. Are hero cu card de broșură (PDF / WhatsApp / email), video de prezentare, pagini pe tipuri de apartament cu galerii și preț „de la”, testimoniale, CTA „programează o vizionare”, mediatecă și hartă interactivă cu repere. Clientul a cerut **fără animații la scroll, parallax sau mișcare la hover**. Unde o idee depinde de mișcare, am marcat-o cu ⚠.

## Site-urile analizate

| # | Proiect | Dezvoltator | Link |
|---|---|---|---|
| 1 | The Capston (fost Embassy Gardens) | Ballymore / Penta | https://thecapston.com/ |
| 2 | Chelsea Barracks | Qatari Diar | https://chelseabarracks.com/ |
| 3 | The OWO Residences by Raffles | Hinduja / Raffles | https://theowo.london/ |
| 4 | The Whiteley (Six Senses Residences) | Finchatton / Northacre | https://www.thewhiteleylondon.com/ |
| 5 | Holland Park Gate | Lodha UK | https://hollandparkgate.com/ |
| 6 | Lodha UK (No.1 Grosvenor Sq., Lincoln Sq.) | Lodha UK | https://www.lodhagroup.co.uk/lodha-uk-residences/ |
| 7 | Holland Park Villas | Native Land / Grosvenor | https://www.hollandparkvillas.com/ |
| 8 | Opus, Bankside Yards | Native Land | https://opus-london.com/ |
| 9 | Native Land (corporate) | Native Land | https://www.native-land.com/ |
| 10 | Park Modern (servicii Bulgari) | Fenton Whelan | https://www.parkmodern.com/ |
| 11 | Battersea Power Station – Apartments | BPS Development Co. | https://batterseapowerstation.co.uk/apartments/ |
| 12 | Riverscape, Royal Wharf | Ballymore / Oxley | https://riverscape.co.uk/ |
| 13 | White City Living | Berkeley Group | https://www.berkeleygroup.co.uk/developments/london/white-city/white-city-living |
| 14 | Parkside Collection, Chelsea Bridge Wharf | Berkeley Group | https://www.berkeleygroup.co.uk/developments/london/battersea/parkside-collection-at-chelsea-bridge-wharf |
| 15 | Chelsea Finery | Mount Anvil | https://www.mountanvil.com/find-your-home/chelsea-finery/ |
| 16 | Television Centre | Stanhope / Mitsui | https://www.televisioncentre.com/ |
| 17 | Deansgate Square / New Jackson (Manchester) | Renaker | https://renaker.com/apartments/ |

### Site-uri înlocuite

- **One Hyde Park:** nu mai are site oficial de vânzări.
- **King's Cross:** secțiunea rezidențială returnează 404.
- **Embassy Gardens:** redirecționează către The Capston.
- **No.1 Grosvenor Square:** redirecționează către pagina de grup Lodha.
- **London City Island:** redirecționează către o pagină sumară de grup.
- **Fortis:** e un dezvoltator de volum din Manchester, nu premium; l-am înlocuit cu Park Modern și Holland Park Villas.
- **Mandarin Oriental Mayfair, Peninsula Residences, One Nine Elms:** apar doar pe site-uri de agenții.

### Ce reiese din ansamblu

- Proiectele foarte scumpe din Londra **ascund prețurile și planurile** și trimit totul spre „Enquire / Register”. Excepții: Chelsea Barracks, Park Modern și Battersea.
- Uneltele practice (căutare, calculator, favorite, programare) apar la dezvoltatorii „mass-premium”: Berkeley, Mount Anvil, Renaker.
- **WhatsApp devine canalul de concierge:** vizionări la OWO, buton flotant la Opus, distribuire la Berkeley.
- **Pe niciun site verificat nu am văzut:** selector 3D sau stacking plan, tur 360°, simulare de însorire sau de vedere, rezervare online, chat live. Faptul că lipsesc este o ocazie de diferențiere.

---

## 1. Funcționalități premium pe care le-am putea implementa

Ordinea este după raportul valoare / efort pentru un proiect cu **o singură clădire**, vândut în RO și EN, cu tipuri de apartament și preț „de la”.

Efort: **S** = scăzut (o secțiune nouă sau un câmp în model, sub ~2 zile), **M** = mediu (componentă nouă, date noi la nivel de unitate), **R** = ridicat (sistem nou, integrare sau producție foto/3D externă).

### Prioritate 1: valoare mare, efort scăzut

**1. „Programează vizionarea” direct pe WhatsApp, cu mesaj precompletat**
- **Ce este:** butonul de vizionare deschide WhatsApp cu un text gata scris, de exemplu „Aș dori o vizionare pentru apartamentul de 3 camere”. Pe fiecare pagină de tip de apartament, mesajul include tipul respectiv.
- **Unde apare:**
  - [The OWO](https://theowo.london/live/): „Request a viewing” deschide WhatsApp.
  - [Opus](https://opus-london.com/): buton WhatsApp flotant.
  - [Renaker](https://renaker.com/apartments/): link WhatsApp.
- **Valoare:** foarte mare. Elimină formularul, iar pentru cumpărătorii din București WhatsApp e canalul firesc. Avem deja WhatsApp în cardul de broșură, deci doar îl extindem la CTA-ul de vizionare și la paginile de tip (parametrul `?text=`).
- **Efort:** S.

**2. Formular de vizionare cu tip de vizită, dată și interval orar**
- **Ce este:** vizitatorul alege vizită la fața locului, în showroom sau video, plus data și intervalul orar dorit (dimineață, după-amiază, seară). Nu e nevoie de un calendar sincronizat.
- **Unde apare:**
  - [Parkside Collection – Berkeley](https://www.berkeleygroup.co.uk/developments/london/battersea/parkside-collection-at-chelsea-bridge-wharf): „Site Tour” sau „Virtual”, cu dată și oră preferată.
  - [Battersea](https://batterseapowerstation.co.uk/apartments/): formular „Arrange a viewing” în tab lateral fix.
- **Valoare:** mare. Lead-urile vin calificate, iar vizionarea video ajunge la cumpărătorii din diaspora.
- **Efort:** S. Doar câmpuri noi în `formular`.

**3. Planuri descărcabile și fișă de tip „particulars” pentru fiecare tip de apartament**
- **Ce este:** un PDF pe tip cu planul cotat, suprafețele pe încăperi, orientarea și finisajele, descărcabil fără formular.
- **Unde apare:**
  - [Battersea](https://batterseapowerstation.co.uk/apartments/new-apartments/): plan și „particulars”, fără gating.
  - [Park Modern](https://www.parkmodern.com/): plan PDF pe unitate.
  - [The Capston](https://thecapston.com/residences/): plan pe tip, cu dimensiunile încăperilor.
  - [Holland Park Gate](https://hollandparkgate.com/residence-finder): broșură pe unitate.
- **Valoare:** mare. Planul e primul lucru pe care îl caută cumpărătorul, iar paginile de tip au deja galerii.
- **Efort:** S. Un câmp de fișier în modelul tipului de apartament și un buton.

**4. Pagină „Facilități și servicii”**
- **Ce este:** o pagină dedicată pentru piscină, grădină, recepție/concierge, parcare, spații comune și servicii pentru rezidenți, cu fotografie și o frază pentru fiecare.
- **Unde apare:**
  - [The OWO – Live](https://theowo.london/live/): amenities și servicii hoteliere.
  - [Holland Park Gate](https://hollandparkgate.com/): pagini separate pentru Health Club și Services.
  - [Riverscape](https://riverscape.co.uk/): Amenities și Resident Services.
  - [Chelsea Barracks](https://chelseabarracks.com/): Garrison Club, cu tab-uri.
- **Valoare:** mare. Piscina și grădina sunt diferențiatori Yacht Kid, iar acum apar probabil doar ca puncte în „avantaje”.
- **Efort:** S. Se poate construi din secțiunile existente (`text`, `galerie`, `avantaje`) și mediatecă.

**5. Ghid de cartier pe categorii, legat de harta existentă**
- **Ce este:** pagini sau tab-uri pe categorii (restaurante, școli, sport și lac, cumpărături, sănătate, transport), fiecare cu o descriere editorială scurtă. Fiecare reper se poate deschide pe hartă.
- **Unde apare:**
  - [The OWO – Local area](https://theowo.london/live/local-area/): Shopping, Culture, Dining, Green spaces, Education.
  - [Television Centre](https://www.televisioncentre.com/): tab-uri pe categorii, plus „Amenity Map”.
- **Valoare:** mare, pentru SEO și pentru ton. Harta există deja; lipsește stratul editorial, adică „de ce contează” fiecare loc.
- **Efort:** S–M. Reperele (`repere`) au deja tipuri, deci trebuie doar un câmp de descriere și pagini filtrate pe tip.

**6. Cronologia proiectului (stadiul lucrărilor și data predării)**
- **Ce este:** o bandă statică cu etape: autorizație, structură, fațadă, finisaje, predare. Etapa curentă e marcată și are fotografii de șantier datate.
- **Unde apare:**
  - [Mount Anvil – Chelsea Finery](https://www.mountanvil.com/find-your-home/chelsea-finery/): lansare iulie 2026, predare Q4 2029.
  - [White City Living](https://www.berkeleygroup.co.uk/developments/london/white-city/white-city-living): „Homes Ready When You Are”.
- **Valoare:** mare. Construiește încredere, mai ales pentru vânzarea pe plan.
- **Efort:** S.

**7. Pagină de specificații și parteneri (branduri de finisaje și echipamente)**
- **Ce este:** o listă clară cu brandurile de finisaje, electrocasnice, obiecte sanitare, tâmplărie și sisteme smart, cu logo și o frază pentru fiecare. Se pot adăuga și creditele arhitectului și designerului de interior.
- **Unde apare:**
  - [Mount Anvil](https://www.mountanvil.com/find-your-home/chelsea-finery/): V-ZUG și altele.
  - [The Whiteley](https://www.thewhiteleylondon.com/residences): colecții semnate de designeri.
  - [The OWO](https://theowo.london/live/): designer creditat pe fiecare reședință.
  - [Lodha](https://www.lodhagroup.co.uk/lodha-uk-residences/): Lissoni, Urquiola.
- **Valoare:** mare pentru apartamente vândute finisate. Arată concret ce primește cumpărătorul.
- **Efort:** S. Secțiunea `tehnologii` și `fisa-tehnica` pot fi refolosite.

### Prioritate 2: valoare bună, efort mediu

**8. Listă de disponibilitate pe unitate, cu filtre (camere, etaj, preț, orientare)**
- **Ce este:** un tabel sau o grilă de carduri cu fiecare apartament: număr, etaj, suprafață, orientare, preț (sau „la cerere”) și status (disponibil, rezervat, vândut). Are filtre simple și sortare după preț.
- **Unde apare:**
  - [Renaker](https://renaker.com/apartments/): filtre pe camere, preț și termen de livrare, cu sortare.
  - [White City Living / Berkeley](https://www.berkeleygroup.co.uk/developments/london/white-city/white-city-living): căutare după preț și camere.
  - [Park Modern](https://www.parkmodern.com/): listă de unități cu prețuri.
  - [Chelsea Barracks](https://chelseabarracks.com/): preț public pe reședință.
- **Valoare:** foarte mare dacă clientul acceptă transparența. Însă segmentul prime din Londra ascunde intenționat prețurile, deci decizia e comercială.
- **Efort:** M. Modelul are azi tipuri cu intervale (`area_min/max`, `floor_min/max`, `price_from`), așa că trebuie o entitate nouă, „unitate”, legată de tip.

**9. Favorite / shortlist**
- **Ce este:** vizitatorul marchează tipuri sau unități și primește lista pe email sau o trimite pe WhatsApp odată cu cererea de vizionare.
- **Unde apare:**
  - [Mount Anvil – /shortlist](https://www.mountanvil.com/shortlist): „Saved”, la nivelul întregului site.
  - [Berkeley](https://www.berkeleygroup.co.uk/): butonul „Save” și cont de utilizator.
- **Valoare:** medie. Contează mai ales împreună cu lista de disponibilitate.
- **Efort:** S–M, cu localStorage și fără cont.

**10. Simulator de vedere pe etaj** ★ diferențiator
- **Ce este:** vizitatorul alege etajul (și orientarea) și vede fotografia reală, făcută cu drona din acel punct, spre lac și Floreasca. Funcționează ca o simplă comutare între imagini statice, deci respectă regula de site static.
- **Unde apare:** nu l-am văzut pe niciun site UK verificat. Este un standard la turnurile din Dubai și New York.
- **Valoare:** foarte mare pentru Yacht Kid. Vederea spre lac e argumentul principal, iar diferența dintre etaje justifică diferențele de preț.
- **Efort:** M. Ședința foto cu drona pe etaje e principalul cost; componenta în sine e simplă.

**11. Selector pe fațadă (stacking plan static)** ★ diferențiator
- **Ce este:** o imagine a fațadei curbe peste care stă un SVG cu etajele sau apartamentele. Click pe un etaj deschide unitățile de pe el și planul de etaj. Evidențierea apare la click sau focus, nu ca animație la hover ⚠.
- **Unde apare:** nu l-am văzut pe site-urile UK verificate; e frecvent pe site-urile din Europa Centrală și de Est. Cel mai apropiat echivalent sunt „masterplan”-urile ilustrate de la [Holland Park Villas](https://www.hollandparkvillas.com/) și [Television Centre](https://www.televisioncentre.com/).
- **Valoare:** mare. Fațada în valuri e iconică, iar selectorul o transformă în navigație.
- **Efort:** M–R. Depinde de punctul 8 (unitățile) și de un desen SVG al fațadei.

**12. Calculator de rate sau plan de plată**
- **Ce este:** avans, perioadă și dobândă duc la rata lunară. Pentru vânzarea pe plan se poate adăuga graficul de plăți al dezvoltatorului (de exemplu 30 / 40 / 30).
- **Unde apare:** [Berkeley – Mortgage calculator](https://www.berkeleygroup.co.uk/helping-you-move/calculator).
- **Valoare:** medie. În segmentul premium din București mulți plătesc cash sau din vânzarea altui imobil. Graficul de plăți al dezvoltatorului e mai util decât un calculator de credit.
- **Efort:** S–M.

**13. Broșură digitală răsfoibilă (în plus față de PDF)**
- **Ce este:** broșura publicată ca pagină HTML sau flipbook, ușor de citit pe telefon și de măsurat (ce pagini se citesc).
- **Unde apare:** [Berkeley – White City Living brochure](https://brochures.berkeleygroup.co.uk/white-city-living/development-brochure/).
- **Valoare:** medie. PDF-ul există deja; varianta HTML se citește mai bine pe mobil și aduce date.
- **Efort:** M. ⚠ Efectul de „întoarcere a paginii” e mișcare; o variantă statică, pagină cu pagină, e suficientă.

**14. Pagină de sustenabilitate și eficiență energetică**
- **Ce este:** clasa energetică, pompe de căldură, fotovoltaice, izolare, certificări (de exemplu BREEAM sau LEED) și costurile de întreținere estimate.
- **Unde apare:**
  - [Opus](https://opus-london.com/): „fossil-fuel-free”.
  - [Mount Anvil](https://www.mountanvil.com/find-your-home/chelsea-finery/): plan de reducere a carbonului.
  - [Native Land](https://www.native-land.com/): pagină „responsibility”.
- **Valoare:** medie. Contează din ce în ce mai mult la creditele verzi.
- **Efort:** S, dacă datele există.

**15. Pagini SEO pe număr de camere**
- **Ce este:** pagini de tipul „Apartamente de 3 camere lângă Lacul Tei / Floreasca”, care leagă tipurile relevante.
- **Unde apare:** [Chelsea Barracks](https://chelseabarracks.com/): pagini dedicate 2-bed, 3-bed.
- **Valoare:** medie (trafic organic).
- **Efort:** S. Probabil acoperit parțial de paginile de tip existente.

### Prioritate 3: de luat în calcul mai târziu

**16. Tur virtual 360° sau Matterport al apartamentului-model**
- **Ce este:** un tur integrat, prin care vizitatorul se plimbă în apartamentul-model.
- **Unde apare:** pe site-urile verificate nu l-am văzut integrat. Berkeley oferă în schimb vizionare video.
- **Valoare:** medie–mare pentru diaspora și străini.
- **Efort:** M. E nevoie de scanare externă și de un embed, iar controlul turului e al utilizatorului, deci nu încalcă regula de site static.

**17. A treia limbă**
- **Ce este:** o limbă în plus față de RO și EN, aleasă după piața de cumpărători străini.
- **Unde apare:**
  - [The Whiteley](https://www.thewhiteleylondon.com/): EN, chineză, arabă (hreflang).
  - [Lodha](https://www.lodhagroup.co.uk/lodha-uk-residences/): link WeChat.
- **Valoare:** mică–medie, doar dacă există o piață clară (de exemplu italiană, germană, ebraică sau arabă).
- **Efort:** M. Infrastructura de limbi există (`LANGS`); costul e traducerea.

**18. Portal sau aplicație pentru rezidenți (după predare)**
- **Ce este:** un spațiu pentru rezidenți: documente, cereri de concierge, rezervări pentru piscină și spații comune, anunțuri.
- **Unde apare:**
  - [Chelsea Barracks](https://chelseabarracks.com/): Resident's Login, my.chelseabarracks.com.
  - [Renaker](https://renaker.com/): aplicație pe dezvoltare.
- **Valoare:** mare pentru imaginea post-vânzare, dar nu ajută vânzarea acum.
- **Efort:** R. De regulă se cumpără o soluție SaaS.

**19. Zonă cu acces pe bază de înregistrare (prețuri sau planuri complete)**
- **Ce este:** prețurile și planurile complete se văd după un formular scurt de înregistrare.
- **Unde apare:**
  - [Park Modern](https://www.parkmodern.com/): register/login.
  - [Opus](https://opus-london.com/): Agent's login.
- **Valoare:** medie. E o alternativă la punctul 8 dacă clientul nu vrea prețuri publice: se obțin lead-uri fără a ascunde complet informația.
- **Efort:** M.

**20. Rezervare online cu avans**
- **Ce este:** vizitatorul rezervă un apartament online și plătește un avans.
- **Unde apare:** nu am văzut-o pe niciun site verificat.
- **Valoare:** mică în segmentul premium, unde contează relația cu vânzătorul.
- **Efort:** R (plăți, contracte, sincronizare cu stocul).

### Ce NU recomand, din cauza constrângerii de site static ⚠

- **Tranziții animate între pagini:** Barba.js, la [Holland Park Gate](https://hollandparkgate.com/) și [Television Centre](https://www.televisioncentre.com/).
- **Smooth-scroll:** Lenis, la [Holland Park Villas](https://www.hollandparkvillas.com/).
- **Preloader cu animație:** la [Opus](https://opus-london.com/) și [The Capston](https://thecapston.com/). La Opus încărcarea e chiar vizibil lentă.
- **Indicatorul „SCROLL” animat.**

Toate aceste efecte dau senzația de „lux” pe site-urile UK, dar contrazic decizia clientului. Ce rămâne aplicabil este **ritmul static**: imagini mari, spațiu alb generos și tipografie puternică.

### Tabel rezumat

| # | Funcționalitate | Valoare | Efort | Avem deja? |
|---|---|---|---|---|
| 1 | Vizionare pe WhatsApp cu mesaj precompletat | Foarte mare | S | Parțial (WhatsApp în cardul de broșură) |
| 2 | Formular de vizionare cu tip, dată și interval | Mare | S | Parțial (CTA de vizionare) |
| 3 | Plan PDF și fișă pe tip de apartament | Mare | S | Nu |
| 4 | Pagină de facilități și servicii | Mare | S | Parțial |
| 5 | Ghid de cartier pe categorii | Mare | S–M | Parțial (hartă cu repere) |
| 6 | Cronologia proiectului | Mare | S | Nu |
| 7 | Specificații, branduri și designeri | Mare | S | Parțial |
| 8 | Disponibilitate pe unitate, cu filtre | Foarte mare* | M | Nu (doar tipuri) |
| 9 | Favorite / shortlist | Medie | S–M | Nu |
| 10 | Simulator de vedere pe etaj ★ | Foarte mare | M | Nu |
| 11 | Selector pe fațadă (stacking plan) ★ | Mare | M–R | Nu |
| 12 | Calculator de rate / plan de plată | Medie | S–M | Nu |
| 13 | Broșură digitală HTML | Medie | M | Nu (doar PDF) |
| 14 | Sustenabilitate și energie | Medie | S | ? |
| 15 | Pagini SEO pe număr de camere | Medie | S | Parțial |
| 16 | Tur 360° | Medie–mare | M | Nu |
| 17 | A treia limbă | Mică–medie | M | RO + EN |
| 18 | Portal pentru rezidenți | Mare (post-vânzare) | R | Nu |
| 19 | Zonă cu acces pe bază de înregistrare | Medie | M | Nu |
| 20 | Rezervare online | Mică | R | Nu |

\* depinde de decizia comercială de a publica prețuri sau status pe unitate.

---

## 2. Stiluri de design: cele mai moderne și premium site-uri

1. **[The Capston](https://thecapston.com/)** (Ballymore, fost Embassy Gardens). Cea mai completă identitate de lux din set: Albertus (serif clasic britanic) cu un sans modern, pe fundal crem. Paleta are culori cu nume proprii („leather”, „silk”, „medallion gold”, „clay”), iar fotografia e editorial-fashion, nu CGI generic.
2. **[Chelsea Barracks](https://chelseabarracks.com/)**. Serif cu contrast mare (PP Fragment), folosit în italic și în majuscule, cu Brown Pro sans. Verdele închis se combină cu un accent crimson. Header-ul e minimal: „Enquire” în stânga, logo centrat, „MENU” în dreapta cu meniu overlay. Panourile foto sunt full-bleed, cu foarte mult spațiu alb.
3. **[The Whiteley](https://www.thewhiteleylondon.com/)** (Six Senses Residences). Are un font serif propriu („Whiteley Bold Inline”) care devine brandul, plus contoare de slide de tip „1/4”. Fiecare designer de interior are propria pagină, ca o colecție de modă.
4. **[The OWO Residences](https://theowo.london/)**. Un font de display creat pentru clădire („1906”) și fotografie de patrimoniu în tonuri de piatră și bej. Mega-meniul are panouri cu imagini (Place / Live / Stay / Dine) și leagă bine mai multe funcțiuni.
5. **[Holland Park Gate](https://hollandparkgate.com/)**. Combinația clasică de lux: serif Bodoni cu contrast mare și Futura. Imaginile sunt full-bleed, în blocuri alternante imagine/text, pe o paletă gri-cald.
6. **[Riverscape](https://riverscape.co.uk/)**. Iese din norma „bej de lux” cu un hero roșu plin și wordmark uriaș, cu litere distanțate, plus perechea Gotham și Crimson Text. Arată că un singur accent de culoare curajos funcționează.
7. **[Opus, Bankside Yards](https://opus-london.com/)**. Alb/negru cu un singur accent lime neon, CTA-uri în majuscule și buton „Enquire” fix. E un premium contemporan, nu clasic.
8. **[Holland Park Villas](https://www.hollandparkvillas.com/)**. Narațiune editorială pe capitole (Foreword, Space, Style, Serenity), cu serif de lux (Giorgio) și Avenir peste fotografie întunecată full-bleed. Tehnic e depășit; merită preluată doar structura pe capitole.

### Tipare recurente pe care le putem prelua (toate compatibile cu un site static)

- **Serif de display cu contrast mare, împerecheat cu un sans geometric sau grotesc.** Apare la aproape toate cele 8. Titlurile mari în serif și etichetele mici în sans, cu majuscule și litere distanțate, sunt semnătura vizuală a segmentului.
- **Header minimal cu meniu overlay** (logo centrat, „Meniu” și „Programează” la margini), plus un CTA fix de tip „Enquire” sau „Programează vizionare”.
- **Fotografie full-bleed alternată cu spațiu alb generos**, cu o singură idee pe ecran. Mediateca de 465 de fotografii permite asta fără CGI nou.
- **O paletă cu nume proprii, legată de loc.** Capston are „leather / silk / gold”; pentru Yacht Kid ar putea fi „lac”, „velă”, „spumă”, „teak”, aliniat cu fațada albă în valuri. Paleta devine parte din poveste.
- **Narațiune pe capitole** (Holland Park Villas, The Whiteley): pagina principală spusă ca o broșură, de exemplu Locul, Arhitectura, Apartamentele, Viața la lac.
- **Creditarea autorilor** (arhitect, designer de interior, peisagist) ca semn de calitate.
- **Contoare discrete în galerii** („1/4”) și săgeți în loc de carusele automate. Carusele automate nu se potrivesc cu regula de site static ⚠.
- **Un singur accent de culoare curajos** (roșul Riverscape, lime la Opus, crimson la Chelsea Barracks) pe o bază neutră.
- **Accent sau semnătură tipografică proprie** (fontul „1906” la OWO, cel inline de la Whiteley). Varianta ieftină e un monogram sau o literă stilizată din valul fațadei, folosită ca ornament static.
