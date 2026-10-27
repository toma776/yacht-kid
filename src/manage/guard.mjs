// /manage cere sesiune (§1.9). Autentificarea (scrypt, sesiuni HttpOnly, limitarea încercărilor) vine odată cu nucleul;
// până atunci panoul e deschis doar pe localhost, ca în standard („fără parolă doar pe localhost”).
import {headers} from 'next/headers';

const LOCAL = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/;

export async function isLocalRequest() {
  const h = await headers();
  return !process.env.VERCEL && LOCAL.test(h.get('host') ?? '');
}
