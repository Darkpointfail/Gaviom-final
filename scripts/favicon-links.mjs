/** Shared favicon <head> links — import in build-blog.mjs */
export const FAVICON_VERSION = '20260530';

export function faviconHeadLinks() {
  const v = FAVICON_VERSION;
  return `  <link rel="icon" type="image/png" sizes="32x32" href="/images/gaviom-favicon-32.png?v=${v}" />
  <link rel="icon" type="image/png" sizes="16x16" href="/images/gaviom-favicon-16.png?v=${v}" />
  <link rel="shortcut icon" href="/favicon.ico?v=${v}" />
  <link rel="icon" href="/favicon.ico?v=${v}" sizes="48x48" />
  <link rel="apple-touch-icon" sizes="180x180" href="/images/gaviom-favicon-192.png?v=${v}" />
  <link rel="manifest" href="/site.webmanifest?v=${v}" />`;
}
