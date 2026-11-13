import Root from './v5/Root';

// Rădăcina pentru /v5/ (RO). Varianta EN, /en/v5/, are rădăcina ei în (v5-en), cu același Root.
export default function Layout({children}) {
  return <Root lang="ro">{children}</Root>;
}
