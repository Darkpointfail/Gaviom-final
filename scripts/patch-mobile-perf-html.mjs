/**
 * Mobile-only perf patches (desktop render unchanged):
 * - Async styles.css on viewports <=768px; blocking on desktop
 * - Font preload only on desktop (mobile: fonts after first paint)
 * - Hero LCP: sync decode, mobile src fallback, 480w srcset
 * - Remove blocking cart.js (lazy-loaded from app.js)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const HERO_V = 'mob20260702';

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (['node_modules', 'dist', '.git', 'business'].includes(name)) continue;
      walk(p, out);
    } else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

function splitStylesheetLoading(html) {
  if (html.includes("onload=\"this.media='(max-width:768px)'\"")) return html;

  html = html.replace(
    /\s*<link rel="preload" as="style" href="(\/styles\.css\?v=[^"]+)"\s*\/?>\s*/g,
    ''
  );

  const block = `  <link rel="preload" as="style" href="$1" media="(min-width: 769px)" />
  <link rel="stylesheet" href="$1" media="(min-width: 769px)" />
  <link rel="stylesheet" href="$1" media="print" onload="this.media='(max-width:768px)'" />
  <noscript><link rel="stylesheet" href="$1" /></noscript>`;

  return html.replace(
    /<link rel="stylesheet" href="(\/styles\.css\?v=[^"]+)"[^>]*\/?>/,
    block
  );
}

function patchHomeFonts(html) {
  return html.replace(
    /<link rel="preload" as="style" href="(https:\/\/fonts\.googleapis\.com[^"]+)"\s*\/?>/,
    '<link rel="preload" as="style" href="$1" media="(min-width: 769px)" />'
  );
}

function patchHeroLcp(html) {
  if (!html.includes('class="hero-home__lcp"')) return html;

  html = html.replace(
    /<picture>[\s\S]*?<\/picture>/,
    `<picture>
        <source media="(max-width: 768px)" srcset="/images/home-hero-mobile-480w.avif?v=${HERO_V} 480w, /images/home-hero-mobile.avif?v=${HERO_V} 686w" sizes="100vw" type="image/avif" />
        <source media="(min-width: 769px)" srcset="/images/home-hero-desktop.avif?v=${HERO_V}" type="image/avif" />
        <source media="(max-width: 768px)" srcset="/images/home-hero-mobile-480w.webp?v=${HERO_V} 480w, /images/home-hero-mobile.webp?v=${HERO_V} 686w" sizes="100vw" type="image/webp" />
        <source media="(min-width: 769px)" srcset="/images/home-hero-desktop.webp?v=${HERO_V}" type="image/webp" />
        <img
          class="hero-home__lcp"
          src="/images/home-hero-mobile.webp?v=${HERO_V}"
          width="686"
          height="1024"
          fetchpriority="high"
          decoding="sync"
          alt="Tropical beach with turquoise water and palm trees"
        />
      </picture>`
  );

  html = html.replace(
    /\s*<link rel="preload" as="image" href="\/images\/home-hero-[^"]+"[^>]*\/>\s*/g,
    ''
  );

  const preloads = `  <link rel="preload" as="image" href="/images/home-hero-mobile-480w.avif?v=${HERO_V}" type="image/avif" media="(max-width: 768px)" fetchpriority="high" />
  <link rel="preload" as="image" href="/images/home-hero-mobile-480w.webp?v=${HERO_V}" type="image/webp" media="(max-width: 768px)" />
  <link rel="preload" as="image" href="/images/home-hero-desktop.avif?v=${HERO_V}" type="image/avif" media="(min-width: 769px)" fetchpriority="high" />
  <link rel="preload" as="image" href="/images/home-hero-desktop.webp?v=${HERO_V}" type="image/webp" media="(min-width: 769px)" />`;

  html = html.replace(
    /(<noscript><link href="https:\/\/fonts\.googleapis\.com[^<]+<\/noscript>)\s*/,
    `$1\n${preloads}\n`
  );

  return html;
}

function removeCartScript(html) {
  return html.replace(/\s*<script defer src="(?:\/)?cart\.js[^"]*"><\/script>\s*/g, '\n');
}

let updated = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  const original = html;
  html = splitStylesheetLoading(html);
  html = removeCartScript(html);
  if (file === join(root, 'index.html')) {
    html = patchHomeFonts(html);
    html = patchHeroLcp(html);
  }
  if (html !== original) {
    writeFileSync(file, html);
    updated++;
  }
}

console.log(`patch-mobile-perf-html: ${updated} pages (mobile async CSS, lazy cart, hero v=${HERO_V})`);
