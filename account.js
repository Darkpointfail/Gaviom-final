(function () {
  'use strict';

  var PRIZE_LABELS = {
    msc: 'MSC Cruise · 7 Nights',
    diving: 'Scuba Discovery · Cozumel',
    iphone: 'iPhone 17 Pro Max',
    vegas: '5-Star Weekend · Las Vegas or Miami',
    'membership-pool': 'Gaviom+ monthly pool',
  };

  var DRAW_LABELS = {
    'founding-2026-09': 'Founding draw · Sep 6, 2026',
  };

  var FOUNDING_DRAW_DATE = new Date('2026-09-06T20:00:00-04:00');

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

  function formatDateShort(iso) {
    if (!iso) return '—';
    try {
      return new Intl.DateTimeFormat('en-US', { dateStyle: 'medium' }).format(new Date(iso));
    } catch (e) {
      return iso;
    }
  }

  function promoFromUserId(id) {
    var raw = (id || '').replace(/-/g, '').slice(0, 8).toUpperCase();
    return 'GAVIOM-' + raw;
  }

  function prizeLabel(id) {
    return PRIZE_LABELS[id] || id || 'Sweepstakes';
  }

  function drawLabel(id) {
    return DRAW_LABELS[id] || id || 'Draw';
  }

  function statusBadge(status) {
    var s = (status || 'confirmed').toLowerCase();
    var cls = 'acct-pill--confirmed';
    if (s === 'pending') cls = 'acct-pill--pending';
    if (s === 'paid') cls = 'acct-pill--paid';
    return '<span class="acct-pill ' + cls + '">' + s + '</span>';
  }

  function parseHashSection() {
    var hash = (window.location.hash || '').replace('#', '');
    var allowed = ['profile', 'tickets', 'draws', 'membership', 'payments', 'promos', 'help', 'security'];
    return allowed.indexOf(hash) >= 0 ? hash : '';
  }

  function setActiveNav(id) {
    $$('[data-account-nav]').forEach(function (link) {
      link.classList.toggle('is-active', link.getAttribute('data-account-nav') === id);
    });
  }

  function scrollToSection(id) {
    if (!id) return;
    var el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActiveNav(id);
  }

  function bindScrollSpy() {
    if (!('IntersectionObserver' in window)) return;
    var sections = $$('[data-account-section]');
    if (!sections.length) return;

    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var id = entry.target.id;
            setActiveNav(id);
            if (history.replaceState) {
              history.replaceState(null, '', '#' + id);
            }
          }
        });
      },
      { rootMargin: '-40% 0px -50% 0px', threshold: 0 }
    );

    sections.forEach(function (section) {
      observer.observe(section);
    });
  }

  function bindNav() {
    $$('[data-account-nav]').forEach(function (link) {
      link.addEventListener('click', function (ev) {
        ev.preventDefault();
        var id = link.getAttribute('data-account-nav');
        history.replaceState(null, '', '#' + id);
        scrollToSection(id);
      });
    });

    window.addEventListener('hashchange', function () {
      scrollToSection(parseHashSection());
    });

    var initial = parseHashSection();
    if (initial) scrollToSection(initial);
    bindScrollSpy();
  }

  function bindGotoOrders() {
    var btn = $('[data-account-goto-orders]');
    if (!btn) return;
    btn.addEventListener('click', function () {
      scrollToSection('tickets');
      $$('[data-account-tickets-tab]').forEach(function (b) {
        var active = b.getAttribute('data-account-tickets-tab') === 'orders';
        b.classList.toggle('is-active', active);
        b.setAttribute('aria-selected', active ? 'true' : 'false');
      });
      $$('[data-account-tickets-panel]').forEach(function (panel) {
        var active = panel.getAttribute('data-account-tickets-panel') === 'orders';
        panel.hidden = !active;
        panel.classList.toggle('is-active', active);
      });
    });
  }

  function bindTicketTabs() {
    $$('[data-account-tickets-tab]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var tab = btn.getAttribute('data-account-tickets-tab');
        $$('[data-account-tickets-tab]').forEach(function (b) {
          var active = b.getAttribute('data-account-tickets-tab') === tab;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        $$('[data-account-tickets-panel]').forEach(function (panel) {
          var active = panel.getAttribute('data-account-tickets-panel') === tab;
          panel.hidden = !active;
          panel.classList.toggle('is-active', active);
        });
      });
    });
  }

  function syncAvatars(avatarUrl, letter) {
    $$('[data-account-avatar]').forEach(function (img) {
      if (avatarUrl) {
        img.src = avatarUrl;
        img.hidden = false;
      } else {
        img.removeAttribute('src');
        img.hidden = true;
      }
    });
    $$('[data-account-avatar-fallback]').forEach(function (fb) {
      fb.textContent = letter;
      fb.hidden = !!avatarUrl;
    });
  }

  function renderUserHeader() {
    var user = state.session.user;
    var meta = user.user_metadata || {};
    var first = state.profile && state.profile.first_name ? state.profile.first_name : meta.first_name;
    var last = state.profile && state.profile.last_name ? state.profile.last_name : meta.last_name;
    var email = user.email || '';
    var letter = initials(first, last, email);

    var nameEl = $('[data-account-name]');
    var memberSince = $('[data-account-member-since]');

    if (nameEl) {
      nameEl.textContent = [first, last].filter(Boolean).join(' ') || 'Gaviom member';
    }

    var since = (state.profile && state.profile.created_at) || user.created_at;
    if (memberSince && since) {
      memberSince.textContent = formatDateShort(since);
    }

    var avatarUrl = state.profile && state.profile.avatar_url;
    syncAvatars(avatarUrl, letter);

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
    renderDraws();
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
        return item.qty + ' ticket' + (item.qty === 1 ? '' : 's') + ' · ' + prizeLabel(item.prizeId);
      });
      var totalTickets = meta.items.reduce(function (sum, item) { return sum + (parseInt(item.qty, 10) || 0); }, 0);
      return { title: lines.join(' · '), detail: 'Pre-order', tickets: totalTickets };
    }
    return { title: 'Gaviom purchase', detail: order.mode || 'Order', tickets: null };
  }

  function renderEntries() {
    var tbody = $('[data-account-entries-list]');
    var empty = $('[data-account-entries-empty]');
    var wrap = $('[data-account-entries-table-wrap]');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!state.entries.length) {
      if (empty) empty.hidden = false;
      if (wrap) wrap.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = false;

    state.entries.forEach(function (entry) {
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><span class="acct-table__title">' + prizeLabel(entry.prize_id) + '</span></td>' +
        '<td><strong>' + entry.quantity + '</strong></td>' +
        '<td class="acct-table__meta">' + drawLabel(entry.draw_id) + '</td>' +
        '<td class="acct-table__meta">' + formatDateShort(entry.created_at) + '</td>' +
        '<td>' + statusBadge(entry.status) + '</td>';
      tbody.appendChild(tr);
    });
  }

  function renderDraws() {
    var list = $('[data-account-draws-list]');
    var empty = $('[data-account-draws-empty]');
    if (!list) return;

    var now = Date.now();
    var pastEntries = state.entries.filter(function (entry) {
      if (entry.status === 'void') return true;
      return now > FOUNDING_DRAW_DATE.getTime();
    });

    list.innerHTML = '';
    if (!pastEntries.length) {
      if (empty) empty.hidden = false;
      list.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    list.hidden = false;

    pastEntries.forEach(function (entry) {
      var li = document.createElement('li');
      li.className = 'acct-timeline__item';
      li.innerHTML =
        '<span class="acct-timeline__dot" aria-hidden="true"></span>' +
        '<article class="acct-timeline__card">' +
        '<p class="acct-timeline__prize">' + prizeLabel(entry.prize_id) + '</p>' +
        '<div class="acct-timeline__meta">' +
        '<span>' + drawLabel(entry.draw_id) + '</span>' +
        '<span>' + entry.quantity + ' ticket' + (entry.quantity === 1 ? '' : 's') + '</span>' +
        '<span>' + formatDateShort(entry.created_at) + '</span>' +
        statusBadge(entry.status) +
        '</div></article>';
      list.appendChild(li);
    });
  }

  function renderMembership() {
    var m = state.membership;
    var badge = $('[data-account-membership-badge]');
    var cta = $('[data-account-membership-cta]');
    var manage = $('[data-account-membership-manage]');
    var cancel = $('[data-account-membership-cancel]');
    var renewal = $('[data-account-membership-renewal]');

    var active = m && (m.status === 'active' || m.status === 'trialing');
    if (badge) {
      badge.textContent = active ? 'Active' : 'Not subscribed';
      badge.classList.toggle('acct-pill--active', active);
    }
    if (renewal) {
      if (active && m.current_period_end) {
        renewal.textContent = 'Renews ' + formatDateShort(m.current_period_end);
        renewal.hidden = false;
      } else {
        renewal.hidden = true;
        renewal.textContent = '';
      }
    }
    if (cta) {
      cta.hidden = active;
      cta.textContent = 'Join Gaviom+';
      cta.href = '/checkout.html?plan=monthly';
      cta.onclick = null;
    }
    if (manage) manage.hidden = !active;
    if (cancel) cancel.hidden = !active;
  }

  function renderOrders() {
    var tbody = $('[data-account-tickets-list]');
    var empty = $('[data-account-tickets-empty]');
    var wrap = $('[data-account-orders-table-wrap]');
    if (!tbody) return;

    tbody.innerHTML = '';
    if (!state.orders.length) {
      if (empty) empty.hidden = false;
      if (wrap) wrap.hidden = true;
      return;
    }
    if (empty) empty.hidden = true;
    if (wrap) wrap.hidden = false;

    state.orders.forEach(function (order) {
      var info = describeOrder(order);
      var tr = document.createElement('tr');
      tr.innerHTML =
        '<td><span class="acct-table__title">' + info.title + '</span></td>' +
        '<td class="acct-table__amount">' + formatMoney(order.amount_total, order.currency) + '</td>' +
        '<td class="acct-table__meta">' + formatDateShort(order.created_at) + '</td>' +
        '<td>' + statusBadge(order.status || 'paid') + '</td>';
      tbody.appendChild(tr);
    });
  }

  function renderStats() {
    renderMembership();
  }

  function renderRedeemed() {
    var container = $('[data-account-redeemed-list]');
    if (!container) return;
    container.innerHTML = '';
    if (!state.promos.length) {
      container.hidden = true;
      return;
    }
    container.hidden = false;
    state.promos.forEach(function (entry) {
      var chip = document.createElement('span');
      chip.className = 'acct-chip';
      chip.textContent = entry.code + ' · ' + entry.status;
      container.appendChild(chip);
    });
  }

  async function saveProfile(ev) {
    ev.preventDefault();
    var client = window.GaviomAuth.getClient();
    var userId = state.session.user.id;

    var payload = {
      first_name: $('#profile-first').value.trim(),
      last_name: $('#profile-last').value.trim(),
      state: $('#profile-state').value,
      marketing_opt_in: $('[data-profile-marketing]').checked,
    };

    var btn = ev.target.querySelector('[type="submit"]');
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
      showAlert(err.message || 'Could not upload photo. Run supabase-full-setup.sql for storage.', 'error');
    }
  }

  async function openBillingPortal() {
    if (!state.accessToken) return;
    $$('[data-account-billing-portal]').forEach(function (btn) { btn.disabled = true; });
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
      $$('[data-account-billing-portal]').forEach(function (btn) { btn.disabled = false; });
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

  function bindAvatarInputs() {
    var input = $('[data-account-avatar-input]');
    if (input) {
      input.addEventListener('change', function () {
        if (input.files && input.files[0]) uploadAvatar(input.files[0]);
      });
    }
  }

  function bindForms() {
    var profileForm = $('[data-account-profile-form]');
    if (profileForm) profileForm.addEventListener('submit', saveProfile);

    bindAvatarInputs();

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

    $$('[data-account-billing-portal]').forEach(function (btn) {
      btn.addEventListener('click', openBillingPortal);
    });

    var manageBtn = $('[data-account-membership-manage]');
    if (manageBtn) manageBtn.addEventListener('click', openBillingPortal);

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
    bindTicketTabs();
    bindGotoOrders();
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
