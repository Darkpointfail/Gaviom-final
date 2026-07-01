/** Above-the-fold CSS inlined on index.html — built from styles/critical-home-mobile.css */
import esbuild from 'esbuild';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const here = dirname(fileURLToPath(import.meta.url));
const raw = readFileSync(join(here, '../styles/critical-home-mobile.css'), 'utf8');
const { code } = esbuild.transformSync(raw, { loader: 'css', minify: true });

export const CRITICAL_HOME_CSS = code;

export function criticalHomeStyleTag() {
  return `  <style id="critical-home">${CRITICAL_HOME_CSS}</style>`;
}
