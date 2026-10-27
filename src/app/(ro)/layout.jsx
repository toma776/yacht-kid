import '../../site/site.css';

// Rădăcina site-ului în română (fără prefix): html lang corect pentru fiecare limbă (§1.10)
export default function Layout({children}) {
  return <html lang="ro"><body>{children}</body></html>;
}
