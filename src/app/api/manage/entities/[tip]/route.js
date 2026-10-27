// POST /api/manage/entities/:tip — o înregistrare nouă, ca ciornă (Anexa C)
import {getDb} from '../../../../../core/db.mjs';
import {createEntity} from '../../../../../core/store.mjs';
import {handle, panelUser} from '../../../../../manage/api.mjs';

export const dynamic = 'force-dynamic';

export async function POST(request, {params}) {
  return handle(request, async () => {
    const {tip} = await params;
    const body = await request.json().catch(() => ({}));
    return {id: await createEntity(await getDb(), tip, body, {user: panelUser()})};
  });
}
