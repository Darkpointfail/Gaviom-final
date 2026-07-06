(function () {
  'use strict';

  function updateNavLink(email) {
    document.querySelectorAll('a.nav-signin').forEach(function (link) {
      link.href = '/account.html';
      link.textContent = 'Account';
      link.classList.add('nav-signin--active');
      if (email) link.setAttribute('title', email);
    });
    updateMembershipLinks(true);
  }

  function resetNavLink() {
    document.querySelectorAll('a.nav-signin').forEach(function (link) {
      link.href = '/signin.html';
      link.textContent = 'Sign in';
      link.classList.remove('nav-signin--active');
      link.removeAttribute('title');
    });
  }

  function updateMembershipLinks() {
    var checkout = '/gaviom-plus-checkout.html';
    document.querySelectorAll('[data-gaviom-plus-cta]').forEach(function (link) {
      link.href = checkout;
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

  function syncNav(session) {
    if (session && session.user) {
      updateNavLink(session.user.email);
    } else {
      resetNavLink();
      updateMembershipLinks();
    }
  }

  async function initAuthNav() {
    var hasSignin = document.querySelector('a.nav-signin');
    var hasMembership = document.querySelector('[data-gaviom-plus-cta]');
    if (!hasSignin && !hasMembership) return;

    try {
      await loadScript('/auth-config.js');
      if (!window.GAVIOM_AUTH_CONFIG || window.GAVIOM_AUTH_CONFIG.supabaseUrl.includes('REPLACE_WITH')) return;

      await loadScript('https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js');
      await loadScript('/auth.js');
      if (!window.GaviomAuth || !window.GaviomAuth.configReady()) return;

      var session = await window.GaviomAuth.waitForSession();
      syncNav(session);
      window.GaviomAuth.subscribe(function (nextSession) {
        syncNav(nextSession);
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
