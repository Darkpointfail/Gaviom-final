import { CANNIBALIZED_REDIRECTS } from '../../content/blog/cannibalization.mjs';
import { BLOG_CATEGORIES } from '../../content/blog/categories.mjs';
import {
  asideBlock,
  injectStrategyBlocks,
  normalizeBodyHtml,
  seoDescription,
  seoTitle,
  STRATEGY,
} from '../../content/blog/strategy.mjs';
import {
  BLOG_SECTIONS,
  blogIndexUrl,
  enrichPost,
  postUrl,
  POSTS_PER_PAGE,
  sectionUrl,
  SECTION_NAV,
  tagUrl,
} from '../../content/blog/taxonomy.mjs';
import { faviconHeadLinks } from '../favicon-links.mjs';
import { TOPBAR_FIRST_DRAW_EXTRA } from '../launch-dates.mjs';
import { googleAnalyticsDeferred } from '../analytics-head.mjs';
import { preconnectHeadLinks } from '../preconnect-head.mjs';
import { GOOGLE_FONTS_STANDARD, googleFontsStylesheetLink } from '../google-fonts-head.mjs';

/** @typedef {ReturnType<typeof enrichPost>} EnrichedPost */

export const SITE_URL = 'https://gaviom.com';

export function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function formatDate(iso) {
  const d = new Date(iso + 'T12:00:00');
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
}

export function slugifyHeading(text) {
  return text
    .toLowerCase()
    .replace(/&[^;]+;/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 64);
}

/** @param {string} html */
export function injectHeadingIds(html) {
  const used = new Set();
  return html.replace(/<(h[23])([^>]*)>([\s\S]*?)<\/\1>/gi, (match, tag, attrs, inner) => {
    if (/\bid\s*=/.test(attrs)) return match;
    const plain = inner.replace(/<[^>]+>/g, '').trim();
    if (!plain) return match;
    let id = slugifyHeading(plain);
    if (!id) return match;
    let n = 2;
    while (used.has(id)) {
      id = `${slugifyHeading(plain)}-${n++}`;
    }
    used.add(id);
    return `<${tag}${attrs} id="${id}">${inner}</${tag}>`;
  });
}

/** @param {string} html */
export function buildToc(html) {
  const items = [];
  html.replace(/<h([23])[^>]*id="([^"]+)"[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, id, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    if (text) items.push({ level: Number(level), id, text });
    return '';
  });
  if (items.length < 3) return { html: '', items: [] };

  const lis = items
    .map(
      (item) =>
        `<li class="blog-toc__item blog-toc__item--h${item.level}"><a href="#${escapeHtml(item.id)}">${escapeHtml(item.text)}</a></li>`
    )
    .join('');

  return {
    items,
    html: `<nav class="blog-toc" aria-label="Table of contents"><p class="blog-toc__label font-mono">On this page</p><ol class="blog-toc__list">${lis}</ol></nav>`,
  };
}

/** @param {{ question: string, answer: string }[]} faq */
export function renderFaqSection(faq) {
  if (!faq?.length) return '';
  const items = faq
    .map(
      (item) =>
        `<details class="blog-faq__item"><summary>${escapeHtml(item.question)}</summary><p>${escapeHtml(item.answer)}</p></details>`
    )
    .join('');
  return `<section class="blog-faq rules-section" aria-label="FAQ"><h2>Frequently asked questions</h2>${items}</section>`;
}

/** @param {{ label: string, href: string }[]} crumbs */
export function breadcrumbHtml(crumbs) {
  return crumbs
    .map((c, i) => {
      const isLast = i === crumbs.length - 1;
      if (isLast) return `<span class="crumb-current">${escapeHtml(c.label)}</span>`;
      return `<a href="${c.href}">${escapeHtml(c.label)}</a> <span>/</span>`;
    })
    .join(' ');
}

/** @param {{ label: string, href: string }[]} crumbs */
export function breadcrumbSchema(crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.label,
      item: c.href.startsWith('http') ? c.href : `${SITE_URL}${c.href}`,
    })),
  };
}

/** @param {EnrichedPost} post */
export function articleSchema(post) {
  const url = `${SITE_URL}${postUrl(post)}`;
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: seoTitle(post),
    description: seoDescription(post),
    datePublished: post.date,
    dateModified: post.updated,
    author: { '@type': 'Organization', name: post.author, url: SITE_URL },
    publisher: {
      '@type': 'Organization',
      name: 'Gaviom Inc.',
      logo: { '@type': 'ImageObject', url: `${SITE_URL}/images/gaviom-logo.webp` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    image: `${SITE_URL}${post.featuredImage}`,
    articleSection: BLOG_SECTIONS[post.section]?.label || post.category,
    keywords: post.tags.join(', '),
  };
}

export function organizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Gaviom Inc.',
    url: SITE_URL,
    logo: `${SITE_URL}/images/gaviom-logo.webp`,
    sameAs: [],
  };
}

/** @param {{ question: string, answer: string }[]} faq */
export function faqSchema(faq) {
  if (!faq?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faq.map(({ question, answer }) => ({
      '@type': 'Question',
      name: question,
      acceptedAnswer: { '@type': 'Answer', text: answer },
    })),
  };
}

/** @param {object} opts */
export function headBlock({
  title,
  description,
  path,
  type = 'website',
  article,
  breadcrumbs,
  ogImage = `${SITE_URL}/images/cruise-hero-800w.webp`,
}) {
  const url = `${SITE_URL}${path}`;
  const ogType = type === 'article' ? 'article' : 'website';
  const schemas = [organizationSchema()];

  if (breadcrumbs?.length) schemas.push(breadcrumbSchema(breadcrumbs));
  if (article) {
    schemas.push(articleSchema(article));
    const faq = faqSchema(article.faq);
    if (faq) schemas.push(faq);
  } else if (path === '/blog') {
    schemas.push({
      '@context': 'https://schema.org',
      '@type': 'Blog',
      name: 'Gaviom Blog',
      url,
      publisher: { '@type': 'Organization', name: 'Gaviom Inc.' },
    });
  }

  const jsonLd = schemas
    .map((s) => `\n  <script type="application/ld+json">${JSON.stringify(s)}</script>`)
    .join('');

  return `  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
${preconnectHeadLinks()}
${faviconHeadLinks()}
  <title>${escapeHtml(title)}</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <link rel="canonical" href="${url}" />${path.startsWith('/blog') ? `\n  <link rel="alternate" type="application/rss+xml" title="Gaviom Blog" href="${SITE_URL}/blog/feed.xml" />` : ''}${article?.category ? `\n  <meta name="article:section" content="${escapeHtml(article.category)}" />` : ''}${article?.tags?.length ? `\n  <meta name="keywords" content="${escapeHtml(article.tags.join(', '))}" />` : ''}
  <meta property="og:type" content="${ogType}" />
  <meta property="og:site_name" content="Gaviom" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:url" content="${url}" />
  <meta property="og:image" content="${ogImage.startsWith('http') ? ogImage : SITE_URL + ogImage}" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImage.startsWith('http') ? ogImage : SITE_URL + ogImage}" />${jsonLd}`;
}

export function topbar() {
  return `  <div class="topbar"><div class="wrap topbar-inner"><div class="topbar-left"><span><span class="live-dot soon-dot"></span> <span data-topbar-label>Gaviom launches in</span> <span data-cd="launch" data-cd-format="compact">--</span></span><span class="extra" data-topbar-extra>${TOPBAR_FIRST_DRAW_EXTRA}</span></div><div><a class="tlink" href="/free-entry.html">Free entry by mail</a> · <a class="tlink" href="/rules.html">Official Rules</a></div></div></div>`;
}

export function nav(active) {
  const link = (href, label, key) =>
    `<a href="${href}"${active === key ? ' class="active"' : ''}>${label}</a>`;
  return `  <header class="nav"><div class="wrap nav-inner"><a href="/" class="brand" aria-label="Gaviom home"><span class="brand-mark">G</span> Gaviom</a><nav class="nav-links">${link('/', 'Home', 'home')}${link('/prizes.html', 'Sweepstakes', 'prizes')}${link('/winners.html', 'Winners', 'winners')}${link('/how.html', 'How it works', 'how')}${link('/impact.html', 'Impact', 'impact')}${link('/membership.html', 'Gaviom+', 'membership')}${link('/business/', 'For business', 'corporate')}</nav><div class="nav-right"><a href="/signin.html" class="nav-signin">Sign in</a><a href="/prize.html" class="btn btn-primary" data-presale-cta data-entry-cta>Pre-order a ticket</a></div></div></header>`;
}

export function footer() {
  return `  <footer class="footer">
    <div class="wrap footer-grid">
      <div class="footer-brand"><a href="/" class="brand"><span class="brand-mark">G</span> Gaviom</a><p class="footer-tagline">US sweepstakes with published odds, live draws, and reserved prize value. Operated by Gaviom Inc., Delaware.</p></div>
      <div class="footer-col"><h4>Play</h4><ul><li><a href="/prizes.html">All sweepstakes</a></li><li><a href="/prize.html">Grand prize</a></li></ul></div>
      <div class="footer-col"><h4>Learn</h4><ul><li><a href="/blog">Blog</a></li><li><a href="/blog/search">Search</a></li><li><a href="/how.html">How it works</a></li><li><a href="/business/">For business</a></li></ul></div>
      <div class="footer-col"><h4>Legal</h4><ul><li><a href="/rules.html">Official Rules</a></li><li><a href="/free-entry.html">Free entry by mail</a></li><li><a href="/terms.html">Terms</a></li><li><a href="/privacy.html">Privacy</a></li></ul></div>
    </div>
    <div class="wrap footer-legal"><span>© 2026 Gaviom Inc.</span><span>18+ · Void where prohibited</span></div>
  </footer>
  <script defer src="/cart.js?v=20260705-perf"></script>
  <script defer src="/app.js?v=20260705-perf"></script>
${googleAnalyticsDeferred()}`;
}

/** @param {object} opts */
export function layout({ title, description, path, type, article, active, breadcrumbs, ogImage, main }) {
  const crumbHtml = breadcrumbs?.length
    ? breadcrumbHtml(breadcrumbs)
    : `<a href="/">Home</a> <span>/</span> <span class="crumb-current">Blog</span>`;

  return `<!DOCTYPE html>
<html lang="en">
<head>
${headBlock({ title, description, path, type, article, breadcrumbs, ogImage })}
${googleFontsStylesheetLink(GOOGLE_FONTS_STANDARD)}
  <link rel="preload" as="style" href="/styles.css?v=20260705-perf" />
  <link rel="stylesheet" href="/styles.css?v=20260705-perf" />
  <link rel="stylesheet" href="/mobile.css?v=20260705-perf" media="screen and (max-width: 1024px)" />
</head>
<body>
${topbar()}
${nav(active)}
  <div class="wrap breadcrumbs blog-breadcrumbs">${crumbHtml}</div>
  <main class="blog-main">
${main}
  </main>
${footer()}
</body>
</html>`;
}

/** @param {EnrichedPost} post */
export function postCard(post) {
  const section = BLOG_SECTIONS[post.section];
  return `
        <article class="blog-card" data-blog-category="${post.section}" data-blog-tags="${escapeHtml(post.tags.join(' '))}">
          <a class="blog-card-link" href="${postUrl(post)}">
            <img class="blog-card-thumb" src="${post.featuredImage}" alt="" width="640" height="360" loading="lazy" decoding="async" />
            <span class="blog-card-cat font-mono">${section?.label || post.category}</span>
            <h2 class="blog-card-title font-display">${escapeHtml(post.title)}</h2>
            <p class="blog-card-excerpt">${escapeHtml(post.description)}</p>
            <span class="blog-card-meta font-mono">${formatDate(post.date)} · ${post.readMin} min read</span>
          </a>
        </article>`;
}

/** @param {EnrichedPost[]} posts */
export function postsGrid(posts) {
  return posts.map(postCard).join('');
}

/** @param {object} opts */
export function paginationHtml({ basePath, page, totalPages, label = 'Blog' }) {
  if (totalPages <= 1) return '';
  const mk = (p, text, current = false) => {
    if (current) return `<span class="blog-page-link is-current" aria-current="page">${text}</span>`;
    const href = p === 1 ? basePath : `${basePath}/page/${p}`;
    return `<a class="blog-page-link" href="${href}" rel="${p === page + 1 ? 'next' : p === page - 1 ? 'prev' : ''}">${text}</a>`;
  };

  const links = [];
  if (page > 1) links.push(mk(page - 1, '← Previous'));
  for (let p = 1; p <= totalPages; p += 1) {
    if (p === 1 || p === totalPages || Math.abs(p - page) <= 1) {
      links.push(mk(p, String(p), p === page));
    } else if (Math.abs(p - page) === 2) {
      links.push('<span class="blog-page-gap">…</span>');
    }
  }
  if (page < totalPages) links.push(mk(page + 1, 'Next →'));

  return `<nav class="blog-pagination" aria-label="${escapeHtml(label)} pagination"><div class="blog-pagination-inner">${links.join('')}</div></nav>`;
}

export function sectionNavHtml(activeKey = '') {
  return SECTION_NAV.map(
    (s) =>
      `<a class="blog-section-link${activeKey === s.key ? ' is-active' : ''}" href="${s.path}">${s.label}</a>`
  ).join('');
}

/** @param {EnrichedPost[]} allPosts */
export function resolveRelatedSlug(slug) {
  return CANNIBALIZED_REDIRECTS[slug] ?? slug;
}

/** @param {EnrichedPost} post @param {EnrichedPost[]} allPosts */
export function pickRelatedPosts(post, allPosts) {
  const bySlug = new Map(allPosts.map((p) => [p.slug, p]));
  const seen = new Set([post.slug]);
  const picked = [];

  const add = (p) => {
    if (!p || seen.has(p.slug)) return;
    seen.add(p.slug);
    picked.push(p);
  };

  for (const slug of post.related || []) {
    add(bySlug.get(resolveRelatedSlug(slug)));
    if (picked.length >= 3) break;
  }

  if (picked.length < 3) {
    for (const p of allPosts) {
      if (p.section === post.section) add(p);
      if (picked.length >= 3) break;
    }
  }

  if (picked.length < 3) {
    for (const p of allPosts) {
      if (p.tags.some((t) => post.tags.includes(t))) add(p);
      if (picked.length >= 3) break;
    }
  }

  return picked.slice(0, 3);
}

/** @param {EnrichedPost[]} allPosts @param {string} section */
export function pickPopularPosts(allPosts, section) {
  return allPosts.filter((p) => p.section === section).slice(0, 3);
}

/** @param {EnrichedPost[]} allPosts */
export function pickLatestPosts(allPosts, limit = 3) {
  return allPosts.slice(0, limit);
}

/** @param {EnrichedPost[]} posts */
export function relatedCards(posts) {
  return posts
    .map(
      (p) => `
        <a class="blog-related-card" href="${postUrl(p)}">
          <span class="blog-card-cat font-mono">${BLOG_SECTIONS[p.section]?.label || p.category}</span>
          <span class="blog-related-title font-display">${escapeHtml(p.title)}</span>
          <span class="blog-card-meta font-mono">${formatDate(p.date)} · ${p.readMin} min</span>
        </a>`
    )
    .join('');
}

const TRAVEL_CROSS_LINK = `
      <section class="rules-section blog-cross-category">
        <h2>Explore More Giveaways on Gaviom</h2>
        <p>Not just travel. Gaviom gives away iPhones, and soon cars and homes. <a href="/prizes.html">Check what&apos;s live now →</a></p>
      </section>`;

function injectTravelCrossLink(html) {
  if (html.includes('blog-cross-category')) return html;
  const marker = '<section class="rules-section blog-cta-band">';
  const idx = html.lastIndexOf(marker);
  if (idx === -1) return html + TRAVEL_CROSS_LINK;
  return html.slice(0, idx) + TRAVEL_CROSS_LINK + html.slice(idx);
}

/** @param {EnrichedPost} post @param {EnrichedPost[]} allPosts */
export function buildPostPage(post, allPosts) {
  let bodyHtml = normalizeBodyHtml(post.body.trim(), post);
  bodyHtml = injectStrategyBlocks(bodyHtml, post);
  if (post.category === BLOG_CATEGORIES.TRAVEL) bodyHtml = injectTravelCrossLink(bodyHtml);
  bodyHtml = injectHeadingIds(bodyHtml);
  const toc = buildToc(bodyHtml);
  const faqBlock = renderFaqSection(post.faq);
  const pageTitle = seoTitle(post);
  const pageDescription = seoDescription(post);
  const section = BLOG_SECTIONS[post.section];
  const similar = pickRelatedPosts(post, allPosts);
  const popular = pickPopularPosts(allPosts, post.section);
  const latest = pickLatestPosts(allPosts, 3);

  const tagLinks = post.tags
    .slice(0, 6)
    .map((t) => `<a class="blog-tag" href="${tagUrl(t)}">${escapeHtml(t)}</a>`)
    .join('');

  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: section?.label || 'Article', href: section?.path || '/blog' },
    { label: post.title, href: postUrl(post) },
  ];

  const main = `    <article class="wrap blog-article rules-doc">
      <header class="blog-article-header rules-doc-header">
        <p class="blog-card-cat font-mono"><a href="${section?.path || '/blog'}">${section?.label || post.category}</a></p>
        <h1 class="blog-article-title font-display">${escapeHtml(post.title)}</h1>
        <p class="blog-article-meta font-mono">
          <time datetime="${post.date}">Published ${formatDate(post.date)}</time>
          · <time datetime="${post.updated}">Updated ${formatDate(post.updated)}</time>
          · ${post.readMin} min read · ${escapeHtml(post.author)}
        </p>
        <p class="lede">${escapeHtml(pageDescription)}</p>
        <div class="blog-tag-row">${tagLinks}</div>
      </header>
      <div class="blog-article-layout">
        ${toc.html}
        <div class="blog-article-body">
          ${bodyHtml}
          ${faqBlock}
        </div>
      </div>
${asideBlock(post)}
      <nav class="blog-related" aria-label="Similar articles">
        <h2 class="font-display blog-related-heading">Similar guides</h2>
        <div class="blog-related-grid">${relatedCards(similar)}</div>
      </nav>
      <nav class="blog-related" aria-label="Popular in category">
        <h2 class="font-display blog-related-heading">Popular in ${escapeHtml(section?.label || post.category)}</h2>
        <div class="blog-related-grid">${relatedCards(popular)}</div>
      </nav>
      <nav class="blog-related" aria-label="Latest articles">
        <h2 class="font-display blog-related-heading">Latest from the blog</h2>
        <div class="blog-related-grid">${relatedCards(latest)}</div>
      </nav>
      <section class="blog-cta-band blog-cta-band--article">
        <div class="blog-cta-inner">
          <h2 class="font-display">Enter Gaviom sweepstakes</h2>
          <p class="lede">Published odds, live Sunday draws, and verified prizes. Pre-order tickets or use free alternate entry.</p>
          <div class="blog-cta-actions">
            <a href="/prizes.html" class="btn btn-primary btn-lg">${STRATEGY.consumerCtaLabel}</a>
            <a href="/free-entry.html" class="btn btn-ghost btn-lg">Free entry</a>
          </div>
        </div>
      </section>
    </article>`;

  return layout({
    title: pageTitle,
    description: pageDescription,
    path: postUrl(post),
    type: 'article',
    article: post,
    active: 'blog',
    breadcrumbs,
    ogImage: post.featuredImage,
    main,
  });
}

/** @param {object} opts @param {EnrichedPost[]} allPosts */
export function buildListPage({ title, description, path, breadcrumbs, heroTitle, heroLede, posts, page, totalPages, basePath, activeSection = '' }) {
  const main = `    <section class="blog-hero">
      <div class="wrap">
        <p class="eyebrow"><span class="bar"></span> Gaviom Blog</p>
        <h1 class="blog-hero-title font-display">${escapeHtml(heroTitle)}</h1>
        <p class="lede blog-hero-lede">${escapeHtml(heroLede)}</p>
        <nav class="blog-section-nav" aria-label="Blog sections">${sectionNavHtml(activeSection)}</nav>
        <form class="blog-search-inline" action="/blog/search" method="get" role="search">
          <label class="sr-only" for="blog-q">Search articles</label>
          <input id="blog-q" name="q" type="search" placeholder="Search guides, tags, topics…" autocomplete="off" />
          <button type="submit" class="btn btn-primary">Search</button>
        </form>
      </div>
    </section>
    <section class="blog-list-section">
      <div class="wrap blog-grid">${postsGrid(posts)}</div>
      ${paginationHtml({ basePath, page, totalPages, label: heroTitle })}
    </section>
    <section class="blog-cta-band">
      <div class="wrap blog-cta-inner">
        <h2 class="font-display">Ready to enter?</h2>
        <p class="lede">Browse founding sweepstakes with published odds and verified prizes.</p>
        <div class="blog-cta-actions">
          <a href="/prizes.html" class="btn btn-primary btn-lg">${STRATEGY.consumerCtaLabel}</a>
          <a href="/how.html" class="btn btn-ghost btn-lg">How it works</a>
        </div>
      </div>
    </section>`;

  return layout({ title, description, path, active: 'blog', breadcrumbs, main });
}

export function buildSearchPage() {
  const breadcrumbs = [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
    { label: 'Search', href: '/blog/search' },
  ];

  const main = `    <section class="blog-hero blog-hero--compact">
      <div class="wrap">
        <h1 class="blog-hero-title font-display">Search the blog</h1>
        <p class="lede blog-hero-lede">Filter by keyword, category, or tag across all Gaviom guides.</p>
        <form class="blog-search-form" id="blog-search-form" role="search">
          <input id="blog-search-input" type="search" placeholder="e.g. travel sweepstakes, iPhone, taxes" autocomplete="off" />
          <select id="blog-search-section" aria-label="Category">
            <option value="">All sections</option>
            ${SECTION_NAV.map((s) => `<option value="${s.key}">${s.label}</option>`).join('')}
          </select>
          <input id="blog-search-tag" type="text" placeholder="Tag (optional)" aria-label="Tag filter" />
          <button type="submit" class="btn btn-primary">Search</button>
        </form>
      </div>
    </section>
    <section class="blog-list-section">
      <div class="wrap">
        <p class="blog-search-status font-mono" id="blog-search-status" aria-live="polite"></p>
        <div class="blog-grid" id="blog-search-results"></div>
      </div>
    </section>
    <script>
    (function () {
      var params = new URLSearchParams(window.location.search);
      var input = document.getElementById('blog-search-input');
      var section = document.getElementById('blog-search-section');
      var tag = document.getElementById('blog-search-tag');
      var status = document.getElementById('blog-search-status');
      var results = document.getElementById('blog-search-results');
      if (input && params.get('q')) input.value = params.get('q');
      if (section && params.get('section')) section.value = params.get('section');
      if (tag && params.get('tag')) tag.value = params.get('tag');

      function card(item) {
        return '<article class="blog-card"><a class="blog-card-link" href="' + item.url + '">' +
          '<img class="blog-card-thumb" src="' + item.image + '" alt="" loading="lazy" decoding="async" />' +
          '<span class="blog-card-cat font-mono">' + item.sectionLabel + '</span>' +
          '<h2 class="blog-card-title font-display">' + item.title.replace(/</g, '&lt;') + '</h2>' +
          '<p class="blog-card-excerpt">' + item.description.replace(/</g, '&lt;') + '</p>' +
          '<span class="blog-card-meta font-mono">' + item.date + ' · ' + item.readMin + ' min read</span></a></article>';
      }

      function runSearch() {
        fetch('/blog/search-index.json')
          .then(function (r) { return r.json(); })
          .then(function (data) {
            var q = (input.value || '').trim().toLowerCase();
            var sec = section.value;
            var tg = (tag.value || '').trim().toLowerCase();
            var list = data.filter(function (item) {
              if (sec && item.section !== sec) return false;
              if (tg && !item.tags.some(function (t) { return t.indexOf(tg) !== -1; })) return false;
              if (!q) return true;
              var hay = (item.title + ' ' + item.description + ' ' + item.tags.join(' ')).toLowerCase();
              return hay.indexOf(q) !== -1;
            });
            status.textContent = list.length + ' article' + (list.length === 1 ? '' : 's') + ' found';
            results.innerHTML = list.slice(0, 48).map(card).join('');
          })
          .catch(function () {
            status.textContent = 'Search index unavailable.';
          });
      }

      document.getElementById('blog-search-form').addEventListener('submit', function (e) {
        e.preventDefault();
        runSearch();
      });
      runSearch();
    })();
    </script>`;

  return layout({
    title: 'Search Gaviom Blog',
    description: 'Search sweepstakes guides, giveaway tips, and HR engagement articles.',
    path: '/blog/search',
    active: 'blog',
    breadcrumbs,
    main,
  });
}

/** @param {EnrichedPost[]} posts */
export function buildSearchIndex(posts) {
  return posts.map((p) => ({
    slug: p.slug,
    url: postUrl(p),
    title: p.title,
    description: p.description,
    section: p.section,
    sectionLabel: BLOG_SECTIONS[p.section]?.label || p.category,
    tags: p.tags,
    date: formatDate(p.date),
    readMin: p.readMin,
    image: p.featuredImage,
  }));
}

/** @param {EnrichedPost[]} posts */
export function buildRss(posts) {
  const items = posts.slice(0, 50).map((p) => {
    const url = `${SITE_URL}${postUrl(p)}`;
    return `    <item>
      <title>${escapeHtml(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${new Date(p.date).toUTCString()}</pubDate>
      <description>${escapeHtml(p.description)}</description>
    </item>`;
  });

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Gaviom Blog</title>
    <link>${SITE_URL}/blog</link>
    <description>Sweepstakes guides, giveaway tips, and HR engagement insights from Gaviom.</description>
    <language>en-us</language>
${items.join('\n')}
  </channel>
</rss>
`;
}

export function paginate(posts, page) {
  const totalPages = Math.max(1, Math.ceil(posts.length / POSTS_PER_PAGE));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * POSTS_PER_PAGE;
  return { items: posts.slice(start, start + POSTS_PER_PAGE), page: safePage, totalPages };
}

export { enrichPost, postUrl, sectionUrl, tagUrl, blogIndexUrl, POSTS_PER_PAGE, BLOG_SECTIONS };
