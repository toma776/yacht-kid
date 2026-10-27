// Entitățile, pe categoriile din registru: fiecare card arată tipurile lui cu numărul de înregistrări.
import {getDb} from '../../../../core/db.mjs';
import {ENTITIES, CATEGORIES} from '../../../../registry/entities.mjs';
import {typeStats} from '../../../../manage/data.mjs';

const ICON = {
  proiect: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 10h.01M15 10h.01',
  imobiliar: 'M3 11l9-7 9 7M5 10v10h14V10M10 20v-6h4v6',
  comunitate: 'M16 19v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M9.5 10a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 19v-1a4 4 0 0 0-3-3.9M15.5 4.1a3 3 0 0 1 0 5.8',
  continut: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20V3H6.5A2.5 2.5 0 0 0 4 5.5zM9 7h7M9 11h5',
  site: 'M3 5h18v14H3zM3 9h18M7 7h.01M10 7h.01'
};
const DESC = {
  proiect: 'Ce e scris o singură dată și apare peste tot: date firmă, cifre, avantaje, tehnologie, premii.',
  imobiliar: 'Tipurile de locuințe, cu fișa tehnică și prețul, și nivelurile Community Card.',
  comunitate: 'Afacerile de la parter și ce spun rezidenții.',
  continut: 'Articolele, categoriile și paginile site-ului, compuse din secțiuni.',
  site: 'Meniuri, formulare, cereri, media, redirecționări și etichetele interfeței.'
};

export default async function Entitati() {
  const db = await getDb();
  const stats = Object.fromEntries(await Promise.all(ENTITIES.map(async e => [e.key, await typeStats(db, e.key)])));
  return (
    <>
      <div className="head"><div><div className="crumb"><a href="/manage/">manage</a></div><h1>Entități</h1></div></div>
      <p className="lead">Tot ce știe Brain-ul despre site, pe tipuri. Fiecare tip e declarat o singură dată în registru; de aici se deschid listele și fișele.</p>
      <div className="cats">
        {CATEGORIES.map(c => {
          const types = ENTITIES.filter(e => e.category === c.key && e.hub !== false);
          const total = types.reduce((n, e) => n + stats[e.key].total, 0);
          return (
            <div key={c.key} className="cat">
              <div className="cat-top"><span className="cat-ico"><svg viewBox="0 0 24 24"><path d={ICON[c.key]}/></svg></span><span className="cat-total">{total}</span></div>
              <h3>{c.label}</h3>
              <p className="muted small" style={{margin: 0}}>{DESC[c.key]}</p>
              <div className="cat-types">
                {types.map(e => {
                  const s = stats[e.key];
                  const missingEn = typeof e.public?.path === 'function' ? s.total - (s.tr.en ?? 0) : 0;
                  return (
                    <a key={e.key} href={`/manage/entitati/${e.key}/`}>
                      <i style={{background: e.color}}/><span>{e.label}</span>
                      {s.drafts ? <span className="tag warn">{s.drafts} ciorne</span> : null}
                      {missingEn ? <span className="tag grey">{missingEn} fără EN</span> : null}
                      {s.inferred ? <span className="tag gold">{s.inferred} de verificat</span> : null}
                      <b>{s.total}</b>
                    </a>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
