// /api/stare: de unde citește site-ul imaginile și baza, fără să afișeze vreun token (TRANSFER.md). Înainte de transfer:
// "blob":"MEDIA_IN_REPO"; după ce clientul își copiază imaginile, șterge MEDIA_IN_REPO și republică:
// "blob":"BLOB_READ_WRITE_TOKEN". "neon": true când DATABASE_URL e pus de integrarea Neon.
import {mediaSource} from '../../../site/media-source.mjs';

export const dynamic = 'force-dynamic';

export function GET() {
  return Response.json({blob: mediaSource().from, neon: Boolean(process.env.DATABASE_URL)}, {headers: {'cache-control': 'no-store'}});
}
