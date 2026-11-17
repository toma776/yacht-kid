// De unde vin imaginile site-ului (ruta /media/<id>/ și /api/stare), după modelul celorlalte proiecte Brain:
//   · MEDIA_IN_REPO setat → din repo (public/m), cât timp clientul nu și-a copiat imaginile în Blob-ul lui;
//   · altfel, cu BLOB_READ_WRITE_TOKEN al clientului → din Blob-ul lui public (adresa se deduce din token);
//   · tokenul vechi al agenției (depozitul suspendat) nu contează: imaginile rămân din repo.
// Pașii clientului sunt în TRANSFER.md („Mutarea imaginilor în Blob-ul vostru”).
export const AGENCY_BLOB_STORE = 'ncdCtSgbPttKO8le';
export const storeId = token => (token ?? '').trim().split('_')[3] ?? '';

export function mediaSource(env = process.env) {
  const token = env.BLOB_READ_WRITE_TOKEN?.trim();
  if (env.MEDIA_IN_REPO?.trim()) return {from: 'MEDIA_IN_REPO', base: null};
  if (token && storeId(token) && storeId(token) !== AGENCY_BLOB_STORE)
    return {from: 'BLOB_READ_WRITE_TOKEN', base: `https://${storeId(token).toLowerCase()}.public.blob.vercel-storage.com`};
  return {from: token ? 'repo (BLOB_READ_WRITE_TOKEN e încă depozitul agenției)' : 'repo', base: null};
}
