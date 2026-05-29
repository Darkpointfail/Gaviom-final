import { mkdirSync, writeFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { POSTS, BLOG_META } from '../content/blog/posts.mjs';
import { faviconHeadLinks } from './favicon-links.mjs';
import { BLOG_CATEGORIES, CATEGORY_FILTER_KEY, CATEGORY_FILTERS } from '../content/blog/categories.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = join(root, 'blog');
const { siteUrl } = BLOG_META;

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

function headBlock({ title, description, path, type = 'website', article }) {
  const url = `${siteUrl}${path}`;
  const ogType = type === 'article' ? 'article' : 'website';
  let jsonLd = '';
  if (article) {
    jsonLd = `
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: article.title,
    description: article.description,
    datePublished: article.date,
    dateModified: article.date,
    author: { '@type': 'Organization', name: 'Gaviom Inc.', url: siteUrl },
    publisher: {
      '@type': 'Organization',
      name: 'Gaviom Inc.',
      logo: { '@type': 'ImageObject', url: `${siteUrl}/images/cruise-hero.png` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: `${siteUrl}/images/cruise-hero.png`,
  })}</script>`;
  } else if (path === '/blog/') {
    jsonLd = `
  <script type="application/ld+json">${JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Blog',
    name: BLOG_META.blogTitle,
    description: BLOG_META.blogDescription,
    url,
    publisher: { '@type': 'Organization', name: 'Gaviom Inc.' },
  })}</script>`;
  }

  return `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${faviconHeadLinks()}
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${url}" />${article?.category ? `\n  <meta name="article:section" content="${escapeHtml(article.category)}" />` : ''}
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Gaviom" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${siteUrl}/images/cruise-hero.png" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />${jsonLd}`;
}

function topbar() {
  return `  <div class="topbar"><div class="wrap topbar-inner"><div class="topbar-left"><span><span class="live-dot soon-dot"></span> <span data-topbar-label>Gaviom launches in</span> <span data-cd="launch" data-cd-format="compact">--</span></span><span class="extra" data-topbar-extra>· Pre-sale open · First draw July 5, 8pm ET</span></div><div><a class="tlink" href="/free-entry.html">Free entry by mail</a> · <a class="tlink" href="/rules.html">Official Rules</a></div></div></div>`;
}

function nav(active) {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' class="active"' : ''}>${label}</a>`;
  return `  <header class="nav"><div class="wrap nav-inner"><a href="/" class="brand" aria-label="Gaviom home"><span class="brand-mark">G</span> Gaviom</a><nav class="nav-links">${link('/', 'Home', 'home')}${link('/prizes.html', 'Sweepstakes', 'prizes')}${link('/winners.html', 'Winners', 'winners')}${link('/how.html', 'How it works', 'how')}${link('/membership.html', 'Gaviom+', 'membership')}${link('/corporate.html', 'For business', 'corporate')}</nav><div class="nav-right"><a href="#" aria-disabled="true" style="pointer-events:none;opacity:0.4;" title="Coming soon">Sign in</a><a href="/prize.html" class="btn btn-primary" data-presale-cta data-entry-cta>Pre-order a ticket</a></div></div></header>`;
}

function footer() {
  return `  <footer class="footer">
    <div class="wrap footer-grid">
      <div class="footer-brand"><a href="/" class="brand"><span class="brand-mark">G</span> Gaviom</a><p class="footer-tagline">US sweepstakes with published odds, live draws, and reserved prize value. Operated by Gaviom Inc., Delaware.</p></div>
      <div class="footer-col"><h4>Play</h4><ul><li><a href="/prizes.html">All sweepstakes</a></li><li><a href="/prize.html">Grand prize</a></li></ul></div>
      <div class="footer-col"><h4>Learn</h4><ul><li><a href="/blog/">Blog</a></li><li><a href="/how.html">How it works</a></li><li><a href="/corporate.html">For business</a></li></ul></div>
      <div class="footer-col"><h4>Legal</h4><ul><li><a href="/rules.html">Official Rules</a></li><li><a href="/free-entry.html">Free entry by mail</a></li><li><a href="/terms.html">Terms</a></li><li><a href="/privacy.html">Privacy</a></li></ul></div>
    </div>
    <div class="wrap footer-legal"><span>© 2026 Gaviom Inc.</span><span>18+ · Void where prohibited</span></div>
  </footer>
  <script src="/app.js"></script>`;
}

function layout({ title, description, path, type, article, active, breadcrumbs, main }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title, description, path, type, article })}
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist+Mono:wght@400;500&family=Geist:wght@300;400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;1,400;1,500&display=swap" rel="stylesheet" />
  <link rel="stylesheet" href="/styles.css" />
  <link rel="stylesheet" href="/mobile.css" />
</head>
<body>
${topbar()}
${nav(active)}
  <div class="wrap breadcrumbs blog-breadcrumbs">${breadcrumbs}</div>
  <main class="blog-main">
${main}
  </main>
${footer()}
</body>
</html>`;
}

const TRAVEL_CROSS_LINK = `
      <section class="rules-section blog-cross-category">
        <h2>Explore More Giveaways on Gaviom</h2>
        <p>Not just travel. Gaviom gives away iPhones, and soon cars and homes. <a href="${siteUrl}/prizes.html">Check what&apos;s live now →</a></p>
      </section>`;

function injectTravelCrossLink(html) {
  if (html.includes('blog-cross-category')) return html;
  const marker = '<section class="rules-section blog-cta-band">';
  const idx = html.lastIndexOf(marker);
  if (idx === -1) return html + TRAVEL_CROSS_LINK;
  return html.slice(0, idx) + TRAVEL_CROSS_LINK + html.slice(idx);
}

function postBySlug(slug) {
  return POSTS.find((p) => p.slug === slug);
}

function relatedPosts(slugs) {
  return slugs
    .map((s) => postBySlug(s))
    .filter(Boolean)
    .map(
      (p) => `
        <a class="blog-related-card" href="/blog/${p.slug}.html">
          <span class="blog-card-cat font-mono">${p.category}</span>
          <span class="blog-related-title font-display">${escapeHtml(p.title)}</span>
          <span class="blog-card-meta font-mono">${formatDate(p.date)} · ${p.readMin} min</span>
        </a>`
    )
    .join('');
}

function buildIndex() {
  const sorted = [...POSTS].sort((a, b) => b.date.localeCompare(a.date));
  const cards = sorted
    .map(
      (p) => `
        <article class="blog-card" data-blog-category="${CATEGORY_FILTER_KEY[p.category] || 'guides'}">
          <a class="blog-card-link" href="/blog/${p.slug}.html">
            <span class="blog-card-cat font-mono">${p.category}</span>
            <h2 class="blog-card-title font-display">${escapeHtml(p.title)}</h2>
            <p class="blog-card-excerpt">${escapeHtml(p.description)}</p>
            <span class="blog-card-meta font-mono">${formatDate(p.date)} · ${p.readMin} min read</span>
          </a>
        </article>`
    )
    .join('');

  const filterBtns = CATEGORY_FILTERS.map(
    (f) =>
      `<button type="button" class="blog-filter-btn chip${f.key === 'all' ? ' active' : ''}" data-blog-filter="${f.key}">${f.label}</button>`
  ).join('');

  const main = `    <section class="blog-hero">
      <div class="wrap">
        <p class="eyebrow"><span class="bar"></span> Gaviom Blog</p>
        <h1 class="blog-hero-title font-display">Travel, Tech, Car &amp; Home Giveaway Guides</h1>
        <p class="lede blog-hero-lede">${escapeHtml(BLOG_META.blogDescription)}</p>
        <div class="blog-filters chips" aria-label="Filter by category">${filterBtns}</div>
      </div>
    </section>
    <section class="blog-list-section">
      <div class="wrap blog-grid" id="blog-grid">${cards}</div>
    </section>
    <section class="blog-cta-band">
      <div class="wrap blog-cta-inner">
        <h2 class="font-display">Ready to enter?</h2>
        <p class="lede">Browse travel, tech, and founding sweepstakes on Gaviom — or start with the iPhone and cruise draws.</p>
        <div class="blog-cta-actions">
          <a href="/prizes.html" class="btn btn-primary btn-lg">Browse sweepstakes</a>
          <a href="/how.html" class="btn btn-ghost btn-lg">How it works</a>
        </div>
      </div>
    </section>
    <script>
    (function () {
      var btns = document.querySelectorAll('[data-blog-filter]');
      var cards = document.querySelectorAll('[data-blog-category]');
      btns.forEach(function (btn) {
        btn.addEventListener('click', function () {
          var key = btn.getAttribute('data-blog-filter');
          btns.forEach(function (b) { b.classList.toggle('active', b === btn); });
          cards.forEach(function (card) {
            var show = key === 'all' || card.getAttribute('data-blog-category') === key;
            card.style.display = show ? '' : 'none';
          });
        });
      });
    })();
    </script>`;

  return layout({
    title: 'Gaviom Blog — Travel, Tech, Car & Home Giveaway Guides',
    description: BLOG_META.blogDescription,
    path: '/blog/',
    active: 'blog',
    breadcrumbs: `<a href="/">Home</a> <span>/</span> <span class="crumb-current">Blog</span>`,
    main,
  });
}

function buildPost(post) {
  // SECURITY NOTE: escape post.category if it ever comes from user input.
  // SECURITY NOTE: post.body is injected as raw HTML.
  // This is safe only while content comes from trusted build-time
  // generators. If a CMS or external content source is added,
  // sanitize with DOMPurify or a server-side sanitizer before this point.
  let bodyHtml = post.body.trim();
  if (post.category === BLOG_CATEGORIES.TRAVEL) {
    bodyHtml = injectTravelCrossLink(bodyHtml);
  }
  const main = `    <article class="wrap blog-article rules-doc">
      <header class="blog-article-header rules-doc-header">
        <p class="blog-card-cat font-mono">${post.category}</p>
        <h1 class="blog-article-title font-display">${escapeHtml(post.title)}</h1>
        <p class="blog-article-meta font-mono">${formatDate(post.date)} · ${post.readMin} min read · By Gaviom Inc.</p>
        <p class="lede">${escapeHtml(post.description)}</p>
      </header>
      <div class="blog-article-body">
        ${bodyHtml}
      </div>
      <aside class="blog-article-aside">
        <p class="eyebrow"><span class="bar"></span> Enter on Gaviom</p>
        <p style="font-size:15px;line-height:1.55;color:var(--ink-2);margin-bottom:16px;">Published odds, free mail-in entry, and live Sunday draws. Not legal advice; see <a href="/rules.html">Official Rules</a> for each promotion.</p>
        <a href="/prizes.html" class="btn btn-primary">Browse sweepstakes</a>
      </aside>
      <nav class="blog-related" aria-label="Related articles">
        <h2 class="font-display" style="font-size:22px;margin-bottom:16px;">Related guides</h2>
        <div class="blog-related-grid">${relatedPosts(post.related)}</div>
      </nav>
    </article>`;

  return layout({
    title: `${post.title} · Gaviom Blog`,
    description: post.description,
    path: `/blog/${post.slug}.html`,
    type: 'article',
    article: post,
    active: 'blog',
    breadcrumbs: `<a href="/">Home</a> <span>/</span> <a href="/blog/">Blog</a> <span>/</span> <span class="crumb-current">${escapeHtml(post.title)}</span>`,
    main,
  });
}

function buildSitemap() {
  const staticPages = [
    '/',
    '/prizes.html',
    '/prize.html',
    '/prize-diving.html',
    '/prize-vegas.html',
    '/prize-iphone.html',
    '/how.html',
    '/membership.html',
    '/corporate.html',
    '/winners.html',
    '/free-entry.html',
    '/checkout.html',
    '/rules.html',
    '/terms.html',
    '/privacy.html',
    '/blog/',
  ];

  const urls = [
    ...staticPages.map((p) => ({ loc: `${siteUrl}${p}`, lastmod: '2026-05-21' })),
    ...POSTS.map((p) => ({
      loc: `${siteUrl}/blog/${p.slug}.html`,
      lastmod: p.date,
    })),
  ];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls
  .map(
    (u) => `  <url>
    <loc>${u.loc}</loc>
    <lastmod>${u.lastmod}</lastmod>
  </url>`
  )
  .join('\n')}
</urlset>
`;

  writeFileSync(join(root, 'sitemap.xml'), xml);
}

function buildRobots() {
  writeFileSync(
    join(root, 'robots.txt'),
    `User-agent: *
Allow: /

Sitemap: ${siteUrl}/sitemap.xml
`
  );
}

mkdirSync(blogDir, { recursive: true });
writeFileSync(join(blogDir, 'index.html'), buildIndex());
for (const post of POSTS) {
  writeFileSync(join(blogDir, `${post.slug}.html`), buildPost(post));
}
buildSitemap();
buildRobots();

console.log(`Built blog → blog/index.html + ${POSTS.length} posts, sitemap.xml, robots.txt`);
