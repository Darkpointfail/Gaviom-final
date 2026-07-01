/**
 * PageSpeed mobile image + CLS patches (run after patch-responsive-images).
 * Adds missing srcset defaults, width/height on prize-photo, responsive villa bg.
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
  'src="/images/cruise-hero-400w.webp" srcset="/images/cruise-hero-400w.webp 400w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 300px" width="400" height="171" decoding="async"';

const VEGAS_CARD =
  'src="/images/vegas-quote-hero-450w.webp" srcset="/images/vegas-quote-hero-450w.webp 450w, /images/vegas-quote-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 300px" width="450" height="300" decoding="async"';

const REPLACEMENTS = [
  /* prizes.html sweep panels — mobile loads 450w not full master */
  [
    /src="\/images\/diving-turtle\.webp" srcset="\/images\/diving-turtle-800w\.webp 800w, \/images\/diving-turtle\.webp 1280w" sizes="100vw"/g,
    'src="/images/diving-turtle-450w.webp" srcset="/images/diving-turtle-450w.webp 450w, /images/diving-turtle-800w.webp 800w, /images/diving-turtle.webp 1280w" sizes="100vw" width="450" height="300"',
  ],
  [
    /src="\/images\/vegas-quote-hero\.webp" srcset="\/images\/vegas-quote-hero-800w\.webp 800w, \/images\/vegas-quote-hero\.webp 1024w" sizes="100vw" width="1024" height="686"/g,
    'src="/images/vegas-quote-hero-450w.webp" srcset="/images/vegas-quote-hero-450w.webp 450w, /images/vegas-quote-hero-800w.webp 800w, /images/vegas-quote-hero.webp 1024w" sizes="100vw" width="450" height="300"',
  ],
  /* prize-diving gallery + poster */
  [
    /poster="\/images\/diving-turtle\.webp"/g,
    'poster="/images/diving-turtle-450w.webp"',
  ],
  [
    /src="\/images\/diving-turtle\.webp"\s+alt="Scuba diving in crystal-clear Cozumel waters"/g,
    'src="/images/diving-turtle-450w.webp" srcset="/images/diving-turtle-450w.webp 450w, /images/diving-turtle-800w.webp 800w" sizes="100vw" width="450" height="300" alt="Scuba diving in crystal-clear Cozumel waters"',
  ],
  [
    /<img class="prize-photo" src="\/images\/diving-turtle\.webp" alt="" \/>/g,
    '<img class="prize-photo" src="/images/diving-turtle-450w.webp" srcset="/images/diving-turtle-450w.webp 450w, /images/diving-turtle-800w.webp 800w" sizes="(max-width: 768px) 100vw, 200px" width="450" height="300" alt="" loading="lazy" decoding="async" />',
  ],
  /* prize detail pages — related cards still on vegas 800w / cruise master */
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
    '<img class="prize-photo" data-gallery-main src="/images/cruise-hero-800w.webp" srcset="/images/cruise-hero-400w.webp 400w, /images/cruise-hero-800w.webp 800w, /images/cruise-hero.webp 1200w" sizes="(max-width: 768px) 100vw, 720px" width="800" height="342" alt="MSC Cruises grand ship at sea" loading="eager" decoding="async" />',
  ],
  /* how.html hero */
  [
    /<img class="prize-photo" src="\/images\/cruise-hero\.webp" alt="Couple on a cruise ship deck at sunset with golden confetti" width="1200" height="675" loading="eager" decoding="async" \/>/g,
    '<img class="prize-photo" src="/images/cruise-hero-400w.webp" srcset="/images/cruise-hero-400w.webp 400w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="400" height="171" alt="Couple on a cruise ship deck at sunset with golden confetti" loading="eager" decoding="async" />',
  ],
  /* prize-vegas gallery thumb */
  [
    /<img class="prize-photo" src="\/images\/vegas-quote-hero-800w\.webp" width="1024" height="686" alt="" loading="lazy" decoding="async" \/>/g,
    `<img class="prize-photo" ${VEGAS_CARD} alt="" loading="lazy" />`,
  ],
  [
    /data-gallery-main src="\/images\/vegas-quote-hero\.webp" srcset="\/images\/vegas-strip-mobile-480w\.webp 480w, \/images\/vegas-quote-hero-800w\.webp 800w, \/images\/vegas-quote-hero\.webp 1024w" sizes="\(max-width: 768px\) 100vw, 1200px" width="1024" height="686"/g,
    'data-gallery-main src="/images/vegas-quote-hero-450w.webp" srcset="/images/vegas-quote-hero-450w.webp 450w, /images/vegas-quote-hero-800w.webp 800w, /images/vegas-quote-hero.webp 1024w" sizes="(max-width: 768px) 100vw, 720px" width="450" height="300"',
  ],
  /* index spotlight cruise — CLS dimensions */
  [
    /src="\/images\/cruise-hero-400w\.webp" srcset="\/images\/cruise-hero-400w\.webp 400w, \/images\/cruise-hero-800w\.webp 800w" sizes="\(max-width: 900px\) 100vw, 420px" alt="Cruise ship at sea, golden hour" loading="lazy" decoding="async"/g,
    'src="/images/cruise-hero-400w.webp" srcset="/images/cruise-hero-400w.webp 400w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 900px) 100vw, 420px" width="400" height="171" alt="Cruise ship at sea, golden hour" loading="lazy" decoding="async"',
  ],
  /* blog figures — villa 480w on mobile */
  [
    /<figure class="blog-figure"><img src="\/images\/home-eight-oclock-villa\.webp"/g,
    '<figure class="blog-figure"><img src="/images/home-eight-oclock-villa-480w.webp" srcset="/images/home-eight-oclock-villa-480w.webp 480w, /images/home-eight-oclock-villa-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="480" height="320"',
  ],
  [
    /<figure class="blog-figure"><img src="\/images\/cruise-hero\.webp"/g,
    '<figure class="blog-figure"><img src="/images/cruise-hero-400w.webp" srcset="/images/cruise-hero-400w.webp 400w, /images/cruise-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="400" height="171"',
  ],
  [
    /<figure class="blog-figure"><img src="\/images\/vegas-quote-hero\.webp"/g,
    '<figure class="blog-figure"><img src="/images/vegas-quote-hero-450w.webp" srcset="/images/vegas-quote-hero-450w.webp 450w, /images/vegas-quote-hero-800w.webp 800w" sizes="(max-width: 768px) 100vw, 720px" width="450" height="300"',
  ],
  /* duplicate width attrs from prior patches */
  [/ width="400" height="220" alt="([^"]*)" width="800" height="450"/g, ' width="400" height="220" alt="$1"'],
  [/ width="450" height="300" alt="([^"]*)" width="800" height="450"/g, ' width="450" height="300" alt="$1"'],
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
