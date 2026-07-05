/**
 * Minify JS/CSS in dist/ after static copy (production output only).
 */
import esbuild from 'esbuild';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join } from 'path';

const dist = join(process.cwd(), 'dist');

async function minifyFile(rel, loader) {
  const path = join(dist, rel);
  if (!existsSync(path)) {
    console.warn(`minify-assets: skip missing ${rel}`);
    return;
  }
  const input = readFileSync(path, 'utf8');
  const { code } = await esbuild.transform(input, {
    loader,
    minify: true,
    target: 'es2018',
    legalComments: 'none',
  });
  writeFileSync(path, code);
  const saved = input.length - code.length;
  console.log(`minify-assets: ${rel} (${input.length} → ${code.length}, −${saved} B)`);
}

await minifyFile('app.js', 'js');
await minifyFile('cart.js', 'js');
await minifyFile('checkout-stripe.js', 'js');
await minifyFile('styles.css', 'css');
await minifyFile('mobile.css', 'css');
await minifyFile('safari-compat.css', 'css');
