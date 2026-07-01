/**
 * Patch HTML for Lighthouse-responsive srcset/sizes and LCP AVIF hero.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const HERO_V = 'lcp20260701';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (['node_modules', 'dist', '.git', 'business'].includes(name)) continue;
      walk(p, out);
    } else if (name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

function patchHeroPreloads(html) {
  html = html.replace(
    /\s*<link rel="preload" as="image" href="\/images\/home-hero-(?:mobile|desktop)\.(?:avif|webp)[^"]*"[^>]*\/>\s*/g,
    ''
  );
  const block = `  <link rel="preload" as="image" href="/images/home-hero-mobile.avif?v=${HERO_V}" type="image/avif" media="(max-width: 768px)" fetchpriority="high" />
  <link rel="preload" as="image" href="/images/home-hero-mobile.webp?v=${HERO_V}" type="image/webp" media="(max-width: 768px)" fetchpriority="high" />
  <link rel="preload" as="image" href="/images/home-hero-desktop.avif?v=${HERO_V}" type="image/avif" media="(min-width: 769px)" fetchpriority="high" />
  <link rel="preload" as="image" href="/images/home-hero-desktop.webp?v=${HERO_V}" type="image/webp" media="(min-width: 769px)" fetchpriority="high" />`;
  return html.replace(
    /(<noscript><link href="https:\/\/fonts\.googleapis\.com[^<]+<\/noscript>)/,
    `$1\n${block}`
  );
}

function patchHero(html) {
  if (!html.includes('class="hero-home__lcp"')) return html;

  html = patchHeroPreloads(html);

  const heroPicture =
    `<picture>\n        <source media="(max-width: 768px)" srcset="/images/home-hero-mobile.avif?v=${HERO_V}" type="image/avif" />\n        <source media="(min-width: 769px)" srcset="/images/home-hero-desktop.avif?v=${HERO_V}" type="image/avif" />\n        <source media="(max-width: 768px)" srcset="/images/home-hero-mobile.webp?v=${HERO_V}" type="image/webp" />\n        <source media="(min-width: 769px)" srcset="/images/home-hero-desktop.webp?v=${HERO_V}" type="image/webp" />\n        <img\n          class="hero-home__lcp"\n          src="/images/home-hero-desktop.webp?v=${HERO_V}"\n          width="1600"\n          height="893"\n          fetchpriority="high"\n          decoding="async"\n          alt="Tropical beach with turquoise water and palm trees"\n        />\n      </picture>`;

  html = html.replace(
    /<picture>\s*<source media="\(max-width: 768px\)" srcset="\/images\/home-hero-mobile\.webp[^"]*" type="image\/webp"\s*\/>\s*<source media="\(min-width: 769px\)" srcset="\/images\/home-hero-desktop\.webp[^"]*" type="image\/webp"\s*\/>\s*<img[\s\S]*?class="hero-home__lcp"[\s\S]*?\/>\s*<\/picture>/,
    heroPicture
  );

  return html;
}

const REPLACEMENTS = [
  [
    /<img class="brand-logo"([^>]*?)src="\/images\/gaviom-logo\.webp"/g,
    '<img class="brand-logo"$1src="/images/gaviom-logo-110w.webp" srcset="/images/gaviom-logo-110w.webp 110w, /images/gaviom-logo.webp 453w" sizes="120px"',
  ],
  [
    /<img class="brand-logo brand-logo--footer"([^>]*?)src="\/images\/gaviom-logo\.webp"/g,
    '<img class="brand-logo brand-logo--footer"$1src="/images/gaviom-logo-110w.webp" srcset="/images/gaviom-logo-110w.webp 110w, /images/gaviom-logo.webp 453w" sizes="140px"',
  ],
  [
    /<img class="brand-logo brand-logo--corp"([^>]*?)src="\/images\/gaviom-logo\.webp"/g,
    '<img class="brand-logo brand-logo--corp"$1src="/images/gaviom-logo-110w.webp" srcset="/images/gaviom-logo-110w.webp 110w, /images/gaviom-logo.webp 453w" sizes="120px"',
  ],
  [
    /src="\/images\/cruise-hero-800w\.webp" srcset="\/images\/cruise-hero-480w\.webp 480w, \/images\/cruise-hero-800w\.webp 800w" sizes="\(max-width: 900px\) 100vw, 420px"/g,
    'src="/images/cruise-hero-400w.webp" srcset="/images/cruise-hero-400w.webp 400w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 900px) 100vw, 420px"',
  ],
  [
    /src="\/images\/vegas-quote-hero-800w\.webp" srcset="\/images\/vegas-strip-mobile-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w, \/images\/vegas-quote-hero\.webp 1024w" sizes="\(max-width: 768px\) 100vw, 900px" width="1024" height="686"/g,
    'src="/images/vegas-quote-hero-450w.webp" srcset="/images/vegas-quote-hero-450w.webp 450w, /images/vegas-quote-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 425px" width="450" height="300"',
  ],
  [
    /<img class="prize-photo" src="\/images\/diving-turtle\.webp"([^>]*?)loading="lazy"\s*\/>/g,
    '<img class="prize-photo" src="/images/diving-turtle-450w.webp" srcset="/images/diving-turtle-450w.webp 450w, /images/diving-turtle-800w.webp 800w" sizes="(max-width: 768px) 100vw, 425px" width="450" height="300"$1loading="lazy" decoding="async" />',
  ],
  [
    /<img class="prize-photo" src="\/images\/iphone-hero\.webp"([^>]*?)loading="lazy"\s*\/>/g,
    '<img class="prize-photo" src="/images/iphone-hero-550w.webp" srcset="/images/iphone-hero-550w.webp 550w, /images/iphone-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 425px" width="550" height="300"$1loading="lazy" decoding="async" />',
  ],
  [
    /<figure class="blog-figure"><img src="\/images\/diving-turtle\.webp"/g,
    '<figure class="blog-figure"><img src="/images/diving-turtle-450w.webp" srcset="/images/diving-turtle-450w.webp 450w, /images/diving-turtle-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="450" height="300"',
  ],
  [
    /<figure class="blog-figure"><img src="\/images\/iphone-hero\.webp"/g,
    '<figure class="blog-figure"><img src="/images/iphone-hero-550w.webp" srcset="/images/iphone-hero-550w.webp 550w, /images/iphone-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="550" height="300"',
  ],
  [
    /<figure class="blog-figure"><img src="\/images\/cruise-hero-800w\.webp"/g,
    '<figure class="blog-figure"><img src="/images/cruise-hero-400w.webp" srcset="/images/cruise-hero-400w.webp 400w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="400" height="220"',
  ],
];

function patchMobileCssLink(html) {
  return html.replace(
    /<link rel="stylesheet" href="\/mobile\.css(\?[^"]*)?"\s*\/?>/,
    '<link rel="stylesheet" href="/mobile.css$1" media="screen and (max-width: 1024px)" />'
  );
}

let updated = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  const original = html;

  if (file.endsWith(`${join('', 'index.html')}`) && !file.includes(`${join('blog', '')}`)) {
    html = patchHero(html);
  }
  if (file === join(root, 'index.html')) html = patchHero(html);

  for (const [re, rep] of REPLACEMENTS) {
    html = html.replace(re, rep);
  }
  html = patchMobileCssLink(html);

  if (html !== original) {
    writeFileSync(file, html);
    updated++;
  }
}

console.log(`patch-responsive-images: ${updated} HTML files updated (hero v=${HERO_V})`);
