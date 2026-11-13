import './v5/v5-chrome.css';
import './v5/v5-hero.css';
import './v5/v5.css';

// Rădăcină separată pentru /v5/: homepage pornit de la zero. Nu moștenește stilurile site-ului sau ale v3/v4.
export default function Layout({children}) {
  return (
    <html lang="ro">
      <head>
        <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossOrigin=""/>
      </head>
      <body className="v5">{children}</body>
    </html>
  );
}
