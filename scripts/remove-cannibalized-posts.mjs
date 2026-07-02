/**
 * Remove cannibalized blog posts from source .mjs files and fix internal links.
 */
import { readFileSync, writeFileSync, readdirSync, unlinkSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
  CANNIBALIZED_REDIRECTS,
  CANNIBALIZED_REMOVED,
} from '../content/blog/cannibalization.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const blogContentDir = join(root, 'content/blog');
const blogHtmlDir = join(root, 'blog');
const distBlogHtmlDir = join(root, 'dist/blog');

/** @param {string[]} lines */
function findPostBlock(lines, slug) {
  const slugRe = new RegExp(`^\\s*slug:\\s*['"]${slug}['"]`);
  let slugLine = -1;
  for (let i = 0; i < lines.length; i++) {
    if (slugRe.test(lines[i])) {
      slugLine = i;
      break;
    }
  }
  if (slugLine === -1) return null;

  let start = slugLine;
  while (start > 0 && !/^\s*\{\s*$/.test(lines[start])) start -= 1;

  let end = slugLine;
  while (end < lines.length) {
    if (/^\s*\},\s*$/.test(lines[end]) && end > slugLine) break;
    end += 1;
  }
  if (end >= lines.length) return null;

  return { start, end };
}

function removeSlugFromFile(path, slug) {
  const content = readFileSync(path, 'utf8');
  const lines = content.split('\n');
  const block = findPostBlock(lines, slug);
  if (!block) return false;

  const next = [...lines.slice(0, block.start), ...lines.slice(block.end + 1)].join('\n');
  writeFileSync(path, next);
  return true;
}

function fixLinksInFile(path) {
  let content = readFileSync(path, 'utf8');
  let changed = false;

  for (const [removed, canonical] of Object.entries(CANNIBALIZED_REDIRECTS)) {
    const patterns = [
      new RegExp(`/blog/${removed}\\.html`, 'g'),
      new RegExp(`'${removed}'`, 'g'),
      new RegExp(`"${removed}"`, 'g'),
    ];
    for (const re of patterns) {
      const next = content.replace(re, (m) => {
        if (m.includes('/blog/')) return `/blog/${canonical}.html`;
        if (m.startsWith("'")) return `'${canonical}'`;
        return `"${canonical}"`;
      });
      if (next !== content) {
        content = next;
        changed = true;
      }
    }
  }

  if (changed) writeFileSync(path, content);
  return changed;
}

function deleteHtml(slug) {
  for (const dir of [blogHtmlDir, distBlogHtmlDir]) {
    const path = join(dir, `${slug}.html`);
    if (existsSync(path)) {
      unlinkSync(path);
      console.log(`  deleted ${path}`);
    }
  }
}

// Remove post blocks from source files
for (const slug of CANNIBALIZED_REMOVED) {
  let removed = false;
  for (const file of readdirSync(blogContentDir).filter((f) => f.endsWith('.mjs'))) {
    if (removeSlugFromFile(join(blogContentDir, file), slug)) {
      console.log(`removed post block: ${slug} from ${file}`);
      removed = true;
    }
  }
  if (!removed) console.warn(`warn: slug not found in source: ${slug}`);
  deleteHtml(slug);
}

// Fix internal links in all blog content files
for (const file of readdirSync(blogContentDir).filter(
  (f) => f.endsWith('.mjs') && f !== 'cannibalization.mjs'
)) {
  if (fixLinksInFile(join(blogContentDir, file))) {
    console.log(`fixed links in ${file}`);
  }
}

console.log(`remove-cannibalized-posts: ${CANNIBALIZED_REMOVED.size} slugs processed`);
