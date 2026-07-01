import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const distBusiness = join(root, 'dist', 'business', 'index.html');

if (!existsSync(distBusiness)) {
  console.log('dev: dist/business/ missing — running npm run build…');
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
}

console.log('dev: serving dist/ at http://localhost:3001');
console.log('     business page → http://localhost:3001/business/');
execSync('npx --yes serve -l 3001 dist', { cwd: root, stdio: 'inherit' });
