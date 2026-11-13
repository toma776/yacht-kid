// Vizionarea v5: o bandă pe toată lățimea, cu fotografia ansamblului, umbră navy doar sub text și o singură acțiune.
import {Icon} from '../../../site/ui/Icons.jsx';

export default function Viewing({data}) {
  if (!data) return null;
  return (
    <section className="v5v" id={data.anchor} aria-labelledby="v5v-title">
      {data.image && <img className="v5v-img" src={data.image.src} srcSet={data.image.srcSet} sizes="100vw" alt="" loading="lazy" decoding="async"/>}
      <div className="v5v-shade" aria-hidden="true"/>
      <div className="h5-wrap v5v-in">
        <p className="v5-eyebrow v5v-eyebrow">{data.eyebrow}</p>
        <h2 className="v5v-title" id="v5v-title">{data.heading}</h2>
        {data.cta && <a className="v5-btn v5-btn--light" href={data.cta.href}>{data.cta.label} <Icon id="calendar" size={16}/></a>}
      </div>
    </section>
  );
}
