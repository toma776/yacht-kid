'use client';
// „Vezi filmul”: deschide filmul întreg (cu sunet și controale) într-un dialog. Cu „mișcare redusă” cerută de sistem,
// filmul din fundal se oprește și rămâne fotografia.
import {useEffect, useRef} from 'react';
import {Icon} from '../../../site/ui/Icons.jsx';

export default function HeroFilm({src, poster}) {
  const dlg = useRef(null), vid = useRef(null);

  useEffect(() => {
    const bg = document.querySelector('[data-x5-bg]');
    if (bg && matchMedia('(prefers-reduced-motion: reduce)').matches) { bg.pause(); bg.removeAttribute('autoplay'); }
  }, []);

  const open = () => { dlg.current?.showModal(); vid.current?.play().catch(() => {}); };
  const close = () => { vid.current?.pause(); dlg.current?.close(); };

  return (
    <>
      <button type="button" className="x5-film" onClick={open}>
        <span className="x5-film-ic"><Icon id="play" size={16}/></span>
        <span>Vezi filmul</span>
      </button>
      <dialog ref={dlg} className="x5-dialog" aria-label="Filmul YACHT KID" onClose={() => vid.current?.pause()} onClick={e => { if (e.target === dlg.current) close(); }}>
        <button type="button" className="x5-dialog-close" onClick={close} aria-label="Închide"><Icon id="close" size={24}/></button>
        <video ref={vid} controls playsInline preload="none" poster={poster}><source src={src} type="video/mp4"/></video>
      </dialog>
    </>
  );
}
