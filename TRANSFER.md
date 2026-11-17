# Transferul site-ului YACHT KID

Codul stă pe GitHub în `getDAVID-ro/yacht-kid-brain` (privat). Pe Vercel, proiectul are nevoie de o bază **Neon** și de un
**Blob** al vostru. Până la transfer, imaginile stau în repo (`public/m`, ~128 MB, WebP) și baza stă tot în repo, ca
o copie (`data/brain-export.json.gz`). Cu pașii de mai jos ajung în Neon-ul și Blob-ul vostru.

## 1. Baza de date (Neon)

1. În proiectul de pe Vercel: Storage → Create → **Neon**, plan Free, regiunea Frankfurt, legată de proiect
   (Production, Preview și Development bifate).
2. Cu Node 24 sau mai nou: `git clone https://github.com/getDAVID-ro/yacht-kid-brain.git`, apoi `cd yacht-kid-brain`,
   apoi `npm install`, apoi `npx vercel link` (alegeți proiectul), apoi `npx vercel env pull .env.local`.
3. `npm run db:seed` copiază baza din repo în Neon-ul vostru, într-o singură tranzacție. La final afișează câte rânduri
   a scris.

## 2. Mutarea imaginilor în Blob-ul vostru

1. În proiectul de pe Vercel: Storage → Create → **Blob**, public, Frankfurt, legat de proiect (cu Development bifat).
   Dacă proiectul are deja variabila `BLOB_READ_WRITE_TOKEN`, ștergeți-o întâi: e de la depozitul agenției.
2. `npx vercel env pull .env.local` (ca să aducă tokenul nou), apoi `npm run blob:copy`. Copierea durează câteva minute
   și la final confirmă fiecare fișier.
3. În Settings → Environment Variables ștergeți `MEDIA_IN_REPO`, apoi faceți **Redeploy**.
4. Rulați încă o dată `npm run blob:copy`, ca să prindă ce s-a adăugat între timp.

**Verificare:** `https://<proiect>.vercel.app/api/stare` trebuie să arate `"blob":"BLOB_READ_WRITE_TOKEN"` și
`"neon":true`.

## 3. Curățenia, după ce site-ul merge din contul vostru

- Ștergeți variabilele rămase de la agenție, dacă există: `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`, `MEDIA_BASE_URL`.
- **Securitate:** `MANAGE_PUBLIC=1` deschide /manage fără autentificare pe Vercel. Ștergeți-o (și Redeploy) înainte
  de lansarea pe domeniul real.
- Agenția își șterge apoi baza, Blob-ul și integrarea Turso din contul ei.

## Lucrul de zi cu zi

- `npm run dev` pornește baza locală (Postgres încorporat, în `data/pg`) și site-ul pe http://localhost:3000.
- `npm run db:pull` aduce baza de pe Neon local; `npm run db:push` o trimite înapoi (refuză dacă pe Neon sunt
  testimoniale trimise de pe site care lipsesc local).
- Imaginile noi intră în `public/m` cu `npm run media:repo` (din originalele din `reference/snapshot/media`); după
  mutarea în Blob, se urcă și acolo cu `npm run blob:copy`.
