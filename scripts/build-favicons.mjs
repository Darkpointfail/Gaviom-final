/**
 * Optional: derive PNG variants from the canonical favicon.ico (never overwrites favicon.ico).
 * Run manually if needed: node scripts/build-favicons.mjs
 */
import sharp from 'sharp';
import { readFile, writeFile, access } from 'fs/promises';
import { join } from 'path';

const root = process.cwd();
const ICO = join(root, 'favicon.ico');

const PNG_OUTPUTS = [
  { rel: 'favicon.png', size: 48 },
  { rel: 'apple-touch-icon.png', size: 48 },
  { rel: 'images/gaviom-favicon-48.png', size: 48 },
];

async function main() {
  await access(ICO);
  const master = await readFile(ICO);
  for (const { rel, size } of PNG_OUTPUTS) {
    const buf = await sharp(master)
      .resize(size, size, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .png()
      .toBuffer();
    await writeFile(join(root, rel), buf);
  }
  console.log('build-favicons: derived PNGs from favicon.ico (favicon.ico unchanged)');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
