/** Early DNS/TLS hints for third-party origins used on gaviom.com */

export const PRECONNECT_ORIGINS = [
  'https://fonts.googleapis.com',
  'https://fonts.gstatic.com',
];

export function preconnectHeadLinks() {
  const lines = ['  <!-- Resource hints: external origins -->'];

  for (const href of PRECONNECT_ORIGINS) {
    if (href === 'https://fonts.gstatic.com') {
      lines.push(`  <link rel="preconnect" href="${href}" crossorigin />`);
    } else {
      lines.push(`  <link rel="preconnect" href="${href}" />`);
    }
  }

  return lines.join('\n');
}

const PRECONNECT_LINE =
  /^\s*<link\s+rel="preconnect"\s+href="https:\/\/(?:fonts\.googleapis\.com|fonts\.gstatic\.com|www\.googletagmanager\.com|www\.google-analytics\.com|images\.unsplash\.com|cdn\.gaviom\.com)"[^>]*\/?>\s*$/gm;

const PRECONNECT_COMMENT = /^\s*<!-- Resource hints: external origins -->\s*\n?/gm;

/** @param {string} html */
export function injectPreconnectIntoHtml(html) {
  const block = preconnectHeadLinks();
  let next = html.replace(PRECONNECT_COMMENT, '').replace(PRECONNECT_LINE, '');

  const charsetMatch = next.match(/<meta\s+charset="[^"]+"\s*\/?>/i);
  if (charsetMatch) {
    const charsetTag = charsetMatch[0];
    const idx = next.indexOf(charsetTag);
    const after = idx + charsetTag.length;
    return `${next.slice(0, after)}\n${block}${next.slice(after)}`;
  }

  if (next.includes('<head>')) {
    return next.replace('<head>', `<head>\n${block}`);
  }

  return next;
}
