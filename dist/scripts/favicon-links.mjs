/** Shared favicon + Google Search <head> tags — used by build-blog.mjs */
export function faviconHeadLinks() {
  return `  <link rel="icon" href="/favicon.ico" sizes="any" />
  <link rel="icon" href="/favicon.png" type="image/png" sizes="48x48" />
  <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
  <link rel="manifest" href="/site.webmanifest" />
  <meta name="google-site-verification" content="REPLACE_WITH_YOUR_CODE" />`;
}
