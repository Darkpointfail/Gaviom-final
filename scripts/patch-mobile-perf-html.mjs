/**
 * Mobile perf patches — Safari-safe stylesheet loading.
 * Always load styles.css (no print/onload trick — breaks Mobile Safari).
 * mobile.css uses a standard media query.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const HERO_V = 'mob20260702';
const ASSET_V = '20260706-perf';

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

/** Strip legacy async/split CSS loading (unreliable on Safari). */
function stripLegacyCssLoading(html) {
  html = html.replace(
    /\s*<link rel="preload" as="style" href="(\/styles\.css\?v=[^"]+)" media="\(min-width: 769px\)"[^>]*\/?>\s*/g,
    ''
  );
  html = html.replace(
    /\s*<link rel="stylesheet" href="(\/styles\.css\?v=[^"]+)" media="\(min-width: 769px\)"[^>]*\/?>\s*/g,
    ''
  );
  html = html.replace(
    /\s*<link rel="stylesheet" href="(\/styles\.css\?v=[^"]+)" media="print" onload="this\.media='\(max-width:768px\)'"[^>]*\/?>\s*/g,
    ''
  );
  html = html.replace(
    /\s*<noscript><link rel="stylesheet" href="(\/styles\.css\?v=[^"]+)"[^>]*\/?><\/noscript>\s*/g,
    ''
  );
  html = html.replace(
    /\s*<link rel="stylesheet" href="(\/mobile\.css\?v=[^"]+)" media="print" onload="this\.media='screen and \(max-width:1024px\)'"[^>]*\/?>\s*/g,
    ''
  );
  html = html.replace(
    /\s*<noscript><link rel="stylesheet" href="(\/mobile\.css\?v=[^"]+)" media="screen and \(max-width: 1024px\)"[^>]*\/?><\/noscript>\s*/g,
    ''
  );
  html = html.replace(
    /\s*<link rel="stylesheet" href="(\/safari-compat\.css\?v=[^"]+)"[^>]*\/?>\s*/g,
    ''
  );
  return html;
}

function ensureReliableStylesheets(html) {
  const vMatch = html.match(/\/styles\.css\?v=([^"]+)/);
  const v = vMatch ? vMatch[1] : ASSET_V;

  const block = `  <link rel="stylesheet" href="/styles.css?v=${v}" />
  <link rel="stylesheet" href="/mobile.css?v=${v}" media="screen and (max-width: 1024px)" />
  <link rel="stylesheet" href="/safari-compat.css?v=${v}" />`;

  if (html.includes(`/styles.css?v=${v}"`) && html.includes('/safari-compat.css')) {
    return html;
  }

  if (html.includes(`/styles.css?v=${v}"`)) {
    return html.replace(
      /<link rel="stylesheet" href="(\/styles\.css\?v=[^"]+)"[^>]*\/?>/,
      block
    );
  }

  return html.replace(
    /<\/head>/i,
    `${block}\n</head>`
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
        <source media="(max-width: 768px)" srcset="/images/home-hero-mobile-480w.avif?v=${HERO_V}" type="image/avif" />
        <source media="(min-width: 769px)" srcset="/images/home-hero-desktop.avif?v=${HERO_V}" type="image/avif" />
        <source media="(max-width: 768px)" srcset="/images/home-hero-mobile-480w.webp?v=${HERO_V}" type="image/webp" />
        <source media="(min-width: 769px)" srcset="/images/home-hero-desktop.webp?v=${HERO_V}" type="image/webp" />
        <img
          class="hero-home__lcp"
          src="/images/home-hero-mobile-480w.webp?v=${HERO_V}"
          width="480"
          height="716"
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
  <link rel="preload" as="image" href="/images/home-hero-desktop.avif?v=${HERO_V}" type="image/avif" media="(min-width: 769px)" fetchpriority="high" />
  <link rel="preload" as="image" href="/images/home-hero-desktop.webp?v=${HERO_V}" type="image/webp" media="(min-width: 769px)" />`;

  if (html.includes('rel="preload" as="image" href="/images/home-hero-mobile-480w')) {
    return html;
  }

  html = html.replace(
    /(<link rel="stylesheet" href="\/safari-compat\.css[^"]+"[^>]*\/?>)/,
    `$1\n${preloads}`
  );

  return html;
}

function removeCartScript(html) {
  return html.replace(/\s*<script defer src="(?:\/)?cart\.js[^"]*"><\/script>\s*/g, '\n');
}

function injectAccountCriticalCss(html) {
  if (!html.includes('data-account-page')) return html;
  if (html.includes('id="critical-account"')) return html;

  const critical = `<style id="critical-account">body.account-page{margin:0;background:#faf7f2;color:#0a1628;font-family:system-ui,-apple-system,sans-serif}.nav,.topbar{position:relative;z-index:10;background:#051525;color:#e2c06a}.account-hero{background:#051525;color:#faf7f2;padding:24px 0}.account-layout{display:block;padding:20px}.account-content{background:#faf7f2;border:1px solid #e5ddd2;border-radius:12px;padding:20px}[hidden],.account-panel.is-hidden{display:none!important}</style>`;

  return html.replace(/<\/head>/i, `${critical}\n</head>`);
}

let updated = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  const original = html;
  html = stripLegacyCssLoading(html);
  html = ensureReliableStylesheets(html);
  html = injectAccountCriticalCss(html);
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

console.log(`patch-mobile-perf-html: ${updated} pages (Safari-safe CSS, hero v=${HERO_V})`);
