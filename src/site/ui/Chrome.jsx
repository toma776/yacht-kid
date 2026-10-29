// Rama site-ului, după design/homepage: antetul cu plăcile (mega), meniul pe mobil, subsolul și bara de contact.
// Nu conține text scris aici: etichetele vin din `etichete`, meniurile din `meniuri`, contactul din Date firmă.
import {Icon} from './Icons.jsx';

const num = i => String(i + 1).padStart(2, '0');
const Arrow = () => <Icon id="arrow"/>;

function Langs({chrome, className = 'langs'}) {
  const {alternates, lang} = chrome;
  return (
    <nav className={className} aria-label={chrome.labels.limba ?? 'Limba'}>
      {['ro', 'en'].map(l => <a key={l} href={alternates[l] ?? (l === 'ro' ? '/' : '/en/')} hrefLang={l} aria-current={l === lang ? 'true' : undefined}>{l.toUpperCase()}</a>)}
    </nav>
  );
}

function MegaUnits({item, chrome}) {
  return (
    <>
      <ul className="mega-units">
        {item.children.filter(c => c.unit).map((c, i) => (
          <li key={c.unit.id}><a className="mega-unit" href={c.href}>
            <span className="frame mega-frame">{c.unit.image && <img src={c.unit.image} alt="" decoding="async" loading="lazy"/>}</span>
            <span className="mega-unit-meta"><span className="num">{num(i)}</span><span className="mega-unit-title">{c.unit.name}{(c.unit.area || c.unit.price) && <small>{[c.unit.area, c.unit.price].filter(Boolean).join(' · ')}</small>}</span><svg className="mega-go" width="16" height="16" aria-hidden="true"><use href="#i-arrow"/></svg></span>
          </a></li>
        ))}
      </ul>
      {item.aside && (
        <aside className="mega-aside on-dark">
          <p className="eyebrow">{item.aside.eyebrow}</p>
          <p className="mega-aside-title">{item.aside.title}</p>
          {chrome.firma && <a className="mega-phone" href={`tel:${chrome.firma.phone}`}><Icon id="phone" size={18}/>{chrome.firma.phoneLabel}</a>}
          {item.aside.cta?.href && <a className="btn btn--sm" href={item.aside.cta.href}>{item.aside.cta.label} <span className="btn-icon"><Icon id="calendar"/></span></a>}
        </aside>
      )}
    </>
  );
}

// Placa Proiectul: capitolele, iar pe ultima coloană harta zonei, care duce la harta interactivă (secțiunea Locație)
function MegaTopics({item, chrome}) {
  const L = chrome.labels, map = item.mega === 'proiect' ? chrome.map : null;
  return (
    <ul className="mega-topics">
      {item.children.map(c => (
        <li key={c.href}><a className="mega-topic" href={c.href}>
          <span className="frame mega-topic-frame">{c.image && <img src={c.image} alt="" decoding="async" loading="lazy"/>}</span>
          <span className="mega-topic-text"><span className="mega-topic-ic"><Icon id={c.icon ?? 'arrow'} size={22}/></span><span><b>{c.label}</b><small>{c.desc}</small></span></span>
        </a></li>
      ))}
      {map && (
        <li><a className="mega-topic mega-map" href={map.href} data-mega-close>
          <span className="frame mega-topic-frame">{map.image && <img src={map.image} alt="" decoding="async" loading="lazy"/>}</span>
          <span className="mega-topic-text"><span className="mega-topic-ic"><Icon id="location" size={22}/></span><span><b>{L['harta-interactiva'] ?? 'Harta interactivă'}</b><small>{L['harta-interactiva-text'] ?? 'Lacul, parcul și tot ce e în jur, pe harta 3D.'}</small></span></span>
        </a></li>
      )}
    </ul>
  );
}

export function Header({chrome, solid = false}) {
  const L = chrome.labels;
  const items = chrome.header.filter(i => !i.cta);
  return (
    <>
      <header className={`site-header${solid ? ' is-solid' : ''}`} data-header>
        <div className="header-inner wrap">
          <a className="logo" href={chrome.home} aria-label={`YACHT KID, ${L['pagina-principala'] ?? 'pagina principală'}`}>
            <img className="logo-light" src="/media/1/" alt="" width="275" height="168"/>
            <img className="logo-dark" src="/media/2/" alt="" width="275" height="168"/>
          </a>
          <nav className="nav" aria-label={L['meniul-principal'] ?? 'Meniul principal'} data-nav>
            <span className="nav-pill" aria-hidden="true" data-nav-pill/>
            <ul>
              {items.map((it, i) => it.mega ? (
                <li key={i} className="has-mega">
                  <button type="button" aria-expanded="false" aria-controls={`mega-${i}`} data-mega-toggle={`mega-${i}`}>{it.label} <Icon id="chevron" size={12}/></button>
                  <div className="mega" id={`mega-${i}`} data-mega>
                    <div className={`wrap mega-inner ${it.mega === 'proiect' ? 'mega-inner--project' : ''}`}>
                      <div className="mega-intro">
                        <p className="eyebrow">{it.eyebrow}</p>
                        <p className="mega-title">{it.title}</p>
                        {it.more?.href && <a className="link-arrow" href={it.more.href} data-mega-close>{it.more.label} <Arrow/></a>}
                      </div>
                      {it.mega === 'locuinte' ? <MegaUnits item={it} chrome={chrome}/> : <MegaTopics item={it} chrome={chrome}/>}
                    </div>
                  </div>
                </li>
              ) : <li key={i}><a href={it.href}>{it.label}</a></li>)}
            </ul>
          </nav>
          <div className="header-actions">
            <Langs chrome={chrome}/>
            {chrome.firma && <a className="header-phone" href={`tel:${chrome.firma.phone}`} aria-label={`${L.telefon ?? 'Telefon'}: ${chrome.firma.phoneLabel}`}><Icon id="phone" size={16}/><span>{chrome.firma.phoneLabel}</span></a>}
            {/* Intenția avansată (vizionarea) stă mereu la vedere; oferta rămâne în hero, în secțiuni și în subsol */}
            <a className="btn btn--sm header-cta" href={chrome.header.find(i => i.mega === 'locuinte')?.aside?.cta?.href ?? chrome.contactHref}>{L['programeaza-vizionare'] ?? 'Programează o vizionare'}</a>
            <button className="menu-toggle" type="button" aria-expanded="false" aria-controls="mobile-menu" data-menu-toggle><span/><span/><span className="sr-only" data-label-open={L.meniu ?? 'Meniu'} data-label-close={L['inchide-meniul'] ?? 'Închide meniul'}>{L.meniu ?? 'Meniu'}</span></button>
          </div>
        </div>
      </header>
      <div className="mega-scrim" data-mega-scrim/>
      <MobileMenu chrome={chrome} items={items}/>
    </>
  );
}

// Meniul pe mobil: tipurile de locuințe ca fotografii, proiectul pe rânduri, contactul și o bară de acțiune fixă
function MobileMenu({chrome, items}) {
  const L = chrome.labels, f = chrome.firma;
  const units = items.find(i => i.mega === 'locuinte');
  const topics = items.find(i => i.mega === 'proiect');
  const links = [...items.filter(i => !i.mega), ...chrome.footer.flatMap(g => g.children ?? []).filter(c => c.mobile)];
  const unitCards = units?.children.filter(c => c.unit) ?? [];
  let n = 0;
  return (
    <div className="mobile-menu" id="mobile-menu" role="dialog" aria-modal="true" aria-label={L.meniu ?? 'Meniu'} hidden data-mobile-menu>
      <svg className="mm-waves" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="1.2" vectorEffect="non-scaling-stroke"><path d="M0 20c25 0 25 14 50 14s25-14 50-14 25 14 50 14 25-14 50-14 25 14 50 14 25-14 50-14 25 14 50 14 25-14 50-14"/><path d="M0 50c25 0 25 14 50 14s25-14 50-14 25 14 50 14 25-14 50-14 25 14 50 14 25-14 50-14 25 14 50 14 25-14 50-14"/><path d="M0 80c25 0 25 14 50 14s25-14 50-14 25 14 50 14 25-14 50-14 25 14 50 14 25-14 50-14 25 14 50 14 25-14 50-14"/></g></svg>
      <div className="mm-scroll">
        <div className="wrap mm-top mm-in" style={{'--i': n++}}>
          <Langs chrome={chrome} className="mm-langs"/>
          {f && <a className="mm-call" href={`tel:${f.phone}`}><Icon id="phone" size={16}/>{f.phoneLabel}</a>}
        </div>
        {units && (
          <section className="mm-block" aria-labelledby="mm-ap">
            <div className="wrap mm-head mm-in" style={{'--i': n++}}>
              <p className="eyebrow on-dark" id="mm-ap">{units.label}</p>
              <span className="mm-count num" data-mm-count>1 / {unitCards.length}</span>
            </div>
            <ul className="mm-units" data-mm-units>
              {unitCards.map((c, i) => (
                <li key={c.unit.id} className="mm-in" style={{'--i': n++}}><a className="mm-unit" href={c.href}>
                  <span className="mm-unit-img">{c.unit.image && <img src={c.unit.image} alt="" decoding="async" loading="lazy"/>}</span>
                  <span className="mm-unit-body"><span className="num">{num(i)}</span><b>{c.short ?? c.unit.name}</b><small>{[c.unit.area, c.unit.price].filter(Boolean).join(' · ')}</small></span>
                </a></li>
              ))}
            </ul>
          </section>
        )}
        <section className="wrap mm-block" aria-labelledby="mm-pr">
          {topics && <>
            <p className="eyebrow on-dark mm-in" style={{'--i': n++}} id="mm-pr">{topics.label}</p>
            <ul className="mm-rows">
              {topics.children.map(c => (
                <li key={c.href} className="mm-in" style={{'--i': n++}}><a href={c.href}><span className="mm-ic"><Icon id={c.icon ?? 'arrow'} size={22}/></span><span><b>{c.label}</b><small>{c.short ?? c.desc}</small></span><svg className="mm-go" width="16" height="16" aria-hidden="true"><use href="#i-arrow"/></svg></a></li>
              ))}
            </ul>
          </>}
          <ul className="mm-links mm-in" style={{'--i': n++}}>{links.map(l => <li key={l.href}><a href={l.href}>{l.label}</a></li>)}</ul>
          {f && <address className="mm-address mm-in" style={{'--i': n++}}><Icon id="pin" size={18}/><span>{f.address}{f.schedule && <small>{f.schedule}</small>}</span></address>}
        </section>
      </div>
      <div className="mm-bar">
        <a className="btn mm-bar-main" href={units?.aside?.cta?.href ?? chrome.contactHref}><span>{L['programeaza-vizionare'] ?? 'Programează o vizionare'}</span> <span className="btn-icon"><Icon id="calendar"/></span></a>
        {f && <a className="mm-bar-ic" href={`tel:${f.phone}`} aria-label={`${L.telefon ?? 'Telefon'}: ${f.phoneLabel}`}><Icon id="phone" size={20}/></a>}
        {f && <a className="mm-bar-ic" href={f.whatsapp} aria-label={L['scrie-ne-whatsapp'] ?? 'WhatsApp'}><Icon id="whatsapp" size={20}/></a>}
      </div>
    </div>
  );
}

export function Footer({chrome}) {
  const L = chrome.labels, f = chrome.firma;
  const SOCIAL = {facebook: 'facebook', instagram: 'instagram', linkedin: 'linkedin'};
  const cols = chrome.footer.filter(g => !g.legal);
  const legal = chrome.footer.find(g => g.legal);
  return (
    <>
      {/* Subsolul: compact, fără colțuri rotunjite. Sus: marca și acțiunile (ofertă, vizionare, broșură); apoi contactul,
          biroul de vânzări, linkurile (din meniul „subsol”) și informațiile legale; jos: datele firmei, ANPC, limba. */}
      <footer className="site-footer bg-plinth on-dark" aria-label="YACHT KID">
        <div className="wrap">
          <div className="ft-top-row">
            <a className="ft-logo" href={chrome.home} aria-label="YACHT KID"><img src="/media/1/" alt="" width="275" height="168" loading="lazy"/></a>
            <p className="ft-tagline">{L['subsol-tagline']}</p>
            <div className="ft-actions">
              <a className="btn" href={chrome.contactHref}>{L['solicita-oferta']} <span className="btn-icon"><Arrow/></span></a>
              <a className="btn btn--glass" href={chrome.header.find(i => i.mega === 'locuinte')?.aside?.cta?.href ?? chrome.contactHref}>{L['programeaza-vizionare']} <span className="btn-icon"><Icon id="calendar"/></span></a>
              {chrome.brochure && <a className="ft-brochure" href={chrome.brochure} target="_blank" rel="noopener" download>{L['brosura-descarca'] ?? 'Descarcă broșura'} <span>PDF</span></a>}
            </div>
          </div>
          <div className="ft-grid">
            {f && (
              <div className="ft-col">
                <h3 className="ft-h">Contact</h3>
                <ul className="ft-contact">
                  <li><Icon id="phone" size={16}/><a href={`tel:${f.phone}`}>{f.phoneLabel}</a></li>
                  <li><Icon id="mail" size={16}/><a href={`mailto:${f.email}`}>{f.email}</a></li>
                  <li><Icon id="whatsapp" size={16}/><a href={f.whatsapp}>{L['scrie-ne-whatsapp']}</a></li>
                </ul>
                {f.schedule && <p className="ft-hours"><span>{L.program}</span>{f.schedule}</p>}
              </div>
            )}
            {f && (
              <div className="ft-col">
                <h3 className="ft-h">{L['birou-vanzari'] ?? L['vizitati-ne']}</h3>
                <address className="ft-address">{f.street}<br/>{chrome.lang === 'en' ? 'Bucharest' : f.city} {f.postal_code}</address>
                <a className="ft-maps" href={f.maps} target="_blank" rel="noopener"><Icon id="pin" size={16}/>{L['deschide-maps']}</a>
                <ul className="ft-social" aria-label={L['retele-sociale'] ?? 'Rețele sociale'}>
                  {(f.social ?? []).map(x => { const id = SOCIAL[x.label.toLowerCase()]; return id && <li key={x.url}><a href={x.url} aria-label={x.label}><Icon id={id} size={16}/></a></li>; })}
                </ul>
              </div>
            )}
            {cols.map((g, i) => (
              <nav key={g.label} className="ft-col" aria-labelledby={`ft-c${i}`}>
                <h3 className="ft-h" id={`ft-c${i}`}>{g.label}</h3>
                <ul className="ft-links">{g.children.map(c => <li key={c.href}><a href={c.href}>{c.label}</a></li>)}</ul>
              </nav>
            ))}
            {legal && (
              <nav className="ft-col" aria-labelledby="ft-legal">
                <h3 className="ft-h" id="ft-legal">{legal.label}</h3>
                <ul className="ft-links">{legal.children.map(c => <li key={c.href}><a href={c.href}>{c.label}</a></li>)}</ul>
              </nav>
            )}
          </div>
          <div className="ft-bottom">
            {f && <p className="ft-company">© {new Date().getFullYear()} YACHT KID · {f.legal_name} · CUI {f.cui} · {f.reg_com} · {L['sediu-social']}: {f.registered_office}</p>}
            <div className="anpc">
              <a href="https://anpc.ro/ce-este-sal/"><img src="/media/8/" alt="ANPC SAL" width="250" height="62" loading="lazy"/></a>
              <a href="https://ec.europa.eu/consumers/odr/main/index.cfm?event=main.home2.show&lng=RO"><img src="/media/9/" alt="SOL" width="250" height="62" loading="lazy"/></a>
            </div>
            <div className="ft-bottom-actions">
              <Langs chrome={chrome}/>
              <a className="ft-top" href="#continut" data-to-top>{L.sus} <Icon id="arrow" size={14}/></a>
            </div>
          </div>
        </div>
      </footer>
      {f && (
        <nav className="dock" aria-label={L['contact-rapid'] ?? 'Contact rapid'}>
          <a href={`tel:${f.phone}`}><Icon id="phone" size={20}/>{L.telefon}</a>
          <a href={f.whatsapp}><Icon id="whatsapp" size={20}/>WhatsApp</a>
          <a href={`mailto:${f.email}`}><Icon id="mail" size={20}/>Email</a>
        </nav>
      )}
    </>
  );
}
