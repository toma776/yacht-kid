// HTML-ul din site-ul vechi → conținut (§1.8: textul bogat are un vocabular fix). Fără dependențe: un tokenizer
// simplu ajunge pentru HTML-ul generat de WordPress și Bricks, iar verificarea dus-întors prinde ce scapă.

export const decode = s => (s ?? '')
  .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(+n)).replace(/&#x([0-9a-f]+);/gi, (_, n) => String.fromCodePoint(parseInt(n, 16)))
  .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#039;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&rsquo;|&lsquo;/g, "'").replace(/&rdquo;|&ldquo;|&bdquo;/g, '"')
  .replace(/&hellip;/g, '…').replace(/&ndash;/g, '–').replace(/&mdash;/g, '—');
export const escape = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const squash = s => (s ?? '').replace(/\s+/g, ' ').trim();
export const fold = s => (s ?? '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export const text = html => squash(decode((html ?? '').replace(/<(script|style|svg|noscript)\b[\s\S]*?<\/\1>/gi, ' ').replace(/<[^>]+>/g, ' ')));
export const attr = (tag, name) => { const v = tag.match(new RegExp(`\\s${name}=(["'])([\\s\\S]*?)\\1`, 'i'))?.[2]; return v == null ? null : decode(v); };

export const mainOf = html => html.match(/<main\b[\s\S]*<\/main>/)?.[0] ?? '';
export const headOf = html => html.slice(0, html.indexOf('</head>'));
export const metaOf = (html, name) => decode(headOf(html).match(new RegExp(`<meta (?:name|property)="${name}" content="([^"]*)"`))?.[1] ?? '') || null;

// Bucățile unei pagini, după titluri: [{level, heading, html}] (html = tot ce urmează până la titlul următor)
export function byHeading(html) {
  const parts = html.split(/(<h[1-6]\b[^>]*>[\s\S]*?<\/h[1-6]>)/i);
  const out = [];
  for (let i = 1; i < parts.length; i += 2) {
    const level = +parts[i].match(/<h([1-6])/i)[1];
    out.push({level, heading: text(parts[i]), html: parts[i + 1] ?? ''});
  }
  return out;
}
export const paragraphs = html => [...(html ?? '').matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi)].map(([, p]) => text(p)).filter(Boolean);

// Imaginile unei bucăți de HTML, cu sursa reală (Bricks încarcă leneș: data-src)
export const images = html => [...(html ?? '').matchAll(/<img\b[^>]*>/gi)].map(([t]) => ({
  src: attr(t, 'data-src') ?? (attr(t, 'src')?.startsWith('data:') ? null : attr(t, 'src')), alt: attr(t, 'alt') ?? ''
})).filter(i => i.src);

// Numele fișierului din biblioteca media, fără variantele redimensionate (-1024x576) și fără -scaled
export const uploadKey = url => {
  const m = decodeURIComponent(url ?? '').match(/\/wp-content\/uploads\/([^?#"'\s]+)/);
  return m ? m[1].replace(/-\d+x\d+(?=\.\w+$)/, '').replace(/-scaled(?=\.\w+$)/, '') : null;
};

const KEEP = new Set(['h2', 'h3', 'h4', 'p', 'ul', 'ol', 'li', 'blockquote', 'figure', 'figcaption', 'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td', 'a', 'strong', 'em', 'br', 'iframe']);
const RENAME = {b: 'strong', i: 'em', h1: 'h2', h5: 'h4', h6: 'h4'};
const DROP_WITH_CONTENT = /<(script|style|form|noscript|svg|button|input|select|textarea)\b[\s\S]*?<\/\1>/gi;
const VOID = new Set(['img', 'br']);
// Conținutul ascuns (de exemplu „ex.com” strecurat într-o adresă de email, contra roboților) nu e text
// (Complianz îl ascunde prin clasa cmplz-fmail-domain, nu prin stil)
const HIDDEN = /<(span|div|p)\b[^>]*(?:style="[^"]*display:\s*none[^"]*"|class="[^"]*cmplz-fmail-domain[^"]*")[^>]*>[\s\S]*?<\/\1>/gi;

// Curăță textul bogat: păstrează vocabularul fix și scoate restul (clase, stiluri, scripturi, machete).
// link(href) → {ref} | {href} | null; image(src) → id media | null. Ce nu se poate rezolva ajunge în `issues`.
export function sanitize(html, {link = h => ({href: h}), image = () => null} = {}) {
  const issues = [];
  let out = '';
  const src = (html ?? '').replace(DROP_WITH_CONTENT, '').replace(HIDDEN, '').replace(/<!--[\s\S]*?-->/g, '');
  const stack = [];
  for (const [tok, close, rawName, attrs] of src.matchAll(/<(\/?)([a-zA-Z0-9]+)([^>]*)>|[^<]+/g)) {
    if (!rawName) { out += tok.replace(/</g, '&lt;'); continue; }
    const name = RENAME[rawName.toLowerCase()] ?? rawName.toLowerCase();
    if (!KEEP.has(name)) continue;
    if (close) {
      const i = stack.lastIndexOf(name);
      if (i < 0) continue;
      while (stack.length > i) out += `</${stack.pop()}>`;
      continue;
    }
    const tag = `<${rawName}${attrs}>`;
    if (name === 'a') {
      const href = attr(tag, 'href');
      const r = href ? link(href) : null;
      if (r?.ref) out += `<a data-ref="${r.ref}">`;
      else if (r?.media) out += `<a data-media="${r.media}">`;
      else if (r?.href) out += `<a href="${escape(r.href)}"${/^https?:/.test(r.href) ? ' rel="noopener"' : ''}>`;
      else { out += '<a>'; if (href) issues.push({kind: 'link', href}); }
      stack.push('a');
    } else if (name === 'img') {
      const s = attr(tag, 'data-src') ?? attr(tag, 'src');
      const id = image(s);
      if (id) out += `<img data-media="${id}" alt="${escape(attr(tag, 'alt') ?? '')}">`;
      else issues.push({kind: 'image', src: s});
    } else if (name === 'iframe') {
      const s = attr(tag, 'src') ?? '';
      if (/youtube(-nocookie)?\.com\/embed\//.test(s)) { out += `<iframe src="${escape(s)}" loading="lazy" allowfullscreen>`; stack.push('iframe'); }
      else issues.push({kind: 'iframe', src: s});
    } else {
      out += `<${name}>`;
      if (!VOID.has(name)) stack.push(name);
    }
  }
  while (stack.length) out += `</${stack.pop()}>`;
  // Paragrafele și linkurile goale rămase după curățare
  out = out.replace(/<(p|a|strong|em)>\s*<\/\1>/g, '').replace(/<a>([\s\S]*?)<\/a>/g, '$1').replace(/\n{2,}/g, '\n').trim();
  return {html: out, issues};
}

// Blocurile de text, în ordine: [tip, text]. Verificarea dus-întors (§1.3) compară blocurile sursei cu cele curățate.
const BLOCK = /<(h[1-6]|p|li|blockquote|figcaption|th|td)\b[^>]*>([\s\S]*?)<\/\1>/gi;
export function blocks(html) {
  const src = (html ?? '').replace(DROP_WITH_CONTENT, '').replace(HIDDEN, '');
  // Spațiul dinaintea punctuației ține de granițele tagurilor, nu de text
  return [...src.matchAll(BLOCK)].map(([, t, inner]) => [RENAME[t.toLowerCase()] ?? t.toLowerCase(),
    text(inner.replace(/<(p|li)\b[\s\S]*?<\/\1>/gi, '')).replace(/\s+([,.;:!?])/g, '$1')]).filter(([, t]) => t);
}
export function roundTrip(original, cleaned) {
  const a = blocks(original), b = blocks(cleaned);
  for (let i = 0; i < Math.max(a.length, b.length); i++)
    if (a[i]?.[0] !== b[i]?.[0] || a[i]?.[1] !== b[i]?.[1]) return {ok: false, at: i, expected: a[i] ?? null, got: b[i] ?? null};
  return {ok: true, blocks: a.length};
}
