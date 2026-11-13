// YACHT KID · homepage v5, pornit de la zero: rama (antet cu meniu, subsol) și secțiunile, pe rând. Aceeași pagină
// pentru RO și EN; textele interfeței vin din chrome.t (i18n.mjs), conținutul din Brain.
import {IconSprite} from '../../../site/ui/Icons.jsx';
import Header from './Header';
import Footer from './Footer';
import Hero from './Hero';
import Collection from './Collection';
import Project from './Project';
import Features from './Features';
import Awards from './Awards';
import Location from './Location';
import Viewing from './Viewing';
import Contact from './Contact';

export default function V5({chrome, hero, collection, project, features, awards, location, viewing, contact}) {
  const t = chrome.t;
  return (
    <>
      <IconSprite/>
      <a className="v5-skip" href="#continut">{t.skip}</a>
      <Header chrome={chrome}/>
      <main id="continut" className="v5-main">
        <Hero hero={hero} t={t}/>
        <Collection data={collection} t={t}/>
        <Project data={project} t={t}/>
        <Features data={features}/>
        <Awards data={awards} t={t}/>
        <Location data={location} lang={chrome.lang} maps={chrome.firma?.maps} t={{...t, openMaps: chrome.labels['deschide-maps'] ?? t.openMaps}}/>
        <Viewing data={viewing}/>
        <Contact data={contact} firma={chrome.firma} labels={chrome.labels} t={t}/>
      </main>
      <Footer chrome={chrome}/>
    </>
  );
}
