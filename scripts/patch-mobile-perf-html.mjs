/**
 * Mobile-only perf patches (desktop render unchanged):
 * - Async styles.css + mobile.css on viewports <=768px / <=1024px
 * - Font preload only on desktop
 * - Hero LCP: sync decode, 480w src fallback, srcset
 * - Remove blocking cart.js (lazy-loaded from app.js)
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const HERO_V = 'mob20260702';
const HERO_DESKTOP_V = 'desk20260712-hq';
const HERO_MOBILE_V = 'mob20260712-perf';
const ASSET_V = '20260712-mobile-perf';

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

function splitMobileStylesheet(html) {
  if (html.includes("onload=\"this.media='screen and (max-width:1024px)'\"")) return html;

  return html.replace(
    /<link rel="stylesheet" href="(\/mobile\.css\?v=[^"]+)" media="screen and \(max-width: 1024px\)"[^>]*\/?>/,
    `<link rel="stylesheet" href="$1" media="print" onload="this.media='screen and (max-width:1024px)'" />
  <noscript><link rel="stylesheet" href="$1" media="screen and (max-width: 1024px)" /></noscript>`
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
        <source media="(max-width: 768px)" srcset="/images/home-hero-mobile-coast-360w.avif?v=${HERO_MOBILE_V} 360w, /images/home-hero-mobile-coast-480w.avif?v=${HERO_MOBILE_V} 480w" sizes="100vw" type="image/avif" />
        <source media="(min-width: 769px)" srcset="/images/home-hero-desktop-2560w.avif?v=${HERO_DESKTOP_V} 2560w, /images/home-hero-desktop-1920w.avif?v=${HERO_DESKTOP_V} 1920w, /images/home-hero-desktop-1600w.avif?v=${HERO_DESKTOP_V} 1600w" sizes="100vw" type="image/avif" />
        <source media="(max-width: 768px)" srcset="/images/home-hero-mobile-coast-360w.webp?v=${HERO_MOBILE_V} 360w, /images/home-hero-mobile-coast-480w.webp?v=${HERO_MOBILE_V} 480w" sizes="100vw" type="image/webp" />
        <source media="(min-width: 769px)" srcset="/images/home-hero-desktop-2560w.webp?v=${HERO_DESKTOP_V} 2560w, /images/home-hero-desktop-1920w.webp?v=${HERO_DESKTOP_V} 1920w, /images/home-hero-desktop-1600w.webp?v=${HERO_DESKTOP_V} 1600w" sizes="100vw" type="image/webp" />
        <img
          class="hero-home__lcp"
          src="/images/home-hero-mobile-coast-360w.webp?v=${HERO_MOBILE_V}"
          width="360"
          height="781"
          fetchpriority="high"
          decoding="sync"
          alt="Mediterranean coast at golden hour with villa terrace overlooking the sea"
        />
      </picture>`
  );

  html = html.replace(
    /\s*<link rel="preload" as="image" href="\/images\/home-hero-[^"]+"[^>]*\/>\s*/g,
    ''
  );

  const preloads = `  <link rel="preload" as="image" href="/images/home-hero-mobile-coast-360w.avif?v=${HERO_MOBILE_V}" type="image/avif" media="(max-width: 768px)" fetchpriority="high" />
  <link rel="preload" as="image" href="/images/home-hero-desktop-1920w.avif?v=${HERO_DESKTOP_V}" type="image/avif" media="(min-width: 769px)" fetchpriority="high" />
  <link rel="preload" as="image" href="/images/home-hero-desktop-1920w.webp?v=${HERO_DESKTOP_V}" type="image/webp" media="(min-width: 769px)" />`;

  if (html.includes(`href="/images/home-hero-mobile-coast-360w.avif?v=${HERO_MOBILE_V}`)) {
    return html;
  }

  html = html.replace(/(<\/noscript>)(\s*<link rel="preload" as="style" href="\/styles\.css)/, `$1\n${preloads}\n$2`);

  return html;
}

function removeCartScript(html) {
  return html.replace(/\s*<script defer src="(?:\/)?cart\.js[^"]*"><\/script>\s*/g, '\n');
}

function patchHomeSeo(html) {
  html = html.replace(/\s*<meta name="google-site-verification"[^>]*>\s*/gi, '');

  if (!html.includes('property="og:image"')) {
    html = html.replace(
      /<meta property="og:description" content="Real prizes\. Live draws\. From \$2\." \/>/,
      `<meta property="og:description" content="Real prizes. Live draws. From $2." />
  <meta property="og:url" content="https://gaviom.com/" />
  <meta property="og:image" content="https://gaviom.com/images/home-hero-desktop-1920w.webp?v=${HERO_DESKTOP_V}" />
  <meta property="og:image:alt" content="Gaviom US sweepstakes platform" />`
    );
  }

  if (!html.includes('name="twitter:image"')) {
    html = html.replace(
      /<meta name="twitter:description" content="Real prizes\. Live draws\. From \$2\." \/>/,
      `<meta name="twitter:description" content="Real prizes. Live draws. From $2." />
  <meta name="twitter:image" content="https://gaviom.com/images/home-hero-desktop-1920w.webp?v=${HERO_DESKTOP_V}" />`
    );
  }

  if (!html.includes('application/ld+json')) {
    html = html.replace(
      /<title>Gaviom, US Sweepstakes Platform<\/title>/,
      `<script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","name":"Gaviom","url":"https://gaviom.com/","description":"US sweepstakes platform with published odds, verified prizes, and live draws."}</script>
  <title>Gaviom, US Sweepstakes Platform</title>`
    );
  }

  return html;
}

function patchHomeIdleScripts(html) {
  const appSrc = `/app.js?v=${ASSET_V}`;

  const loader = `<script>
(function () {
  function loadHomeScripts() {
    if (window.__gaviomHomeScripts) return;
    window.__gaviomHomeScripts = true;
    ['/auth-nav.js', '${appSrc}'].forEach(function (src) {
      var s = document.createElement('script');
      s.src = src;
      s.defer = true;
      document.body.appendChild(s);
    });
  }
  function schedule() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(loadHomeScripts, { timeout: 2500 });
    } else {
      setTimeout(loadHomeScripts, 1);
    }
  }
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
})();
</script>`;

  html = html.replace(
    /\s*<script defer src="\/auth-nav\.js"><\/script>\s*<script defer src="\/app\.js[^"]*"><\/script>\s*/i,
    `\n${loader}\n`
  );
  html = html.replace(
    /<script>\s*\(function \(\) \{\s*function loadHomeScripts\(\)[\s\S]*?__gaviomHomeScripts[\s\S]*?\}\)\(\);\s*<\/script>/,
    loader
  );

  if (!html.includes('__gaviomHomeScripts')) {
    html = html.replace(/(\s*<script>\s*\(function \(\) \{\s*function loadGA)/, `\n${loader}\n$1`);
  }

  return html;
}

let updated = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  const original = html;
  html = splitStylesheetLoading(html);
  html = splitMobileStylesheet(html);
  html = removeCartScript(html);
  if (file === join(root, 'index.html')) {
    html = patchHomeFonts(html);
    html = patchHeroLcp(html);
    html = patchHomeSeo(html);
    html = patchHomeIdleScripts(html);
  }
  if (html !== original) {
    writeFileSync(file, html);
    updated++;
  }
}

console.log(`patch-mobile-perf-html: ${updated} pages (async CSS, hero v=${HERO_MOBILE_V})`);
