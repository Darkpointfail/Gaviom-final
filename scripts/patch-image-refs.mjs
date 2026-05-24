/**
 * Point local image refs at WebP (generated at build). Run once on source, or after adding PNGs.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const ROOT = process.cwd();
const SKIP_DIRS = new Set(['node_modules', 'dist', '.git']);

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    if (SKIP_DIRS.has(name) || name.startsWith('.')) continue;
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else if (/\.(html|js|css)$/i.test(name)) out.push(p);
  }
  return out;
}

const reLocalPng = /((?:\/)?images\/[a-z0-9-]+)\.png/gi;
let touched = 0;

for (const file of walk(ROOT)) {
  const rel = file.slice(ROOT.length + 1);
  if (rel.startsWith('scripts/')) continue;
  const before = readFileSync(file, 'utf8');
  const after = before.replace(reLocalPng, '$1.webp');
  if (after !== before) {
    writeFileSync(file, after);
    touched += 1;
  }
}

console.log(`patch-image-refs: updated ${touched} files`);
