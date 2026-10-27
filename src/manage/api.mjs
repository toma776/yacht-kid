// Apărarea rutelor /api/manage (§1.9): autorizarea pe server, la fiecare cerere. Până există autentificarea,
// scrierile sunt permise local și, cu MANAGE_PUBLIC=1, pe Vercel; scrierile venite din alt site sunt refuzate (verificarea Origin).
import {StoreError} from '../core/store.mjs';
import {canManage} from './guard.mjs';

// Cine apare în istoric: panoul local sau cel deschis de pe Vercel
export const panelUser = () => (process.env.VERCEL ? 'Panou Vercel' : 'Panou local');

export function guard(request) {
  const host = request.headers.get('host') ?? '';
  if (!canManage(host)) return Response.json({error: 'Scrierile din /manage merg doar local până la autentificare.'}, {status: 403});
  const origin = request.headers.get('origin');
  if (origin && new URL(origin).host !== host) return Response.json({error: 'Cerere din alt site.'}, {status: 403});
  return null;
}

export async function handle(request, fn) {
  const denied = guard(request);
  if (denied) return denied;
  try {
    return Response.json(await fn());
  } catch (e) {
    if (e instanceof StoreError) return Response.json({error: e.message, errors: e.errors}, {status: e.status});
    console.error(e);
    return Response.json({error: 'Eroare neașteptată la salvare.'}, {status: 500});
  }
}
