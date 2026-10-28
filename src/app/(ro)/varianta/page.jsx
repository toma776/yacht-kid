import '../../../site/styles/v2.css';
import {renderPublic, metadataFor} from '../../../site/PublicPage.jsx';

// Macheta de probă a homepage-ului după DESIGN.md: aceleași date, alt stil (styles/v2.css, totul sub .v2).
// Nu e în meniu, nu intră în Google; se decide ulterior dacă stilul trece pe site.
export const dynamic = 'force-dynamic';

export async function generateMetadata() {
  return {...await metadataFor('ro', []), title: 'Variantă homepage (DESIGN.md) - YachtKID', robots: {index: false, follow: false}};
}

export default async function Page() {
  return renderPublic('ro', [], {variant: 'v2'});
}
