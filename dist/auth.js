(function () {
  'use strict';

  var US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
    'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
    'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
    'WI', 'WY', 'DC',
  ];

  var US_STATE_NAMES = {
    AL: 'Alabama', AK: 'Alaska', AZ: 'Arizona', AR: 'Arkansas', CA: 'California', CO: 'Colorado',
    CT: 'Connecticut', DE: 'Delaware', FL: 'Florida', GA: 'Georgia', HI: 'Hawaii', ID: 'Idaho',
    IL: 'Illinois', IN: 'Indiana', IA: 'Iowa', KS: 'Kansas', KY: 'Kentucky', LA: 'Louisiana',
    ME: 'Maine', MD: 'Maryland', MA: 'Massachusetts', MI: 'Michigan', MN: 'Minnesota', MS: 'Mississippi',
    MO: 'Missouri', MT: 'Montana', NE: 'Nebraska', NV: 'Nevada', NH: 'New Hampshire', NJ: 'New Jersey',
    NM: 'New Mexico', NY: 'New York', NC: 'North Carolina', ND: 'North Dakota', OH: 'Ohio', OK: 'Oklahoma',
    OR: 'Oregon', PA: 'Pennsylvania', RI: 'Rhode Island', SC: 'South Carolina', SD: 'South Dakota',
    TN: 'Tennessee', TX: 'Texas', UT: 'Utah', VT: 'Vermont', VA: 'Virginia', WA: 'Washington',
    WV: 'West Virginia', WI: 'Wisconsin', WY: 'Wyoming', DC: 'District of Columbia',
  };

  var AUTH_PERSIST_KEY = 'gaviom-auth-persist';
  var POST_VERIFY_NEXT_KEY = 'gaviom-post-verify-next';
  var DISPOSABLE_EMAIL_DOMAINS = {
    '10minutemail.com': 1,
    '10minutemail.net': 1,
    'dispostable.com': 1,
    'dropmail.me': 1,
    'fakeinbox.com': 1,
    'getnada.com': 1,
    'guerrillamail.com': 1,
    'guerrillamail.net': 1,
    'guerrillamail.org': 1,
    'maildrop.cc': 1,
    'mailinator.com': 1,
    'mailnesia.com': 1,
    'mintemail.com': 1,
    'moakt.com': 1,
    'sharklasers.com': 1,
    'spam4.me': 1,
    'temp-mail.org': 1,
    'tempmail.com': 1,
    'tempmail.net': 1,
    'throwaway.email': 1,
    'trashmail.com': 1,
    'trashmail.net': 1,
    'yopmail.com': 1,
  };
  var clientInstance = null;
  var authReadyPromise = null;
  var authSubscribers = [];
  var authState = {
    session: null,
    user: null,
    ready: false,
  };

  function authDebugEnabled() {
    try {
      if (window.location.search.indexOf('auth_debug=1') !== -1) return true;
      return localStorage.getItem('gaviom-auth-debug') === '1';
    } catch (e) {
      return false;
    }
  }

  function logAuth(label, detail) {
    if (!authDebugEnabled()) return;
    if (detail !== undefined) {
      console.log('[Gaviom Auth]', label, detail);
    } else {
      console.log('[Gaviom Auth]', label);
    }
  }

  function isEmailConfirmed(user) {
    if (!user) return false;
    return !!(user.email_confirmed_at || user.confirmed_at);
  }

  function isDisposableEmail(email) {
    var parts = String(email || '').trim().toLowerCase().split('@');
    if (parts.length !== 2) return false;
    return !!DISPOSABLE_EMAIL_DOMAINS[parts[1]];
  }

  function validateSignupEmail(email) {
    var value = String(email || '').trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      return 'Enter a valid email address.';
    }
    if (isDisposableEmail(value)) {
      return 'Use a permanent email address — temporary inbox providers are not allowed.';
    }
    return null;
  }

  function emailConfirmRedirectUrl() {
    return window.location.origin + '/signin.html?verified=1';
  }

  function storePostVerifyNext() {
    try {
      var params = new URLSearchParams(window.location.search);
      var next = params.get('next');
      if (next && next.startsWith('/') && !next.startsWith('//')) {
        sessionStorage.setItem(POST_VERIFY_NEXT_KEY, next);
      }
    } catch (e) {
      /* ignore */
    }
  }

  function readPostVerifyNext(fallback) {
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) return next;
    try {
      next = sessionStorage.getItem(POST_VERIFY_NEXT_KEY);
      if (next && next.startsWith('/') && !next.startsWith('//')) return next;
    } catch (e) {
      /* ignore */
    }
    return fallback || '/account.html';
  }

  function clearPostVerifyNext() {
    try {
      sessionStorage.removeItem(POST_VERIFY_NEXT_KEY);
    } catch (e) {
      /* ignore */
    }
  }

  function isEmailConfirmationLanding() {
    var params = new URLSearchParams(window.location.search || '');
    var hash = window.location.hash || '';
    return (
      params.get('verified') === '1' ||
      params.has('code') ||
      params.has('token_hash') ||
      hash.indexOf('access_token=') !== -1 ||
      hash.indexOf('refresh_token=') !== -1
    );
  }

  function hasUrlAuthTokens() {
    var params = new URLSearchParams(window.location.search || '');
    var hash = window.location.hash || '';
    return (
      params.has('code') ||
      params.has('token_hash') ||
      hash.indexOf('access_token=') !== -1
    );
  }

  function parseHashAuthParams() {
    var hash = window.location.hash || '';
    if (!hash || hash.indexOf('access_token=') === -1) return null;
    var params = new URLSearchParams(hash.replace(/^#/, ''));
    var accessToken = params.get('access_token');
    var refreshToken = params.get('refresh_token');
    if (!accessToken || !refreshToken) return null;
    return { access_token: accessToken, refresh_token: refreshToken };
  }

  function scrubAuthUrl() {
    try {
      var params = new URLSearchParams(window.location.search || '');
      params.delete('code');
      params.delete('token_hash');
      var search = params.toString();
      var clean = window.location.pathname + (search ? '?' + search : '');
      history.replaceState(null, '', clean);
    } catch (e) {
      /* ignore */
    }
  }

  async function establishSessionFromUrl(client) {
    var params = new URLSearchParams(window.location.search || '');

    if (params.has('code')) {
      var exchanged = await client.auth.exchangeCodeForSession(params.get('code'));
      if (!exchanged.error && exchanged.data && exchanged.data.session) {
        return exchanged.data.session;
      }
      if (exchanged.error) logAuth('confirm:exchange-error', exchanged.error.message);
    }

    if (params.has('token_hash')) {
      var otpType = params.get('type') || 'signup';
      var verified = await client.auth.verifyOtp({
        token_hash: params.get('token_hash'),
        type: otpType,
      });
      if (!verified.error && verified.data && verified.data.session) {
        return verified.data.session;
      }
      if (verified.error) logAuth('confirm:otp-error', verified.error.message);
    }

    var hashTokens = parseHashAuthParams();
    if (hashTokens) {
      var setResult = await client.auth.setSession(hashTokens);
      if (!setResult.error && setResult.data && setResult.data.session) {
        return setResult.data.session;
      }
      if (setResult.error) logAuth('confirm:set-session-error', setResult.error.message);
    }

    var result = await client.auth.getSession();
    return result.data && result.data.session ? result.data.session : null;
  }

  async function waitForConfirmedSession(maxWaitMs) {
    var client = getClient();
    var deadline = Date.now() + (maxWaitMs || 12000);

    while (Date.now() < deadline) {
      var session = await establishSessionFromUrl(client);
      if (session && session.user && isEmailConfirmed(session.user)) {
        return session;
      }
      await new Promise(function (resolve) {
        setTimeout(resolve, 200);
      });
    }

    return null;
  }

  function showConfirmationSigningIn() {
    var card = document.querySelector('.auth-card');
    if (!card || card.querySelector('[data-auth-signing-in]')) return;
    var form = card.querySelector('form');
    if (form) form.hidden = true;
    var block = document.createElement('div');
    block.className = 'auth-verify-pending';
    block.setAttribute('data-auth-signing-in', '');
    block.innerHTML =
      '<p class="auth-verify-pending__msg">Email confirmed. Signing you in…</p>' +
      '<p class="auth-verify-pending__hint font-mono">You will be redirected to your account automatically.</p>';
    var insertBefore = form || card.querySelector('.auth-legal');
    if (insertBefore) card.insertBefore(block, insertBefore);
    else card.appendChild(block);
  }

  async function completeEmailConfirmationLanding() {
    if (!isEmailConfirmationLanding() || !configReady()) return false;

    try {
      showConfirmationSigningIn();
      var session = await waitForConfirmedSession(12000);
      if (!session || !session.user || !isEmailConfirmed(session.user)) {
        return false;
      }

      applySession(session, 'SIGNED_IN');
      emitAuthChanged('SIGNED_IN');
      scrubAuthUrl();

      var dest = readPostVerifyNext('/account.html');
      clearPostVerifyNext();
      logAuth('confirm:auto-login', { email: session.user.email, dest: dest });
      window.location.replace(dest);
      return true;
    } catch (err) {
      logAuth('confirm:landing-error', err.message);
      return false;
    }
  }

  function redirectIfSignedInConfirmed(session) {
    if (!session || !session.user || !isEmailConfirmed(session.user)) return false;
    var dest = readPostVerifyNext('/account.html');
    clearPostVerifyNext();
    window.location.replace(dest);
    return true;
  }

  async function sendConfirmationViaApi(email) {
    var res = await fetch('/api/auth-confirmation-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: String(email || '').trim() }),
    });
    var data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* ignore */
    }
    if (!res.ok) {
      var apiMessage = normalizeAlertMessage(data.error || data.message || data.msg);
      throw new Error(apiMessage || 'Could not send confirmation email.');
    }
    return data;
  }

  async function sendPasswordResetViaApi(email) {
    var res = await fetch('/api/auth-reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({ email: String(email || '').trim() }),
    });
    var data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* ignore */
    }
    if (!res.ok) {
      var apiMessage = normalizeAlertMessage(data.error || data.message || data.msg);
      throw new Error(apiMessage || 'Could not send password reset email.');
    }
    return data;
  }

  async function setPasswordViaApi(password) {
    var token = await window.GaviomAuth.getAccessToken();
    if (!token) throw new Error('Your reset session expired. Request a new password reset email.');
    var res = await fetch('/api/auth-set-password', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer ' + token,
      },
      credentials: 'same-origin',
      body: JSON.stringify({ password: password }),
    });
    var data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* ignore */
    }
    if (!res.ok) {
      var apiMessage = normalizeAlertMessage(data.error || data.message || data.msg);
      throw new Error(apiMessage || 'Could not save your new password.');
    }
    return data;
  }

  async function signInViaApi(email, password) {
    var res = await fetch('/api/auth-signin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify({
        email: String(email || '').trim().toLowerCase(),
        password: password,
      }),
    });
    var data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* ignore */
    }
    if (!res.ok) {
      var err = new Error(normalizeAlertMessage(data.error || data.message || data.msg) || 'Sign in failed.');
      err.code = data.code || null;
      throw err;
    }
    if (!data.access_token || !data.refresh_token) {
      throw new Error('Sign in failed. Try again.');
    }
    return data;
  }

  async function applyAuthSessionFromApi(apiData, eventLabel) {
    var client = getClient();
    var setResult = await client.auth.setSession({
      access_token: apiData.access_token,
      refresh_token: apiData.refresh_token,
    });
    if (setResult.error) throw setResult.error;
    var userResult = await client.auth.getUser();
    var user = userResult.data && userResult.data.user ? userResult.data.user : apiData.user;
    if (setResult.data && setResult.data.session) {
      var session = Object.assign({}, setResult.data.session, { user: user || setResult.data.session.user });
      applySession(session, eventLabel || 'SIGNED_IN');
      emitAuthChanged('SIGNED_IN');
      return session;
    }
    throw new Error('Could not establish session.');
  }

  async function signupViaApi(payload) {
    var res = await fetch('/api/auth-signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(payload),
    });
    var data = {};
    try {
      data = await res.json();
    } catch (e) {
      /* ignore */
    }
    if (!res.ok) {
      var apiMessage = normalizeAlertMessage(data.error || data.message || data.msg);
      throw new Error(apiMessage || 'Could not create account.');
    }
    return data;
  }

  async function clearLocalSession(client) {
    try {
      if (client) await client.auth.signOut({ scope: 'local' });
    } catch (e) {
      logAuth('signOut:local-error', e.message);
    }
    applySession(null, 'SIGNED_OUT');
    setTimeout(function () {
      emitAuthChanged('SIGNED_OUT');
    }, 0);
  }

  function configReady() {
    var cfg = window.GAVIOM_AUTH_CONFIG;
    return cfg && cfg.supabaseUrl && cfg.supabaseAnonKey
      && !cfg.supabaseUrl.includes('REPLACE_WITH')
      && !cfg.supabaseAnonKey.includes('REPLACE_WITH');
  }

  function createAuthStorage() {
    return {
      getItem: function (key) {
        try {
          var fromLocal = localStorage.getItem(key);
          var fromSession = sessionStorage.getItem(key);
          var persist = localStorage.getItem(AUTH_PERSIST_KEY) !== '0';
          var primary = persist ? fromLocal : fromSession;
          var fallback = persist ? fromSession : fromLocal;
          if (primary) return primary;
          if (fallback) {
            (persist ? localStorage : sessionStorage).setItem(key, fallback);
            (persist ? sessionStorage : localStorage).removeItem(key);
            logAuth('token-auto-migrate', persist ? 'localStorage' : 'sessionStorage');
            return fallback;
          }
          return null;
        } catch (e) {
          return null;
        }
      },
      setItem: function (key, value) {
        try {
          var persist = localStorage.getItem(AUTH_PERSIST_KEY) !== '0';
          (persist ? localStorage : sessionStorage).setItem(key, value);
        } catch (e) {
          /* ignore */
        }
      },
      removeItem: function (key) {
        try {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        } catch (e) {
          /* ignore */
        }
      },
    };
  }

  function getSupabaseStorageKey() {
    var cfg = window.GAVIOM_AUTH_CONFIG;
    if (!cfg || !cfg.supabaseUrl) return null;
    var match = cfg.supabaseUrl.match(/https:\/\/([^.]+)\.supabase\.co/);
    return match ? 'sb-' + match[1] + '-auth-token' : null;
  }

  function migrateAuthTokenStorage(remember) {
    var key = getSupabaseStorageKey();
    if (!key) return;
    try {
      var from = remember ? sessionStorage : localStorage;
      var to = remember ? localStorage : sessionStorage;
      var val = from.getItem(key);
      if (val) {
        to.setItem(key, val);
        from.removeItem(key);
        logAuth('token-migrated', remember ? 'localStorage' : 'sessionStorage');
      }
    } catch (e) {
      logAuth('token-migrate:error', e.message);
    }
  }

  function setRememberMe(remember) {
    try {
      var prev = localStorage.getItem(AUTH_PERSIST_KEY);
      var next = remember ? '1' : '0';
      if (prev !== null && prev !== next) {
        migrateAuthTokenStorage(remember);
      }
      localStorage.setItem(AUTH_PERSIST_KEY, next);
    } catch (e) {
      /* ignore */
    }
    logAuth('remember-me', remember ? 'localStorage' : 'sessionStorage');
  }

  function shouldRememberMe() {
    try {
      return localStorage.getItem(AUTH_PERSIST_KEY) !== '0';
    } catch (e) {
      return true;
    }
  }

  function notifyAuthChanged(event) {
    authSubscribers.forEach(function (fn) {
      try {
        fn(authState.session, event);
      } catch (err) {
        logAuth('subscriber-error', err.message);
      }
    });
    document.dispatchEvent(new CustomEvent('gaviom:auth-changed', {
      detail: { event: event, session: authState.session, user: authState.user },
    }));
  }

  function applySession(session, event) {
    authState.session = session || null;
    authState.user = session && session.user ? session.user : null;
    logAuth('state:' + event, authState.user
      ? { id: authState.user.id, email: authState.user.email }
      : 'signed-out');
  }

  function emitAuthChanged(event) {
    notifyAuthChanged(event);
  }

  function wireAuthListener(client) {
    if (client._gaviomAuthListener) return;
    client._gaviomAuthListener = true;
    client.auth.onAuthStateChange(function (event, session) {
      applySession(session, event);
      if (event === 'SIGNED_IN') logAuth('login');
      if (event === 'SIGNED_OUT') logAuth('logout');
      if (event === 'TOKEN_REFRESHED') logAuth('token-refresh');
      if (event === 'USER_UPDATED') logAuth('user-updated');
      // Defer subscribers — async work inside this callback can deadlock signInWithPassword.
      setTimeout(function () {
        emitAuthChanged(event);
      }, 0);
    });
  }

  function hasStoredAuthToken() {
    var key = getSupabaseStorageKey();
    if (!key) return false;
    try {
      return !!(localStorage.getItem(key) || sessionStorage.getItem(key));
    } catch (e) {
      return false;
    }
  }

  function getClient() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('Supabase SDK not loaded.');
    }
    if (!configReady()) {
      throw new Error('Missing Supabase config. Edit auth-config.js with your project URL and anon key.');
    }
    if (!clientInstance) {
      var cfg = window.GAVIOM_AUTH_CONFIG;
      if (localStorage.getItem(AUTH_PERSIST_KEY) == null) {
        setRememberMe(true);
      }
      clientInstance = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true,
          storage: createAuthStorage(),
        },
      });
      wireAuthListener(clientInstance);
      bootstrapAuth();
    }
    return clientInstance;
  }

  function bootstrapAuth() {
    if (authReadyPromise) return authReadyPromise;
    authReadyPromise = (async function () {
      if (!configReady()) {
        authState.ready = true;
        logAuth('bootstrap:config-missing');
        return null;
      }
      try {
        var client = getClient();
        var result = await client.auth.getSession();
        applySession(result.data.session || null, 'INITIAL_SESSION');

        var redirected = await completeEmailConfirmationLanding();
        if (redirected) return null;

        setTimeout(function () {
          emitAuthChanged('INITIAL_SESSION');
        }, 0);
        logAuth('bootstrap:session-loaded', authState.user ? authState.user.email : 'none');
      } catch (err) {
        logAuth('bootstrap:error', err.message);
      } finally {
        authState.ready = true;
      }
      return authState.session;
    })();
    return authReadyPromise;
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function normalizeAlertMessage(message) {
    if (message == null || message === '') return '';
    if (typeof message === 'string') {
      var trimmed = message.trim();
      if (!trimmed || trimmed === '{}' || trimmed === '[object Object]') {
        return 'Something went wrong. Please try again.';
      }
      if (trimmed.charAt(0) === '{') {
        try {
          var parsed = JSON.parse(trimmed);
          return normalizeAlertMessage(parsed);
        } catch (e) {
          /* keep string */
        }
      }
      return trimmed;
    }
    if (message instanceof Error) {
      return normalizeAlertMessage(message.message || message);
    }
    if (typeof message === 'object') {
      var nested =
        message.message ||
        message.msg ||
        message.error_description ||
        message.description ||
        message.error;
      if (nested) return normalizeAlertMessage(nested);
      try {
        var json = JSON.stringify(message);
        if (json && json !== '{}') return json;
      } catch (e2) {
        /* ignore */
      }
      return 'Something went wrong. Please try again.';
    }
    var text = String(message).trim();
    if (!text || text === '[object Object]' || text === '{}') {
      return 'Something went wrong. Please try again.';
    }
    return text;
  }

  function showAlert(el, message, type) {
    if (!el) return;
    var text = normalizeAlertMessage(message);
    el.hidden = !text;
    el.textContent = text;
    el.classList.remove('auth-alert--error', 'auth-alert--success');
    if (type && text) el.classList.add('auth-alert--' + type);
    if (text) {
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }

  function setSubmitLabel(form, text) {
    if (!form) return;
    var btn = form.querySelector('[type="submit"]');
    if (!btn) return;
    if (!btn.dataset.defaultLabel) btn.dataset.defaultLabel = btn.textContent;
    btn.textContent = text || btn.dataset.defaultLabel;
  }

  function friendlyAuthError(err) {
    if (!err) return 'Something went wrong. Please try again.';
    if (typeof err === 'string') return normalizeAlertMessage(err);

    var code = '';
    if (err) {
      if (err.error_code) code = String(err.error_code);
      else if (typeof err.code === 'string') code = err.code;
      else if (err.code != null) code = String(err.code);
    }
    var msg = normalizeAlertMessage(
      err.message || err.msg || err.error_description || err.error
    );

    var known = {
      email_address_not_authorized:
        'Gaviom cannot send a confirmation email to this address yet. The Supabase project needs custom SMTP configured, or email confirmation must be disabled in the dashboard.',
      email_address_invalid:
        'Supabase could not accept this email address. Check for typos and spaces, or try another provider (Outlook, Yahoo, iCloud).',
      over_email_send_rate_limit:
        'Too many signup attempts for this email. Wait about 10 minutes, then try again.',
      over_request_rate_limit:
        'Too many signup attempts from your connection. Wait a few minutes, then try again.',
      email_exists:
        'This email is already registered. Sign in instead, or use Forgot password.',
      user_already_exists:
        'This email is already registered. Sign in instead, or use Forgot password.',
      signup_disabled:
        'New account creation is temporarily disabled.',
      weak_password:
        'Choose a stronger password (at least 8 characters).',
      invalid_credentials:
        'Incorrect email or password. Try again or use Forgot password.',
      email_not_confirmed:
        'Confirm your email before signing in. Check your inbox or resend the confirmation link below.',
      unexpected_failure:
        'Account service error, often caused by email confirmation not being configured. Check Supabase Auth settings.',
    };

    if (known[code]) return known[code];
    if (/email not confirmed/i.test(msg)) {
      return known.email_not_confirmed;
    }
    if (/invalid login credentials/i.test(msg)) {
      return known.invalid_credentials;
    }
    if (/load failed|failed to fetch|networkerror/i.test(msg)) {
      return 'Cannot reach Gaviom servers. Check your connection, or try again in a moment.';
    }
    if (/invalid/i.test(msg) && /email/i.test(msg)) {
      return known.email_address_invalid;
    }
    if (/confirmation email/i.test(msg)) {
      return 'We could not send the confirmation email from Supabase. Your account may still be created — check your inbox or use Resend confirmation on sign in.';
    }
    return msg || 'Something went wrong. Please try again.';
  }

  function setLoading(form, loading) {
    if (!form) return;
    form.classList.toggle('is-loading', loading);
    form.querySelectorAll('button, input, select').forEach(function (node) {
      node.disabled = loading;
    });
    var submit = form.querySelector('[type="submit"]');
    if (submit) submit.setAttribute('aria-busy', loading ? 'true' : 'false');
    if (loading) {
      setSubmitLabel(form, form.id === 'auth-signup-form' ? 'Creating account…' : 'Signing in…');
    } else {
      setSubmitLabel(form, '');
    }
  }

  function withAuthTimeout(promise, ms, message) {
    return Promise.race([
      promise,
      new Promise(function (_resolve, reject) {
        setTimeout(function () {
          reject(new Error(message || 'Request timed out. Please try again.'));
        }, ms || 20000);
      }),
    ]);
  }

  function redirectAfterAuth() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      window.location.href = next;
      return;
    }
    window.location.href = '/account.html';
  }

  function ageFromDob(isoDate) {
    var dob = new Date(isoDate + 'T12:00:00');
    if (Number.isNaN(dob.getTime())) return null;
    var today = new Date();
    var age = today.getFullYear() - dob.getFullYear();
    var m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age;
  }

  function fillStateSelect(select, selectedCode) {
    if (!select) return;
    var selected = selectedCode || select.value || '';
    if (select.options.length > 1) {
      select.dataset.statesFilled = '1';
      if (selected) select.value = selected;
      return;
    }
    select.innerHTML = '';
    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = 'Select your state';
    placeholder.disabled = true;
    placeholder.selected = !selected;
    select.appendChild(placeholder);
    US_STATES.forEach(function (code) {
      var opt = document.createElement('option');
      opt.value = code;
      opt.textContent = (US_STATE_NAMES[code] || code) + ' (' + code + ')';
      select.appendChild(opt);
    });
    select.dataset.statesFilled = '1';
    if (selected) select.value = selected;
  }

  function clearFieldErrors(form) {
    if (!form) return;
    form.querySelectorAll('.auth-input-invalid').forEach(function (el) {
      el.classList.remove('auth-input-invalid');
    });
  }

  function markFieldInvalid(el) {
    if (!el) return;
    el.classList.add('auth-input-invalid');
    el.focus({ preventScroll: false });
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }

  function setupSignupDob() {
    var dob = $('#signup-dob');
    if (!dob) return;
    var today = new Date();
    var max = new Date(today.getFullYear() - 18, today.getMonth(), today.getDate());
    var min = new Date(today.getFullYear() - 110, today.getMonth(), today.getDate());
    dob.max = max.toISOString().slice(0, 10);
    dob.min = min.toISOString().slice(0, 10);
  }

  function validateSignupForm(form, alertEl) {
    clearFieldErrors(form);
    var first = $('#signup-first');
    var last = $('#signup-last');
    var email = $('#signup-email');
    var password = $('#signup-password');
    var confirm = $('#signup-confirm');
    var dob = $('#signup-dob');
    var state = $('#signup-state');
    var terms = $('#signup-terms');

    if (!first || !first.value.trim()) {
      showAlert(alertEl, 'Please enter your first name.', 'error');
      markFieldInvalid(first);
      return false;
    }
    if (!last || !last.value.trim()) {
      showAlert(alertEl, 'Please enter your last name.', 'error');
      markFieldInvalid(last);
      return false;
    }
    if (!email || !email.value.trim()) {
      showAlert(alertEl, 'Please enter your email address.', 'error');
      markFieldInvalid(email);
      return false;
    }
    var emailError = validateSignupEmail(email.value);
    if (emailError) {
      showAlert(alertEl, emailError, 'error');
      markFieldInvalid(email);
      return false;
    }
    if (!password || !password.value) {
      showAlert(alertEl, 'Please choose a password (8+ characters).', 'error');
      markFieldInvalid(password);
      return false;
    }
    if (password.value.length < 8) {
      showAlert(alertEl, 'Password must be at least 8 characters.', 'error');
      markFieldInvalid(password);
      return false;
    }
    if (!confirm || !confirm.value) {
      showAlert(alertEl, 'Please confirm your password.', 'error');
      markFieldInvalid(confirm);
      return false;
    }
    if (password.value !== confirm.value) {
      showAlert(alertEl, 'Passwords do not match.', 'error');
      markFieldInvalid(confirm);
      return false;
    }
    if (!dob || !dob.value) {
      showAlert(alertEl, 'Please select your date of birth.', 'error');
      markFieldInvalid(dob);
      return false;
    }
    var age = ageFromDob(dob.value);
    if (age === null || age < 18) {
      showAlert(alertEl, 'You must be 18 or older to create an account.', 'error');
      markFieldInvalid(dob);
      return false;
    }
    if (!state || !state.value) {
      showAlert(alertEl, 'Please select your state.', 'error');
      markFieldInvalid(state);
      return false;
    }
    if (!terms || !terms.checked) {
      showAlert(alertEl, 'Please accept the Terms and Privacy Policy.', 'error');
      if (terms) markFieldInvalid(terms);
      return false;
    }
    return true;
  }

  function escapeHtml(text) {
    return String(text || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function showSignupVerifyScreen(email, initialError) {
    var card = document.querySelector('.auth-card');
    if (!card || card.querySelector('[data-auth-verify-pending]')) return;

    var form = $('#auth-signup-form');
    var sub = card.querySelector('.auth-card__sub');
    var title = card.querySelector('.auth-card__title');
    var safeEmail = escapeHtml(email);

    if (form) {
      form.hidden = true;
      form.style.display = 'none';
    }
    if (sub) sub.hidden = true;
    if (title) title.textContent = 'Verify your email';

    var block = document.createElement('div');
    block.className = 'auth-verify-pending';
    block.setAttribute('data-auth-verify-pending', '');
    block.innerHTML =
      '<p class="auth-verify-pending__msg">We sent a confirmation link to <strong>' + safeEmail + '</strong>. Open it to activate your account — you will be signed in automatically.</p>' +
      '<p class="auth-verify-pending__hint font-mono">Check your spam or promotions folder. If nothing arrives within 5 minutes, use Resend confirmation below or try another email provider (Gmail, Outlook).</p>' +
      '<p class="auth-alert" data-auth-verify-alert role="alert" aria-live="polite"' + (initialError ? '' : ' hidden') + '></p>' +
      '<div class="auth-verify-pending__actions">' +
      '<button type="button" class="btn btn-primary btn-lg auth-submit" data-auth-signup-resend>Resend confirmation email</button>' +
      '<a href="/signin.html" class="btn btn-ghost auth-verify-pending__signin">Go to sign in</a>' +
      '</div>';

    var insertBefore = card.querySelector('.auth-legal');
    if (insertBefore) card.insertBefore(block, insertBefore);
    else card.appendChild(block);

    if (initialError) {
      showAlert(block.querySelector('[data-auth-verify-alert]'), initialError, 'error');
    }

    block.querySelector('[data-auth-signup-resend]').addEventListener('click', async function () {
      var btn = block.querySelector('[data-auth-signup-resend]');
      var alertEl = block.querySelector('[data-auth-verify-alert]');
      if (btn) btn.disabled = true;
      try {
        await window.GaviomAuth.resendConfirmationEmail(email);
        showAlert(alertEl, 'Confirmation email sent. Check your inbox and spam folder.', 'success');
      } catch (err) {
        showAlert(alertEl, friendlyAuthError(err), 'error');
      } finally {
        if (btn) btn.disabled = false;
      }
    });
  }

  function showAlreadySignedIn(session, client) {
    var card = document.querySelector('.auth-card');
    if (!card || card.querySelector('[data-auth-already]')) return;

    var form = card.querySelector('.auth-form');
    var sub = card.querySelector('.auth-card__sub');
    var title = card.querySelector('.auth-card__title');
    var email = (session.user && session.user.email) || 'your account';

    if (form) {
      form.hidden = true;
      form.style.display = 'none';
    }
    if (sub) sub.hidden = true;
    if (title) title.textContent = 'Already signed in';

    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    var continueLabel = next && next.indexOf('checkout') !== -1
      ? 'Continue to Gaviom+ checkout'
      : 'Go to my account';
    var continueHref = next && next.startsWith('/') && !next.startsWith('//') ? next : '/account.html';

    var block = document.createElement('div');
    block.className = 'auth-already';
    block.setAttribute('data-auth-already', '');
    block.innerHTML =
      '<p class="auth-already__msg">You are signed in as <strong>' + email + '</strong>.</p>' +
      '<div class="auth-already__actions">' +
      '<button type="button" class="btn btn-primary btn-lg auth-submit" data-auth-continue>' + continueLabel + '</button>' +
      '<button type="button" class="btn btn-ghost auth-already__prizes" data-auth-prizes>Browse sweepstakes</button>' +
      '<button type="button" class="btn btn-ghost auth-already__signout" data-auth-signout>Sign out</button>' +
      '</div>';

    var insertBefore = form || card.querySelector('.auth-legal');
    if (insertBefore) card.insertBefore(block, insertBefore);
    else card.appendChild(block);

    block.querySelector('[data-auth-continue]').addEventListener('click', function () {
      window.location.href = continueHref;
    });
    block.querySelector('[data-auth-prizes]').addEventListener('click', function () {
      window.location.href = '/prizes.html';
    });
    block.querySelector('[data-auth-signout]').addEventListener('click', async function () {
      var btn = block.querySelector('[data-auth-signout]');
      if (btn) btn.disabled = true;
      try {
        await window.GaviomAuth.signOut();
        window.location.reload();
      } catch (err) {
        if (btn) btn.disabled = false;
        showAlert($('[data-auth-alert]'), friendlyAuthError(err), 'error');
      }
    });
  }

  async function waitForRecoverySession(maxWaitMs) {
    var client = getClient();
    var deadline = Date.now() + (maxWaitMs || 12000);

    while (Date.now() < deadline) {
      var session = await establishSessionFromUrl(client);
      if (session && session.user) return session;
      var result = await client.auth.getSession();
      if (result.data && result.data.session && result.data.session.user) {
        return result.data.session;
      }
      await new Promise(function (resolve) {
        setTimeout(resolve, 200);
      });
    }

    return null;
  }

  function isPasswordRecoveryLanding() {
    var params = new URLSearchParams(window.location.search || '');
    var hash = window.location.hash || '';
    return (
      params.get('ready') === '1' ||
      params.has('code') ||
      hash.indexOf('type=recovery') !== -1 ||
      hash.indexOf('access_token=') !== -1
    );
  }

  async function initResetPassword() {
    var form = $('#auth-reset-password-form');
    if (!form) return;
    var alertEl = $('[data-auth-alert]');
    var params = new URLSearchParams(window.location.search || '');

    if (params.get('reset') === 'error') {
      showAlert(alertEl, 'This reset link expired or was already used. Request a new one from sign in.', 'error');
      form.hidden = true;
      return;
    }

    try {
      await bootstrapAuth();
      var session = null;
      if (isPasswordRecoveryLanding()) {
        session = await waitForRecoverySession(12000);
      } else {
        session = await window.GaviomAuth.waitForSession(8000);
      }
      if (!session || !session.user) {
        showAlert(alertEl, 'Open the reset link from your email, or request a new one from sign in.', 'error');
        form.hidden = true;
        return;
      }
      showAlert(
        alertEl,
        'Choose a new password for ' + (session.user.email || 'your account') + '.',
        'success'
      );
    } catch (err) {
      showAlert(alertEl, friendlyAuthError(err), 'error');
      form.hidden = true;
      return;
    }

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      showAlert(alertEl, '', '');
      var passwordEl = $('#reset-password');
      var confirmEl = $('#reset-password-confirm');
      var password = passwordEl ? passwordEl.value : '';
      var confirm = confirmEl ? confirmEl.value : '';
      if (!password || password.length < 8) {
        showAlert(alertEl, 'Choose a password with at least 8 characters.', 'error');
        if (passwordEl) markFieldInvalid(passwordEl);
        return;
      }
      if (password !== confirm) {
        showAlert(alertEl, 'Passwords do not match.', 'error');
        if (confirmEl) markFieldInvalid(confirmEl);
        return;
      }
      setLoading(form, true);
      try {
        var apiData = await setPasswordViaApi(password);
        await applyAuthSessionFromApi(apiData, 'PASSWORD_UPDATED');
        showAlert(alertEl, 'Password updated. Redirecting to your account…', 'success');
        window.location.replace('/account.html');
      } catch (err) {
        showAlert(alertEl, friendlyAuthError(err), 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  async function guardSignedIn() {
    var page = document.body.dataset.authPage;
    if (page === 'reset-password') return;
    if (page !== 'signin' && page !== 'signup') return;

    if (isEmailConfirmationLanding()) {
      showConfirmationSigningIn();
      var landed = await completeEmailConfirmationLanding();
      if (landed) return;
    }

    try {
      var session = await window.GaviomAuth.waitForSession();
      if (!session || !session.user) return;
      if (!isEmailConfirmed(session.user)) {
        if (page === 'signup') {
          showSignupVerifyScreen(session.user.email || '');
        }
        return;
      }

      if (redirectIfSignedInConfirmed(session)) return;
    } catch (e) {
      logAuth('guardSignedIn:error', e.message);
    }
  }

  async function initSignIn() {
    var form = $('#auth-signin-form');
    if (!form) return;
    var alertEl = $('[data-auth-alert]');
    var rememberEl = $('[data-auth-remember]');
    if (rememberEl) rememberEl.checked = shouldRememberMe();

    var params = new URLSearchParams(window.location.search);
    if (params.get('reset') === 'done') {
      showAlert(alertEl, 'Your password was updated. Sign in with your new password.', 'success');
    } else if (params.get('verified') === '1') {
      showConfirmationSigningIn();
      waitForConfirmedSession(12000).then(function (session) {
        if (session && session.user && isEmailConfirmed(session.user)) {
          applySession(session, 'SIGNED_IN');
          emitAuthChanged('SIGNED_IN');
          redirectIfSignedInConfirmed(session);
          return;
        }
        if (params.get('confirm') !== 'error') {
          showAlert(alertEl, 'Email confirmed — finishing sign-in…', 'success');
        }
      });
    } else if (params.get('confirm') === 'error') {
      showAlert(alertEl, 'This confirmation link expired or was already used. Try signing in below — if your email is confirmed it will work. Otherwise use Resend confirmation.', 'error');
    } else if (params.get('confirm') === 'required') {
      showAlert(alertEl, 'Confirm your email before purchasing. Check your inbox for the confirmation link.', 'error');
    }

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      showAlert(alertEl, '', '');
      if (!form.checkValidity()) {
        form.reportValidity();
        return;
      }
      var email = ($('#signin-email') || {}).value || '';
      var password = ($('#signin-password') || {}).value || '';
      if (!email || !password) {
        showAlert(alertEl, 'Enter your email and password.', 'error');
        return;
      }
      email = email.trim().toLowerCase();
      setRememberMe(!rememberEl || rememberEl.checked);
      setLoading(form, true);
      try {
        var signedIn = false;
        try {
          var apiData = await signInViaApi(email, password);
          await applyAuthSessionFromApi(apiData, 'SIGNED_IN');
          signedIn = true;
        } catch (apiErr) {
          logAuth('signin:api-failed', apiErr.message);
          if (apiErr.code === 'email_not_confirmed') throw apiErr;
        }
        if (!signedIn) {
          var client = getClient();
          var result = await withAuthTimeout(
            client.auth.signInWithPassword({ email: email, password: password }),
            20000,
            'Sign in timed out. Check your connection and try again.'
          );
          if (result.error) throw result.error;
          if (!result.data || !result.data.session) {
            throw { code: 'invalid_credentials', message: 'Invalid login credentials' };
          }
          var userResult = await client.auth.getUser();
          var freshUser = userResult.data && userResult.data.user ? userResult.data.user : result.data.session.user;
          if (!isEmailConfirmed(freshUser)) {
            await clearLocalSession(client);
            throw { code: 'email_not_confirmed', message: 'Email not confirmed' };
          }
          applySession(Object.assign({}, result.data.session, { user: freshUser }), 'SIGNED_IN');
          emitAuthChanged('SIGNED_IN');
        }
        logAuth('signin:ok', { email: email });
        showAlert(alertEl, 'Signed in. Redirecting…', 'success');
        redirectAfterAuth();
      } catch (err) {
        showAlert(alertEl, friendlyAuthError(err), 'error');
      } finally {
        setLoading(form, false);
      }
    });

    var forgot = $('[data-auth-forgot]');
    if (forgot) {
      forgot.addEventListener('click', async function (ev) {
        ev.preventDefault();
        showAlert(alertEl, '', '');
        var email = ($('#signin-email') || {}).value || '';
        if (!email) {
          showAlert(alertEl, 'Enter your email above, then click reset password.', 'error');
          return;
        }
        setLoading(form, true);
        try {
          await sendPasswordResetViaApi(email.trim());
          showAlert(alertEl, 'Password reset email sent. Check your inbox and spam folder.', 'success');
        } catch (err) {
          logAuth('forgot:error', err.message);
          showAlert(alertEl, friendlyAuthError(err), 'error');
        } finally {
          setLoading(form, false);
        }
      });
    }

    var resend = $('[data-auth-resend]');
    if (resend) {
      resend.addEventListener('click', async function (ev) {
        ev.preventDefault();
        showAlert(alertEl, '', '');
        var email = ($('#signin-email') || {}).value || '';
        if (!email) {
          showAlert(alertEl, 'Enter your email above, then click resend confirmation.', 'error');
          return;
        }
        setLoading(form, true);
        try {
          await window.GaviomAuth.resendConfirmationEmail(email.trim());
          showAlert(alertEl, 'Confirmation email sent. Check your inbox and spam folder.', 'success');
        } catch (err) {
          showAlert(alertEl, friendlyAuthError(err), 'error');
        } finally {
          setLoading(form, false);
        }
      });
    }
  }

  async function initSignUp() {
    var form = $('#auth-signup-form');
    if (!form) return;
    var alertEl = $('[data-auth-alert]');
    fillStateSelect($('#signup-state'));
    setupSignupDob();

    form.querySelectorAll('input, select').forEach(function (el) {
      el.addEventListener('input', function () { el.classList.remove('auth-input-invalid'); });
      el.addEventListener('change', function () { el.classList.remove('auth-input-invalid'); });
    });

    form.addEventListener('submit', async function (ev) {
      ev.preventDefault();
      showAlert(alertEl, '', '');
      if (!validateSignupForm(form, alertEl)) return;

      var firstName = $('#signup-first').value;
      var lastName = $('#signup-last').value;
      var email = $('#signup-email').value;
      var password = $('#signup-password').value;
      var dob = $('#signup-dob').value;
      var state = $('#signup-state').value;
      var marketing = ($('#signup-marketing') || {}).checked;

      setRememberMe(true);
      setLoading(form, true);
      storePostVerifyNext();

      var signupEmail = email.trim();
      var signupData = {
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        date_of_birth: dob,
        state: state,
        marketing_opt_in: marketing,
      };

      try {
        await signupViaApi({
          email: signupEmail,
          password: password,
          first_name: signupData.first_name,
          last_name: signupData.last_name,
          date_of_birth: signupData.date_of_birth,
          state: signupData.state,
          marketing_opt_in: signupData.marketing_opt_in,
        });
        logAuth('signup:created-via-api', { email: signupEmail });
        showSignupVerifyScreen(signupEmail);
        showAlert(alertEl, '', '');
        form.reset();
      } catch (err) {
        showAlert(alertEl, friendlyAuthError(err), 'error');
      } finally {
        setLoading(form, false);
      }
    });
  }

  function showConfigBanner() {
    if (configReady()) return;
    var banner = document.createElement('p');
    banner.className = 'auth-config-banner font-mono';
    banner.textContent = 'Setup: add your Supabase URL and anon key in auth-config.js';
    var main = document.querySelector('.auth-main');
    if (main) main.prepend(banner);
  }

  function init() {
    try {
      localStorage.removeItem('gaviom-signup-draft');
    } catch (e) {
      /* legacy cleanup */
    }
    showConfigBanner();
    if (configReady()) bootstrapAuth();
    guardSignedIn();
    var page = document.body.dataset.authPage;
    if (page === 'signin') initSignIn();
    if (page === 'signup') initSignUp();
    if (page === 'reset-password') initResetPassword();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  window.GaviomAuth = {
    configReady: configReady,
    getClient: getClient,
    friendlyAuthError: friendlyAuthError,
    showAlert: showAlert,
    fillStateSelect: fillStateSelect,
    US_STATES: US_STATES,
    US_STATE_NAMES: US_STATE_NAMES,
    setRememberMe: setRememberMe,
    shouldRememberMe: shouldRememberMe,
    isReady: function () { return authState.ready; },
    getUser: function () { return authState.user; },
    refreshUser: async function () {
      if (!configReady()) return null;
      try {
        var client = getClient();
        if (!authState.ready) await bootstrapAuth();
        var result = await client.auth.getUser();
        if (result.error) throw result.error;
        var user = result.data && result.data.user ? result.data.user : null;
        if (user && authState.session) {
          authState.session = Object.assign({}, authState.session, { user: user });
          authState.user = user;
        }
        return user;
      } catch (e) {
        logAuth('refreshUser:error', e.message);
        return authState.user;
      }
    },
    subscribe: function (fn) {
      authSubscribers.push(fn);
      if (authState.ready) fn(authState.session, 'SUBSCRIBE');
      return function () {
        authSubscribers = authSubscribers.filter(function (item) { return item !== fn; });
      };
    },
    waitForSession: async function (maxWaitMs) {
      if (!configReady()) return null;
      var deadline = Date.now() + (maxWaitMs || 8000);
      await bootstrapAuth();
      if (authState.session && authState.session.user) return authState.session;

      if (!hasStoredAuthToken() && !isEmailConfirmationLanding() && !hasUrlAuthTokens()) {
        return authState.session;
      }

      while (Date.now() < deadline) {
        try {
          var client = getClient();
          var result = await client.auth.getSession();
          applySession(result.data.session || null, 'WAIT_SESSION');
          if (authState.session && authState.session.user) return authState.session;
        } catch (e) {
          logAuth('waitForSession:error', e.message);
        }
        await new Promise(function (resolve) {
          setTimeout(resolve, 150);
        });
      }

      if (hasStoredAuthToken() && authState.session && authState.session.user) {
        return authState.session;
      }
      return authState.session;
    },
    getSession: async function () {
      if (!configReady()) return null;
      if (!authState.ready) await bootstrapAuth();
      if (authState.session) return authState.session;
      try {
        var client = getClient();
        var result = await client.auth.getSession();
        applySession(result.data.session || null, 'GET_SESSION');
      } catch (e) {
        logAuth('getSession:error', e.message);
      }
      return authState.session;
    },
    getAccessToken: async function () {
      var session = await window.GaviomAuth.getSession();
      return session && session.access_token ? session.access_token : null;
    },
    requireSession: async function (nextPath) {
      try {
        var session = await window.GaviomAuth.waitForSession();
        if (!session) session = await window.GaviomAuth.getSession();
        if (session && session.user && isEmailConfirmed(session.user)) return session;
        if (session && session.user && !isEmailConfirmed(session.user)) {
          window.location.href =
            '/signin.html?confirm=required&next=' + encodeURIComponent(nextPath || '/account.html');
          return null;
        }
      } catch (e) {
        logAuth('requireSession:error', e.message);
      }
      var dest = '/signin.html?next=' + encodeURIComponent(nextPath || '/account.html');
      window.location.href = dest;
      return null;
    },
    isEmailConfirmed: isEmailConfirmed,
    validateSignupEmail: validateSignupEmail,
    resendConfirmationEmail: async function (email) {
      if (!configReady()) throw new Error('Account service is not configured.');
      var value = String(email || '').trim();
      if (!value) throw new Error('Enter your email address.');
      try {
        await sendConfirmationViaApi(value);
        return true;
      } catch (apiErr) {
        logAuth('resend:api-failed', apiErr.message);
      }
      var client = getClient();
      var result = await client.auth.resend({
        type: 'signup',
        email: value,
        options: { emailRedirectTo: emailConfirmRedirectUrl() },
      });
      if (result.error) throw result.error;
      return true;
    },
    requestPasswordReset: async function (email) {
      if (!configReady()) throw new Error('Account service is not configured.');
      var value = String(email || '').trim();
      if (!value) throw new Error('Enter your email address.');
      await sendPasswordResetViaApi(value);
      return true;
    },
    signOut: async function () {
      try {
        var client = getClient();
        await client.auth.signOut({ scope: 'local' });
      } catch (e) {
        logAuth('signOut:local-error', e.message);
      }
      try {
        var key = getSupabaseStorageKey();
        if (key) {
          localStorage.removeItem(key);
          sessionStorage.removeItem(key);
        }
      } catch (e2) {
        /* ignore */
      }
      applySession(null, 'SIGNED_OUT');
      setTimeout(function () {
        emitAuthChanged('SIGNED_OUT');
      }, 0);
    },
    enableDebug: function () {
      try { localStorage.setItem('gaviom-auth-debug', '1'); } catch (e) { /* ignore */ }
      logAuth('debug-enabled');
    },
    getDebugContext: function () {
      var persist = null;
      try {
        persist = localStorage.getItem(AUTH_PERSIST_KEY);
      } catch (e) {
        /* ignore */
      }
      return {
        userId: authState.user ? authState.user.id : null,
        email: authState.user ? authState.user.email : null,
        hasSession: !!(authState.session && authState.session.user),
        hasToken: hasStoredAuthToken(),
        persist: persist,
        storage: persist !== '0' ? 'localStorage' : 'sessionStorage',
        isMobile: typeof window.matchMedia === 'function' && window.matchMedia('(max-width:768px)').matches,
        width: typeof window.innerWidth === 'number' ? window.innerWidth : null,
      };
    },
    log: logAuth,
    getSupabaseStorageKey: getSupabaseStorageKey,
    hasStoredAuthToken: hasStoredAuthToken,
  };
})();
