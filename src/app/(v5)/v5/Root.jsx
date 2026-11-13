// Rădăcina documentului v5, comună ambelor limbi: html lang corect, fontul, stilurile v5. Nu moștenește nimic de la site.
import './v5-chrome.css';
import './v5-hero.css';
import './v5-collection.css';
import './v5-project.css';
import './v5-features.css';
import './v5-awards.css';
import './v5-location.css';
import './v5.css';

export default function Root({lang, children}) {
  return (
    <html lang={lang}>
      <head>
        <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossOrigin=""/>
      </head>
      <body className="v5">{children}</body>
    </html>
  );
}
