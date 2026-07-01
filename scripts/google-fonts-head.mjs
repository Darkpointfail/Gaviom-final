/**
 * Google Fonts URLs — display=swap is required on every href (non-blocking text).
 * Used by build-blog.mjs and patch-google-fonts-html.mjs.
 */

/** Blog + most site pages (Bricolage, Geist, Geist Mono, Newsreader) */
export const GOOGLE_FONTS_STANDARD =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist+Mono:wght@400;500&family=Geist:wght@300;400;500;600;700&family=Newsreader:ital,wght@0,400;0,500;1,400;1,500&display=swap';

/** Homepage — trimmed weights, async-loaded for FCP */
export const GOOGLE_FONTS_HOME =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&family=Geist+Mono:wght@400&family=Geist:wght@400;500;600&display=swap';

/** Rules / legal pages — minimal set */
export const GOOGLE_FONTS_LEGAL =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700&family=Geist+Mono:wght@400;500&family=Geist:wght@400;500;600&display=swap';

/** Checkout — no Newsreader */
export const GOOGLE_FONTS_CHECKOUT =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=Geist+Mono:wght@400;500&family=Geist:wght@300;400;500;600;700&display=swap';

export function assertDisplaySwap(url) {
  if (!url.includes('display=swap')) {
    throw new Error(`Google Fonts URL missing display=swap: ${url}`);
  }
}

/** @param {string} [href] */
export function googleFontsStylesheetLink(href = GOOGLE_FONTS_STANDARD) {
  assertDisplaySwap(href);
  return `  <link href="${href}" rel="stylesheet" />`;
}

/** Non-render-blocking font CSS for homepage (display=swap in URL). */
export function googleFontsAsyncHead(href = GOOGLE_FONTS_HOME) {
  assertDisplaySwap(href);
  const esc = href.replace(/&/g, '&amp;');
  return `  <link rel="preload" as="style" href="${esc}" />
  <link href="${esc}" rel="stylesheet" media="print" onload="this.media='all'" />
  <noscript><link href="${esc}" rel="stylesheet" /></noscript>`;
}

/** Ensure any legacy Google Fonts href includes display=swap */
export function ensureDisplaySwap(url) {
  if (url.includes('display=swap')) return url;
  return url.includes('?') ? `${url}&display=swap` : `${url}?display=swap`;
}

const FONT_LINK =
  /<link\s+(?:[^>]*\s+)?href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"\s+rel="stylesheet"(?:\s+media="print"\s+onload="this\.media='all'")?\s*\/?>/gi;

const FONT_PRELOAD =
  /<link\s+rel="preload"\s+as="style"\s+href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"\s*\/?>/gi;

const NOSCRIPT_FONT =
  /<noscript><link\s+href="(https:\/\/fonts\.googleapis\.com\/css2[^"]+)"\s+rel="stylesheet"\s*\/?><\/noscript>/gi;

/** @param {string} html */
export function normalizeGoogleFontLinks(html) {
  let next = html;
  for (const re of [FONT_LINK, FONT_PRELOAD, NOSCRIPT_FONT]) {
    next = next.replace(re, (match, url) => {
      const fixed = ensureDisplaySwap(url.replace(/&amp;/g, '&'));
      assertDisplaySwap(fixed);
      return match.replace(url, fixed.replace(/&/g, '&amp;'));
    });
  }
  return next;
}
