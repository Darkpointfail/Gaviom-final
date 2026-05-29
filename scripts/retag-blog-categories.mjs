/**
 * Retag existing blog posts to new category taxonomy.
 * Run: node scripts/retag-blog-categories.mjs
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { BLOG_CATEGORIES } from '../content/blog/categories.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

function retag(file, from, to) {
  const path = join(root, file);
  let s = readFileSync(path, 'utf8');
  const n = (s.match(new RegExp(`category: "${from}"`, 'g')) || []).length;
  s = s.replaceAll(`category: "${from}"`, `category: "${to}"`);
  writeFileSync(path, s);
  console.log(`${file}: ${n} → ${to}`);
}

retag('content/blog/persona-posts.mjs', 'Trust', BLOG_CATEGORIES.TRAVEL);
retag('content/blog/persona-posts.mjs', 'Family', BLOG_CATEGORIES.TRAVEL);
retag('content/blog/persona-posts.mjs', 'Dreamer', BLOG_CATEGORIES.TRAVEL);
retag('content/blog/travel-posts.mjs', 'Travel', BLOG_CATEGORIES.TRAVEL);

console.log('Done retagging persona + travel posts.');
