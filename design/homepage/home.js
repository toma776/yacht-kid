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

// Pastila navigației: o singură formă alunecă sub intrarea peste care e mouse-ul (sau sub placa deschisă)
const nav = document.querySelector('[data-nav]');
const pill = document.querySelector('[data-nav-pill]');
const navItems = [...nav.querySelectorAll(':scope > ul > li > a, :scope > ul > li > button')];
let hoverEl = null;
function movePill(el) {
  if (!el) { pill.classList.remove('is-on'); return; }
  // Pastila e poziționată față de antet (nu față de navigație), ca plăcile să rămână pe toată lățimea
  const r = el.getBoundingClientRect(), n = header.getBoundingClientRect();
  // Prima apariție nu alunecă din stânga: se pune pe loc, apoi animă doar mutările
  const first = !pill.classList.contains('is-on');
  pill.classList.toggle('no-anim', first);
  pill.style.setProperty('--x', `${r.left - n.left}px`);
  pill.style.setProperty('--w', `${r.width}px`);
  pill.classList.add('is-on');
  if (first) requestAnimationFrame(() => pill.classList.remove('no-anim'));
}

// Plăcile (mega): Apartamente și Proiectul. Se deschid la hover (cu o mică întârziere, ca să nu clipească la trecerea
// mouse-ului), la click și din tastatură; se închid cu Esc, la click pe voal sau când mouse-ul iese din antet.
// Între două plăci, conținutul se schimbă pe loc, fără să se strângă placa.
const megaBtns = [...document.querySelectorAll('[data-mega-toggle]')];
const scrim = document.querySelector('[data-mega-scrim]');
const btnOf = id => megaBtns.find(b => b.dataset.megaToggle === id);
let openId = null, megaTimer;
function setMega(id) {
  clearTimeout(megaTimer);
  if (id === openId) return;
  const prev = openId, swap = !!(prev && id);
  for (const b of megaBtns) {
    const key = b.dataset.megaToggle, m = document.getElementById(key), on = key === id;
    b.setAttribute('aria-expanded', String(on));
    m.classList.toggle('is-swap', swap && on);
    m.classList.toggle('is-swap-out', swap && key === prev);
    if (!swap) m.classList.remove('is-swap', 'is-swap-out');
    m.classList.toggle('is-open', on);
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
  b.addEventListener('click', () => setMega(openId === id ? null : id));
  b.parentElement.addEventListener('mouseenter', () => {
    if (!hoverable.matches) return;
    clearTimeout(megaTimer);
    // Dintr-o placă deschisă în alta: aproape imediat; din antet închis: după o mică pauză
    megaTimer = setTimeout(() => setMega(id), openId ? 60 : 120);
  });
  document.getElementById(id).addEventListener('click', e => { if (e.target.closest('[data-mega-close]')) setMega(null); });
}
for (const el of navItems) {
  el.addEventListener('mouseenter', () => { hoverEl = el; movePill(el); });
  el.addEventListener('focus', () => movePill(el));
}
nav.addEventListener('mouseleave', () => { hoverEl = null; movePill(openId ? btnOf(openId) : null); });
nav.addEventListener('focusout', e => { if (!nav.contains(e.relatedTarget)) movePill(openId ? btnOf(openId) : null); });
header.addEventListener('mouseleave', () => { if (hoverable.matches) { clearTimeout(megaTimer); megaTimer = setTimeout(() => setMega(null), 220); } });
header.addEventListener('mouseenter', () => { if (openId) clearTimeout(megaTimer); });
// Celelalte legături din meniu închid placa
document.querySelectorAll('.nav > ul > li:not(.has-mega)').forEach(li => li.addEventListener('mouseenter', () => { if (hoverable.matches) setMega(null); }));
scrim.addEventListener('click', () => setMega(null));
header.addEventListener('focusout', e => { if (openId && !header.contains(e.relatedTarget)) setMega(null); });
addEventListener('resize', () => movePill(openId ? btnOf(openId) : null));
addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (openId) { const b = btnOf(openId); setMega(null); b.focus(); }
  if (document.body.classList.contains('menu-open')) setMenu(false);
});

// Meniul pe mobil: un dialog. Restul paginii devine inert cât e deschis (focusul nu poate ieși din antet și meniu),
// iar la închidere focusul se întoarce pe buton.
const toggle = document.querySelector('[data-menu-toggle]');
const menu = document.querySelector('[data-mobile-menu]');
const behind = [document.querySelector('main'), document.querySelector('footer'), document.querySelector('.dock')].filter(Boolean);
function setMenu(open) {
  toggle.setAttribute('aria-expanded', String(open));
  toggle.querySelector('.sr-only').textContent = open ? 'Închide meniul' : 'Meniu';
  document.body.classList.toggle('menu-open', open);
  behind.forEach(el => { el.inert = open; });
  if (open) {
    menu.hidden = false;
    menu.querySelector('.mm-scroll').scrollTop = 0;
    requestAnimationFrame(() => { menu.classList.add('is-open'); menu.querySelector('.mm-unit')?.focus({preventScroll: true}); });
  } else {
    const hadFocus = menu.contains(document.activeElement);
    menu.classList.remove('is-open');
    setTimeout(() => { if (!menu.classList.contains('is-open')) menu.hidden = true; }, 700);
    if (hadFocus) toggle.focus();
  }
}
toggle.addEventListener('click', () => setMenu(toggle.getAttribute('aria-expanded') !== 'true'));
menu.addEventListener('click', e => { if (e.target.closest('a')) setMenu(false); });
// Pe ecran lat meniul de mobil nu mai are sens: îl închidem dacă fereastra se lărgește cu el deschis
matchMedia('(min-width: 1181px)').addEventListener('change', e => { if (e.matches && document.body.classList.contains('menu-open')) setMenu(false); });

// Caruselul tipurilor de locuințe: „2 / 4” urmează cardul aflat la stânga
const units = menu.querySelector('[data-mm-units]');
const count = menu.querySelector('[data-mm-count]');
if (units && count) {
  const cards = [...units.children];
  units.addEventListener('scroll', () => {
    const step = cards[1] ? cards[1].offsetLeft - cards[0].offsetLeft : 1;
    const i = Math.min(cards.length - 1, Math.round(units.scrollLeft / step));
    count.textContent = `${i + 1} / ${cards.length}`;
  }, {passive: true});
}

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

// Capitolele din Despre: unul deschis o dată, cu fotografia lui alături. Se schimbă singure cât timp secțiunea e pe
// ecran, se opresc la hover sau la focus și se opresc de tot după primul click, ca cititorul să nu fie grăbit
const chapters = document.querySelector('[data-chapters]');
if (chapters) {
  const items = [...chapters.querySelectorAll('[data-chapter]')];
  const figures = [...chapters.querySelectorAll('[data-figure]')];
  const STEP = 8000;
  chapters.style.setProperty('--chapter-ms', `${STEP}ms`);
  let current = 0, timer = null, started = 0, left = STEP, auto = !reduced, visible = false, held = false;

  const show = i => {
    current = (i + items.length) % items.length;
    items.forEach((li, n) => {
      const on = n === current;
      li.classList.toggle('is-active', on);
      li.querySelector('button').setAttribute('aria-expanded', String(on));
    });
    figures.forEach((f, n) => { f.classList.toggle('is-active', n === current); f.toggleAttribute('aria-hidden', n !== current); });
  };
  // Repornește animația liniei de progres pe capitolul nou
  const restartBar = () => { chapters.classList.remove('is-playing'); void chapters.offsetWidth; if (auto) chapters.classList.add('is-playing'); };
  const schedule = ms => { clearTimeout(timer); started = Date.now(); left = ms; timer = setTimeout(() => { show(current + 1); left = STEP; restartBar(); schedule(STEP); }, ms); };
  const sync = () => {
    const run = auto && visible && !held;
    chapters.classList.toggle('is-paused', !run);
    if (run) schedule(left); else if (timer) { clearTimeout(timer); timer = null; left = Math.max(400, left - (Date.now() - started)); }
  };

  items.forEach((li, n) => li.querySelector('button').addEventListener('click', () => {
    auto = false; clearTimeout(timer); chapters.classList.remove('is-playing');
    show(n);
  }));
  chapters.addEventListener('mouseenter', () => { held = true; sync(); });
  chapters.addEventListener('mouseleave', () => { held = false; sync(); });
  chapters.addEventListener('focusin', () => { held = true; sync(); });
  chapters.addEventListener('focusout', e => { if (!chapters.contains(e.relatedTarget)) { held = false; sync(); } });
  // Rulează cât timp componenta trece prin mijlocul ecranului (pe mobil e mai înaltă decât ecranul)
  new IntersectionObserver(([e]) => { visible = e.isIntersecting; sync(); }, {rootMargin: '-30% 0px -30% 0px'}).observe(chapters);
  show(0);
  if (auto) restartBar();
}

// „Sus” din subsol: înapoi la hero
document.querySelector('[data-to-top]')?.addEventListener('click', e => { e.preventDefault(); scrollTo({top: 0, behavior: reduced ? 'auto' : 'smooth'}); });

// Formularul: în prototip doar validează; trimiterea reală vine cu formularele din Brain
const form = document.querySelector('[data-form]');
form.addEventListener('submit', e => {
  e.preventDefault();
  const note = form.querySelector('[data-form-note]');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  note.textContent = 'Prototip: formularul nu trimite încă date.';
});
