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

const HERO_WEBP_Q = 76;
const HERO_AVIF_Q = 52;
const CARD_WEBP_Q = 78;
const VILLA_WEBP_Q = 76;

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
}

async function cardVariant({ source, out, width, fromPng }) {
  const pngName = fromPng || source.replace('.webp', '.png');
  const input = resolveInput(pngName) || resolveInput(source);
  if (!input) {
    console.warn(`lighthouse-images: skip ${out} (no source)`);
    return;
  }
  await writeWebp(input, join(imagesDir, out), width, CARD_WEBP_Q);
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
await recompressVilla();
await logoVariant();

const summaryPath = join(root, 'scripts', 'lighthouse-images-report.json');
writeFileSync(summaryPath, JSON.stringify({ generatedAt: new Date().toISOString(), items: report }, null, 2));
const totalSaved = report.reduce((n, r) => n + Math.max(0, r.saved || 0), 0);
console.log(`lighthouse-images: done (${report.length} outputs, ~${totalSaved} B saved vs prior where cached)`);
