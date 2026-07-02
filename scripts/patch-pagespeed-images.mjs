/**
 * PageSpeed mobile image + CLS patches (run after patch-responsive-images).
 * Uses 480w/800w variants — confirmed deployed on Vercel (450w/1280w were 404).
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const VILLA_V = 'ps20260703';

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

const CRUISE_CARD =
  'src="/images/cruise-hero-480w.webp" srcset="/images/cruise-hero-480w.webp 480w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 300px" width="480" height="268" decoding="async"';

const VEGAS_CARD =
  'src="/images/vegas-strip-mobile.webp" srcset="/images/vegas-strip-mobile-480w.webp 480w, /images/vegas-strip-mobile.webp 686w" sizes="(max-width: 768px) 100vw, 300px" width="686" height="1024" decoding="async"';

const VEGAS_PRIZE_CARD =
  'src="/images/vegas-strip-mobile.webp" srcset="/images/vegas-strip-mobile-480w.webp 480w, /images/vegas-strip-mobile.webp 686w"';

const VEGAS_GALLERY =
  'data-gallery-main src="/images/vegas-quote-hero-800w.webp" srcset="/images/vegas-strip-mobile-480w.webp 480w, /images/vegas-quote-hero-800w.webp 800w, /images/vegas-quote-hero.webp 1024w" sizes="(max-width: 768px) 100vw, 720px" width="800" height="536"';

const DIVING_INDEX_CARD =
  '<picture><source media="(max-width: 768px)" srcset="/images/diving-cozumel-480w.webp" type="image/webp" /><img class="prize-photo" src="/images/diving-turtle-480w.webp" srcset="/images/diving-turtle-480w.webp 480w, /images/diving-turtle-800w.webp 800w" sizes="(max-width: 768px) 100vw, 425px" width="480" height="320" alt="Crystal-clear water, Riviera Maya" loading="lazy" decoding="async" /></picture>';

const REPLACEMENTS = [
  /* homepage diving card — lighter Cozumel lagoon on mobile, turtle on desktop */
  [
    /<div class="prize-photo-wrap"><img class="prize-photo" src="\/images\/diving-turtle(?:-480w)?\.webp"[^>]*alt="Crystal-clear water, Riviera Maya"[^>]*\/><\/div>/g,
    `<div class="prize-photo-wrap">${DIVING_INDEX_CARD}</div>`,
  ],
  /* prize cards + homepage — portrait Strip (4:3 crop); landscape hero stays on gallery */
  [
    /src="\/images\/vegas-quote-hero-480w\.webp" srcset="\/images\/vegas-quote-hero-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w" sizes="\(max-width: 768px\) 100vw, 425px" width="480" height="322"/g,
    `${VEGAS_PRIZE_CARD} sizes="(max-width: 768px) 100vw, 425px" width="480" height="717"`,
  ],
  [
    /src="\/images\/vegas-quote-hero-480w\.webp" srcset="\/images\/vegas-quote-hero-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w" sizes="\(max-width: 768px\) 100vw, 300px" width="480" height="322"/g,
    `${VEGAS_PRIZE_CARD} sizes="(max-width: 768px) 100vw, 300px" width="480" height="717"`,
  ],
  /* prize-vegas full-bleed — portrait on mobile */
  [
    /<source media="\(max-width: 800px\)" srcset="\/images\/vegas-quote-hero-480w\.webp" type="image\/webp" \/>/g,
    '<source media="(max-width: 800px)" srcset="/images/vegas-strip-mobile-480w.webp" type="image/webp" />',
  ],
  /* prizes sweep panel — 800w fallback on desktop */
  [
    /<img src="\/images\/vegas-quote-hero-480w\.webp" srcset="\/images\/vegas-quote-hero-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w, \/images\/vegas-quote-hero\.webp 1024w" sizes="100vw" width="480" height="322"/g,
    '<img src="/images/vegas-quote-hero-800w.webp" srcset="/images/vegas-strip-mobile-480w.webp 480w, /images/vegas-quote-hero-800w.webp 800w, /images/vegas-quote-hero.webp 1024w" sizes="100vw" width="800" height="536"',
  ],
  [
    /data-gallery-main src="\/images\/vegas-quote-hero-1280w\.webp" srcset="[^"]*" sizes="[^"]*" width="1024" height="686"/g,
    VEGAS_GALLERY,
  ],
  [
    /data-gallery-main src="\/images\/vegas-quote-hero-800w\.webp" srcset="\/images\/vegas-quote-hero-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w, \/images\/vegas-quote-hero\.webp 1024w" sizes="\(max-width: 768px\) 100vw, 720px" width="800" height="536"/g,
    VEGAS_GALLERY,
  ],
  /* prizes.html sweep panels */
  [
    /src="\/images\/diving-turtle\.webp" srcset="\/images\/diving-turtle-800w\.webp 800w, \/images\/diving-turtle\.webp 1280w" sizes="100vw"/g,
    'src="/images/diving-turtle-480w.webp" srcset="/images/diving-turtle-480w.webp 480w, /images/diving-turtle-800w.webp 800w, /images/diving-turtle.webp 1280w" sizes="100vw" width="480" height="320"',
  ],
  [
    /src="\/images\/vegas-quote-hero\.webp" srcset="\/images\/vegas-quote-hero-800w\.webp 800w, \/images\/vegas-quote-hero\.webp 1024w" sizes="100vw" width="1024" height="686"/g,
    'src="/images/vegas-quote-hero-480w.webp" srcset="/images/vegas-quote-hero-480w.webp 480w, /images/vegas-quote-hero-800w.webp 800w, /images/vegas-quote-hero.webp 1024w" sizes="100vw" width="480" height="322"',
  ],
  /* prize-diving gallery + poster */
  [
    /poster="\/images\/diving-turtle\.webp"/g,
    'poster="/images/diving-turtle-480w.webp"',
  ],
  [
    /poster="\/images\/diving-turtle-450w\.webp"/g,
    'poster="/images/diving-turtle-480w.webp"',
  ],
  [
    /src="\/images\/diving-turtle\.webp"\s+alt="Scuba diving in crystal-clear Cozumel waters"/g,
    'src="/images/diving-turtle-480w.webp" srcset="/images/diving-turtle-480w.webp 480w, /images/diving-turtle-800w.webp 800w" sizes="100vw" width="480" height="320" alt="Scuba diving in crystal-clear Cozumel waters"',
  ],
  [
    /<img class="prize-photo" src="\/images\/diving-turtle\.webp" alt="" \/>/g,
    '<img class="prize-photo" src="/images/diving-turtle-480w.webp" srcset="/images/diving-turtle-480w.webp 480w, /images/diving-turtle-800w.webp 800w" sizes="(max-width: 768px) 100vw, 200px" width="480" height="320" alt="" loading="lazy" decoding="async" />',
  ],
  /* prize detail pages — related cards */
  [
    /<img class="prize-photo" src="\/images\/vegas-quote-hero-800w\.webp" srcset="\/images\/vegas-strip-mobile-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w" sizes="\(max-width: 768px\) 100vw, 600px" width="1024" height="686"/g,
    `<img class="prize-photo" ${VEGAS_CARD}`,
  ],
  [
    /<img class="prize-photo" src="\/images\/cruise-hero\.webp" alt="MSC Cruise" loading="lazy" \/>/g,
    `<img class="prize-photo" ${CRUISE_CARD} alt="MSC Cruise" loading="lazy" />`,
  ],
  [
    /<img class="prize-photo" src="\/images\/cruise-hero\.webp" alt="MSC cruise ship at sea" loading="lazy" \/>/g,
    `<img class="prize-photo" ${CRUISE_CARD} alt="MSC cruise ship at sea" loading="lazy" />`,
  ],
  /* prize.html hero gallery */
  [
    /<img class="prize-photo" data-gallery-main src="\/images\/cruise-hero\.webp" alt="MSC Cruises grand ship at sea" width="1200" height="800" loading="eager" decoding="async" \/>/g,
    '<img class="prize-photo" data-gallery-main src="/images/cruise-hero-800w.webp" srcset="/images/cruise-hero-480w.webp 480w, /images/cruise-hero-800w.webp 800w, /images/cruise-hero.webp 1200w" sizes="(max-width: 768px) 100vw, 720px" width="800" height="342" alt="MSC Cruises grand ship at sea" loading="eager" decoding="async" />',
  ],
  /* how.html hero */
  [
    /<img class="prize-photo" src="\/images\/cruise-hero\.webp" alt="Couple on a cruise ship deck at sunset with golden confetti" width="1200" height="675" loading="eager" decoding="async" \/>/g,
    '<img class="prize-photo" src="/images/cruise-hero-480w.webp" srcset="/images/cruise-hero-480w.webp 480w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="480" height="268" alt="Couple on a cruise ship deck at sunset with golden confetti" loading="eager" decoding="async" />',
  ],
  /* prize-vegas gallery thumb */
  [
    /<img class="prize-photo" src="\/images\/vegas-quote-hero-800w\.webp" width="1024" height="686" alt="" loading="lazy" decoding="async" \/>/g,
    `<img class="prize-photo" ${VEGAS_CARD} alt="" loading="lazy" />`,
  ],
  [
    /data-gallery-main src="\/images\/vegas-quote-hero\.webp" srcset="\/images\/vegas-strip-mobile-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w, \/images\/vegas-quote-hero\.webp 1024w" sizes="\(max-width: 768px\) 100vw, 1200px" width="1024" height="686"/g,
    VEGAS_GALLERY,
  ],
  /* index spotlight cruise — CLS dimensions */
  [
    /src="\/images\/cruise-hero-480w\.webp" srcset="\/images\/cruise-hero-480w\.webp 480w, \/images\/cruise-hero-800w\.webp 800w" sizes="\(max-width: 900px\) 100vw, 420px" alt="Cruise ship at sea, golden hour" loading="lazy" decoding="async"/g,
    'src="/images/cruise-hero-480w.webp" srcset="/images/cruise-hero-480w.webp 480w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 900px) 100vw, 420px" width="480" height="268" alt="Cruise ship at sea, golden hour" loading="lazy" decoding="async"',
  ],
  /* blog figures — villa 480w on mobile */
  [
    /<figure class="blog-figure"><img src="\/images\/home-eight-oclock-villa\.webp"/g,
    '<figure class="blog-figure"><img src="/images/home-eight-oclock-villa-480w.webp" srcset="/images/home-eight-oclock-villa-480w.webp 480w, /images/home-eight-oclock-villa-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="480" height="320"',
  ],
  [
    /<figure class="blog-figure"><img src="\/images\/cruise-hero\.webp"/g,
    '<figure class="blog-figure"><img src="/images/cruise-hero-480w.webp" srcset="/images/cruise-hero-480w.webp 480w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="480" height="268"',
  ],
  [
    /<figure class="blog-figure"><img src="\/images\/vegas-quote-hero\.webp"/g,
    '<figure class="blog-figure"><img src="/images/vegas-quote-hero-480w.webp" srcset="/images/vegas-quote-hero-480w.webp 480w, /images/vegas-quote-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="480" height="322"',
  ],
  /* revert prior patch sizes */
  [/,\s*\/images\/vegas-quote-hero-1280w\.webp 1280w/g, ''],
  [/,\s*\/images\/vegas-quote-hero-1920w\.webp 1920w/g, ''],
  [/data-gallery-main src="\/images\/vegas-quote-hero-1280w\.webp"/g, 'data-gallery-main src="/images/vegas-quote-hero-800w.webp"'],
  [
    /src="\/images\/vegas-quote-hero-800w\.webp" srcset="\/images\/vegas-strip-mobile-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w, \/images\/vegas-quote-hero-1280w\.webp 1280w" sizes="\(max-width: 768px\) 100vw, 900px" width="1024" height="686"/g,
    `${VEGAS_PRIZE_CARD} sizes="(max-width: 768px) 100vw, 425px" width="686" height="1024"`,
  ],
  [
    /src="\/images\/vegas-strip-mobile-480w\.webp" srcset="\/images\/vegas-strip-mobile-480w\.webp 480w, \/images\/vegas-strip-mobile\.webp 686w"/g,
    'src="/images/vegas-strip-mobile.webp" srcset="/images/vegas-strip-mobile-480w.webp 480w, /images/vegas-strip-mobile.webp 686w"',
  ],
  [/diving-turtle-450w\.webp 450w/g, 'diving-turtle-480w.webp 480w'],
  [/src="\/images\/diving-turtle-450w\.webp"/g, 'src="/images/diving-turtle-480w.webp"'],
  [/cruise-hero-400w\.webp 400w/g, 'cruise-hero-480w.webp 480w'],
  [/src="\/images\/cruise-hero-400w\.webp"/g, 'src="/images/cruise-hero-480w.webp"'],
  [/width="450" height="300" decoding="async" alt="" loading="lazy"/g, 'width="480" height="322" decoding="async" alt="" loading="lazy"'],
  [/width="450" height="300" alt="Las Vegas/g, 'width="480" height="322" alt="Las Vegas'],
  [/width="450" height="300" decoding="async" alt="Las Vegas/g, 'width="480" height="322" decoding="async" alt="Las Vegas'],
  [/width="450" height="300" alt="Scuba/g, 'width="480" height="320" alt="Scuba'],
  [/width="400" height="171"/g, 'width="480" height="268"'],
  [/ width="400" height="220" alt="([^"]*)" width="800" height="450"/g, ' width="480" height="268" alt="$1"'],
  [/ width="450" height="300" alt="([^"]*)" width="800" height="450"/g, ' width="480" height="322" alt="$1"'],
];

function patchVillaBackground(html) {
  return html.replace(
    /class="full-bleed-quote__media full-bleed-quote__photo" style="background-image:url\('\/images\/home-eight-oclock-villa\.webp[^']*'\)"/,
    'class="full-bleed-quote__media full-bleed-quote__photo full-bleed-quote__photo--villa-responsive"'
  );
}

let updated = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  const original = html;
  for (const [re, rep] of REPLACEMENTS) {
    html = html.replace(re, rep);
  }
  if (file === join(root, 'index.html')) {
    html = patchVillaBackground(html);
  }
  if (html !== original) {
    writeFileSync(file, html);
    updated++;
  }
}

console.log(`patch-pagespeed-images: ${updated} HTML files updated (villa v=${VILLA_V})`);
