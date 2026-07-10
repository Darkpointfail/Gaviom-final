import { existsSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

const root = process.cwd();
const distIndex = join(root, 'dist', 'index.html');
const distCreators = join(root, 'dist', 'creators', 'index.html');

if (!existsSync(distIndex) || !existsSync(distCreators)) {
  console.log('dev: dist/ missing — running npm run build…');
  execSync('npm run build', { cwd: root, stdio: 'inherit' });
}

console.log('');
console.log('dev: serving dist/ (the built site, NOT the project root)');
console.log('     home      → http://localhost:3001/');
console.log('     creators  → http://localhost:3001/creators/');
console.log('     account   → http://localhost:3001/account.html#creator');
console.log('');
console.log('Sign-in locally needs API → run: npm run dev:api');
console.log('(requires .env.local from: vercel env pull .env.local)');
console.log('');

execSync('npx --yes serve -l 3001 dist', { cwd: root, stdio: 'inherit' });
