// POST /api/manage/inferred/:relație — confirmarea sau scoaterea în masă a legăturilor deduse (§2.5)
import {getDb} from '../../../../../core/db.mjs';
import {decideLinks} from '../../../../../core/store.mjs';
import {handle, panelUser} from '../../../../../manage/api.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request, {params}) {
  return handle(request, async () => {
    const {rel} = await params;
    const {pairs, decision} = await request.json();
    return decideLinks(await getDb(), decodeURIComponent(rel), pairs, decision, {user: panelUser()});
  });
}
