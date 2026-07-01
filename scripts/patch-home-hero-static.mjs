/**
 * Homepage hero: static countdown HTML + clean head (fonts async on desktop only).
 */
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const root = process.cwd();
const indexPath = join(root, 'index.html');
const LAUNCH_AT = Date.parse('2026-09-01T16:00:00.000Z');

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,700;12..96,800&amp;family=Geist+Mono:wght@400&amp;family=Geist:wght@400;500;600&amp;display=swap';

const PREMIUM_BLOCK_PARTS = [
  { key: 'd', label: 'Days' },
  { key: 'h', label: 'Hours' },
  { key: 'm', label: 'Mins' },
  { key: 's', label: 'Secs' },
];

function pad2(n) {
  return String(Math.max(0, n)).padStart(2, '0');
}

function formatCompact(ms) {
  const diff = Math.max(0, ms);
  return {
    d: Math.floor(diff / 86400000),
    h: Math.floor(diff / 3600000) % 24,
    m: Math.floor(diff / 60000) % 60,
    s: Math.floor(diff / 1000) % 60,
  };
}

function renderPremiumBlocks(parts) {
  const segments = PREMIUM_BLOCK_PARTS.map((p, i) => {
    const sep = i > 0 ? '<span class="countdown-sep-colon" aria-hidden="true">:</span>' : '';
    return `${sep}<span class="countdown-segment" data-cd-part="${p.key}"><span class="countdown-number">${pad2(parts[p.key])}</span><span class="countdown-unit">${p.label}</span></span>`;
  }).join('');
  return `<span class="countdown-blocks countdown-blocks--premium">${segments}</span>`;
}

function renderCompact(parts) {
  return `<span class="countdown-inline countdown-inline--compact"><span class="countdown-number">${pad2(parts.d)}</span><span class="countdown-unit">d</span><span class="countdown-inline__gap" aria-hidden="true"></span><span class="countdown-number">${pad2(parts.h)}</span><span class="countdown-unit">h</span><span class="countdown-inline__gap" aria-hidden="true"></span><span class="countdown-number">${pad2(parts.m)}</span><span class="countdown-unit">m</span><span class="countdown-inline__gap" aria-hidden="true"></span><span class="countdown-number">${pad2(parts.s)}</span><span class="countdown-unit">s</span></span>`;
}

function patchStaticCountdown(html) {
  const parts = formatCompact(Math.max(0, LAUNCH_AT - Date.now()));
  const premium = renderPremiumBlocks(parts);
  const compact = renderCompact(parts);

  html = html.replace(
    /(<div class="launch-countdown__timer" data-cd="launch" data-cd-format="blocks-premium"[^>]*>)--(<\/div>)/,
    `$1${premium}$2`
  );

  html = html.replace(
    /(<[^>]+data-cd="launch" data-cd-format="compact"[^>]*>)--(<\/span>)/g,
    `$1${compact}$2`
  );

  return html;
}

function patchMobileHead(html) {
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.googleapis\.com"\s*\/?>\s*/g, '\n');
  html = html.replace(/\s*<link rel="preconnect" href="https:\/\/fonts\.gstatic\.com" crossorigin\s*\/?>\s*/g, '\n');

  const fontBlock = `  <link rel="preload" as="style" href="${FONT_HREF}" media="(min-width: 769px)" />
  <link href="${FONT_HREF}" rel="stylesheet" media="print" onload="this.media='(min-width:769px)'" />
  <noscript><link href="${FONT_HREF}" rel="stylesheet" /></noscript>`;

  html = html.replace(
    /<link rel="preload" as="style" href="https:\/\/fonts\.googleapis\.com[^"]+"[\s\S]*?(?=\s*<link rel="preload" as="image" href="\/images\/home-hero)/,
    `${fontBlock}\n`
  );

  return html;
}

let html = readFileSync(indexPath, 'utf8');
const original = html;
html = patchStaticCountdown(html);
html = patchMobileHead(html);

if (html !== original) {
  writeFileSync(indexPath, html);
  console.log('patch-home-hero-static: index.html (static countdown + mobile head)');
} else {
  console.log('patch-home-hero-static: no changes');
}
