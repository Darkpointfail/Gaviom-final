(function () {
  'use strict';

  function updateNavLink(email) {
    document.querySelectorAll('a.nav-signin').forEach(function (link) {
      link.href = '/account.html';
      link.textContent = 'Account';
      link.classList.add('nav-signin--active');
      if (email) link.setAttribute('title', email);
    });
  }

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (document.querySelector('script[src="' + src + '"]')) {
        resolve();
        return;
      }
      var s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  async function initAuthNav() {
    if (!document.querySelector('a.nav-signin')) return;

    try {
      await loadScript('/auth-config.js');
      var cfg = window.GAVIOM_AUTH_CONFIG;
      if (!cfg || !cfg.supabaseUrl || cfg.supabaseUrl.includes('REPLACE_WITH')) return;

      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      if (!window.supabase || !window.supabase.createClient) return;

      var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
      var result = await client.auth.getSession();
      if (result.data.session) {
        updateNavLink(result.data.session.user && result.data.session.user.email);
      }

      client.auth.onAuthStateChange(function (_event, session) {
        if (session) updateNavLink(session.user && session.user.email);
      });
    } catch (err) {
      /* optional enhancement */
    }
  }

  window.GaviomAuthNav = { init: initAuthNav };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAuthNav);
  } else {
    initAuthNav();
  }
})();
