/**
 * Regenerate all favicon assets from one master PNG (gold G mark).
 * Run: node scripts/build-favicons.mjs
 */
import sharp from 'sharp';
import { readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const toIco = require('to-ico');

const root = process.cwd();
/** Canonical favicon artwork — all outputs are resized from this file only */
const MASTER = join(root, 'images/gaviom-favicon-192.png');

const PNG_OUTPUTS = [
  { rel: 'images/gaviom-favicon-16.png', size: 16 },
  { rel: 'images/gaviom-favicon-32.png', size: 32 },
  { rel: 'images/gaviom-favicon-48.png', size: 48 },
  { rel: 'favicon.png', size: 32 },
  { rel: 'images/gaviom-favicon-192.png', size: 192 },
  { rel: 'apple-touch-icon.png', size: 192 },
  { rel: 'images/gaviom-favicon-512.png', size: 512 },
];

async function resizePng(master, size) {
  return sharp(master)
    .resize(size, size, {
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
}

async function main() {
  const master = await readFile(MASTER);
  for (const { rel, size } of PNG_OUTPUTS) {
    const buf = await resizePng(master, size);
    await writeFile(join(root, rel), buf);
  }
  const icoPngs = await Promise.all([16, 32, 48].map((s) => resizePng(master, s)));
  await writeFile(join(root, 'favicon.ico'), await toIco(icoPngs));
  console.log('build-favicons: regenerated favicon.ico, favicon.png, apple-touch-icon.png, images/gaviom-favicon-*.png');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
