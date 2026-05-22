import { cpSync, copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const out = join(root, 'dist');

/* Full refresh: dist is wiped then recopied so nothing stale remains */
if (existsSync(out)) {
  rmSync(out, { recursive: true, force: true });
}
mkdirSync(out, { recursive: true });

const skip = new Set([
  'node_modules',
  '.git',
  'dist',
  'content',
  'package.json',
  'package-lock.json',
  '.gitignore',
  'rules-source.html',
]);

const skipFiles = /\.(log|md)$/i;

for (const name of readdirSync(root)) {
  if (skip.has(name) || name.startsWith('.')) continue;
  if (skipFiles.test(name)) continue;

  const src = join(root, name);
  const dest = join(out, name);
  const st = statSync(src);

  if (st.isDirectory()) {
    cpSync(src, dest, { recursive: true });
  } else {
    copyFileSync(src, dest);
  }
}

const htmlCount = readdirSync(out).filter((f) => f.endsWith('.html')).length;
console.log(`Built static site → dist/ (${htmlCount} HTML pages)`);
