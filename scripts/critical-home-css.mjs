/** Above-the-fold CSS inlined on index.html for faster FCP/LCP paint */
export const CRITICAL_HOME_CSS = `*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}html{background:#051525;overflow-x:hidden;scroll-behavior:smooth}body{font-family:system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;font-size:16px;line-height:1.5;color:#0a1628;background:#faf7f2;-webkit-font-smoothing:antialiased;min-height:100vh;position:relative}.wrap{width:100%;max-width:1200px;margin:0 auto;padding:0 clamp(20px,4vw,40px)}.hero-home--video{position:relative;overflow:hidden;isolation:isolate;background:#051525;min-height:760px;padding:96px 0 120px}.hero-home__lcp{position:absolute;inset:0;z-index:0;width:100%;height:100%;object-fit:cover;object-position:center 36%;display:block;pointer-events:none}.hero-overlay{position:absolute;inset:0;z-index:2;pointer-events:none}.hero-home__content{position:relative;z-index:4}.topbar,.nav{position:relative;z-index:10}`;

export function criticalHomeStyleTag() {
  return `  <style id="critical-home">${CRITICAL_HOME_CSS}</style>`;
}
