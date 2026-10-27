/** @type {import('next').NextConfig} */
export default {
  // Adresele vechi au bară la final; o adresă fără bară primește 301 (§3.8)
  trailingSlash: true,
  // Clientul libSQL are o parte nativă pentru fișierul local; rămâne în afara pachetului
  serverExternalPackages: ['@libsql/client', 'libsql'],
  // Ruta de cron face primul import pe Vercel, deci are nevoie de snapshot (fără fișierele media) și de rapoartele analizei
  outputFileTracingIncludes: {
    '/api/manage/cron/tick': [
      './reference/snapshot/manifest.json',
      './reference/snapshot/api/**/*',
      './reference/snapshot/html/**/*',
      './reference/analysis/*.json'
    ]
  },
  poweredByHeader: false,
  // Brandbook-ul clientului (public/brand/) nu e în repo, deci nici pe Vercel: acolo /brand/* vine din Blob
  // (urcat de scripts/media-to-blob.mjs). „afterFiles” = doar dacă fișierul nu există în public/, dar înaintea rutei
  // [[...segments]] a site-ului (care altfel ar răspunde 404); fără MEDIA_BASE_URL (local), nimic.
  async rewrites() {
    const base = process.env.MEDIA_BASE_URL;
    return {afterFiles: base ? [{source: '/brand/:path(.*)', destination: `${base}/brand/:path`}] : []};
  },
  // Nimic de pe *.vercel.app nu intră în Google (site-ul de test); pe domeniul real se indexează doar site-ul public.
  // Antetul, nu robots.txt: un Disallow l-ar împiedica pe Google să vadă noindex și ar putea lista totuși adresele.
  async headers() {
    const noindex = [{key: 'X-Robots-Tag', value: 'noindex, nofollow, noarchive'}];
    return [
      {source: '/:path*', has: [{type: 'host', value: '.*\\.vercel\\.app'}], headers: noindex},
      {source: '/manage/:path*', headers: noindex},
      {source: '/api/:path*', headers: noindex}
    ];
  }
};
