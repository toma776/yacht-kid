# YACHT KID — site + Brain

Site-ul yachtkid.ro (RO/EN) și panoul de conținut /manage („Brain”), într-un singur proiect Next.js. Conținutul vine
din registrul de entități (`src/registry/entities.mjs`); baza e Postgres (local: PGlite în `data/pg`; pe Vercel: Neon),
iar imaginile stau în `public/m` până la mutarea în Vercel Blob.

## Pornire

Cu Node 24 sau mai nou: `npm install`, apoi `npm run db:seed` doar dacă baza Neon e goală (vezi mai jos), apoi
`npm run dev` → http://localhost:3000 (site) și http://localhost:3000/manage/ (Brain). `npm test` rulează testele.

## Transferul (baza Neon, mutarea imaginilor în Blob-ul vostru)

Pașii sunt în [TRANSFER.md](TRANSFER.md): Neon legat de proiect + `npm run db:seed`, Blob legat de proiect +
`npm run blob:copy`, apoi ștergerea `MEDIA_IN_REPO` și Redeploy. Verificare: `/api/stare` arată
`"blob":"BLOB_READ_WRITE_TOKEN"` și `"neon":true`.

## Comenzi

| Comandă | Ce face |
| --- | --- |
| `npm run dev` | baza locală + site-ul |
| `npm run db:pull` / `db:push` | Neon → local / local → Neon (copie completă) |
| `npm run db:export` / `db:seed` | local → `data/brain-export.json.gz` / fișierul → Neon |
| `npm run media:repo` | imaginile noi din snapshot → `public/m` (WebP) |
| `npm run blob:copy` | `public/m` → Blob-ul proiectului |
