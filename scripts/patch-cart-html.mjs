import { readFileSync, writeFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
      walk(p, out);
    } else if (name.endsWith('.html')) {
      out.push(p);
    }
  }
  return out;
}

let patched = 0;
for (const file of walk(root)) {
  let html = readFileSync(file, 'utf8');
  if (!html.includes('app.js')) continue;
  if (html.includes('cart.js')) continue;

  const rel = file.startsWith(root) ? file.slice(root.length + 1) : file;
  const cartSrc = rel.startsWith('blog/') ? '/cart.js' : 'cart.js';

  const next = html.replace(
    /(<script src="[^"]*app\.js"><\/script>)/,
    `<script src="${cartSrc}"></script>\n  $1`
  );

  if (next !== html) {
    writeFileSync(file, next);
    patched += 1;
  }
}

console.log(`Patched ${patched} HTML files with cart.js`);
