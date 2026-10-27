// Branding › Prezentare: coperta brandbook-ului, capitolele și ce am observat comparându-l cu site-ul.
import {BRANDBOOK, SECTIUNI, OBSERVATII, CULORI, TIPOGRAFIE} from '../../../../manage/brand.mjs';

export default function Prezentare() {
  const capitole = SECTIUNI.filter(s => s.slug && s.pagini.length);
  return (
    <>
      <div className="bb-hero">
        <div><h2>{BRANDBOOK.titlu}</h2><p>{BRANDBOOK.subtitlu}</p></div>
        <img src="/brand/logo-negativ.png" alt="Logo YACHT KID, negativ"/>
      </div>
      <div className="kpis">
        <a className="kpi" href="/manage/branding/variante/"><b>6</b><span>variante de logo</span><small>A–F, pe fond închis și deschis</small></a>
        <a className="kpi" href="/manage/branding/culori/"><b>{CULORI.primare.length + CULORI.secundare.length * 2}</b><span>culori</span><small>2 primare, 6 secundare, 2 gradiente</small></a>
        <a className="kpi" href="/manage/branding/tipografie/"><b>1</b><span>familie de litere</span><small>{TIPOGRAFIE.familie}</small></a>
        <a className="kpi" href="/manage/branding/pagini/"><b>{BRANDBOOK.pagini}</b><span>pagini</span><small>{BRANDBOOK.format}</small></a>
      </div>
      <section>
        <h2>Capitole</h2>
        <div className="bb-chapters">
          {capitole.map(s => (
            <a key={s.slug} className="bb-chapter" href={`/manage/branding/${s.slug}/`}>
              <img src={BRANDBOOK.img(s.pagini[s.pagini.length > 1 ? 1 : 0])} alt="" loading="lazy"/>
              <div><b>{s.titlu}</b><small>{s.grup} · {s.pagini.length > 1 ? `paginile ${s.pagini[0]}–${s.pagini[s.pagini.length - 1]}` : `pagina ${s.pagini[0]}`}</small></div>
            </a>
          ))}
        </div>
      </section>
      <section>
        <h2>Observații</h2>
        <div className="card">
          {OBSERVATII.map((o, i) => <div key={i} className="bb-obs"><span className={`lvl ${o.nivel}`}>{o.nivel === 'ok' ? 'ok' : o.nivel}</span><span>{o.text}</span></div>)}
        </div>
      </section>
    </>
  );
}
