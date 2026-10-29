// Piese comune secțiunilor (Sections.jsx) și compozițiilor homepage-ului (Compositions.jsx): titlul de secțiune,
// butoanele din câmpul `buttons`, extragerea paragrafelor, listelor și figurilor din textul bogat.
import {fillTokens} from '../rich.mjs';
import {resolveTo} from '../chrome.mjs';
import {Icon} from './Icons.jsx';

export const strip = html => (html ?? '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
export const num = i => String(i + 1).padStart(2, '0');
export const Arrow = () => <Icon id="arrow"/>;

export async function buttons(ctx, s, values) {
  return Promise.all((s.buttons ?? []).map(async b => ({...b, label: fillTokens(b.label, values), href: await resolveTo(ctx, b.to)})));
}
export const Btn = ({b, cls = 'btn', icon = 'arrow'}) => b?.href ? <a className={cls} href={b.href} {...(b.video ? {'data-video-open': ''} : {})}>{b.label} <span className="btn-icon"><Icon id={b.video ? 'play' : icon}/></span></a> : null;

// h1: secțiunea care deschide o pagină fără hero (Contact) poartă titlul paginii
export const Head = ({s, values, id, cls = '', h1 = false}) => {
  const H = h1 ? 'h1' : 'h2';
  return <>
    {s.eyebrow && <p className={`eyebrow reveal ${cls}`}>{fillTokens(s.eyebrow, values)}</p>}
    {s.heading && <H className="h2 ruled reveal" id={id} style={{'--d': '80ms'}}>{fillTokens(s.heading, values)}</H>}
  </>;
};

export function mediaVideo(m, quality) {
  const r = (m?.renditions ?? []).find(x => x.quality === quality) ?? m?.renditions?.[0];
  return {src: r?.file ?? `/media/${m?.id}/`, poster: m?.poster};
}

// Din HTML-ul randat: paragrafele (text), elementele listelor (<li>, cu <b> ca titlu) și figurile (src + alt), în ordine
export const parasOf = html => (html.match(/<p>[\s\S]*?<\/p>/g) ?? []).map(strip).filter(Boolean);
export const itemsOf = html => (html.match(/<li>[\s\S]*?<\/li>/g) ?? []).map(li => {
  const title = li.match(/<(?:b|strong)>([\s\S]*?)<\/(?:b|strong)>/)?.[1];
  return {title: title ? strip(title) : null, text: strip(title ? li.replace(/<(?:b|strong)>[\s\S]*?<\/(?:b|strong)>/, '') : li)};
});
export const figuresOf = html => [...html.matchAll(/<figure>([\s\S]*?)<\/figure>/g)].map(m => ({
  src: m[1].match(/src="([^"]+)"/)?.[1], alt: m[1].match(/alt="([^"]*)"/)?.[1] ?? '', caption: strip(m[1].match(/<figcaption>([\s\S]*?)<\/figcaption>/)?.[1] ?? '')
})).filter(f => f.src);
