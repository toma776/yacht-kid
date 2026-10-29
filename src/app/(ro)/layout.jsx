import '../../site/styles/system.css';
import '../../site/styles/site.css';
import '../../site/styles/design.css';
import '../../site/styles/v2.css';

// Rădăcina site-ului în română (fără prefix): html lang corect pentru fiecare limbă (§1.10).
// Stilurile sunt cele din designul aprobat (design/system.css și design/homepage/home.css), portate în src/site/styles/.
export default function Layout({children}) {
  return (
    <html lang="ro">
      <head><link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossOrigin=""/></head>
      <body>{children}</body>
    </html>
  );
}
