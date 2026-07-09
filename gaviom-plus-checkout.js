(function () {
  'use strict';

  if (!document.body || !('gaviomPlusCheckout' in document.body.dataset)) return;

  var SESSION_WAIT_MS = 2500;
  var AUTH_EVENT_WAIT_MS = 1500;

  var state = {
    accessToken: null,
    authEmail: null,
    authUserId: null,
    embeddedCheckout: null,
    embeddedReady: false,
    mounting: false,
    stripeConfig: null,
    stripeConfigPromise: null,
  };

  function qs(sel) {
    return document.querySelector(sel);
  }

  function showNotice(message, isError) {
    var notice = qs('[data-gplus-notice]');
    if (!notice) return;
    if (!message) {
      notice.hidden = true;
      notice.textContent = '';
      notice.classList.remove('is-error');
      return;
    }
    notice.hidden = false;
    notice.textContent = message;
    notice.classList.toggle('is-error', !!isError);
  }

  function setLoading(loading) {
    var el = qs('[data-gplus-stripe-loading]');
    var form = qs('[data-gplus-form]');
    if (el) el.hidden = !loading;
    if (form) form.classList.toggle('is-loading', !!loading);
  }

  function setAuthChecking(checking) {
    var gate = qs('[data-gplus-auth-gate]');
    var checkingEl = qs('[data-gplus-auth-checking]');
    if (gate) gate.hidden = !!checking;
    if (checkingEl) checkingEl.hidden = !checking;
  }

  function returnPath() {
    return '/gaviom-plus-checkout.html' + (window.location.search || '');
  }

  function authHeaders() {
    var headers = { 'Content-Type': 'application/json' };
    if (state.accessToken) headers.Authorization = 'Bearer ' + state.accessToken;
    return headers;
  }

  function debugCheckout(label, detail) {
    if (!window.GaviomAuth || !window.GaviomAuth.log) return;
    var ctx = window.GaviomAuth.getDebugContext ? window.GaviomAuth.getDebugContext() : {};
    window.GaviomAuth.log('[Gaviom+] ' + label, Object.assign({}, ctx, detail || {}));
  }

  function prefetchStripeConfig() {
    if (state.stripeConfigPromise) return state.stripeConfigPromise;
    state.stripeConfigPromise = fetch('/api/stripe-config', { credentials: 'same-origin' })
      .then(function (res) { return res.json(); })
      .then(function (config) {
        state.stripeConfig = config;
        return config;
      })
      .catch(function () {
        state.stripeConfigPromise = null;
        return null;
      });
    return state.stripeConfigPromise;
  }

  function applyTestNoteFromConfig(config) {
    var note = qs('[data-gplus-test-note]');
    if (note && config && config.publishableKey && config.publishableKey.indexOf('pk_test_') === 0) {
      note.hidden = false;
    }
  }

  async function resolveSession() {
    if (!window.GaviomAuth || !window.GaviomAuth.configReady()) return null;

    var hasToken = window.GaviomAuth.hasStoredAuthToken && window.GaviomAuth.hasStoredAuthToken();

    if (!hasToken) {
      var quick = window.GaviomAuth.getSession ? await window.GaviomAuth.getSession() : null;
      if (quick && quick.user) {
        applySession(quick);
        return quick;
      }
      return null;
    }

    setAuthChecking(true);

    var session = null;
    if (window.GaviomAuth.waitForSession) {
      session = await window.GaviomAuth.waitForSession(SESSION_WAIT_MS);
    }
    if (!session && window.GaviomAuth.getSession) {
      session = await window.GaviomAuth.getSession();
    }

    if (session && session.user) {
      applySession(session);
      setAuthChecking(false);
      return session;
    }

    await new Promise(function (resolve) {
      var done = false;
      function finish() {
        if (done) return;
        done = true;
        document.removeEventListener('gaviom:auth-changed', onChange);
        clearTimeout(timer);
        resolve();
      }
      function onChange(ev) {
        var detail = ev.detail || {};
        if (detail.session && detail.session.user) finish();
      }
      var timer = setTimeout(finish, AUTH_EVENT_WAIT_MS);
      document.addEventListener('gaviom:auth-changed', onChange);
    });

    session = window.GaviomAuth.getSession ? await window.GaviomAuth.getSession() : null;
    setAuthChecking(false);
    if (session && session.user) {
      applySession(session);
      return session;
    }

    return null;
  }

  function applySession(session) {
    state.authUserId = session.user.id;
    state.authEmail = session.user.email || null;
    state.accessToken = session.access_token || null;
    debugCheckout('session:resolved', {
      userId: state.authUserId,
      email: state.authEmail,
      hasToken: !!state.accessToken,
    });
  }

  function isEmailConfirmed(user) {
    if (window.GaviomAuth && window.GaviomAuth.isEmailConfirmed) {
      return window.GaviomAuth.isEmailConfirmed(user);
    }
    return !!(user && (user.email_confirmed_at || user.confirmed_at));
  }

  function applyAuthUI(session) {
    var gate = qs('[data-gplus-auth-gate]');
    var unverified = qs('[data-gplus-unverified]');
    var form = qs('[data-gplus-form]');
    var signinLink = qs('[data-gplus-signin-link]');
    var retry = qs('[data-gplus-retry]');
    var checking = qs('[data-gplus-auth-checking]');

    if (retry) retry.hidden = true;
    if (checking) checking.hidden = true;

    if (!session || !session.user) {
      if (gate) gate.hidden = false;
      if (unverified) unverified.hidden = true;
      if (form) form.hidden = true;
      if (signinLink) {
        signinLink.href = '/signin.html?next=' + encodeURIComponent(returnPath());
      }
      document.querySelectorAll('[data-gplus-signup-link]').forEach(function (link) {
        link.href = '/signup.html?next=' + encodeURIComponent(returnPath());
      });
      return false;
    }

    if (!isEmailConfirmed(session.user)) {
      if (gate) gate.hidden = true;
      if (unverified) unverified.hidden = false;
      if (form) form.hidden = true;
      return false;
    }

    if (gate) gate.hidden = true;
    if (unverified) unverified.hidden = true;
    if (form) form.hidden = false;
    return true;
  }

  function loadStripeScript() {
    if (window.Stripe) return Promise.resolve(window.Stripe);
    return new Promise(function (resolve, reject) {
      var existing = document.querySelector('script[data-gplus-stripe]');
      if (existing) {
        existing.addEventListener('load', function () {
          if (window.Stripe) resolve(window.Stripe);
          else reject(new Error('Stripe failed to load.'));
        });
        existing.addEventListener('error', function () {
          reject(new Error('Stripe is blocked. Disable ad blockers and refresh.'));
        });
        return;
      }
      var script = document.createElement('script');
      script.src = 'https://js.stripe.com/v3/';
      script.async = true;
      script.setAttribute('data-gplus-stripe', '1');
      script.onload = function () {
        if (window.Stripe) resolve(window.Stripe);
        else reject(new Error('Stripe failed to load.'));
      };
      script.onerror = function () {
        reject(new Error('Stripe is blocked. Disable ad blockers and refresh.'));
      };
      document.head.appendChild(script);
    });
  }

  function destroyEmbedded() {
    if (!state.embeddedCheckout) return;
    try {
      state.embeddedCheckout.destroy();
    } catch (e) {
      /* ignore */
    }
    state.embeddedCheckout = null;
    state.embeddedReady = false;
  }

  async function mountEmbeddedCheckout() {
    var container = qs('[data-gplus-stripe-embedded]');
    var email = state.authEmail;
    if (!container || !email || state.embeddedReady || state.mounting) return state.embeddedReady;

    state.mounting = true;
    destroyEmbedded();
    setLoading(true);
    showNotice('', false);

    var retry = qs('[data-gplus-retry]');
    if (retry) retry.hidden = true;

    try {
      if (!state.accessToken && window.GaviomAuth.getAccessToken) {
        var token = await window.GaviomAuth.getAccessToken();
        if (token) state.accessToken = token;
      }

      var configPromise = state.stripeConfig ? Promise.resolve(state.stripeConfig) : prefetchStripeConfig();
      var sessionPromise = fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: authHeaders(),
        credentials: 'same-origin',
        body: JSON.stringify({
          type: 'membership',
          plan: 'monthly',
          email: email,
          embedded: true,
        }),
      }).then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || 'Could not load payment form.');
          return data;
        });
      });

      var results = await Promise.all([configPromise, sessionPromise, loadStripeScript()]);
      var config = results[0];
      var sessionData = results[1];
      var StripeLib = results[2];

      if (!config || !config.configured || !config.publishableKey) {
        throw new Error('Payments are not live yet.');
      }
      applyTestNoteFromConfig(config);

      if (!sessionData.clientSecret) {
        throw new Error('Payment form unavailable. Refresh and try again.');
      }

      state.embeddedCheckout = await StripeLib(config.publishableKey).initEmbeddedCheckout({
        clientSecret: sessionData.clientSecret,
      });
      container.hidden = false;
      state.embeddedCheckout.mount(container);
      state.embeddedReady = true;
      setLoading(false);
      return true;
    } catch (err) {
      destroyEmbedded();
      setLoading(false);
      showNotice(err.message || 'Payment form failed to load.', true);
      if (retry) retry.hidden = false;
      return false;
    } finally {
      state.mounting = false;
    }
  }

  function bindUI() {
    var resend = qs('[data-gplus-resend-confirm]');
    if (resend) {
      resend.addEventListener('click', async function () {
        if (!state.authEmail) return;
        window.location.href =
          '/verify-email.html?email=' + encodeURIComponent(state.authEmail) +
          '&next=' + encodeURIComponent(returnUrl());
      });
    }

    var signout = qs('[data-gplus-signout]');
    if (signout) {
      signout.addEventListener('click', async function (ev) {
        ev.preventDefault();
        if (window.GaviomAuth && window.GaviomAuth.signOut) {
          await window.GaviomAuth.signOut();
        }
        window.location.reload();
      });
    }

    var retry = qs('[data-gplus-retry]');
    if (retry) {
      retry.addEventListener('click', function () {
        state.embeddedReady = false;
        mountEmbeddedCheckout();
      });
    }
  }

  function showCanceledNotice() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('canceled') === '1') {
      showNotice('Payment canceled — try again when ready.', false);
    }
  }

  async function init() {
    showCanceledNotice();
    bindUI();
    prefetchStripeConfig();

    var sessionPromise = resolveSession();
    var session = await sessionPromise;
    var ready = applyAuthUI(session);

    if (window.GaviomAuth && window.GaviomAuth.subscribe) {
      window.GaviomAuth.subscribe(function (nextSession) {
        if (!nextSession || !nextSession.user) {
          destroyEmbedded();
          applyAuthUI(null);
          return;
        }
        applySession(nextSession);
        if (applyAuthUI(nextSession)) mountEmbeddedCheckout();
      });
    }

    if (ready && state.authEmail) {
      await mountEmbeddedCheckout();
    } else {
      setLoading(false);
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
