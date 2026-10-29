'use client';
// Comportamentul site-ului (portat din design/homepage/home.js): antetul la derulare, pastila și plăcile mega,
// meniul pe mobil ca dialog, apariția la derulare, parallax-ul, video-ul și capitolele din Despre.
// Totul pornește din markup-ul randat pe server (data-*); lipsa unui element (de exemplu hero-ul pe paginile
// interioare) doar oprește partea respectivă. La demontare se scoate tot (React montează de două ori în dezvoltare).
import {useEffect} from 'react';

function init(signal) {
  const on = (el, type, fn, opts = {}) => el?.addEventListener(type, fn, {...opts, signal});
  const cleanups = [];
  // Redesign: mișcare moderată (apariții discrete, parallax-ul hero-ului, tranziții de meniu); efectele grele rămân
  // oprite: parallax pe straturi, valuri care curg, capitole care se schimbă singure, antet care se ascunde
  const reduced = true;
  const header = document.querySelector('[data-header]');
  const hero = document.querySelector('.hero, .hero-card, .lx-hero');
  if (!header) return () => {};

  // ---------- Antetul: bandă albă de la început, pe toate paginile (rămâne mereu pe ecran).
  if (!hero) document.body.classList.add('no-hero');
  function onScroll() {
    const y = scrollY;
    document.body.classList.toggle('past-hero', !hero || y > innerHeight * .6);
    // Antetul e transparent peste hero până la prima derulare (styles/design.css)
    document.body.classList.toggle('is-scrolled', y > 40);
  }
  on(window, 'scroll', onScroll, {passive: true});
  onScroll();

  // ---------- Parallax pe fotografia hero-ului homepage-ului: singura excepție de la site-ul static, cerută explicit.
  // Fotografia coboară mai încet decât pagina (--hero-p de la 0 la 1 cât hero-ul iese din ecran); oprit la „reduce motion”
  const heroImg = document.querySelector('.hero-card-img');
  if (heroImg && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    const card = heroImg.closest('.hero-card, .lx-hero');
    let frame = 0;
    const move = () => {
      frame = 0;
      const r = card.getBoundingClientRect();
      heroImg.style.setProperty('--hero-p', Math.min(1, Math.max(0, -r.top / r.height)).toFixed(4));
    };
    on(window, 'scroll', () => { frame ||= requestAnimationFrame(move); }, {passive: true});
    move();
  }

  // ---------- Colecția (selectorul de tipologii): rândul ales cu mouse-ul sau tastatura aprinde fotografia lui
  document.querySelectorAll('[data-typo]').forEach(box => {
    const items = [...box.querySelectorAll('[data-typo-item]')], imgs = [...box.querySelectorAll('[data-typo-img]')];
    const pick = i => {
      items.forEach(el => el.classList.toggle('is-active', +el.dataset.typoItem === i));
      imgs.forEach(el => el.classList.toggle('is-active', +el.dataset.typoImg === i));
    };
    items.forEach(el => { on(el, 'mouseenter', () => pick(+el.dataset.typoItem)); on(el, 'focusin', () => pick(+el.dataset.typoItem)); });
  });

  // ---------- Articolul schematic: „Pe scurt” deschide capitolul cerut și aduce pagina la el
  const openChapter = n => {
    const li = document.querySelector(`.ax-chapters [data-chapter="${n}"]`);
    if (!li) return;
    if (!li.classList.contains('is-active')) li.querySelector('button').click();
    // După ce capitolul anterior s-a strâns (tranziția panoului, ~300 ms), altfel poziția e calculată greșit
    setTimeout(() => li.scrollIntoView({behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start'}), 340);
  };
  document.querySelectorAll('[data-chapter-open]').forEach(a => on(a, 'click', e => { e.preventDefault(); openChapter(+a.dataset.chapterOpen); }));

  // ---------- Pastila navigației: o singură formă alunecă sub intrarea activă
  const nav = document.querySelector('[data-nav]');
  const pill = document.querySelector('[data-nav-pill]');
  const navItems = nav ? [...nav.querySelectorAll(':scope > ul > li > a, :scope > ul > li > button')] : [];
  let hoverEl = null;
  function movePill(el) {
    if (!pill) return;
    if (!el) { pill.classList.remove('is-on'); return; }
    const r = el.getBoundingClientRect(), n = header.getBoundingClientRect();
    const first = !pill.classList.contains('is-on');
    pill.classList.toggle('no-anim', first);
    pill.style.setProperty('--x', `${r.left - n.left}px`);
    pill.style.setProperty('--w', `${r.width}px`);
    pill.classList.add('is-on');
    if (first) requestAnimationFrame(() => pill.classList.remove('no-anim'));
  }

  // ---------- Plăcile (mega): hover cu întârziere, click, tastatură; între plăci conținutul se schimbă pe loc
  const megaBtns = [...document.querySelectorAll('[data-mega-toggle]')];
  const scrim = document.querySelector('[data-mega-scrim]');
  const btnOf = id => megaBtns.find(b => b.dataset.megaToggle === id);
  let openId = null, megaTimer;
  function setMega(id) {
    clearTimeout(megaTimer);
    if (id === openId) return;
    const prev = openId, swap = !!(prev && id);
    for (const b of megaBtns) {
      const key = b.dataset.megaToggle, m = document.getElementById(key), isOn = key === id;
      b.setAttribute('aria-expanded', String(isOn));
      m.classList.toggle('is-swap', swap && isOn);
      m.classList.toggle('is-swap-out', swap && key === prev);
      if (!swap) m.classList.remove('is-swap', 'is-swap-out');
      m.classList.toggle('is-open', isOn);
    }
    openId = id;
    header.classList.toggle('mega-open', !!id);
    document.body.classList.toggle('mega-on', !!id);
    movePill(id ? btnOf(id) : hoverEl);
    onScroll();
  }
  const hoverable = matchMedia('(hover: hover) and (min-width: 1181px)');
  for (const b of megaBtns) {
    const id = b.dataset.megaToggle;
    on(b, 'click', () => setMega(openId === id ? null : id));
    on(b.parentElement, 'mouseenter', () => { if (!hoverable.matches) return; clearTimeout(megaTimer); megaTimer = setTimeout(() => setMega(id), openId ? 60 : 120); });
    on(document.getElementById(id), 'click', e => { if (e.target.closest('[data-mega-close]')) setMega(null); });
  }
  for (const el of navItems) { on(el, 'mouseenter', () => { hoverEl = el; movePill(el); }); on(el, 'focus', () => movePill(el)); }
  on(nav, 'mouseleave', () => { hoverEl = null; movePill(openId ? btnOf(openId) : null); });
  on(nav, 'focusout', e => { if (!nav.contains(e.relatedTarget)) movePill(openId ? btnOf(openId) : null); });
  on(header, 'mouseleave', () => { if (hoverable.matches) { clearTimeout(megaTimer); megaTimer = setTimeout(() => setMega(null), 220); } });
  on(header, 'mouseenter', () => { if (openId) clearTimeout(megaTimer); });
  document.querySelectorAll('.nav > ul > li:not(.has-mega)').forEach(li => on(li, 'mouseenter', () => { if (hoverable.matches) setMega(null); }));
  on(scrim, 'click', () => setMega(null));
  on(header, 'focusout', e => { if (openId && !header.contains(e.relatedTarget)) setMega(null); });
  on(window, 'resize', () => movePill(openId ? btnOf(openId) : null));

  // ---------- Meniul pe mobil: dialog; restul paginii devine inert; focusul revine pe buton
  const toggle = document.querySelector('[data-menu-toggle]');
  const menu = document.querySelector('[data-mobile-menu]');
  const behind = [document.querySelector('main'), document.querySelector('footer'), document.querySelector('.dock')].filter(Boolean);
  function setMenu(open) {
    if (!toggle || !menu) return;
    toggle.setAttribute('aria-expanded', String(open));
    const sr = toggle.querySelector('.sr-only');
    sr.textContent = open ? sr.dataset.labelClose : sr.dataset.labelOpen;
    document.body.classList.toggle('menu-open', open);
    behind.forEach(el => { el.inert = open; });
    if (open) {
      menu.hidden = false;
      menu.querySelector('.mm-scroll').scrollTop = 0;
      requestAnimationFrame(() => { menu.classList.add('is-open'); menu.querySelector('.mm-unit, .mm-rows a')?.focus({preventScroll: true}); });
    } else {
      const hadFocus = menu.contains(document.activeElement);
      menu.classList.remove('is-open');
      setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700);
      if (hadFocus) toggle.focus();
    }
  }
  on(toggle, 'click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
  on(menu, 'click', e => { if (e.target.closest('a')) setMenu(false); });
  const wide = matchMedia('(min-width: 1181px)');
  const onWide = e => { if (e.matches && document.body.classList.contains('menu-open')) setMenu(false); };
  wide.addEventListener('change', onWide);
  cleanups.push(() => { wide.removeEventListener('change', onWide); document.body.classList.remove('menu-open', 'mega-on'); behind.forEach(el => { el.inert = false; }); });
  on(window, 'keydown', e => {
    if (e.key !== 'Escape') return;
    if (openId) { const b = btnOf(openId); setMega(null); b.focus(); }
    if (document.body.classList.contains('menu-open')) setMenu(false);
  });
  const units = menu?.querySelector('[data-mm-units]'), count = menu?.querySelector('[data-mm-count]');
  if (units && count) {
    const cards = [...units.children];
    on(units, 'scroll', () => {
      const step = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
      count.textContent = `${Math.min(cards.length - 1, Math.round(units.scrollLeft / step)) + 1} / ${cards.length}`;
    }, {passive: true});
  }

  // ---------- Apariția la derulare (redesign): elementele de sub primul ecran urcă discret o singură dată, când intră
  // în ecran. Hero-ul nu are .reveal (titlul, prețul și acțiunile apar imediat); cu „mișcare redusă” totul e vizibil
  const reveals = [...document.querySelectorAll('.reveal')];
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) reveals.forEach(el => el.classList.add('is-in'));
  else {
    document.documentElement.classList.add('motion');
    const io = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); } }), {rootMargin: '0px 0px -8% 0px'});
    reveals.forEach(el => (el.getBoundingClientRect().top < innerHeight ? el.classList.add('is-in') : io.observe(el)));
    cleanups.push(() => io.disconnect());
  }

  // ---------- Parallax, pe mai multe straturi (doar transform/translate, un singur requestAnimationFrame):
  //  · hero: video-ul se mărește și coboară, titlul urcă și se stinge, un voal navy se adâncește;
  //  · [data-parallax]: imaginea alunecă în rama ei;
  //  · [data-depth]: rama întreagă se mișcă cu viteza ei (colajul de fațade, ca straturi apropiate și depărtate);
  //  · [data-drift]: valurile din logo curg orizontal, ca apa.
  // Pe mobil amplitudinea e la jumătate; cu „mișcare redusă” nu rulează deloc.
  const layers = [...document.querySelectorAll('[data-parallax]')];
  const depths = [...document.querySelectorAll('[data-depth]')];
  const drifts = [...document.querySelectorAll('[data-drift]')];
  if (!reduced && (hero || layers.length || depths.length || drifts.length)) {
    let ticking = false;
    const update = () => {
      ticking = false;
      const k = innerWidth < 760 ? .5 : 1;
      if (hero) {
        const p = Math.min(1, Math.max(0, scrollY / (hero.offsetHeight || 1)));
        hero.style.setProperty('--hero-p', p.toFixed(4));
      }
      for (const img of layers) {
        const r = img.parentElement.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const p = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight + r.height);
        img.style.transform = `translate3d(0, ${(-8 - p * 14 * k).toFixed(2)}%, 0)`;
      }
      for (const el of depths) {
        const r = el.getBoundingClientRect();
        if (r.bottom < -200 || r.top > innerHeight + 200) continue;
        const p = (r.top + r.height / 2 - innerHeight / 2) / innerHeight;
        el.style.translate = `0 ${(p * Number(el.dataset.depth) * 90 * k).toFixed(1)}px`;
      }
      for (const el of drifts) {
        const r = el.getBoundingClientRect();
        if (r.bottom < 0 || r.top > innerHeight) continue;
        const p = (r.top - innerHeight / 2) / innerHeight;
        el.style.setProperty('--drift', `${(p * Number(el.dataset.drift || 1) * 60 * k).toFixed(1)}px`);
      }
    };
    on(window, 'scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive: true});
    on(window, 'resize', update);
    update();
  }

  // ---------- Video: fereastra de prezentare cu sunet (fundalul din hero rulează la viteza normală).
  // Fiecare fereastră ține de butoanele din secțiunea ei (pot fi mai multe video pe pagină)
  document.querySelectorAll('[data-video-dialog]').forEach(dialog => {
    const full = dialog.querySelector('[data-video-full]');
    if (!full) return;
    (dialog.closest('section') ?? document).querySelectorAll('[data-video-open]').forEach(b => on(b, 'click', e => { e.preventDefault(); dialog.showModal(); full.play().catch(() => {}); }));
    const closeVideo = () => { full.pause(); if (dialog.open) dialog.close(); };
    on(dialog.querySelector('[data-video-close]'), 'click', closeVideo);
    on(dialog, 'click', e => { if (e.target === dialog) closeVideo(); });
    on(dialog, 'close', () => full.pause());
  });

  // ---------- Cuprinsul articolului: marchează secțiunea citită acum (cea mai de sus care a trecut de antet)
  const toc = document.querySelector('[data-toc]');
  if (toc) {
    const links = new Map([...toc.querySelectorAll('a[href^="#"]')].map(a => [a.getAttribute('href').slice(1), a]));
    const parts = [...document.querySelectorAll('[data-toc-section]')];
    const mark = () => {
      const at = parts.filter(s => s.getBoundingClientRect().top < innerHeight * .35).pop();
      links.forEach((a, id) => a.classList.toggle('is-current', id === at?.id));
    };
    on(window, 'scroll', mark, {passive: true});
    mark();
  }

  // ---------- Testimonialele „card”: paginile 1, 2, 3… arată cardul ales (pe loc, fără animație)
  document.querySelectorAll('[data-voices]').forEach(stack => {
    const cards = [...stack.querySelectorAll('[data-voice]')];
    const pages = [...stack.parentElement.querySelectorAll('[data-voice-go]')];
    pages.forEach(b => on(b, 'click', () => {
      const n = +b.dataset.voiceGo;
      cards.forEach((c, i) => { c.hidden = i !== n; });
      pages.forEach((p, i) => p.setAttribute('aria-pressed', String(i === n)));
    }));
  });

  // ---------- Galeria: fotografia mare într-un dialog, cu înainte/înapoi (butoane, săgețile tastaturii) și Esc.
  // Pot fi mai multe pe pagină (grila și banda): fiecare dialog ține de butoanele din secțiunea lui
  document.querySelectorAll('[data-lightbox]').forEach(box => {
    const photos = JSON.parse(box.dataset.lightbox), img = box.querySelector('[data-lightbox-img]'), count = box.querySelector('[data-lightbox-count]');
    let at = 0;
    const show = i => { at = (i + photos.length) % photos.length; img.src = photos[at].src; img.alt = photos[at].alt; count.textContent = `${at + 1} / ${photos.length}`; };
    (box.closest('section') ?? document).querySelectorAll('[data-lightbox-open]').forEach(b => on(b, 'click', () => { show(+b.dataset.lightboxOpen); box.showModal(); }));
    box.querySelectorAll('[data-lightbox-step]').forEach(b => on(b, 'click', () => show(at + +b.dataset.lightboxStep)));
    on(box.querySelector('[data-lightbox-close]'), 'click', () => box.close());
    on(box, 'click', e => { if (e.target === box) box.close(); });
    on(box, 'keydown', e => { if (e.key === 'ArrowRight') show(at + 1); if (e.key === 'ArrowLeft') show(at - 1); });
  });

  // ---------- Banda de fotografii: săgețile derulează cu aproape un ecran; la capete, săgeata respectivă se stinge
  document.querySelectorAll('[data-strip]').forEach(track => {
    const steps = [...track.closest('section').querySelectorAll('[data-strip-step]')];
    const edges = () => {
      steps[0].disabled = track.scrollLeft <= 4;
      steps[1].disabled = track.scrollLeft + track.clientWidth >= track.scrollWidth - 4;
    };
    // Derulare lină la săgeți (excepție de la site-ul static, cerută explicit); instant cu „reduce motion”
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches;
    // data-strip-page (caruselul de testimoniale): un ecran întreg, adică următoarele 4 carduri
    const page = track.hasAttribute('data-strip-page') ? 1 : .8;
    steps.forEach(b => on(b, 'click', () => track.scrollBy({left: +b.dataset.stripStep * track.clientWidth * page, behavior: smooth ? 'smooth' : 'auto'})));
    on(track, 'scroll', edges, {passive: true});
    edges();
  });

  // ---------- Capitolele din Despre: unul deschis, cu fotografia lui; se schimbă singure cât timp secțiunea e pe
  // ecran, se opresc la hover/focus și de tot după primul click
  // (pot fi mai multe pe pagină: Tehnologie are trei)
  document.querySelectorAll('[data-chapters]').forEach(chapters => {
    const items = [...chapters.querySelectorAll('[data-chapter]')];
    const figures = [...chapters.querySelectorAll('[data-figure]')];
    const STEP = 8000;
    chapters.style.setProperty('--chapter-ms', `${STEP}ms`);
    let current = 0, timer = null, started = 0, left = STEP, auto = !reduced, visible = false, held = false;
    const show = i => {
      current = (i + items.length) % items.length;
      items.forEach((li, n) => { const isOn = n === current; li.classList.toggle('is-active', isOn); li.querySelector('button').setAttribute('aria-expanded', String(isOn)); });
      figures.forEach((f, n) => { f.classList.toggle('is-active', n === current); f.toggleAttribute('aria-hidden', n !== current); });
    };
    const restartBar = () => { chapters.classList.remove('is-playing'); void chapters.offsetWidth; if (auto) chapters.classList.add('is-playing'); };
    const schedule = ms => { clearTimeout(timer); started = Date.now(); left = ms; timer = setTimeout(() => { show(current + 1); left = STEP; restartBar(); schedule(STEP); }, ms); };
    const sync = () => {
      const run = auto && visible && !held;
      chapters.classList.toggle('is-paused', !run);
      if (run) schedule(left); else if (timer) { clearTimeout(timer); timer = null; left = Math.max(400, left - (Date.now() - started)); }
    };
    // Click pe capitolul deschis („−”) îl închide; fotografia rămâne a lui până se deschide altul
    const close = li => { li.classList.remove('is-active'); li.querySelector('button').setAttribute('aria-expanded', 'false'); };
    items.forEach((li, n) => on(li.querySelector('button'), 'click', () => {
      auto = false; clearTimeout(timer); chapters.classList.remove('is-playing');
      if (n === current && li.classList.contains('is-active')) close(li); else show(n);
    }));
    on(chapters, 'mouseenter', () => { held = true; sync(); });
    on(chapters, 'mouseleave', () => { held = false; sync(); });
    on(chapters, 'focusin', () => { held = true; sync(); });
    on(chapters, 'focusout', e => { if (!chapters.contains(e.relatedTarget)) { held = false; sync(); } });
    const cio = new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, {rootMargin: '-30% 0px -30% 0px'});
    cio.observe(chapters);
    cleanups.push(() => { cio.disconnect(); clearTimeout(timer); });
    show(0);
    if (auto) restartBar();
  });

  // ---------- „Sus” din subsol
  document.querySelectorAll('[data-to-top]').forEach(a => on(a, 'click', e => { e.preventDefault(); scrollTo({top: 0, behavior: reduced ? 'auto' : 'smooth'}); }));

  // ---------- Formularul: cele cu data-endpoint trimit (testimonialul); restul doar validează până vin cererile din Brain
  document.querySelectorAll('[data-form]').forEach(form => on(form, 'submit', async e => {
    e.preventDefault();
    const note = form.querySelector('[data-form-note]');
    if (!form.checkValidity()) { form.reportValidity(); return; }
    if (!form.dataset.endpoint) { if (note) note.textContent = note.dataset.pending ?? ''; return; }
    const button = form.querySelector('[type="submit"]');
    const data = {lang: form.dataset.lang};
    new FormData(form).forEach((v, k) => { data[k] = v; });
    button.disabled = true;
    try {
      const r = await fetch(form.dataset.endpoint, {method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(data)});
      if (!r.ok) throw new Error(String(r.status));
      form.reset();
      if (note) { note.textContent = note.dataset.done ?? ''; note.classList.add('is-done'); }
    } catch {
      if (note) note.textContent = note.dataset.error ?? '';
    } finally {
      button.disabled = false;
    }
  }));

  return () => { cleanups.forEach(f => f()); clearTimeout(megaTimer); };
}

export default function SiteBehavior() {
  useEffect(() => {
    const ac = new AbortController();
    const dispose = init(ac.signal);
    return () => { ac.abort(); dispose(); };
  }, []);
  return null;
}
