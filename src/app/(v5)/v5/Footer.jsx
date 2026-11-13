// Subsolul v5: navy, pe trei niveluri. Sus: marca, o frază și acțiunile; la mijloc: contactul, biroul de vânzări
// și meniul „subsol” din Brain; jos: datele firmei, ANPC/SOL și „sus”.
import {Icon} from '../../../site/ui/Icons.jsx';
import {Waves} from './parts';

const SOCIAL = {facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedin'};

export default function Footer({chrome}) {
  const L = chrome.labels, f = chrome.firma;
  const visit = chrome.header.find(i => i.mega === 'locuinte')?.aside?.cta?.href ?? chrome.contactHref;
  return (
    <footer className="f5">
      <Waves className="f5-waves"/>
      <div className="h5-wrap">
        <div className="f5-top">
          <img className="f5-logo" src="/media/1/" alt="YACHT KID" width="275" height="168" loading="lazy"/>
          <p className="f5-tagline">{L['subsol-tagline']}</p>
          <div className="f5-actions">
            <a className="v5-btn v5-btn--light" href={chrome.contactHref}>{L['solicita-oferta'] ?? 'Solicită ofertă'} <Icon id="arrow" size={16}/></a>
            <a className="v5-btn v5-btn--line" href={visit}>{L['programeaza-vizionare'] ?? chrome.t.visit} <Icon id="calendar" size={16}/></a>
          </div>
        </div>

        <div className="f5-grid">
          {f && (
            <div className="f5-col">
              <h2 className="f5-h">Contact</h2>
              <ul className="f5-contact">
                <li><Icon id="phone" size={16}/><a href={`tel:${f.phone}`}>{f.phoneLabel}</a></li>
                <li><Icon id="mail" size={16}/><a href={`mailto:${f.email}`}>{f.email}</a></li>
                <li><Icon id="whatsapp" size={16}/><a href={f.whatsapp}>{L['scrie-ne-whatsapp'] ?? 'Scrie-ne pe WhatsApp'}</a></li>
              </ul>
              {f.schedule && <p className="f5-small"><span>{L.program ?? 'Program'}</span>{f.schedule}</p>}
            </div>
          )}
          {f && (
            <div className="f5-col">
              <h2 className="f5-h">{L['birou-vanzari'] ?? 'Birou de vânzări'}</h2>
              <address className="f5-address">{f.street}<br/>{chrome.t.city ?? f.city} {f.postal_code}</address>
              <a className="f5-maps" href={f.maps} target="_blank" rel="noopener"><Icon id="pin" size={16}/>{L['deschide-maps'] ?? 'Deschide în Maps'}</a>
              <ul className="f5-social" aria-label={L['retele-sociale'] ?? 'Rețele sociale'}>
                {(f.social ?? []).map(x => { const id = SOCIAL[x.label.toLowerCase()]; return id && <li key={x.url}><a href={x.url} aria-label={x.label}><Icon id={id} size={16}/></a></li>; })}
              </ul>
            </div>
          )}
          {chrome.footer.map((g, i) => (
            <nav key={g.label} className="f5-col" aria-labelledby={`f5-c${i}`}>
              <h2 className="f5-h" id={`f5-c${i}`}>{g.label}</h2>
              <ul className="f5-links">{g.children.map(c => <li key={c.href}><a href={c.href}>{c.label}</a></li>)}</ul>
            </nav>
          ))}
        </div>

        <div className="f5-bottom">
          {f && <p className="f5-company">© {new Date().getFullYear()} YACHT KID · {f.legal_name} · CUI {f.cui} · {f.reg_com}{f.registered_office && <> · {L['sediu-social'] ?? 'Sediu social'}: {f.registered_office}</>}</p>}
          <div className="f5-anpc">
            <a href="https://anpc.ro/ce-este-sal/"><img src="/media/8/" alt="ANPC SAL" width="250" height="62" loading="lazy"/></a>
            <a href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=RO"><img src="/media/9/" alt="SOL" width="250" height="62" loading="lazy"/></a>
          </div>
          <a className="f5-up" href="#continut">{L.sus ?? 'Sus'} <Icon id="arrow" size={14}/></a>
        </div>
      </div>
    </footer>
  );
}
