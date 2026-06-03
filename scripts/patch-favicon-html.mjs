/**
 * Sync favicon <head> tags on root *.html with scripts/favicon-links.mjs
 * Blog posts are updated via build-blog.mjs. Run: node scripts/patch-favicon-html.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { faviconHeadLinks, FAVICON_VERSION } from './favicon-links.mjs';

const root = process.cwd();
const snippet = faviconHeadLinks();
const marker = `favicon.png?v=${FAVICON_VERSION}`;

function stripFaviconBlock(html) {
  let prev;
  do {
    prev = html;
    html = html.replace(/\s*<link rel="icon"[^>]*>\n?/gi, '');
    html = html.replace(/\s*<link rel="apple-touch-icon"[^>]*>\n?/gi, '');
    html = html.replace(/\s*<link rel="manifest" href="\/site\.webmanifest"[^>]*>\n?/gi, '');
    html = html.replace(/\s*<meta name="google-site-verification"[^>]*>\s*/gi, '');
  } while (html !== prev);
  return html;
}

function insertFavicon(html) {
  const hadMarker = html.includes(marker);
  html = stripFaviconBlock(html);
  if (hadMarker) {
    if (html.includes('<meta charset="UTF-8" />')) {
      return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n${snippet}\n`);
    }
    return html;
  }
  if (html.includes('<meta charset="UTF-8" />')) {
    return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n${snippet}\n`);
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>\n${snippet}`);
  }
  return html;
}

let updated = 0;
for (const file of readdirSync(root)) {
  if (!file.endsWith('.html')) continue;
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  const next = insertFavicon(html);
  if (next === html && html.includes(marker)) continue;
  if (next === html) continue;
  writeFileSync(path, next);
  updated++;
  console.log(`updated favicon in ${file}`);
}

console.log(`patch-favicon-html: ${updated} root pages (v=${FAVICON_VERSION})`);
