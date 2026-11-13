'use client';
// Mișcarea paginii v5, într-un singur loc și fără biblioteci:
//  · [data-rv]     apare când intră în ecran (primește data-in; forma animației e în v5-motion.css);
//  · [data-px="N"] parallax: elementul alunecă cu până la ±N px față de cadrul lui (--py), cât trece prin ecran;
//  · [data-scene]  primește --p (0 → 1): cât din secțiune a trecut de marginea de sus a ecranului.
// Cu „mișcare redusă” cerută de sistem nu pornește nimic: clasa v5-motion lipsește și tot conținutul stă la locul lui.
import {useEffect} from 'react';

export default function Motion() {
  useEffect(() => {
    const root = document.documentElement;
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('v5-motion');

    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { e.target.setAttribute('data-in', ''); io.unobserve(e.target); }
    }, {rootMargin: '0px 0px -10% 0px'});
    document.querySelectorAll('[data-rv]').forEach(el => io.observe(el));

    const px = [...document.querySelectorAll('[data-px]')].map(el => ({el, ref: el.closest('[data-px-ref]') ?? el.parentElement, k: +el.dataset.px || 40}));
    const scenes = [...document.querySelectorAll('[data-scene]')];
    let raf = 0;
    const frame = () => {
      raf = 0;
      const vh = innerHeight;
      for (const {el, ref, k} of px) {
        const r = ref.getBoundingClientRect();
        if (r.bottom < -120 || r.top > vh + 120) continue;
        const c = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);   // -1 (sus) … 1 (jos)
        el.style.setProperty('--py', `${(-c * k).toFixed(1)}px`);
      }
      for (const el of scenes) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > vh) continue;
        el.style.setProperty('--p', Math.min(1, Math.max(0, -r.top / r.height)).toFixed(4));
      }
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(frame); };
    frame();
    addEventListener('scroll', on, {passive: true});
    addEventListener('resize', on);
    return () => { root.classList.remove('v5-motion'); io.disconnect(); removeEventListener('scroll', on); removeEventListener('resize', on); cancelAnimationFrame(raf); };
  }, []);
  return null;
}
