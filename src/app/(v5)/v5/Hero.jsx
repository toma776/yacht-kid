// Hero-ul v5: o fereastră mare spre ansamblu (filmul în buclă, fără sunet; fotografia cât se încarcă), cu titlul jos,
// în stânga, și „Vezi filmul” în dreapta; dedesubt, banda de date, cu linii fine între cifre.
import {Icon} from '../../../site/ui/Icons.jsx';
import HeroFilm from './HeroFilm';

export default function Hero({hero, t}) {
  if (!hero) return null;
  const {image, video} = hero;
  return (
    <section className="x5" aria-labelledby="x5-title">
      <div className="h5-wrap">
        <div className="x5-stage">
          <div className="x5-media" aria-hidden="true">
            {image && <img src={image.src} srcSet={image.srcSet} sizes="100vw" alt="" fetchPriority="high" decoding="async"/>}
            {video && <video autoPlay muted loop playsInline preload="metadata" poster={video.bg.poster ?? image?.src} data-x5-bg>
              <source src={video.start ? `${video.bg.src}#t=${video.start}` : video.bg.src} type="video/mp4"/>
            </video>}
          </div>
          <div className="x5-shade" aria-hidden="true"/>
          <div className="x5-copy">
            {hero.eyebrow && <p className="v5-eyebrow x5-eyebrow">{hero.eyebrow}</p>}
            <h1 className="x5-title" id="x5-title">{hero.heading}</h1>
            {hero.text && <p className="x5-sub">{hero.text}</p>}
            <div className="x5-actions">
              {hero.primary && <a className="v5-btn v5-btn--light" href={hero.primary.href}>{hero.primary.label} <Icon id="arrow" size={16}/></a>}
              {hero.secondary && <a className="v5-btn v5-btn--line" href={hero.secondary.href}>{hero.secondary.label} <Icon id="calendar" size={16}/></a>}
            </div>
          </div>
          {video && <HeroFilm src={video.full.src} poster={video.full.poster ?? image?.src} t={t}/>}
        </div>

        {hero.band.length > 0 && (
          <dl className="x5-band">
            {hero.band.map(d => (
              <div key={d.label} className="x5-datum">
                <dt>{d.label}</dt>
                <dd><b>{d.value}</b>{d.unit && <span> {d.unit}</span>}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>
    </section>
  );
}
