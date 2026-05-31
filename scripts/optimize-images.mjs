/**
 * Generate WebP variants. Use --source for images/ (keeps PNG for dev).
 * Default: dist/images/ (converts PNG then removes them from deploy output).
 */
import sharp from 'sharp';
import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, extname, basename } from 'path';

const sourceMode = process.argv.includes('--source');
const imagesDir = sourceMode
  ? join(process.cwd(), 'images')
  : join(process.cwd(), 'dist', 'images');
const removeRaster = !sourceMode;

const WIDTHS = [480, 800, 1280, 1920];
const MAX_DEFAULT = 1920;
const WEBP_QUALITY = 82;

function isRaster(name) {
  const ext = extname(name).toLowerCase();
  return ext === '.png' || ext === '.jpg' || ext === '.jpeg';
}

/** Favicons and tab marks must stay PNG — HTML and Safari reference .png paths */
function isFaviconOrBrandRaster(name) {
  return (
    /^gaviom-favicon/i.test(name) ||
    /^gaviom-tab-logo/i.test(name) ||
    /^gaviom-mark\.png$/i.test(name) ||
    /^gaviom-logo\.png$/i.test(name)
  );
}

/** Nav/footer HTML references .webp; generate from preserved brand PNGs at build time */
function isBrandWebpSource(name) {
  return /^gaviom-(logo|mark)\.png$/i.test(name);
}

async function ensureBrandWebp(pngFileName) {
  const inputPath = join(imagesDir, pngFileName);
  const base = basename(pngFileName, extname(pngFileName));
  const webpOut = join(imagesDir, `${base}.webp`);
  if (!existsSync(inputPath)) return;

  const inputStat = statSync(inputPath);
  if (existsSync(webpOut)) {
    const outStat = statSync(webpOut);
    if (outStat.mtimeMs >= inputStat.mtimeMs) {
      console.log(`optimize-images: ${base}.webp cached`);
      return;
    }
  }

  await sharp(inputPath, { failOn: 'none' })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(webpOut);
  console.log(`optimize-images: ${base}.webp from ${pngFileName}`);
}

function shouldSkipVariant(baseName, width) {
  if (!baseName.includes('-mobile') && !baseName.includes('winners-hero')) return false;
  return width > 800;
}

async function optimizeOne(fileName) {
  const inputPath = join(imagesDir, fileName);
  const ext = extname(fileName);
  const base = basename(fileName, ext);
  const defaultOut = join(imagesDir, `${base}.webp`);

  const inputStat = statSync(inputPath);
  if (existsSync(defaultOut)) {
    const outStat = statSync(defaultOut);
    if (outStat.mtimeMs >= inputStat.mtimeMs) {
      if (removeRaster) unlinkSync(inputPath);
      return { base, skipped: true };
    }
  }

  const meta = await sharp(inputPath, { failOn: 'none' }).metadata();
  const srcWidth = meta.width || MAX_DEFAULT;
  const defaultWidth = Math.min(srcWidth, MAX_DEFAULT);

  await sharp(inputPath)
    .resize({ width: defaultWidth, withoutEnlargement: true })
    .webp({ quality: WEBP_QUALITY, effort: 4 })
    .toFile(defaultOut);

  for (const w of WIDTHS) {
    if (srcWidth <= w || shouldSkipVariant(base, w)) continue;
    await sharp(inputPath)
      .resize({ width: w, withoutEnlargement: true })
      .webp({ quality: 80, effort: 4 })
      .toFile(join(imagesDir, `${base}-${w}w.webp`));
  }

  if (removeRaster) unlinkSync(inputPath);
  return { base, skipped: false };
}

if (!existsSync(imagesDir)) {
  console.warn(`optimize-images: ${imagesDir} missing`);
  process.exit(sourceMode ? 0 : 0);
}

const files = readdirSync(imagesDir).filter(isRaster);
let converted = 0;
let skipped = 0;

const preserved = files.filter(isFaviconOrBrandRaster);
const toOptimize = files.filter((f) => !isFaviconOrBrandRaster(f));

for (const file of preserved) {
  console.log(`optimize-images: preserve ${file} (favicon/brand)`);
  if (isBrandWebpSource(file)) await ensureBrandWebp(file);
}

for (const file of toOptimize) {
  const result = await optimizeOne(file);
  if (result.skipped) skipped += 1;
  else converted += 1;
}

const where = sourceMode ? 'images/' : 'dist/images/';
console.log(`optimize-images (${where}): ${converted} converted, ${skipped} cached`);
