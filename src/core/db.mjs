// Conexiunea la Brain. Un singur client libSQL pentru ambele medii (decizia T1):
// - local: fișierul data/brain.db (implicit), fără nicio configurare;
// - Vercel: Turso, din TURSO_DATABASE_URL și TURSO_AUTH_TOKEN (puse de integrarea Turso din Marketplace).
import {createClient} from '@libsql/client';
import {mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {migrateClient} from './schema.mjs';

// Relativ la rădăcina proiectului (de unde rulează next și scripturile npm)
const DATA_DIR = join(process.cwd(), 'data');

export function openDb({url = process.env.TURSO_DATABASE_URL, authToken = process.env.TURSO_AUTH_TOKEN} = {}) {
  if (!url) {
    // Pe Vercel nu există disc persistent: fără Turso configurat, refuzăm în loc să scriem într-un fișier care dispare
    if (process.env.VERCEL) throw new Error('TURSO_DATABASE_URL lipsește: instalează integrarea Turso pe proiectul Vercel.');
    mkdirSync(DATA_DIR, {recursive: true});
    url = `file:${join(DATA_DIR, 'brain.db')}`;
  }
  return createClient({url, authToken});
}

// SQLite verifică cheile străine doar dacă i se cere, pe fiecare conexiune
export async function prepare(client) {
  await client.execute('PRAGMA foreign_keys = ON');
  await migrateClient(client);
  return client;
}

// O singură conexiune pe proces (o instanță de funcție pe Vercel, procesul de dezvoltare local)
let shared;
export const getDb = () => (shared ??= prepare(openDb()));

// Rânduri libSQL → obiecte simple (Row are și acces după index)
export const plain = rows => rows.map(r => ({...r}));
export const one = async (db, sql, args = []) => (await db.execute({sql, args})).rows[0] ?? null;
export const all = async (db, sql, args = []) => plain((await db.execute({sql, args})).rows);
