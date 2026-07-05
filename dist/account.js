(function () {
  'use strict';

  var PRIZE_LABELS = {
    msc: 'MSC Cruise · 7 Nights',
    diving: 'Scuba Discovery · Cozumel',
    iphone: 'iPhone 17 Pro Max',
    vegas: '5-Star Weekend · Las Vegas or Miami',
    'membership-pool': 'Gaviom+ monthly pool',
  };

  var state = {
    session: null,
    profile: null,
    orders: [],
    entries: [],
    membership: null,
    promos: [],
    accessToken: null,
  };

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function $$(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function showAlert(message, type) {
    if (window.GaviomAuth && window.GaviomAuth.showAlert) {
      window.GaviomAuth.showAlert($('[data-account-alert]'), message, type);
    }
  }

  function initials(first, last, email) {
    var a = (first || '').trim().charAt(0);
    var b = (last || '').trim().charAt(0);
    if (a && b) return (a + b).toUpperCase();
    if (a) return a.toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'G';
  }

  function formatMoney(cents, currency) {
    if (cents == null) return '—';
    var cur = (currency || 'usd').toUpperCase();
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: cur }).format(cents / 100);
  }

  function formatDate(iso) {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  }

  function promoFromUserId(id) {
    var raw = (id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
    return 'GAVIOM-' + raw;
  }

  function parseHashPanel() {
    var hash = (window.location.hash || '#overview').replace('#', '');
    var allowed = ['overview', 'profile', 'tickets', 'membership', 'payments', 'promos', 'help', 'security'];
    return allowed.indexOf(hash) >= 0 ? hash : 'overview';
  }

  function showPanel(id) {
    $$('[data-account-panel]').forEach(function (panel) {
      var active = panel.getAttribute('data-account-panel') === id;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    $$('[data-account-nav]').forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-account-nav') === id);
    });
  }

  function bindNav() {
    $$('[data-account-nav]').forEach(function (link) {
      link.addEventListener('click', function (ev) {
        ev.preventDefault();
        var id = link.getAttribute('data-account-nav');
        history.replaceState(null, '', '#' + id);
        showPanel(id);
      });
    });
    window.addEventListener('hashchange', function () {
      showPanel(parseHashPanel());
    });
    showPanel(parseHashPanel());
  }

  function renderUserHeader() {
    var user = state.session.user;
    var meta = user.user_metadata || {};
    var first = state.profile && state.profile.first_name ? state.profile.first_name : meta.first_name;
    var last = state.profile && state.profile.last_name ? state.profile.last_name : meta.last_name;
    var email = user.email || '';

    var nameEl = $('[data-account-name]');
    var emailEl = $('[data-account-email]');
    var fallback = $('[data-account-avatar-fallback]');
    var img = $('[data-account-avatar]');

    if (nameEl) {
      nameEl.textContent = [first, last].filter(Boolean).join(' ') || 'Gaviom member';
    }
    if (emailEl) emailEl.textContent = email;
    if (fallback) fallback.textContent = initials(first, last, email);

    var avatarUrl = state.profile && state.profile.avatar_url;
    if (img && avatarUrl) {
      img.src = avatarUrl;
      img.hidden = false;
      if (fallback) fallback.hidden = true;
    } else if (img) {
      img.hidden = true;
      if (fallback) fallback.hidden = false;
    }

    var promoEl = $('[data-account-promo-code]');
    if (promoEl) {
      promoEl.textContent = (state.profile && state.profile.promo_code) || promoFromUserId(user.id);
    }
  }

  function fillProfileForm() {
    var user = state.session.user;
    var meta = user.user_metadata || {};
    var p = state.profile || {};

    var first = $('#profile-first');
    var last = $('#profile-last');
    var email = $('#profile-email');
    var dob = $('#profile-dob');
    var st = $('#profile-state');
    var marketing = $('[data-profile-marketing]');

    if (first) first.value = p.first_name || meta.first_name || '';
    if (last) last.value = p.last_name || meta.last_name || '';
    if (email) email.value = user.email || '';
    if (dob) dob.value = p.date_of_birth || meta.date_of_birth || '';
    if (st) st.value = p.state || meta.state || '';
    if (marketing) marketing.checked = !!(p.marketing_opt_in != null ? p.marketing_opt_in : meta.marketing_opt_in);

    if (window.GaviomAuth && window.GaviomAuth.fillStateSelect) {
      window.GaviomAuth.fillStateSelect(st);
      if (st && st.value) st.value = p.state || meta.state || st.value;
    }
  }

  async function loadProfile(client) {
    var userId = state.session.user.id;
    var result = await client.from('users').select('*').eq('id', userId).maybeSingle();
    if (result.error && result.error.code !== 'PGRST116') {
      console.warn('[Gaviom account] profile load', result.error.message);
    }
    state.profile = result.data || null;
    renderUserHeader();
    fillProfileForm();
  }

  async function loadEntries(client) {
    var result = await client
      .from('entries')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(100);
    if (result.error) {
      console.warn('[Gaviom account] entries', result.error.message);
      state.entries = [];
    } else {
      state.entries = result.data || [];
    }
    renderEntries();
    renderStats();
  }

  async function loadMembership(client) {
    var result = await client
      .from('memberships')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (result.error && result.error.code !== 'PGRST116') {
      console.warn('[Gaviom account] membership', result.error.message);
    }
    state.membership = result.data || null;
    renderMembership();
    renderStats();
  }

  async function loadPromos(client) {
    var userId = state.session.user.id;
    var result = await client
      .from('promo_redemptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    if (result.error) {
      console.warn('[Gaviom account] promos', result.error.message);
      state.promos = [];
    } else {
      state.promos = result.data || [];
    }
    renderRedeemed();
  }

  async function loadOrders() {
    if (!state.accessToken) return;
    try {
      var res = await fetch('/api/account/orders', {
        headers: { Authorization: 'Bearer ' + state.accessToken },
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not load orders');
      state.orders = data.orders || [];
    } catch (err) {
      console.warn('[Gaviom account] orders', err.message);
      state.orders = [];
    }
    renderOrders();
    renderStats();
  }

  function describeOrder(order) {
    var meta = order.metadata || {};
    if (order.mode === 'subscription' || meta.type === 'membership') {
      return { title: 'Gaviom+ · Monthly membership', detail: 'Subscription', tickets: null };
    }
    if (meta.type === 'tickets' && Array.isArray(meta.items)) {
      var lines = meta.items.map(function (item) {
        var label = PRIZE_LABELS[item.prizeId] || item.prizeId || 'Sweepstakes';
        return item.qty + ' ticket' + (item.qty === 1 ? '' : 's') + ' · ' + label;
      });
      var totalTickets = meta.items.reduce(function (sum, item) { return sum + (parseInt(item.qty, 10) || 0); }, 0);
      return { title: lines.join(' · '), detail: 'Pre-order', tickets: totalTickets };
    }
    return { title: 'Gaviom purchase', detail: order.mode || 'Order', tickets: null };
  }

  function renderEntries() {
    var list = $('[data-account-entries-list]');
    var empty = $('[data-account-entries-empty]');
    if (!list) return;

    list.innerHTML = '';
    if (!state.entries.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    state.entries.forEach(function (entry) {
      var label = PRIZE_LABELS[entry.prize_id] || entry.prize_id;
      var li = document.createElement('li');
      li.className = 'account-order-item';
      li.innerHTML =
        '<div class="account-order-item__main">' +
        '<p class="account-order-item__title">' + entry.quantity + ' ticket' + (entry.quantity === 1 ? '' : 's') + ' · ' + label + '</p>' +
        '<p class="account-order-item__meta font-mono">' + formatDate(entry.created_at) + ' · ' + entry.source + ' · ' + entry.status + '</p>' +
        '</div>' +
        '<span class="badge badge-ochre">' + (entry.draw_id || 'Draw') + '</span>';
      list.appendChild(li);
    });
  }

  function renderMembership() {
    var m = state.membership;
    var badge = $('[data-account-membership-badge]');
    var cta = $('[data-account-membership-cta]');
    var statMembership = $('[data-account-stat-membership]');

    var active = m && (m.status === 'active' || m.status === 'trialing');
    if (statMembership) {
      statMembership.textContent = active ? 'Gaviom+ active' : 'Not active';
    }
    if (badge) {
      badge.textContent = active ? 'Subscribed' : 'Not subscribed';
      badge.classList.toggle('badge-ochre', active);
    }
    if (cta) {
      cta.textContent = active ? 'Manage membership' : 'Join Gaviom+';
      cta.href = active ? '#payments' : '/checkout.html?plan=monthly';
    }
  }

  function renderOrders() {
    var list = $('[data-account-tickets-list]');
    var empty = $('[data-account-tickets-empty]');
    if (!list) return;

    list.innerHTML = '';
    if (!state.orders.length) {
      if (empty) empty.hidden = false;
      return;
    }
    if (empty) empty.hidden = true;

    state.orders.forEach(function (order) {
      var info = describeOrder(order);
      var li = document.createElement('li');
      li.className = 'account-order-item';
      li.innerHTML =
        '<div class="account-order-item__main">' +
        '<p class="account-order-item__title">' + info.title + '</p>' +
        '<p class="account-order-item__meta font-mono">' + formatDate(order.created_at) + ' · ' + (order.status || 'paid') + '</p>' +
        '</div>' +
        '<p class="account-order-item__amount font-display">' + formatMoney(order.amount_total, order.currency) + '</p>';
      list.appendChild(li);
    });
  }

  function renderStats() {
    var ticketTotal = state.entries.reduce(function (sum, entry) {
      return sum + (parseInt(entry.quantity, 10) || 0);
    }, 0);

    var statTickets = $('[data-account-stat-tickets]');
    var statOrders = $('[data-account-stat-orders]');

    if (statTickets) statTickets.textContent = String(ticketTotal);
    if (statOrders) statOrders.textContent = String(state.orders.length);
    renderMembership();
  }

  function renderRedeemed() {
    var list = $('[data-account-redeemed-list]');
    if (!list) return;
    list.innerHTML = '';
    if (!state.promos.length) return;
    state.promos.forEach(function (entry) {
      var li = document.createElement('li');
      li.textContent = entry.code + ' · ' + entry.status + ' · ' + formatDate(entry.created_at);
      list.appendChild(li);
    });
  }

  async function saveProfile(ev) {
    ev.preventDefault();
    var form = ev.target;
    var client = window.GaviomAuth.getClient();
    var userId = state.session.user.id;

    var payload = {
      first_name: $('#profile-first').value.trim(),
      last_name: $('#profile-last').value.trim(),
      state: $('#profile-state').value,
      marketing_opt_in: $('[data-profile-marketing]').checked,
    };

    var btn = form.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      var result = await client.from('users').update(payload).eq('id', userId).select().maybeSingle();
      if (result.error) throw result.error;
      state.profile = result.data || Object.assign({}, state.profile || {}, payload);
      await client.auth.updateUser({
        data: {
          first_name: payload.first_name,
          last_name: payload.last_name,
          state: payload.state,
          marketing_opt_in: payload.marketing_opt_in,
        },
      });
      renderUserHeader();
      showAlert('Profile saved.', 'success');
    } catch (err) {
      showAlert(window.GaviomAuth.friendlyAuthError(err), 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function uploadAvatar(file) {
    if (!file || !state.session) return;
    if (file.size > 2 * 1024 * 1024) {
      showAlert('Photo must be under 2 MB.', 'error');
      return;
    }

    var client = window.GaviomAuth.getClient();
    var userId = state.session.user.id;
    var ext = (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '') || 'jpg';
    var path = userId + '/avatar.' + ext;

    showAlert('Uploading photo…', 'success');

    try {
      var upload = await client.storage.from('avatars').upload(path, file, { upsert: true, contentType: file.type });
      if (upload.error) throw upload.error;

      var pub = client.storage.from('avatars').getPublicUrl(path);
      var url = pub.data.publicUrl + '?t=' + Date.now();

      var update = await client.from('users').update({ avatar_url: url }).eq('id', userId);
      if (update.error) throw update.error;

      state.profile = state.profile || {};
      state.profile.avatar_url = url;
      renderUserHeader();
      showAlert('Profile photo updated.', 'success');
    } catch (err) {
      showAlert(err.message || 'Could not upload photo. Run supabase-account-setup.sql for storage.', 'error');
    }
  }

  async function openBillingPortal() {
    if (!state.accessToken) return;
    var btn = $('[data-account-billing-portal]');
    if (btn) btn.disabled = true;
    try {
      var res = await fetch('/api/account/billing-portal', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + state.accessToken },
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) throw new Error(data.error || 'Could not open billing portal');
      window.location.href = data.url;
    } catch (err) {
      showAlert(err.message, 'error');
    } finally {
      if (btn) btn.disabled = false;
    }
  }

  async function sendPasswordReset() {
    var email = state.session.user.email;
    if (!email) return;
    try {
      var client = window.GaviomAuth.getClient();
      var result = await client.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + '/signin.html',
      });
      if (result.error) throw result.error;
      showAlert('Password reset email sent.', 'success');
    } catch (err) {
      showAlert(window.GaviomAuth.friendlyAuthError(err), 'error');
    }
  }

  function bindForms() {
    var profileForm = $('[data-account-profile-form]');
    if (profileForm) profileForm.addEventListener('submit', saveProfile);

    var avatarInput = $('[data-account-avatar-input]');
    if (avatarInput) {
      avatarInput.addEventListener('change', function () {
        if (avatarInput.files && avatarInput.files[0]) uploadAvatar(avatarInput.files[0]);
      });
    }

    var redeemForm = $('[data-account-redeem-form]');
    if (redeemForm) {
      redeemForm.addEventListener('submit', async function (ev) {
        ev.preventDefault();
        var code = ($('#redeem-code') || {}).value || '';
        code = code.trim().toUpperCase();
        if (!code) {
          showAlert('Enter a promo code.', 'error');
          return;
        }
        try {
          var client = window.GaviomAuth.getClient();
          var userId = state.session.user.id;
          var result = await client.from('promo_redemptions').insert({
            user_id: userId,
            code: code,
            status: 'saved',
          });
          if (result.error) {
            if (result.error.code === '23505') {
              showAlert('Code already saved to your account.', 'success');
            } else {
              throw result.error;
            }
          } else {
            showAlert('Promo code saved to your account.', 'success');
          }
          await loadPromos(client);
          redeemForm.reset();
        } catch (err) {
          showAlert(err.message || 'Could not save promo code.', 'error');
        }
      });
    }

    var copyBtn = $('[data-account-copy-promo]');
    if (copyBtn) {
      copyBtn.addEventListener('click', function () {
        var code = ($('[data-account-promo-code]') || {}).textContent || '';
        if (navigator.clipboard && code) {
          navigator.clipboard.writeText(code).then(function () {
            showAlert('Code copied.', 'success');
          });
        }
      });
    }

    var billingBtn = $('[data-account-billing-portal]');
    if (billingBtn) billingBtn.addEventListener('click', openBillingPortal);

    var resetBtn = $('[data-account-reset-password]');
    if (resetBtn) resetBtn.addEventListener('click', sendPasswordReset);

    $$('[data-account-signout]').forEach(function (btn) {
      btn.addEventListener('click', async function () {
        btn.disabled = true;
        try {
          await window.GaviomAuth.signOut();
          window.location.href = '/signin.html';
        } catch (err) {
          btn.disabled = false;
          showAlert(window.GaviomAuth.friendlyAuthError(err), 'error');
        }
      });
    });
  }

  async function init() {
    if (!document.body.dataset.accountPage) return;

    var session = await window.GaviomAuth.requireSession('/account.html');
    if (!session) return;

    state.session = session;
    state.accessToken = session.access_token;

    bindNav();
    bindForms();

    try {
      var client = window.GaviomAuth.getClient();
      await loadProfile(client);
      await Promise.all([loadOrders(), loadEntries(client), loadMembership(client), loadPromos(client)]);
    } catch (err) {
      showAlert(window.GaviomAuth.friendlyAuthError(err), 'error');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
