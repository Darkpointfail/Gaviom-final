/** Google Analytics 4, gaviom.com web stream */
export const GA_MEASUREMENT_ID = 'G-6Z150MVYT0';

/**
 * Deferred GA4 — loads after idle / post-load so it does not compete with LCP.
 * Place immediately before </body>.
 */
export function googleAnalyticsDeferred() {
  return `  <script>
(function () {
  function loadGA() {
    if (window.__gaviomGaLoaded) return;
    window.__gaviomGaLoaded = true;
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}';
    document.head.appendChild(s);
    window.dataLayer = window.dataLayer || [];
    function gtag() { dataLayer.push(arguments); }
    window.gtag = gtag;
    gtag('js', new Date());
    gtag('config', '${GA_MEASUREMENT_ID}');
  }
  if ('requestIdleCallback' in window) {
    requestIdleCallback(loadGA, { timeout: 4000 });
  } else {
    window.addEventListener('load', function () { setTimeout(loadGA, 1500); }, { once: true });
  }
})();
</script>`;
}

/** @deprecated Use googleAnalyticsDeferred() before </body> instead */
export function googleAnalyticsHead() {
  return '';
}
