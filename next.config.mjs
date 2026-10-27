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
  poweredByHeader: false
};
