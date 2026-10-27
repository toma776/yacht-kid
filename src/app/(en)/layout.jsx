import '../../site/site.css';

// Rădăcina site-ului în engleză (/en/): html lang corect pentru fiecare limbă (§1.10)
export default function Layout({children}) {
  return <html lang="en"><body>{children}</body></html>;
}
