/** Google Analytics 4 — gaviom.com web stream */
export const GA_MEASUREMENT_ID = 'G-SSJ8R41VP4';

/** GA4 gtag snippet for <head> — one tag per page, immediately after <head> */
export function googleAnalyticsHead() {
  return `  <!-- Google tag (gtag.js) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', '${GA_MEASUREMENT_ID}');
  </script>`;
}
