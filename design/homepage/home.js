// Homepage YACHT KID: antetul, meniul pe mobil, apariția la derulare, parallax-ul imaginilor și video-ul.
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;

// Antetul: transparent peste hero, bandă albă după; se ascunde la coborâre și revine la urcare
const header = document.querySelector('[data-header]');
const hero = document.querySelector('.hero');
let lastY = scrollY;
function onScroll() {
  const y = scrollY;
  const pastHero = y > (hero?.offsetHeight ?? 600) - 120;
  const megaOpen = header.classList.contains('mega-open');
  header.classList.toggle('is-solid', megaOpen || (y > 40 && (pastHero || y > innerHeight * .5)));
  document.body.classList.toggle('past-hero', y > innerHeight * .6);
  header.classList.toggle('is-hidden', !megaOpen && pastHero && y > lastY + 4 && !document.body.classList.contains('menu-open'));
  if (y < lastY - 4 || !pastHero) header.classList.remove('is-hidden');
  lastY = y;
}
addEventListener('scroll', onScroll, {passive: true});
onScroll();

// Mega meniul Apartamente: se deschide la hover (cu o mică întârziere, ca să nu clipească la trecerea mouse-ului),
// la click și din tastatură; se închide cu Esc, la click pe voal sau când mouse-ul iese din antet
const megaBtn = document.querySelector('[data-mega-toggle]');
const mega = document.querySelector('[data-mega]');
const scrim = document.querySelector('[data-mega-scrim]');
let megaTimer;
function setMega(open) {
  clearTimeout(megaTimer);
  megaBtn.setAttribute('aria-expanded', String(open));
  mega.classList.toggle('is-open', open);
  header.classList.toggle('mega-open', open);
  document.body.classList.toggle('mega-on', open);
  onScroll();
}
const hoverable = matchMedia('(hover: hover) and (min-width: 1181px)');
megaBtn.addEventListener('click', () => setMega(megaBtn.getAttribute('aria-expanded') !== 'true'));
megaBtn.parentElement.addEventListener('mouseenter', () => { if (hoverable.matches) { clearTimeout(megaTimer); megaTimer = setTimeout(() => setMega(true), 120); } });
header.addEventListener('mouseleave', () => { if (hoverable.matches) { clearTimeout(megaTimer); megaTimer = setTimeout(() => setMega(false), 220); } });
header.addEventListener('mouseenter', () => { if (mega.classList.contains('is-open')) clearTimeout(megaTimer); });
// Celelalte legături din meniu închid placa
document.querySelectorAll('.nav > ul > li:not(.has-mega)').forEach(li => li.addEventListener('mouseenter', () => { if (hoverable.matches) setMega(false); }));
scrim.addEventListener('click', () => setMega(false));
mega.addEventListener('click', e => { if (e.target.closest('[data-mega-close]')) setMega(false); });
mega.addEventListener('focusout', e => { if (!header.contains(e.relatedTarget)) setMega(false); });
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (mega.classList.contains('is-open')) { setMega(false); megaBtn.focus(); }
  if (document.body.classList.contains('menu-open')) setMenu(false);
});

// Meniul pe mobil
const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-mobile-menu]');
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  document.body.classList.toggle('menu-open', open);
  if (open) { menu.hidden = false; requestAnimationFrame(() => menu.classList.add('is-open')); }
  else { menu.classList.remove('is-open'); setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700); }
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });

// Apariția la derulare
const io = new IntersectionObserver(entries => {
  for (const e of entries) if (e.isIntersecting) { e.target.classList.add('is-in'); io.unobserve(e.target); }
}, {rootMargin: '0px 0px -8% 0px', threshold: .08});
document.querySelectorAll('.reveal').forEach(el => io.observe(el));

// Parallax fin pe imaginile mari: imaginea alunecă în rama ei, ca o reflexie în sticlă
const layers = [...document.querySelectorAll('[data-parallax]')];
if (!reduced && layers.length) {
  let ticking = false;
  const update = () => {
    for (const img of layers) {
      const r = img.parentElement.getBoundingClientRect();
      if (r.bottom < 0 || r.top > innerHeight) continue;
      const p = (r.top + r.height / 2 - innerHeight / 2) / (innerHeight + r.height);
      img.style.transform = `translate3d(0, ${(-8 - p * 14).toFixed(2)}%, 0)`;
    }
    ticking = false;
  };
  addEventListener('scroll', () => { if (!ticking) { ticking = true; requestAnimationFrame(update); } }, {passive: true});
  update();
}

// Video-ul din hero: pornește doar dacă utilizatorul nu a cerut mișcare redusă
const heroVideo = document.querySelector('[data-hero-video]');
if (reduced && heroVideo) { heroVideo.removeAttribute('autoplay'); heroVideo.pause(); }
// Mai lent decât filmarea: cadrele curg calm, ca un travelling
const HERO_RATE = .7;
if (heroVideo) {
  heroVideo.playbackRate = HERO_RATE;
  heroVideo.addEventListener('loadedmetadata', () => { heroVideo.playbackRate = HERO_RATE; });
  heroVideo.addEventListener('play', () => { heroVideo.playbackRate = HERO_RATE; });
}

// Video de prezentare, cu sunet, într-o fereastră
const dialog = document.querySelector('[data-video-dialog]');
const full = document.querySelector('[data-video-full]');
document.querySelector('[data-video-open]')?.addEventListener('click', () => { dialog.showModal(); full.play().catch(() => {}); });
const closeVideo = () => { full.pause(); dialog.close(); };
document.querySelector('[data-video-close]').addEventListener('click', closeVideo);
dialog.addEventListener('click', e => { if (e.target === dialog) closeVideo(); });
dialog.addEventListener('close', () => full.pause());

// Formularul: în prototip doar validează; trimiterea reală vine cu formularele din Brain
const form = document.querySelector('[data-form]');
form.addEventListener('submit', e => {
  e.preventDefault();
  const note = form.querySelector('[data-form-note]');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  note.textContent = 'Prototip: formularul nu trimite încă date.';
});
