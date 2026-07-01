/**
 * Sync launch / first-draw copy across HTML, JS, and blog content sources.
 * Run: node scripts/patch-launch-dates.mjs
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { LAUNCH_COPY_REPLACEMENTS, TOPBAR_FIRST_DRAW_EXTRA } from './launch-dates.mjs';

const root = process.cwd();
const skipDirNames = new Set(['node_modules', 'dist', '.git', 'business']);
const skipPaths = new Set([
  join(root, 'blog'),
  join(root, 'business', 'node_modules'),
  join(root, 'business', '.next'),
  join(root, 'business', 'out'),
]);

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (skipPaths.has(path)) continue;
    const st = statSync(path);
    if (st.isDirectory()) {
      if (skipDirNames.has(name) && dir === root) continue;
      walk(path, files);
      continue;
    }
    if (/\.(html|mjs|js)$/.test(name) && !name.endsWith('.min.js')) {
      files.push(path);
    }
  }
  return files;
}

function applyReplacements(text) {
  let out = text;
  for (const [from, to] of LAUNCH_COPY_REPLACEMENTS) {
    out = out.split(from).join(to);
  }
  if (out.includes('First draw July 5, 8pm ET')) {
    out = out.split('First draw July 5, 8pm ET').join(TOPBAR_FIRST_DRAW_EXTRA.replace('· Pre-sale open · ', ''));
  }
  /* Topbar full extra line */
  out = out.split('· Pre-sale open · First draw July 5, 8pm ET').join(TOPBAR_FIRST_DRAW_EXTRA);
  return out;
}

let updated = 0;
for (const path of walk(root)) {
  if (path.endsWith('scripts/patch-launch-dates.mjs')) continue;
  if (path.endsWith('scripts/launch-dates.mjs')) continue;
  const html = readFileSync(path, 'utf8');
  const next = applyReplacements(html);
  if (next !== html) {
    writeFileSync(path, next);
    updated++;
  }
}

/* Root-level HTML only */
for (const name of readdirSync(root)) {
  if (!name.endsWith('.html')) continue;
  const path = join(root, name);
  let html = readFileSync(path, 'utf8');
  const next = applyReplacements(html);
  if (next !== html) {
    writeFileSync(path, next);
    if (!updated) updated++;
  }
}

console.log(`patch-launch-dates: updated ${updated} file(s)`);
