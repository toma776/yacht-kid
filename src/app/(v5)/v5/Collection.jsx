'use client';
// Colecția de apartamente v5: un selector de tipologii, nu o listă de unități. Pe desktop, fotografia mare din stânga
// urmează tipul ales în dreapta (click; fără hover, ca rândurile să nu se miște sub cursor): fotografia nouă intră
// ca o cortină peste cea veche; tipul ales se deschide cu descrierea, datele și acțiunile.
// Pe mobil, fiecare tip e un card cu fotografia lui, toate deschise.
import {useState} from 'react';
import {Icon} from '../../../site/ui/Icons.jsx';

const num = i => String(i + 1).padStart(2, '0');

export default function Collection({data, t: tx}) {
  // on: tipul ales; prev: cel dinainte, care rămâne dedesubt cât intră fotografia nouă
  const [{on: active, prev}, setSel] = useState({on: 0, prev: null});
  const pick = i => setSel(s => i === s.on ? s : {on: i, prev: s.on});
  if (!data?.items.length) return null;
  const {items} = data;

  return (
    <section className="c5" id={data.anchor} aria-labelledby="c5-title">
      <div className="h5-wrap">
        <header className="c5-head" data-rv>
          <div>
            <p className="v5-eyebrow">{data.eyebrow}</p>
            <h2 className="c5-title" id="c5-title">{data.heading}</h2>
          </div>
          {data.text && <p className="c5-lead">{data.text}</p>}
        </header>

        <div className="c5-grid">
          <div className="c5-stage" aria-hidden="true" data-rv>
            {items.map((t, i) => t.image && (
              <img key={t.id} src={t.image.src} srcSet={t.image.srcSet} sizes="(max-width: 1023px) 100vw, 58vw" alt="" loading="lazy" decoding="async"
                data-on={i === active || undefined} data-prev={i === prev || undefined}/>
            ))}
            <span className="c5-count"><b>{num(active)}</b> / {num(items.length - 1)}</span>
          </div>

          <ol className="c5-list" data-rv>
            {items.map((t, i) => {
              const on = i === active;
              return (
                <li key={t.id} className="c5-item" data-on={on || undefined}>
                  <button type="button" className="c5-row" aria-expanded={on} aria-controls={`c5-b${t.id}`} onClick={() => pick(i)}>
                    <span className="c5-num">{num(i)}</span>
                    <span className="c5-name">{t.short}</span>
                    {t.price && <span className="c5-price"><small>{tx.from}</small> {t.price}</span>}
                    <Icon id="chevron" size={14} className="c5-chev"/>
                  </button>
                  <div className="c5-body" id={`c5-b${t.id}`}>
                    <div className="c5-body-in">
                      {t.image && <a className="c5-img" href={t.href} tabIndex={-1} aria-hidden="true"><img src={t.image.src} srcSet={t.image.srcSet} sizes="100vw" alt="" loading="lazy" decoding="async"/></a>}
                      <p className="c5-full">{t.name}</p>
                      {t.intro && <p className="c5-intro">{t.intro}</p>}
                      <dl className="c5-specs">
                        {t.specs.map(s => <div key={s.label}><dt>{s.label}</dt><dd>{s.value}</dd></div>)}
                        {t.price && <div className="c5-spec-price"><dt>{tx.priceFrom}</dt><dd>{t.price} <small>{t.vat}</small></dd></div>}
                      </dl>
                      <div className="c5-actions">
                        <a className="v5-btn" href={t.href}>{t.viewLabel} <Icon id="arrow" size={16}/></a>
                        {data.visit && <a className="c5-link" href={data.visit}>{tx.visit}</a>}
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
    </section>
  );
}
