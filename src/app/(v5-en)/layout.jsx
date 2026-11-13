import Root from '../(v5)/v5/Root';

// Rădăcina pentru /en/v5/ (EN): același Root ca /v5/, cu html lang="en".
export default function Layout({children}) {
  return <Root lang="en">{children}</Root>;
}
