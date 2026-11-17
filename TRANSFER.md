# Transferul site-ului YACHT KID

Ghid pentru predarea proiectului către client: repo-ul GitHub, proiectul Vercel, baza de date (Neon) și imaginile (Vercel Blob).
Baza și imaginile **nu** trec singure odată cu proiectul. Clientul își creează în contul lui o bază Neon și un spațiu Blob,
iar scriptul `scripts/transfer-client.mjs` copiază în ele datele și imaginile.

## Ce face agenția, înainte

1. Transferă repo-ul GitHub `toma776/yacht-kid` către contul sau organizația clientului (GitHub → Settings → Transfer).
2. Transferă proiectul Vercel `yacht-kid` în echipa Vercel a clientului (Vercel → Project → Settings → Transfer Project).
3. Trimite clientului **pe un canal privat**, nu în repo, adresa bazei agenției, valabilă doar pentru transfer:
   `SOURCE_DATABASE_URL=postgresql://…` (din Vercel → Storage → baza Neon a agenției → `.env.local` → `DATABASE_URL`).
4. După ce clientul confirmă că site-ul merge din contul lui, agenția șterge baza Neon, spațiul Blob, contul Cloudinary
   și integrarea Turso din contul ei.

## Ce face clientul: comanda pentru Claude

Clientul deschide proiectul (clona repo-ului transferat) în Claude Code și trimite mesajul de mai jos, cu
`SOURCE_DATABASE_URL` primit de la agenție. Claude are nevoie de conectorul Vercel (MCP) activ în sesiune.

```text
Pregătește site-ul YACHT KID în contul meu, după TRANSFER.md din acest repo:
1. În proiectul Vercel „yacht-kid” din echipa mea, creează un spațiu Vercel Blob public (regiunea fra1) conectat la proiect, prin conectorul Vercel.
2. Spune-mi exact unde să dau click ca să adaug o bază Neon (Free) conectată la același proiect, apoi așteaptă confirmarea mea.
3. Scrie .env.transfer.local cu DATABASE_URL și BLOB_READ_WRITE_TOKEN din proiectul meu și cu SOURCE_DATABASE_URL de mai jos. Nu afișa valorile.
4. Rulează: npm install, apoi node --env-file=.env.transfer.local scripts/transfer-client.mjs
5. Pune MEDIA_BLOB_URL (afișat de script) în variabilele proiectului Vercel, pentru Production și Preview.
6. Scoate variabilele rămase de la agenție: TURSO_DATABASE_URL, TURSO_AUTH_TOKEN, MEDIA_BASE_URL și orice BLOB_READ_WRITE_TOKEN care nu aparține spațiului Blob creat la pasul 1.
7. Fă redeploy pe producție și verifică pagina principală, o pagină de apartament, /blog/ și /manage/: imaginile să vină din Blob-ul meu, iar datele din Neon.
SOURCE_DATABASE_URL=<adresa primită de la agenție>
```

## Ce se întâmplă, pe scurt

| Pas | Unde | Rezultat |
| --- | --- | --- |
| Blob | Vercel → Storage, creat de Claude prin conector | `BLOB_READ_WRITE_TOKEN` pe proiect |
| Neon | Vercel → Storage → Create Database → Neon, de mână (acceptă termenii) | `DATABASE_URL` pe proiect |
| Date | `transfer-client.mjs` | baza agenției copiată integral în Neon-ul clientului |
| Imagini | `transfer-client.mjs` | `public/m/*` urcate în Blob, la aceleași nume |
| Site | variabila `MEDIA_BLOB_URL` + redeploy | `/media/<id>/` trimite la Blob-ul clientului |

Scriptul se poate relua fără grijă: imaginile deja urcate sunt sărite, iar baza e rescrisă integral (copia pornește
mereu din baza agenției, deci se rulează **înainte** ca clientul să editeze ceva în /manage).

## După transfer

- Imaginile rămân și în repo, în `public/m/` (~128 MB), ca sursă pentru `transfer-client.mjs`. Odată ce site-ul
  merge din Blob, folderul se poate scoate din repo; imaginile noi se urcă din /manage.
- Lucrul local: `npm run dev` pornește baza locală (PGlite, în `data/pg`) și site-ul. `npm run db:pull` aduce baza
  de pe Neon local, `npm run db:push` o trimite înapoi (cere `.env.neon.local` cu `DATABASE_URL`).
- **Securitate:** variabila `MANAGE_PUBLIC=1` deschide /manage fără autentificare pe Vercel. Clientul o șterge (și
  face redeploy) înainte de lansarea pe domeniul real.
