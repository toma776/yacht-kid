import '../../../../site/styles/v2.css';
import {renderPublic, metadataFor} from '../../../../site/PublicPage.jsx';

// Macheta de probă după DESIGN.md: /varianta/ + adresa paginii (/varianta/, /varianta/tehnologie/, …). Aceleași date,
// alt stil (styles/v2.css, totul sub .v2). Nu e în meniu, nu intră în Google; se decide ulterior dacă trece pe site.
export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  const meta = await metadataFor('ro', (await params).path);
  return {...meta, title: `Variantă (DESIGN.md) · ${meta.title ?? 'YachtKID'}`, robots: {index: false, follow: false}};
}

export default async function Page({params}) {
  return renderPublic('ro', (await params).path, {variant: 'v2'});
}
