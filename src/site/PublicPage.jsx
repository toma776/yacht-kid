// Site-ul public, randat pe server din Brain (§3.1), în designul aprobat (design/homepage). Aceeași funcție servește
// ambele limbi; limba vine din adresă (/en/… = EN). Rama (antet, meniu, subsol) e comună tuturor paginilor;
// paginile compuse se construiesc din secțiuni, celelalte au o machetă pe tipul lor.
import {notFound, permanentRedirect} from 'next/navigation';
import {getDb} from '../core/db.mjs';
import {titleOf} from '../registry/derive.mjs';
import {localPath} from '../registry/langs.mjs';
import {createContext} from './context.mjs';
import {resolvePath, pathsOf} from './resolve.mjs';
import {rich, tokenValues} from './rich.mjs';
import {loadChrome, resolveTo} from './chrome.mjs';
import {IconSprite} from './ui/Icons.jsx';
import {Header, Footer} from './ui/Chrome.jsx';
import {Sections, sectionsOf, PostList} from './ui/Sections.jsx';
import SiteBehavior from './ui/SiteBehavior.jsx';
import {Article} from './ui/Article.jsx';
import {UnitPage} from './ui/Unit.jsx';


export const pathFrom = (lang, segments = []) => localPath(lang, ...segments.map(decodeURIComponent));

async function Body({ctx, kind, rec, values, chrome}) {
  const L = chrome.labels;
  const html = async h => ({__html: await rich(ctx, h, values)});
  const title = titleOf(kind, rec, rec);
  switch (kind) {
    case 'locuinte':
      // Tipurile de locuințe: antet, caracteristici, descriere cu video, galerie, celelalte tipuri, contact, articole
      return <UnitPage ctx={ctx} rec={rec} title={title} chrome={chrome}/>;
    case 'articole':
      // Macheta articolelor: cuprins, secțiuni numerotate, întrebări frecvente în acordeon, sidebar (ui/Article.jsx)
      return <Article ctx={ctx} rec={rec} title={title} chrome={chrome}/>;
    case 'categorii': {
      const posts = await ctx.within('Lista articolelor', `categoria ${rec.id}`, () =>
        ctx.query('articole', {scope: `categorii:${rec.id}`, where: 'e.category_id = ?', args: [rec.id], order: 'e.published_at DESC'}));
      return (
        <div className="wrap page-body">
          <header className="page-head"><p className="eyebrow">Blog</p><h1 className="display">{title}</h1></header>
          <PostList ctx={ctx} posts={posts} labels={L}/>
        </div>
      );
    }
    default:
      return (
        <div className="wrap page-body">
          <header className="page-head"><h1 className="display">{title}</h1></header>
          {rec.body ? <div className="prose" dangerouslySetInnerHTML={await html(rec.body)}/> : null}
        </div>
      );
  }
}

export async function renderPublic(lang, segments) {
  const db = await getDb();
  const path = pathFrom(lang, segments);
  const hit = await resolvePath(db, path);
  if (hit.redirect) {
    const to = hit.redirect.to_ref ? await resolveTo(createContext(db, lang), hit.redirect.to_ref) : hit.redirect.to_path;
    if (to) permanentRedirect(to);
  }
  if (!hit.key) notFound();
  const ctx = createContext(db, lang);
  const rec = await ctx.within('Pagina', 'pagina proprie', () => ctx.item(hit.key, hit.id, 'page'));
  const values = await tokenValues(ctx);
  const chrome = await loadChrome(ctx, await pathsOf(db, hit.key, hit.id));
  // Pagini compuse: paginile cu secțiuni și tipurile de locuințe cu secțiuni (Spații comerciale)
  const sections = ['pagini', 'locuinte'].includes(hit.key) ? await sectionsOf(ctx, hit.key, hit.id) : [];
  const composed = sections.length > 0;
  // Fără hero, antetul e opac și conținutul coboară sub el de la prima randare (nu abia după JS)
  const hero = sections[0]?.kind === 'hero';
  return (
    <>
      <IconSprite/>
      <a className="skip" href="#continut">{chrome.labels['sari-la-continut'] ?? 'Sari la conținut'}</a>
      <Header chrome={chrome} solid/>
      <main id="continut" className={hero ? undefined : 'no-hero'}>
        {composed ? <Sections ctx={ctx} owner={hit.key} pageId={hit.id} values={values} chrome={chrome}/> : <Body ctx={ctx} kind={hit.key} rec={rec} values={values} chrome={chrome}/>}
      </main>
      <Footer chrome={chrome}/>
      <SiteBehavior/>
    </>
  );
}

export async function metadataFor(lang, segments) {
  const db = await getDb();
  const hit = await resolvePath(db, pathFrom(lang, segments));
  if (!hit.key) return {};
  const ctx = createContext(db, lang);
  const rec = await ctx.item(hit.key, hit.id);
  const alternates = await pathsOf(db, hit.key, hit.id);
  return {
    title: rec?.seo_title || titleOf(hit.key, rec, rec),
    description: rec?.seo_description || undefined,
    alternates: {canonical: alternates[lang], languages: alternates},
    other: {'theme-color': '#20366c'}
  };
}
