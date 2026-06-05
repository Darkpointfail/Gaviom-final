/** Shared favicon + Google Search <head> tags — used by build-blog.mjs */
export const FAVICON_VERSION = '3';

export function faviconHeadLinks() {
  const v = `?v=${FAVICON_VERSION}`;
  // Single favicon.ico on every page — same file, same size in all browser tabs
  // TODO: replace REPLACE_WITH_YOUR_CODE with your real
  // Google Search Console verification token before using GSC.
  return `  <link rel="icon" href="/favicon.ico${v}" type="image/x-icon" sizes="48x48" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="google-site-verification" content="REPLACE_WITH_YOUR_CODE" />
`;
}
