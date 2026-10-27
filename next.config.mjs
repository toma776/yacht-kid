/** @type {import('next').NextConfig} */
export default {
  // Adresele vechi au bară la final; o adresă fără bară primește 301 (§3.8)
  trailingSlash: true,
  // Clientul libSQL are o parte nativă pentru fișierul local; rămâne în afara pachetului
  serverExternalPackages: ['@libsql/client', 'libsql'],
  poweredByHeader: false
};
