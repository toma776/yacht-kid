import {isLocalRequest} from '../../../manage/guard.mjs';
import {getDb, one} from '../../../core/db.mjs';
import {ENTITIES} from '../../../registry/entities.mjs';
import {legaturiDeVerificat} from '../../../manage/data.mjs';
import Nav from '../../../manage/ui/Nav.jsx';
import '../../../manage/manage.css';

// /manage se randează la fiecare cerere, fără cache (§3.1)
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Brain · Yacht Kid', robots: {index: false, follow: false}};

async function counts(db) {
  let total = 0;
  for (const e of ENTITIES.filter(e => e.hub !== false)) total += (await one(db, `SELECT count(*) n FROM "${e.table}"`)).n;
  const inferred = (await legaturiDeVerificat(db)).reduce((n, g) => n + g.items.length, 0);
  const changes = (await one(db, `SELECT count(*) n FROM audit_log WHERE user_name != 'Import'`)).n;
  const media = (await one(db, 'SELECT count(*) n FROM media')).n;
  const leads = (await one(db, 'SELECT count(*) n FROM leads')).n;
  return {total, inferred, changes, media, leads};
}

export default async function ManageLayout({children}) {
  const local = await isLocalRequest();
  const db = await getDb();
  const n = local ? await counts(db) : {};
  const groups = [
    {title: 'Brain', items: [
      {href: '/manage/', label: 'Panou', icon: 'panou'},
      {href: '/manage/entitati/', label: 'Entități', icon: 'entitati', n: n.total},
      {href: '/manage/harta/', label: 'Harta legăturilor', icon: 'harta'},
      {href: '/manage/surse/legaturi/', label: 'De verificat', icon: 'legaturi', n: n.inferred, warn: n.inferred > 0},
      {href: '/manage/modificari/', label: 'Modificări', icon: 'modificari', n: n.changes}
    ]},
    {title: 'Site', items: [
      {href: '/manage/media/', label: 'Media', icon: 'media', n: n.media},
      {href: '/manage/entitati/cereri/', label: 'Cereri', icon: 'cereri', n: n.leads}
    ]},
    {title: 'Identitate', items: [
      {href: '/manage/branding/', label: 'Branding', icon: 'branding'}
    ]}
  ];
  const turso = !!process.env.TURSO_DATABASE_URL;
  return (
    <html lang="ro">
      <body>
        <div className="app">
          <aside className="side">
            <a className="logo" href="/manage/"><span className="logo-mark">YK</span><span><b>YACHT KID</b><small>Brain · panou de administrare</small></span></a>
            {local && <Nav groups={groups}/>}
            <div className="side-card">
              <div className="side-status"><i className={local ? '' : 'ro'}></i><span>{local ? `Local · ${turso ? 'baza Turso' : 'data/brain.db'}` : 'Doar local, până la autentificare'}</span></div>
              <div className="side-links"><a href="/" target="_blank" rel="noopener">Site ↗</a><a href="/en/" target="_blank" rel="noopener">EN ↗</a><a href="https://yacht-kid.vercel.app/" target="_blank" rel="noopener">Vercel ↗</a></div>
            </div>
          </aside>
          <main className="main">
            {local ? children : <div className="card empty"><b>Panoul cere autentificare</b>Autentificarea nu e încă implementată, deci panoul merge doar local.</div>}
          </main>
        </div>
      </body>
    </html>
  );
}
