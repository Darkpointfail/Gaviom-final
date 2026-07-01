/**
 * Ensures every Google Fonts href includes display=swap.
 * Homepage: async non-blocking load. Other root *.html: standard stylesheet link.
 * Blog: build-blog.mjs. Run: node scripts/patch-google-fonts-html.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import {
  GOOGLE_FONTS_CHECKOUT,
  GOOGLE_FONTS_HOME,
  GOOGLE_FONTS_LEGAL,
  GOOGLE_FONTS_STANDARD,
  googleFontsAsyncHead,
  googleFontsStylesheetLink,
  normalizeGoogleFontLinks,
} from './google-fonts-head.mjs';

const root = process.cwd();

function pickFontUrl(file) {
  if (file === 'index.html') return null;
  if (file === 'checkout.html') return GOOGLE_FONTS_CHECKOUT;
  if (file === 'rules.html') return GOOGLE_FONTS_LEGAL;
  return GOOGLE_FONTS_STANDARD;
}

function patchIndex(html) {
  const asyncBlock = googleFontsAsyncHead(GOOGLE_FONTS_HOME);
  const blockRe =
    /\s*<link rel="preload" as="style" href="https:\/\/fonts\.googleapis\.com\/css2[^"]+"\s*\/?>\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]+" rel="stylesheet" media="print" onload="this\.media='all'"\s*\/?>\s*<noscript><link href="https:\/\/fonts\.googleapis\.com\/css2[^"]+" rel="stylesheet"\s*\/?><\/noscript>/;
  if (blockRe.test(html)) {
    return html.replace(blockRe, `\n${asyncBlock}`);
  }
  const simpleRe =
    /\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]+" rel="stylesheet"\s*\/?>/;
  if (simpleRe.test(html)) {
    return html.replace(simpleRe, `\n${asyncBlock}`);
  }
  return html;
}

function patchStandardPage(html, file) {
  const url = pickFontUrl(file);
  if (!url) return html;
  const link = googleFontsStylesheetLink(url);
  const fontRe =
    /\s*<link href="https:\/\/fonts\.googleapis\.com\/css2[^"]+" rel="stylesheet"\s*\/?>/;
  if (fontRe.test(html)) {
    return html.replace(fontRe, `\n${link}`);
  }
  return html;
}

let updated = 0;

for (const file of readdirSync(root)) {
  if (!file.endsWith('.html')) continue;
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  if (!html.includes('fonts.googleapis.com/css2')) continue;

  const before = html;
  html = normalizeGoogleFontLinks(html);
  if (file === 'index.html') html = patchIndex(html);
  else html = patchStandardPage(html, file);

  if (html !== before) {
    writeFileSync(path, html);
    updated++;
    console.log(`updated fonts (display=swap) in ${file}`);
  }
}

console.log(`patch-google-fonts-html: ${updated} root pages updated`);
