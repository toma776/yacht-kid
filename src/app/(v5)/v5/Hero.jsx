// Hero-ul v5: filmul ansamblului pe tot ecranul (în buclă, fără sunet; fotografia cât se încarcă), cu meniul
// transparent peste el. Titlul urcă pe cuvinte la încărcare; la derulare, filmul se adâncește și textul urcă mai repede
// (--p vine din Motion.jsx). Jos: „Vezi filmul” și indicația de derulare; sub hero, banda de date.
import {Icon} from '../../../site/ui/Icons.jsx';
import HeroFilm from './HeroFilm';
import {Words} from './parts';

export default function Hero({hero, t}) {
  if (!hero) return null;
  const {image, video} = hero;
  return (
    <section className="x5" aria-labelledby="x5-title">
      <div className="x5-stage" data-scene>
        <div className="x5-media" aria-hidden="true">
          {image && <img src={image.src} srcSet={image.srcSet} sizes="100vw" alt="" fetchPriority="high" decoding="async"/>}
          {video && <video autoPlay muted loop playsInline preload="metadata" poster={video.bg.poster ?? image?.src} data-x5-bg>
            <source src={video.start ? `${video.bg.src}#t=${video.start}` : video.bg.src} type="video/mp4"/>
          </video>}
        </div>
        <div className="x5-shade" aria-hidden="true"/>
        <div className="h5-wrap x5-inner">
          <div className="x5-copy">
            {hero.eyebrow && <p className="v5-eyebrow x5-eyebrow">{hero.eyebrow}</p>}
            <h1 className="x5-title" id="x5-title"><Words text={hero.heading}/></h1>
            {hero.text && <p className="x5-sub">{hero.text}</p>}
            <div className="x5-actions">
              {hero.primary && <a className="v5-btn v5-btn--light" href={hero.primary.href}>{hero.primary.label} <Icon id="arrow" size={16}/></a>}
              {hero.secondary && <a className="v5-btn v5-btn--line" href={hero.secondary.href}>{hero.secondary.label} <Icon id="calendar" size={16}/></a>}
            </div>
          </div>
          {video && <HeroFilm src={video.full.src} poster={video.full.poster ?? image?.src} t={t}/>}
        </div>
        <span className="x5-cue" aria-hidden="true"><i/>{t.scroll}</span>
      </div>

      {hero.band.length > 0 && (
        <div className="h5-wrap">
          <dl className="x5-band">
            {hero.band.map((d, i) => (
              <div key={d.label} className="x5-datum" data-rv style={{'--d': `${i * 90}ms`}}>
                <dt>{d.label}</dt>
                <dd><b>{d.value}</b>{d.unit && <span> {d.unit}</span>}</dd>
              </div>
            ))}
          </dl>
        </div>
      )}
    </section>
  );
}
