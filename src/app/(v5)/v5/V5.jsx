// YACHT KID · homepage v5, pornit de la zero: rama (antet cu meniu, subsol) și secțiunile, în ordinea homepage-ului.
// Aceeași pagină pentru RO și EN; textele interfeței vin din chrome.t (i18n.mjs), conținutul din Brain.
// Mișcarea (apariții, parallax, scene la derulare) pornește din Motion.jsx și se oprește singură la „mișcare redusă”.
import {IconSprite} from '../../../site/ui/Icons.jsx';
import Motion from './Motion';
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

export default function V5({chrome, hero, building, collection, project, features, awards, location, viewing, contact}) {
  const t = chrome.t;
  return (
    <>
      <IconSprite/>
      <a className="v5-skip" href="#continut">{t.skip}</a>
      <Header chrome={chrome}/>
      <main id="continut" className="v5-main">
        <Hero hero={hero} t={t}/>
        <Project data={project} building={building} t={t}/>
        <Features data={features}/>
        <Collection data={collection} t={t}/>
        <Awards data={awards} t={t}/>
        <Location data={location} lang={chrome.lang} maps={chrome.firma?.maps} t={{...t, openMaps: chrome.labels['deschide-maps'] ?? t.openMaps}}/>
        <Viewing data={viewing}/>
        <Contact data={contact} firma={chrome.firma} labels={chrome.labels} t={t}/>
      </main>
      <Footer chrome={chrome}/>
      <Motion/>
    </>
  );
}
