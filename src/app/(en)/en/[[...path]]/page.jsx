import {renderPublic, metadataFor} from '../../../../site/PublicPage.jsx';

// Până există scan și cache-ul paginilor (§3.5), fiecare cerere se randează din Brain
export const dynamic = 'force-dynamic';

export async function generateMetadata({params}) {
  return metadataFor('en', (await params).path);
}

export default async function Page({params}) {
  return renderPublic('en', (await params).path);
}
