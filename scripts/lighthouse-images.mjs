/**
 * Lighthouse-driven image compression and responsive variants.
 * Run: node scripts/lighthouse-images.mjs [--source]
 * --source writes to images/ (for git + Vercel build copy)
 */
import sharp from 'sharp';
import { existsSync, readdirSync, statSync, writeFileSync, renameSync, unlinkSync } from 'fs';
import { join, extname, basename } from 'path';
import { tmpdir } from 'os';

const sourceMode = process.argv.includes('--source');
const root = process.cwd();
const imagesDir = sourceMode ? join(root, 'images') : join(root, 'dist', 'images');
const distFallback = join(root, 'dist', 'images');

const HERO_WEBP_Q = 74;
const HERO_AVIF_Q = 50;
const CARD_WEBP_Q = 74;
const CARD_800_Q = 72;
const VILLA_WEBP_Q = 70;

const report = [];

function resolveInput(name) {
  const primary = join(imagesDir, name);
  if (existsSync(primary)) return primary;
  const fallback = join(distFallback, name);
  if (existsSync(fallback)) return fallback;
  return null;
}

function bytes(path) {
  return statSync(path).size;
}

function logSave(label, before, after, outPath) {
  const saved = before - after;
  report.push({ label, before, after, saved, file: outPath.replace(`${root}/`, '') });
  console.log(`lighthouse-images: ${label} ${before} → ${after} B (−${saved} B)`);
}

async function writeWebp(input, outPath, width, quality) {
  const before = existsSync(outPath) ? bytes(outPath) : 0;
  let pipe = sharp(input, { failOn: 'none' });
  if (width) pipe = pipe.resize({ width, withoutEnlargement: true });
  const sameFile = input === outPath;
  const target = sameFile ? join(tmpdir(), `gaviom-${basename(outPath)}`) : outPath;
  await pipe.webp({ quality, effort: 4 }).toFile(target);
  if (sameFile) {
    const newSize = bytes(target);
    if (before > 0 && newSize >= before) {
      unlinkSync(target);
      console.log(`lighthouse-images: ${basename(outPath)} kept at ${before} B (recompress would grow to ${newSize} B)`);
      return before;
    }
    unlinkSync(outPath);
    renameSync(target, outPath);
  }
  const after = bytes(outPath);
  logSave(basename(outPath), before || after, after, outPath);
  return after;
}

async function writeAvif(input, outPath, width, quality) {
  const before = existsSync(outPath) ? bytes(outPath) : 0;
  let pipe = sharp(input, { failOn: 'none' });
  if (width) pipe = pipe.resize({ width, withoutEnlargement: true });
  await pipe.avif({ quality, effort: 4 }).toFile(outPath);
  const after = bytes(outPath);
  logSave(basename(outPath), before || after, after, outPath);
  return after;
}

/** Match .hero-home__lcp filter baked into mobile pixels (no runtime filter on LCP). */
function heroMobileGrade(pipe) {
  return pipe.modulate({ brightness: 0.9, saturation: 0.88 }).linear(1.08, -10.24);
}

async function writeHeroMobileVariant(input, baseName, width, qualityWebp, qualityAvif) {
  const webpOut = join(imagesDir, baseName);
  const avifOut = join(imagesDir, baseName.replace('.webp', '.avif'));
  let pipe = sharp(input, { failOn: 'none' }).resize({ width, withoutEnlargement: true });
  pipe = heroMobileGrade(pipe);
  const beforeW = existsSync(webpOut) ? bytes(webpOut) : 0;
  await pipe.clone().webp({ quality: qualityWebp, effort: 4 }).toFile(webpOut);
  logSave(basename(webpOut), beforeW || bytes(webpOut), bytes(webpOut), webpOut);
  const beforeA = existsSync(avifOut) ? bytes(avifOut) : 0;
  await pipe.clone().avif({ quality: qualityAvif, effort: 4 }).toFile(avifOut);
  logSave(basename(avifOut), beforeA || bytes(avifOut), bytes(avifOut), avifOut);
}

async function recompressHero() {
  for (const name of ['home-hero-desktop.webp', 'home-hero-mobile.webp']) {
    const input = resolveInput(name);
    if (!input) {
      console.warn(`lighthouse-images: skip ${name} (missing)`);
      continue;
    }
    const meta = await sharp(input).metadata();
    const out = join(imagesDir, name);
    await writeWebp(input, out, meta.width, HERO_WEBP_Q);
    const avifName = name.replace('.webp', '.avif');
    await writeAvif(input, join(imagesDir, avifName), meta.width, HERO_AVIF_Q);
  }

  const mobileSrc = resolveInput('home-hero-mobile.webp');
  if (mobileSrc) {
    await writeHeroMobileVariant(mobileSrc, 'home-hero-mobile-480w.webp', 480, 74, 50);
  }
}

async function cardVariant({ source, out, width, fromPng, quality }) {
  const pngName = fromPng || source.replace('.webp', '.png');
  const input = resolveInput(pngName) || resolveInput(source);
  if (!input) {
    console.warn(`lighthouse-images: skip ${out} (no source)`);
    return;
  }
  await writeWebp(input, join(imagesDir, out), width, quality || CARD_WEBP_Q);
}

async function recompress800wVariants() {
  const items = [
    { out: 'cruise-hero-800w.webp', width: 800, fromPng: 'cruise-hero.png' },
    { out: 'vegas-quote-hero-800w.webp', width: 800, fromPng: 'vegas-quote-hero.png' },
    { out: 'diving-turtle-800w.webp', width: 800, fromPng: 'diving-turtle.png' },
    { out: 'home-eight-oclock-villa-800w.webp', width: 800, fromPng: 'home-eight-oclock-villa.png' },
  ];
  for (const item of items) {
    await cardVariant({ ...item, source: item.out, quality: CARD_800_Q });
  }
}

async function recompressCardMasters() {
  for (const base of ['diving-turtle', 'vegas-quote-hero']) {
    const input = resolveInput(`${base}.png`) || resolveInput(`${base}.webp`);
    if (!input) continue;
    const meta = await sharp(input).metadata();
    await writeWebp(input, join(imagesDir, `${base}.webp`), meta.width, CARD_WEBP_Q);
  }
  const cruiseWebp = resolveInput('cruise-hero.webp');
  if (cruiseWebp) {
    const meta = await sharp(cruiseWebp).metadata();
    await writeWebp(cruiseWebp, join(imagesDir, 'cruise-hero.webp'), meta.width, CARD_WEBP_Q);
  }
}

async function recompressLogoMaster() {
  const input = resolveInput('gaviom-logo.png');
  if (!input) return;
  const meta = await sharp(input).metadata();
  await writeWebp(input, join(imagesDir, 'gaviom-logo.webp'), meta.width, 82);
}

async function recompressVilla() {
  const input = resolveInput('home-eight-oclock-villa.png') || resolveInput('home-eight-oclock-villa.webp');
  if (!input) {
    console.warn('lighthouse-images: skip home-eight-oclock-villa (missing)');
    return;
  }
  const meta = await sharp(input).metadata();
  const out = join(imagesDir, 'home-eight-oclock-villa.webp');
  await writeWebp(input, out, meta.width, VILLA_WEBP_Q);
}

async function logoVariant() {
  const input = resolveInput('gaviom-logo.png');
  if (!input) return;
  await writeWebp(input, join(imagesDir, 'gaviom-logo-110w.webp'), 110, CARD_WEBP_Q);
}

if (!existsSync(imagesDir)) {
  console.warn(`lighthouse-images: ${imagesDir} missing`);
  process.exit(0);
}

await recompressHero();
await cardVariant({ source: 'diving-turtle.webp', out: 'diving-turtle-450w.webp', width: 450, fromPng: 'diving-turtle.png' });
await cardVariant({ source: 'vegas-quote-hero.webp', out: 'vegas-quote-hero-450w.webp', width: 450, fromPng: 'vegas-quote-hero.png' });
await cardVariant({ source: 'cruise-hero.webp', out: 'cruise-hero-400w.webp', width: 400, fromPng: 'cruise-hero.png' });
await cardVariant({ source: 'iphone-hero.webp', out: 'iphone-hero-550w.webp', width: 550, fromPng: 'iphone-hero.png' });
await cardVariant({ source: 'home-eight-oclock-villa.webp', out: 'home-eight-oclock-villa-480w.webp', width: 480, fromPng: 'home-eight-oclock-villa.png' });
await recompress800wVariants();
await recompressCardMasters();
await recompressVilla();
await logoVariant();
await recompressLogoMaster();

const summaryPath = join(root, 'scripts', 'lighthouse-images-report.json');
writeFileSync(summaryPath, JSON.stringify({ generatedAt: new Date().toISOString(), items: report }, null, 2));
const totalSaved = report.reduce((n, r) => n + Math.max(0, r.saved || 0), 0);
console.log(`lighthouse-images: done (${report.length} outputs, ~${totalSaved} B saved vs prior where cached)`);
