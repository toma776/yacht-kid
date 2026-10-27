import {isLocalRequest} from '../../../manage/guard.mjs';
import '../../../manage/manage.css';

// /manage se randează la fiecare cerere, fără cache (§3.1)
export const dynamic = 'force-dynamic';
export const metadata = {title: 'Brain · Yacht Kid', robots: {index: false, follow: false}};

export default async function ManageLayout({children}) {
  const local = await isLocalRequest();
  return (
    <html lang="ro">
      <body>
        <header className="bar"><a href="/manage/">Brain · Yacht Kid</a></header>
        <main>{local ? children : <p>Panoul cere autentificare, care nu e încă implementată. Deocamdată merge doar local.</p>}</main>
      </body>
    </html>
  );
}
