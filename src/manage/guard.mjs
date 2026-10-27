// /manage cere sesiune (§1.9). Autentificarea (scrypt, sesiuni HttpOnly, limitarea încercărilor) vine odată cu nucleul;
// până atunci panoul e deschis pe localhost, ca în standard („fără parolă doar pe localhost”), și pe Vercel doar dacă
// proiectul are MANAGE_PUBLIC=1 (decizia clientului: panoul de test deschis fără autentificare; se închide ștergând variabila).
import {headers} from 'next/headers';

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export const managePublic = () => process.env.MANAGE_PUBLIC === '1';
export const isLocalHost = host => !process.env.VERCEL && LOCAL.test(host ?? '');
export const canManage = host => isLocalHost(host) || managePublic();

export async function isLocalRequest() {
  return isLocalHost((await headers()).get('host'));
}

export async function canManageRequest() {
  return canManage((await headers()).get('host'));
}
