/**
 * Ensures GA4 uses deferred idle-load snippet before </body>.
 * Replaces outdated head/body gtag blocks. Blog: build-blog.mjs.
 */
import { readFileSync, writeFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { GA_MEASUREMENT_ID, googleAnalyticsDeferred } from './analytics-head.mjs';

const root = process.cwd();
const MARKER = '__gaviomGaLoaded';

const GA_BLOCK =
  /\s*(?:<!-- Google tag \(gtag\.js\)[^\n]*\n)?\s*<script async src="https:\/\/www\.googletagmanager\.com\/gtag\/js\?id=[^"]+"><\/script>\s*<script>[\s\S]*?gtag\('config', '[^']+'\);\s*<\/script>/gi;

const GA_INLINE =
  /\s*<script>\s*window\.dataLayer[\s\S]*?gtag\('config', '[^']+'\);\s*<\/script>/gi;

function stripGa(html) {
  let prev;
  do {
    prev = html;
    html = html.replace(GA_BLOCK, '\n');
    html = html.replace(GA_INLINE, '\n');
  } while (html !== prev);
  return html;
}

let updated = 0;

for (const file of readdirSync(root)) {
  if (!file.endsWith('.html')) continue;
  const path = join(root, file);
  let html = readFileSync(path, 'utf8');
  if (html.includes(MARKER)) continue;

  const next = stripGa(html).replace('</body>', `${googleAnalyticsDeferred()}\n</body>`);
  if (next === html) continue;

  writeFileSync(path, next);
  updated++;
  console.log(`updated GA in ${file}`);
}

console.log(`patch-analytics-html: ${updated} root pages → deferred GA (ID: ${GA_MEASUREMENT_ID})`);
