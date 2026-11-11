import './v3/v3.css';

// Rădăcină separată pentru /v3/: propunerea de homepage imersiv, construită pe limbajul fațadei
// (benzi albe continue, colțuri rotunjite, sticlă între etaje). Nu moștenește stilurile site-ului actual.
export default function Layout({children}) {
  return (
    <html lang="ro">
      <head>
        <link rel="preload" href="/fonts/montserrat-latin.woff2" as="font" type="font/woff2" crossOrigin=""/>
        <link rel="preload" href="/v3/fatada-7.jpg" as="image"/>
      </head>
      <body className="v3">{children}</body>
    </html>
  );
}
