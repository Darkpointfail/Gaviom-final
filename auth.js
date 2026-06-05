(function () {
  'use strict';

  var US_STATES = [
    'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
    'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY',
    'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV',
    'WI', 'WY', 'DC',
  ];

  function configReady() {
    var cfg = window.GAVIOM_AUTH_CONFIG;
    return cfg && cfg.supabaseUrl && cfg.supabaseAnonKey
      && !cfg.supabaseUrl.includes('REPLACE_WITH')
      && !cfg.supabaseAnonKey.includes('REPLACE_WITH');
  }

  function getClient() {
    if (!window.supabase || !window.supabase.createClient) {
      throw new Error('Supabase SDK not loaded.');
    }
    if (!configReady()) {
      throw new Error('Missing Supabase config. Edit auth-config.js with your project URL and anon key.');
    }
    var cfg = window.GAVIOM_AUTH_CONFIG;
    return window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey);
  }

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function showAlert(el, message, type) {
    if (!el) return;
    el.hidden = !message;
    el.textContent = message || '';
    el.classList.remove('auth-alert--error', 'auth-alert--success');
    if (type) el.classList.add('auth-alert--' + type);
    if (message) {
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
    var msg = (err && err.message) ? String(err.message) : '';
    if (/load failed|failed to fetch|networkerror/i.test(msg)) {
      return 'Cannot reach Gaviom servers. Check your connection, or try again in a moment.';
    }
    return msg || 'Something went wrong. Please try again.';
  }

  function setLoading(form, loading) {
    if (!form) return;
    form.classList.toggle('is-loading', loading);
    form.querySelectorAll('button, input, select').forEach(function (node) {
      node.disabled = loading;
    });
    if (loading) {
      setSubmitLabel(form, form.id === 'auth-signup-form' ? 'Creating account…' : 'Signing in…');
    } else {
      setSubmitLabel(form, '');
    }
  }

  function redirectAfterAuth() {
    var params = new URLSearchParams(window.location.search);
    var next = params.get('next');
    if (next && next.startsWith('/') && !next.startsWith('//')) {
      window.location.href = next;
      return;
    }
    window.location.href = '/prizes.html';
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

  function fillStateSelect(select) {
    if (!select || select.options.length > 1) return;
    US_STATES.forEach(function (code) {
      var opt = document.createElement('option');
      opt.value = code;
      opt.textContent = code;
      select.appendChild(opt);
    });
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

  async function guardSignedIn() {
    var page = document.body.dataset.authPage;
    if (page !== 'signin' && page !== 'signup') return;
    try {
      var client = getClient();
      var result = await client.auth.getSession();
      if (result.data.session) redirectAfterAuth();
    } catch (e) {
      /* config not ready yet */
    }
  }

  async function initSignIn() {
    var form = $('#auth-signin-form');
    if (!form) return;
    var alertEl = $('[data-auth-alert]');

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
      setLoading(form, true);
      try {
        var client = getClient();
        var result = await client.auth.signInWithPassword({ email: email.trim(), password: password });
        if (result.error) throw result.error;
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
          var client = getClient();
          var result = await client.auth.resetPasswordForEmail(email.trim(), {
            redirectTo: window.location.origin + '/signin.html',
          });
          if (result.error) throw result.error;
          showAlert(alertEl, 'Password reset email sent. Check your inbox.', 'success');
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

      setLoading(form, true);
      try {
        var client = getClient();
        var result = await client.auth.signUp({
          email: email.trim(),
          password: password,
          options: {
            emailRedirectTo: window.location.origin + '/signin.html',
            data: {
              first_name: firstName.trim(),
              last_name: lastName.trim(),
              date_of_birth: dob,
              state: state,
              marketing_opt_in: marketing,
            },
          },
        });
        if (result.error) throw result.error;
        if (result.data.session) {
          showAlert(alertEl, 'Account created. Redirecting…', 'success');
          redirectAfterAuth();
        } else {
          showAlert(alertEl, 'Check your email to confirm your account, then sign in.', 'success');
          form.reset();
        }
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
    showConfigBanner();
    guardSignedIn();
    var page = document.body.dataset.authPage;
    if (page === 'signin') initSignIn();
    if (page === 'signup') initSignUp();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
