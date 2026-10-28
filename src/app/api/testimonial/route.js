// POST /api/testimonial/ — formularul „Împărtășește experiența ta” de pe Comunitate.
// Intră ca ciornă în Testimoniale (sursa „site”); pe site apare doar după „Aprobă” în panou.
import {getDb} from '../../../core/db.mjs';
import {createEntity, StoreError} from '../../../core/store.mjs';

export const dynamic = 'force-dynamic';

const MAX = {name: 120, role: 80, quote: 2000, email: 200};
const clean = (v, n) => String(v ?? '').replace(/\s+\n/g, '\n').trim().slice(0, n);
// Cel mult 5 trimiteri pe oră de la aceeași adresă (în memoria instanței: frână, nu garanție)
const recent = new Map();

export async function POST(request) {
  const host = request.headers.get('host') ?? '';
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== host) return Response.json({error: 'origin'}, {status: 403});
  const ip = (request.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'local';
  const now = Date.now(), hits = (recent.get(ip) ?? []).filter(t => now - t < 3600e3);
  if (hits.length >= 5) return Response.json({error: 'rate'}, {status: 429});

  const body = await request.json().catch(() => null);
  if (!body) return Response.json({error: 'body'}, {status: 400});
  // Câmpul ascuns „website” e capcana pentru roboți: completat = acceptăm în tăcere, nu salvăm nimic
  if (body.website) return Response.json({ok: true});
  const lang = body.lang === 'en' ? 'en' : 'ro';
  const anonymous = body.anonymous === true || body.anonymous === 'on';
  const name = clean(body.name, MAX.name), role = clean(body.role, MAX.role), quote = clean(body.quote, MAX.quote), email = clean(body.email, MAX.email);
  if (!name || quote.length < 20 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !(body.consent === true || body.consent === 'on'))
    return Response.json({error: 'invalid'}, {status: 422});

  try {
    // Numele real rămâne în istoric și în email; pe site, cine a cerut anonimatul apare ca „Rezident YACHT KID”
    const id = await createEntity(await getDb(), 'testimoniale', {
      base: {author: anonymous ? (lang === 'en' ? 'YACHT KID resident' : 'Rezident YACHT KID') : name, anonymous: anonymous ? 1 : 0,
        quote, quote_lang: lang, source: 'site', email, given_on: new Date().toISOString().slice(0, 10), featured: 0},
      tr: role ? {[lang]: {role}} : {}
    }, {user: anonymous ? `Formular site (${name})` : 'Formular site'});
    recent.set(ip, [...hits, now]);
    return Response.json({ok: true, id});
  } catch (e) {
    if (e instanceof StoreError) return Response.json({error: 'invalid', detail: e.message}, {status: 422});
    console.error(e);
    return Response.json({error: 'server'}, {status: 500});
  }
}
