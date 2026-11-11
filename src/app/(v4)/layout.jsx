import './v4/v4.css';

// Rădăcină separată pentru /v4/: homepage din tile-uri (alb și nuanțe de gri), despărțite de o linie navy subțire.
// Fiecare tile are un singur colț rotunjit, ca planșeele fațadei, poziționat fără regulă. Nu moștenește stilurile site-ului.
export default function Layout({children}) {
  return (
    <html lang="ro">
      <head>
        <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossOrigin=""/>
        <link rel="preload" href="/v4/hero.jpg" as="image"/>
      </head>
      <body className="v4">{children}</body>
    </html>
  );
}
