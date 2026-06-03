/** Shared favicon + Google Search <head> tags — used by build-blog.mjs */
export const FAVICON_VERSION = '2';

export function faviconHeadLinks() {
  const v = `?v=${FAVICON_VERSION}`;
  // Single PNG for tabs; apple-touch for iOS; favicon.ico still generated for /favicon.ico requests
  // TODO: replace REPLACE_WITH_YOUR_CODE with your real
  // Google Search Console verification token before using GSC.
  return `  <link rel="icon" href="/favicon.png${v}" type="image/png" sizes="32x32" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png${v}" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="google-site-verification" content="REPLACE_WITH_YOUR_CODE" />
`;
}
