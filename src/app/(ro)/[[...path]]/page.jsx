import {renderPublic, metadataFor} from '../../../site/PublicPage.jsx';

// Până există scan și cache-ul paginilor (§3.5), fiecare cerere se randează din Brain
export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  return metadataFor('ro', (await params).path);
}

export default async function Page({params}) {
  return renderPublic('ro', (await params).path);
}
