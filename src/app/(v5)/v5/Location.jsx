// Locația v5: bandă navy. Sus, titlul în stânga (urcă pe cuvinte) și textul în dreapta; dedesubt, harta 3D a site-ului
// pe toată lățimea (MapLibre, reperele din Brain), cu lista reperelor sub ea; jos, adresa, Google Maps și butonul.
import {Icon} from '../../../site/ui/Icons.jsx';
import LocationMap from '../../../site/ui/LocationMap.jsx';
import {Words} from './parts';

export default function Location({data, lang, maps, t}) {
  if (!data) return null;
  return (
    <section className="l5" id={data.anchor} aria-labelledby="l5-title">
      <div className="h5-wrap">
        <header className="l5-head">
          <div>
            <p className="v5-eyebrow l5-eyebrow" data-rv>{data.eyebrow}</p>
            <h2 className="l5-title" id="l5-title" data-rv="words"><Words text={data.heading}/></h2>
          </div>
          <div className="l5-copy" data-rv style={{'--d': '200ms'}}>
            {data.paras.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </header>

        <div className="l5-map" data-rv>
          {data.map
            ? <LocationMap {...data.map} lang={lang} fallback={data.fallback}/>
            : data.fallback && <figure className="l5-static"><img src={data.fallback.src} alt={data.fallback.alt} loading="lazy"/></figure>}
        </div>

        <div className="l5-foot" data-rv>
          {data.address && (
            <address className="l5-address">
              <Icon id="pin" size={20}/>
              <span>{data.address}</span>
            </address>
          )}
          <div className="l5-actions">
            {maps && <a className="l5-link" href={maps} target="_blank" rel="noopener">{t.openMaps} <Icon id="arrow" size={14}/></a>}
            {data.cta && <a className="v5-btn v5-btn--light" href={data.cta.href}>{data.cta.label} <Icon id="arrow" size={16}/></a>}
          </div>
        </div>
      </div>
    </section>
  );
}
