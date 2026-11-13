// YACHT KID · homepage v5, pornit de la zero: rama (antet cu meniu, subsol) și secțiunile, pe rând.
import {IconSprite} from '../../../site/ui/Icons.jsx';
import Header from './Header';
import Footer from './Footer';
import Hero from './Hero';

export default function V5({chrome, hero}) {
  return (
    <>
      <IconSprite/>
      <a className="v5-skip" href="#continut">Sari la conținut</a>
      <Header chrome={chrome}/>
      <main id="continut" className="v5-main">
        <Hero hero={hero}/>
        <section className="v5-placeholder">
          <p className="v5-eyebrow">Homepage v5</p>
          <p className="v5-placeholder-title">Următoarele secțiuni vin aici.</p>
        </section>
      </main>
      <Footer chrome={chrome}/>
    </>
  );
}
