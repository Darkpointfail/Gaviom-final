/**
 * Performance patches for all HTML (root + blog):
 * - defer cart.js / app.js
 * - lazy GA4 before </body>
 * - preload main stylesheet
 * - cache-bust query on CSS/JS
 * - critical CSS + hero picture on index.html
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { googleAnalyticsDeferred, GA_MEASUREMENT_ID } from './analytics-head.mjs';
import { criticalHomeStyleTag } from './critical-home-css.mjs';

const root = process.cwd();
const ASSET_V = '20260706-perf';

const GA_BLOCK =
  /\s*(?:<!-- Google tag \(gtag\.js\)[^\n]*\n)?\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>\s*<script>[\s\S]*?gtag\('config', '[^']+'\);\s*<\/script>/gi;

const GA_INLINE =
  /\s*<script>\s*window\.dataLayer[\s\S]*?gtag\('config', '[^']+'\);\s*<\/script>/gi;

const GA_DEFERRED_BLOCK =
  /\s*<script>\s*\(function \(\) \{[\s\S]*?__gaviomGaLoaded[\s\S]*?\}\)\(\);\s*<\/script>/gi;

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git' || name === 'business') continue;
      walk(p, out);
    } else if (name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

function stripGa(html) {
  let prev;
  do {
    prev = html;
    html = html.replace(GA_BLOCK, '\n');
    html = html.replace(GA_INLINE, '\n');
  } while (html !== prev);
  return html;
}

function ensureDeferredGa(html) {
  html = html.replace(GA_DEFERRED_BLOCK, '\n');
  const snippet = googleAnalyticsDeferred();
  if (html.includes('</body>')) {
    return html.replace('</body>', `${snippet}\n</body>`);
  }
  return html;
}

function deferScripts(html) {
  return html.replace(
    /<script src="([^"]*(?:cart|app)\.js[^"]*)"><\/script>/gi,
    (match, src) => {
      if (match.includes(' defer')) return match;
      return `<script defer src="${src}"></script>`;
    }
  );
}

function bumpAssetVersions(html) {
  let next = html;
  next = next.replace(/href="(\/styles\.css)(\?[^"]*)?"/g, `href="$1?v=${ASSET_V}"`);
  next = next.replace(/href="(\/mobile\.css)(\?[^"]*)?"/g, `href="$1?v=${ASSET_V}"`);
  next = next.replace(/src="(\/?(?:cart|app)\.js)(\?[^"]*)?"/g, `src="$1?v=${ASSET_V}"`);
  return next;
}

function addStylesheetPreload(html) {
  const preload = `  <link rel="preload" as="style" href="/styles.css?v=${ASSET_V}" />`;
  if (html.includes('rel="preload" as="style" href="/styles.css')) return html;
  return html.replace(
    /(<link rel="stylesheet" href="\/styles\.css[^"]*"\s*\/?>)/,
    `${preload}\n  $1`
  );
}

function patchIndexHero(html) {
  if (!html.includes('class="hero-home__lcp"')) return html;

  if (html.includes('id="critical-home"')) {
    html = html.replace(/<style id="critical-home">[\s\S]*?<\/style>/, criticalHomeStyleTag().trim());
  } else {
    html = html.replace(
      /<style>html \{ background: #FAF7F2; \}<\/style>/,
      criticalHomeStyleTag()
    );
  }

  html = html.replace(/\s*<link rel="prefetch" href="\/prizes\.html"\s*\/?>\s*/g, '\n');

  html = html.replace(
    /url\('\/images\/home-eight-oclock-villa\.webp'\)/,
    "url('/images/home-eight-oclock-villa.webp?v=lcp20260701')"
  );

  return html;
}

let updated = 0;

for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  const original = html;

  html = stripGa(html);
  html = deferScripts(html);
  html = bumpAssetVersions(html);
  html = addStylesheetPreload(html);
  html = ensureDeferredGa(html);

  if (file === join(root, 'index.html')) {
    html = patchIndexHero(html);
  }

  if (html !== original) {
    writeFileSync(file, html);
    updated++;
  }
}

console.log(`patch-performance-html: ${updated} pages updated (asset v=${ASSET_V}, GA=${GA_MEASUREMENT_ID})`);
