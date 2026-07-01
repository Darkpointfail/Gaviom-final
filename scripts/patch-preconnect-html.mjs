/**
 * Inserts early preconnect hints after <meta charset> on root *.html.
 * Blog pages: build-blog.mjs. Run: node scripts/patch-preconnect-html.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { injectPreconnectIntoHtml } from './preconnect-head.mjs';

const root = process.cwd();
let updated = 0;

for (const file of readdirSync(root)) {
  if (!file.endsWith('.html')) continue;
  const path = join(root, file);
  const html = readFileSync(path, 'utf8');
  const unsplash = html.includes('images.unsplash.com');
  const next = injectPreconnectIntoHtml(html, { unsplash });
  if (next === html) continue;
  writeFileSync(path, next);
  updated++;
  console.log(`updated preconnect in ${file}${unsplash ? ' (+ unsplash)' : ''}`);
}

console.log(`patch-preconnect-html: ${updated} root pages updated`);
