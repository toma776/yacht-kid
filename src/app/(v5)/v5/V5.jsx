// YACHT KID · homepage v5, pornit de la zero. Deocamdată: rama (antet cu meniu, subsol); conținutul vine pe rând.
import {IconSprite} from '../../../site/ui/Icons.jsx';
import Header from './Header';
import Footer from './Footer';

export default function V5({chrome}) {
  return (
    <>
      <IconSprite/>
      <a className="v5-skip" href="#continut">Sari la conținut</a>
      <Header chrome={chrome}/>
      <main id="continut" className="v5-main">
        <section className="v5-placeholder">
          <p className="v5-eyebrow">Homepage v5</p>
          <p className="v5-placeholder-title">Conținutul paginii vine aici.</p>
        </section>
      </main>
      <Footer chrome={chrome}/>
    </>
  );
}
