/** Shared favicon + Google Search <head> tags — used by build-blog.mjs */
export function faviconHeadLinks() {
  // TODO: replace REPLACE_WITH_YOUR_CODE with your real
  // Google Search Console verification token before using GSC.
  // Get it from: https://search.google.com/search-console
  return `  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="google-site-verification" content="REPLACE_WITH_YOUR_CODE" />`;
}
