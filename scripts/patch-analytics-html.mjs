/**
 * Ensures GA4 gtag is in root *.html with the current measurement ID.
 * Replaces outdated IDs/blocks. Blog pages use build-blog.mjs.
 * Run: node scripts/patch-analytics-html.mjs
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { GA_MEASUREMENT_ID, googleAnalyticsHead } from './analytics-head.mjs';

const root = process.cwd();
const snippet = googleAnalyticsHead();
const MARKER = 'googletagmanager.com/gtag/js';

/** Remove all existing GA4 gtag blocks (any measurement ID) */
function stripGa(html) {
  let prev;
  do {
    prev = html;
    html = html.replace(
      /\s*(?:<!-- Google tag \(gtag\.js\)[^\n]*\n)?\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>\s*<script>[\s\S]*?gtag\('config', '[^']+'\);\s*<\/script>/gi,
      '\n'
    );
    html = html.replace(
      /\s*<script>\s*window\.dataLayer[\s\S]*?gtag\('config', '[^']+'\);\s*<\/script>/gi,
      '\n'
    );
  } while (html !== prev);
  return html;
}

function hasOnlyCurrentGaId(html) {
  const ids = [...html.matchAll(/gtag\/js\?id=(G-[A-Z0-9]+)/g)].map((m) => m[1]);
  return ids.length === 1 && ids[0] === GA_MEASUREMENT_ID;
}

let updated = 0;

for (const file of readdirSync(root)) {
  if (!file.endsWith('.html')) continue;
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  if (hasOnlyCurrentGaId(html)) continue;

  html = stripGa(html);
  if (html.includes('<head>')) {
    html = html.replace('<head>', `<head>\n${snippet}`);
  } else {
    continue;
  }
  writeFileSync(path, html);
  updated++;
  console.log(`updated GA in ${file}`);
}

console.log(`patch-analytics-html: ${updated} root pages updated (ID: ${GA_MEASUREMENT_ID})`);
