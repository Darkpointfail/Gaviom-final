(function () {
  'use strict';

  var state = {
    stripe: null,
    cardNumber: null,
    clientSecret: null,
    paymentIntentId: null,
    ready: false,
    isSubscription: false,
    authUserId: null,
    authEmail: null,
  };

  async function loadAuthContext() {
    try {
      if (!window.GaviomAuth) {
        await new Promise(function (resolve, reject) {
          var cfg = document.createElement('script');
          cfg.src = '/auth-config.js';
          cfg.onload = function () {
            var sdk = document.createElement('script');
            sdk.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js';
            sdk.onload = function () {
              var auth = document.createElement('script');
              auth.src = '/auth.js';
              auth.onload = resolve;
              auth.onerror = reject;
              document.head.appendChild(auth);
            };
            sdk.onerror = reject;
            document.head.appendChild(sdk);
          };
          cfg.onerror = reject;
          document.head.appendChild(cfg);
        });
      }
      if (!window.GaviomAuth || !window.GaviomAuth.configReady()) return;
      var session = await window.GaviomAuth.getSession();
      if (!session) return;
      state.authUserId = session.user.id;
      state.authEmail = session.user.email || null;
      var emailEl = document.querySelector('#email');
      if (emailEl && state.authEmail && !emailEl.value) {
        emailEl.value = state.authEmail;
      }
    } catch (e) {
      /* guest checkout ok */
    }
  }

  function authPayload(extra) {
    var payload = extra || {};
    if (state.authUserId) payload.userId = state.authUserId;
    return payload;
  }

  function qs(sel) {
    return document.querySelector(sel);
  }

  function showNotice(message, isError) {
    var notice = qs('[data-checkout-notice]');
    if (!notice) return;
    if (!message) {
      notice.hidden = true;
      notice.textContent = '';
      notice.classList.remove('is-error');
      return;
    }
    notice.hidden = false;
    notice.textContent = message;
    notice.classList.toggle('is-error', Boolean(isError));
  }

  function showFieldError(message) {
    var el = document.getElementById('card-errors');
    if (!el) return;
    if (!message) {
      el.hidden = true;
      el.textContent = '';
      return;
    }
    el.hidden = false;
    el.textContent = message;
  }

  function loadCartItems() {
    if (window.GaviomCart) return window.GaviomCart.load();
    try {
      var raw = localStorage.getItem('gaviom-cart-v1');
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data.items) ? data.items : [];
    } catch (e) {
      return [];
    }
  }

  function getOrderPayload() {
    var params = new URLSearchParams(window.location.search);
    var plan = params.get('plan');
    if (plan === 'monthly' || plan === 'annual') {
      return { type: 'membership', plan: 'monthly', isSubscription: true };
    }
    var items = loadCartItems();
    if (items.length > 0) {
      return {
        type: 'cart',
        items: items.map(function (item) {
          return { prizeId: item.prizeId, qty: item.qty };
        }),
      };
    }
    var prize = params.get('prize');
    if (!prize) {
      var single = qs('[data-checkout-single]');
      if (single && !single.hidden) prize = 'msc';
    }
    if (prize) {
      var qty = parseInt(params.get('bundle') || '5', 10) || 5;
      return { prize: prize, qty: qty };
    }
    return null;
  }

  function setPanelLoading(isLoading) {
    var panel = qs('[data-stripe-payment-panel]');
    var loading = qs('[data-stripe-loading]');
    var fields = qs('[data-stripe-fields]');
    if (!panel) return;
    if (loading) loading.hidden = !isLoading;
    if (fields) fields.hidden = isLoading;
    panel.classList.toggle('is-loading', isLoading);
  }

  function waitForStripe(maxMs) {
    return new Promise(function (resolve, reject) {
      if (window.Stripe) {
        resolve(window.Stripe);
        return;
      }
      var start = Date.now();
      var timer = setInterval(function () {
        if (window.Stripe) {
          clearInterval(timer);
          resolve(window.Stripe);
        } else if (Date.now() - start > maxMs) {
          clearInterval(timer);
          reject(new Error('Stripe is blocked. Disable ad blockers and refresh.'));
        }
      }, 100);
    });
  }

  function destroyCardFields() {
    if (state.cardNumber) {
      try {
        state.cardNumber.destroy();
      } catch (e) {
        /* ignore */
      }
    }
    state.cardNumber = null;
    state.stripe = null;
    state.ready = false;
  }

  function mountSplitCardFields(stripe) {
    destroyCardFields();

    var style = {
      base: {
        fontSize: '16px',
        color: '#0a1628',
        fontFamily: 'Geist, system-ui, sans-serif',
        '::placeholder': { color: '#8896a8' },
      },
      invalid: { color: '#b42318' },
    };

    var elements = stripe.elements();
    var cardNumber = elements.create('cardNumber', { style: style, showIcon: true });
    var cardExpiry = elements.create('cardExpiry', { style: style });
    var cardCvc = elements.create('cardCvc', { style: style });

    cardNumber.mount('#card-number');
    cardExpiry.mount('#card-expiry');
    cardCvc.mount('#card-cvc');

    function onChange(event) {
      showFieldError(event.error ? event.error.message : '');
    }
    cardNumber.on('change', onChange);
    cardExpiry.on('change', onChange);
    cardCvc.on('change', onChange);

    state.stripe = stripe;
    state.cardNumber = cardNumber;
    state.ready = true;
    setPanelLoading(false);
  }

  async function initCheckoutStripe() {
    var panel = qs('[data-stripe-payment-panel]');
    if (!panel) return;

    var order = getOrderPayload();
    if (!order) {
      panel.hidden = true;
      destroyCardFields();
      return;
    }

    if (order.isSubscription) {
      state.isSubscription = true;
      panel.hidden = true;
      destroyCardFields();
      return;
    }

    panel.hidden = false;
    setPanelLoading(true);

    try {
      var configRes = await fetch('/api/stripe-config', { credentials: 'same-origin' });
      var config = await configRes.json();
      if (!config.configured || !config.publishableKey) {
        throw new Error('Payments are not live yet.');
      }

      var piRes = await fetch('/api/create-payment-intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify(authPayload(order)),
      });
      var piData = await piRes.json();
      if (!piRes.ok) {
        throw new Error(piData.error || 'Could not load payment form.');
      }

      var StripeLib = await waitForStripe(8000);
      state.clientSecret = piData.clientSecret;
      state.paymentIntentId = piData.paymentIntentId;

      mountSplitCardFields(StripeLib(config.publishableKey));
      showNotice('');
      showFieldError('');
    } catch (err) {
      destroyCardFields();
      setPanelLoading(false);
      showNotice(err.message || 'Card form failed to load. Refresh the page.', true);
    }
  }

  async function startMembershipCheckout(email) {
    var res = await fetch('/api/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(authPayload({ type: 'membership', plan: 'monthly', email: email })),
    });
    var data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Checkout could not start.');
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    throw new Error('No checkout URL returned.');
  }

  async function confirmPayment(email) {
    var updateRes = await fetch('/api/update-payment-intent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
      body: JSON.stringify(authPayload({
        paymentIntentId: state.paymentIntentId,
        email: email,
      })),
    });
    var updateData = await updateRes.json();
    if (!updateRes.ok) {
      throw new Error(updateData.error || 'Could not save email.');
    }

    var returnUrl =
      window.location.origin +
      '/checkout-success.html?payment_intent=' +
      encodeURIComponent(state.paymentIntentId);

    var result = await state.stripe.confirmCardPayment(state.clientSecret, {
      payment_method: {
        card: state.cardNumber,
        billing_details: { email: email },
      },
    });

    if (result.error) {
      throw new Error(result.error.message || 'Payment failed.');
    }
    if (result.paymentIntent && result.paymentIntent.status === 'succeeded') {
      window.location.href = returnUrl;
    }
  }

  function bindForm() {
    var form = document.getElementById('gaviom-checkout');
    if (!form || form.dataset.stripeBound === '1') return;
    form.dataset.stripeBound = '1';

    form.addEventListener('submit', async function (e) {
      e.preventDefault();
      var emailEl = form.querySelector('#email');
      var consent = form.querySelector('.co-consent input[type="checkbox"]');
      var submit = form.querySelector('[data-checkout-submit]');
      var email = emailEl ? emailEl.value.trim() : '';

      if (!email) {
        if (emailEl) emailEl.focus();
        showNotice('Enter your email to continue.', true);
        return;
      }
      if (consent && !consent.checked) {
        consent.focus();
        showNotice('Please confirm eligibility to continue.', true);
        return;
      }

      var defaultLabel = submit ? submit.textContent : '';
      if (submit) {
        submit.disabled = true;
        submit.textContent = 'Processing…';
      }
      showNotice('');

      try {
        if (state.isSubscription) {
          await startMembershipCheckout(email);
          return;
        }
        if (!state.ready) {
          throw new Error('Card fields are still loading. Wait a moment and try again.');
        }
        await confirmPayment(email);
      } catch (err) {
        showNotice(err.message || 'Something went wrong. Please try again.', true);
        if (submit) {
          submit.disabled = false;
          submit.textContent = defaultLabel;
        }
      }
    });
  }

  function showCanceledNotice() {
    var params = new URLSearchParams(window.location.search);
    if (params.get('canceled') === '1') {
      showNotice('Payment canceled. Your cart is still saved — try again when ready.', false);
    }
  }

  function start() {
    showCanceledNotice();
    bindForm();
    loadAuthContext().then(function () {
      initCheckoutStripe();
    });
    if (window.GaviomCart) return;
    var s = document.createElement('script');
    s.src = 'cart.js?v=20260706-perf';
    s.defer = true;
    s.onload = function () {
      initCheckoutStripe();
    };
    document.head.appendChild(s);
  }

  window.GaviomCheckoutStripe = {
    refresh: initCheckoutStripe,
    isReady: function () {
      return state.ready;
    },
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start);
  } else {
    start();
  }
})();
