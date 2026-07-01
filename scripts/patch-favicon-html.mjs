/**
 * Sync favicon <head> tags on root *.html with scripts/favicon-links.mjs
 * Blog posts are updated via build-blog.mjs. Run: node scripts/patch-favicon-html.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { FAVICON_VERSION, injectFaviconIntoHtml } from './favicon-links.mjs';

const root = process.cwd();

let updated = 0;
for (const file of readdirSync(root)) {
  if (!file.endsWith('.html')) continue;
  const path = join(root, file);
  const html = readFileSync(path, 'utf8');
  const next = injectFaviconIntoHtml(html);
  if (next === html) continue;
  writeFileSync(path, next);
  updated++;
  console.log(`updated favicon in ${file}`);
}

console.log(`patch-favicon-html: ${updated} root pages (v=${FAVICON_VERSION})`);
