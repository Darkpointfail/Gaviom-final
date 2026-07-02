import { mkdirSync, writeFileSync, rmSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { POSTS, BLOG_META } from '../content/blog/posts.mjs';
import { BLOG_SECTIONS } from '../content/blog/taxonomy.mjs';
import { CANNIBALIZED_REDIRECTS } from '../content/blog/cannibalization.mjs';
import {
  SITE_URL,
  blogIndexUrl,
  buildListPage,
  buildPostPage,
  buildRss,
  buildSearchIndex,
  buildSearchPage,
  enrichPost,
  paginate,
  postUrl,
  sectionUrl,
  tagUrl,
} from './blog/engine.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blogDir = join(root, 'blog');

function writePage(relativePath, html) {
  const full = join(blogDir, relativePath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, html);
}

function cleanGeneratedDirs() {
  for (const section of Object.keys(BLOG_SECTIONS)) {
    const p = join(blogDir, section);
    if (existsSync(p)) rmSync(p, { recursive: true, force: true });
  }
  const tagDir = join(blogDir, 'tag');
  if (existsSync(tagDir)) rmSync(tagDir, { recursive: true, force: true });
  const pageDir = join(blogDir, 'page');
  if (existsSync(pageDir)) rmSync(pageDir, { recursive: true, force: true });
}

/** @param {ReturnType<typeof enrichPost>[]} posts */
function buildPaginatedList({
  posts,
  basePath,
  filePrefix,
  title,
  description,
  heroTitle,
  heroLede,
  breadcrumbs,
  activeSection = '',
}) {
  const { totalPages } = paginate(posts, 1);
  for (let page = 1; page <= totalPages; page += 1) {
    const { items, page: safePage } = paginate(posts, page);
    const path = page === 1 ? basePath : `${basePath}/page/${page}`;
    const rel =
      page === 1
        ? filePrefix === 'index'
          ? 'index.html'
          : `${filePrefix}/index.html`
        : `${filePrefix === 'index' ? 'page' : `${filePrefix}/page`}/${page}/index.html`;

    writePage(
      rel,
      buildListPage({
        title: page > 1 ? `${title} · Page ${page}` : title,
        description,
        path,
        breadcrumbs,
        heroTitle,
        heroLede,
        posts: items,
        page: safePage,
        totalPages,
        basePath,
        activeSection,
      })
    );
  }
}

function buildSitemaps(enriched) {
  const staticPages = [
    '/',
    '/prizes.html',
    '/prize.html',
    '/how.html',
    '/membership.html',
    '/business/',
    '/winners.html',
    '/free-entry.html',
    '/checkout.html',
    '/rules.html',
    '/terms.html',
    '/privacy.html',
    '/impact.html',
    '/contact',
    '/blog',
    '/blog/search',
    '/blog/feed.xml',
  ];

  const sectionPaths = Object.values(BLOG_SECTIONS).map((s) => s.path);
  const blogPaths = [
    ...staticPages,
    ...sectionPaths,
    ...enriched.map((p) => postUrl(p)),
  ];

  // Pagination pages
  const allSorted = [...enriched].sort((a, b) => b.date.localeCompare(a.date));
  const { totalPages: indexPages } = paginate(allSorted, 1);
  for (let p = 2; p <= indexPages; p += 1) blogPaths.push(`/blog/page/${p}`);

  for (const section of Object.values(BLOG_SECTIONS)) {
    const sectionPosts = enriched.filter((post) => post.section === section.key);
    const { totalPages } = paginate(sectionPosts, 1);
    for (let p = 2; p <= totalPages; p += 1) blogPaths.push(`${section.path}/page/${p}`);
  }

  const tagCounts = new Map();
  for (const post of enriched) {
    for (const tag of post.tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
  }
  for (const [tag, count] of tagCounts) {
    if (count < 2) continue;
    const tagPosts = enriched.filter((p) => p.tags.includes(tag));
    blogPaths.push(tagUrl(tag));
    const { totalPages } = paginate(tagPosts, 1);
    for (let p = 2; p <= totalPages; p += 1) blogPaths.push(`${tagUrl(tag)}/page/${p}`);
  }

  const urls = blogPaths.map((path) => {
    const post = enriched.find((p) => postUrl(p) === path);
    return {
      loc: `${SITE_URL}${path}`,
      lastmod: post?.updated || post?.date || '2026-05-21',
    };
  });

  const chunkSize = 1000;
  const chunks = [];
  for (let i = 0; i < urls.length; i += chunkSize) chunks.push(urls.slice(i, i + chunkSize));

  if (chunks.length === 1) {
    writeFileSync(join(root, 'sitemap.xml'), sitemapXml(chunks[0]));
  } else {
    const sitemapFiles = chunks.map((chunk, i) => {
      const name = `sitemap-blog-${i + 1}.xml`;
      writeFileSync(join(root, name), sitemapXml(chunk));
      return `${SITE_URL}/${name}`;
    });
    writeFileSync(
      join(root, 'sitemap.xml'),
      `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${sitemapFiles.map((loc) => `  <sitemap><loc>${loc}</loc></sitemap>`).join('\n')}
</sitemapindex>
`
    );
  }
}

function sitemapXml(urls) {
  return `<?xml version="1.0" encoding="UTF-8"?>
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
}

function buildRobots() {
  writeFileSync(
    join(root, 'robots.txt'),
    `User-agent: *
Allow: /

Sitemap: ${SITE_URL}/sitemap.xml
`
  );
}

function buildRedirectsFile() {
  const lines = Object.entries(CANNIBALIZED_REDIRECTS).map(
    ([from, to]) => `/blog/${from}.html /blog/${to} 301`
  );
  writeFileSync(join(blogDir, '_redirects.txt'), lines.join('\n'));
}

mkdirSync(blogDir, { recursive: true });
cleanGeneratedDirs();

const enriched = [...POSTS].map(enrichPost).sort((a, b) => b.date.localeCompare(a.date));

// Posts (keep .html for backward compat + clean URL rewrites)
for (const post of enriched) {
  writePage(`${post.slug}.html`, buildPostPage(post, enriched));
}

// Blog hub + pagination
buildPaginatedList({
  posts: enriched,
  basePath: '/blog',
  filePrefix: 'index',
  title: 'Gaviom Blog · Sweepstakes & Giveaway Guides',
  description: BLOG_META.blogDescription,
  heroTitle: 'Sweepstakes & Giveaway Guides',
  heroLede: BLOG_META.blogDescription,
  breadcrumbs: [
    { label: 'Home', href: '/' },
    { label: 'Blog', href: '/blog' },
  ],
});

// Section archives
for (const section of Object.values(BLOG_SECTIONS)) {
  const sectionPosts = enriched.filter((p) => p.section === section.key);
  buildPaginatedList({
    posts: sectionPosts,
    basePath: section.path,
    filePrefix: section.key,
    title: `${section.label} · Gaviom Blog`,
    description: section.description,
    heroTitle: section.label,
    heroLede: section.description,
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Blog', href: '/blog' },
      { label: section.label, href: section.path },
    ],
    activeSection: section.key,
  });
}

// Tag archives (2+ posts)
const tagCounts = new Map();
for (const post of enriched) {
  for (const tag of post.tags) tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
}

for (const [tag, count] of [...tagCounts.entries()].sort((a, b) => b[1] - a[1])) {
  if (count < 2) continue;
  const tagPosts = enriched.filter((p) => p.tags.includes(tag));
  const label = tag.charAt(0).toUpperCase() + tag.slice(1);
  buildPaginatedList({
    posts: tagPosts,
    basePath: tagUrl(tag),
    filePrefix: `tag/${tag.toLowerCase()}`,
    title: `${label} · Gaviom Blog`,
    description: `Articles tagged “${label}” on the Gaviom blog.`,
    heroTitle: `#${label}`,
    heroLede: `${count} guides about ${label}.`,
    breadcrumbs: [
      { label: 'Home', href: '/' },
      { label: 'Blog', href: '/blog' },
      { label: label, href: tagUrl(tag) },
    ],
  });
}

writePage('search.html', buildSearchPage());
writeFileSync(join(blogDir, 'search-index.json'), JSON.stringify(buildSearchIndex(enriched)));
writeFileSync(join(blogDir, 'feed.xml'), buildRss(enriched));

buildSitemaps(enriched);
buildRobots();
buildRedirectsFile();

console.log(
  `Built SEO blog → ${enriched.length} posts, ${Object.keys(BLOG_SECTIONS).length} sections, RSS, search index, sitemap`
);
