/** Shared favicon + Google Search <head> tags (build-blog, patch-favicon-html, build-business). */
export const FAVICON_VERSION = '3';

export function faviconHeadLinks() {
  const v = `?v=${FAVICON_VERSION}`;
  return `  <link rel="icon" href="/favicon.ico${v}" type="image/x-icon" sizes="48x48" />
  <link rel="manifest" href="/site.webmanifest" />
`;
}

/** Minified snippet for Next.js static HTML (single line). */
export function faviconHeadLinksInline() {
  const v = `?v=${FAVICON_VERSION}`;
  return `<link rel="icon" href="/favicon.ico${v}" type="image/x-icon" sizes="48x48"/><link rel="manifest" href="/site.webmanifest"/>`;
}

export function stripFaviconBlock(html) {
  let prev;
  do {
    prev = html;
    html = html.replace(/\s*<link rel="icon"[^>]*>\n?/gi, '');
    html = html.replace(/\s*<link rel="apple-touch-icon"[^>]*>\n?/gi, '');
    html = html.replace(/\s*<link rel="manifest" href="\/site\.webmanifest"[^>]*\/?>\n?/gi, '');
    html = html.replace(/\s*<meta name="google-site-verification"[^>]*>\s*/gi, '');
  } while (html !== prev);
  return html;
}

export function injectFaviconIntoHtml(html) {
  const marker = `favicon.ico?v=${FAVICON_VERSION}`;
  if (html.includes(marker)) return html;

  html = stripFaviconBlock(html);
  const inline = faviconHeadLinksInline();

  if (/<meta charSet="utf-8"\/>/i.test(html)) {
    return html.replace(/<meta charSet="utf-8"\/>/i, `<meta charSet="utf-8"/>${inline}`);
  }
  if (html.includes('<meta charset="UTF-8" />')) {
    return html.replace('<meta charset="UTF-8" />', `<meta charset="UTF-8" />\n${faviconHeadLinks()}\n`);
  }
  if (html.includes('<head>')) {
    return html.replace('<head>', `<head>${inline}`);
  }
  return html;
}
