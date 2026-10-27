// PUT /api/manage/entities/:tip/:id — salvarea: câmpuri comune, texte pe limbă, legături, stare (Anexa C)
import {getDb} from '../../../../../../core/db.mjs';
import {saveEntity} from '../../../../../../core/store.mjs';
import {handle, panelUser} from '../../../../../../manage/api.mjs';

export const dynamic = 'force-dynamic';

export async function PUT(request, {params}) {
  return handle(request, async () => {
    const {tip, id} = await params;
    const body = await request.json();
    return saveEntity(await getDb(), tip, Number(id), body, {user: panelUser()});
  });
}
