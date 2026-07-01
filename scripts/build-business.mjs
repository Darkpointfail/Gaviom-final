import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';
import { FAVICON_VERSION, injectFaviconIntoHtml } from './favicon-links.mjs';

const root = process.cwd();
const businessDir = join(root, 'business');
const outDir = join(businessDir, 'out');
const destDir = join(root, 'dist', 'business');

function patchFaviconInDir(dir) {
  let count = 0;
  for (const name of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, name.name);
    if (name.isDirectory()) {
      count += patchFaviconInDir(path);
      continue;
    }
    if (!name.name.endsWith('.html')) continue;
    const html = readFileSync(path, 'utf8');
    const next = injectFaviconIntoHtml(html);
    if (next === html) continue;
    writeFileSync(path, next);
    count++;
  }
  return count;
}

if (!existsSync(businessDir)) {
  console.log('build-business: skipped (no business/ directory)');
  process.exit(0);
}

console.log('build-business: installing dependencies…');
execSync('npm install', { cwd: businessDir, stdio: 'inherit' });

console.log('build-business: next build…');
execSync('npm run build', { cwd: businessDir, stdio: 'inherit' });

if (!existsSync(outDir)) {
  throw new Error('build-business: business/out not found after build');
}

const patched = patchFaviconInDir(outDir);
console.log(`build-business: favicon injected in ${patched} HTML file(s) (v=${FAVICON_VERSION})`);

if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true, force: true });
}
mkdirSync(join(root, 'dist'), { recursive: true });
cpSync(outDir, destDir, { recursive: true });

console.log('build-business: copied → dist/business/');
