import { cpSync, existsSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const businessDir = join(root, 'business');
const outDir = join(businessDir, 'out');
const destDir = join(root, 'dist', 'business');

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

if (existsSync(destDir)) {
  rmSync(destDir, { recursive: true, force: true });
}
mkdirSync(join(root, 'dist'), { recursive: true });
cpSync(outDir, destDir, { recursive: true });

console.log('build-business: copied → dist/business/');
