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

  function isAccountPage() {
    return !!(document.body && 'accountPage' in document.body.dataset);
  }

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
    var allowed = ['profile', 'tickets', 'draws', 'membership', 'creator', 'payments', 'promos', 'help', 'security'];
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
    var values = profileFromState();
    var user = state.session.user;
    var letter = initials(values.first_name, values.last_name, values.email);

    var nameEl = $('[data-account-name]');
    var memberSince = $('[data-account-member-since]');

    if (nameEl) {
      nameEl.textContent = [values.first_name, values.last_name].filter(Boolean).join(' ') || 'Gaviom member';
    }

    var emailEl = $('[data-account-email]');
    if (emailEl) emailEl.textContent = values.email;

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

  function debugLog(label, detail) {
    var ctx =
      window.GaviomAuth && window.GaviomAuth.getDebugContext
        ? window.GaviomAuth.getDebugContext()
        : { isMobile: window.matchMedia('(max-width:768px)').matches, width: window.innerWidth };
    var payload = Object.assign({}, ctx, detail || {});
    if (window.GaviomAuth && window.GaviomAuth.log) {
      window.GaviomAuth.log('[Account] ' + label, payload);
      return;
    }
    if (window.location.search.indexOf('auth_debug=1') !== -1) {
      console.log('[Gaviom Account]', label, payload);
    }
  }

  var PROFILE_TABLE = 'profiles';

  function profileFromState() {
    var p = state.profile || {};
    var meta =
      (state.session && state.session.user && state.session.user.user_metadata) || {};
    return {
      first_name: p.first_name || meta.first_name || '',
      last_name: p.last_name || meta.last_name || '',
      email: p.email || (state.session && state.session.user && state.session.user.email) || '',
      date_of_birth: p.date_of_birth || meta.date_of_birth || '',
      state: p.state || meta.state || '',
      marketing_opt_in:
        typeof p.marketing_opt_in === 'boolean'
          ? p.marketing_opt_in
          : !!meta.marketing_opt_in,
    };
  }

  function fillProfileForm() {
    var values = profileFromState();

    var first = $('#profile-first');
    var last = $('#profile-last');
    var email = $('#profile-email');
    var dob = $('#profile-dob');
    var st = $('#profile-state');
    var marketing = $('[data-profile-marketing]');

    if (first) first.value = values.first_name;
    if (last) last.value = values.last_name;
    if (email) email.value = values.email;
    if (dob) dob.value = values.date_of_birth ? String(values.date_of_birth).slice(0, 10) : '';
    if (marketing) marketing.checked = !!values.marketing_opt_in;

    if (st) {
      if (window.GaviomAuth && window.GaviomAuth.fillStateSelect) {
        window.GaviomAuth.fillStateSelect(st, values.state);
      } else if (values.state) {
        st.value = values.state;
      }
    }
  }

  function ensureStateSelect() {
    var st = $('#profile-state');
    if (!st) return;
    if (window.GaviomAuth && window.GaviomAuth.fillStateSelect) {
      window.GaviomAuth.fillStateSelect(st);
      return;
    }
    if (st.options.length <= 1) {
      st.innerHTML =
        '<option value="" disabled selected>Select your state</option>' +
        '<option value="AL">Alabama (AL)</option><option value="AK">Alaska (AK)</option>' +
        '<option value="AZ">Arizona (AZ)</option><option value="AR">Arkansas (AR)</option>' +
        '<option value="CA">California (CA)</option><option value="CO">Colorado (CO)</option>' +
        '<option value="CT">Connecticut (CT)</option><option value="DE">Delaware (DE)</option>' +
        '<option value="FL">Florida (FL)</option><option value="GA">Georgia (GA)</option>' +
        '<option value="HI">Hawaii (HI)</option><option value="ID">Idaho (ID)</option>' +
        '<option value="IL">Illinois (IL)</option><option value="IN">Indiana (IN)</option>' +
        '<option value="IA">Iowa (IA)</option><option value="KS">Kansas (KS)</option>' +
        '<option value="KY">Kentucky (KY)</option><option value="LA">Louisiana (LA)</option>' +
        '<option value="ME">Maine (ME)</option><option value="MD">Maryland (MD)</option>' +
        '<option value="MA">Massachusetts (MA)</option><option value="MI">Michigan (MI)</option>' +
        '<option value="MN">Minnesota (MN)</option><option value="MS">Mississippi (MS)</option>' +
        '<option value="MO">Missouri (MO)</option><option value="MT">Montana (MT)</option>' +
        '<option value="NE">Nebraska (NE)</option><option value="NV">Nevada (NV)</option>' +
        '<option value="NH">New Hampshire (NH)</option><option value="NJ">New Jersey (NJ)</option>' +
        '<option value="NM">New Mexico (NM)</option><option value="NY">New York (NY)</option>' +
        '<option value="NC">North Carolina (NC)</option><option value="ND">North Dakota (ND)</option>' +
        '<option value="OH">Ohio (OH)</option><option value="OK">Oklahoma (OK)</option>' +
        '<option value="OR">Oregon (OR)</option><option value="PA">Pennsylvania (PA)</option>' +
        '<option value="RI">Rhode Island (RI)</option><option value="SC">South Carolina (SC)</option>' +
        '<option value="SD">South Dakota (SD)</option><option value="TN">Tennessee (TN)</option>' +
        '<option value="TX">Texas (TX)</option><option value="UT">Utah (UT)</option>' +
        '<option value="VT">Vermont (VT)</option><option value="VA">Virginia (VA)</option>' +
        '<option value="WA">Washington (WA)</option><option value="WV">West Virginia (WV)</option>' +
        '<option value="WI">Wisconsin (WI)</option><option value="WY">Wyoming (WY)</option>' +
        '<option value="DC">Washington DC (DC)</option>';
    }
  }

  function applySessionShell(session) {
    if (!session || !session.user) return;
    var email = session.user.email || '';
    var nameEl = $('[data-account-name]');
    var emailEl = $('[data-account-email]');
    var memberSince = $('[data-account-member-since]');
    if (emailEl && email) emailEl.textContent = email;
    if (nameEl && email) nameEl.textContent = email;
    if (memberSince && session.user.created_at) {
      memberSince.textContent = formatDateShort(session.user.created_at);
    }
    syncAvatars(null, initials('', '', email));
  }

  async function loadProfile(client) {
    if (!state.session || !state.session.user) return;

    var userId = state.session.user.id;
    debugLog('loadProfile:start', { userId: userId });

    try {
      await client.auth.getSession();

      var result = await client.from(PROFILE_TABLE).select('*').eq('id', userId).maybeSingle();
      if (!result.data && !result.error) {
        await new Promise(function (resolve) {
          setTimeout(resolve, 400);
        });
        result = await client.from(PROFILE_TABLE).select('*').eq('id', userId).maybeSingle();
      }

      if (result.error) {
        debugLog('loadProfile:rls-error', {
          code: result.error.code,
          message: result.error.message,
          hint: result.error.hint || null,
        });
        console.warn('[Gaviom account] profile load', result.error.message);
        showAlert(
          'Could not load profile (user ' + userId.slice(0, 8) + '…): ' + result.error.message,
          'error'
        );
      }

      debugLog('loadProfile:db-row', result.data || null);

      if (!result.data) {
        debugLog('loadProfile:missing', { userId: userId, profileInDb: false });
        state.profile = null;
        showAlert(
          'No profile row for ' +
            (state.session.user.email || userId) +
            '. In Supabase: Table Editor → profiles → check this user id exists.',
          'error'
        );
      } else {
        state.profile = result.data;
        debugLog('loadProfile:found', {
          userId: userId,
          profileInDb: true,
          hasFirstName: !!result.data.first_name,
          hasLastName: !!result.data.last_name,
          hasEmail: !!result.data.email,
          hasState: !!result.data.state,
        });
      }
    } catch (err) {
      console.error('[Gaviom account] loadProfile', err);
      showAlert(err.message || 'Profile load failed.', 'error');
    } finally {
      debugLog('loadProfile:done', state.profile);
      renderUserHeader();
      fillProfileForm();
      document.body.dataset.accountReady = '1';
    }
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
      cta.href = '/gaviom-plus-checkout.html';
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

    var newEmail = ($('#profile-email').value || '').trim().toLowerCase();
    var currentEmail = (profileFromState().email || '').trim().toLowerCase();
    var stateCode = $('#profile-state').value;

    if (!stateCode) {
      showAlert('Select your US state to continue.', 'error');
      var stEl = $('#profile-state');
      if (stEl) stEl.focus();
      return;
    }

    var payload = {
      first_name: $('#profile-first').value.trim(),
      last_name: $('#profile-last').value.trim(),
      state: stateCode,
      marketing_opt_in: $('[data-profile-marketing]').checked,
    };

    if (newEmail) payload.email = newEmail;

    var btn = ev.target.querySelector('[type="submit"]');
    if (btn) btn.disabled = true;

    try {
      var result = await client.from(PROFILE_TABLE).update(payload).eq('id', userId).select().maybeSingle();
      if (result.error) throw result.error;
      if (!result.data) {
        var insertPayload = Object.assign({ id: userId, email: currentEmail || state.session.user.email }, payload);
        var inserted = await client.from(PROFILE_TABLE).insert(insertPayload).select().maybeSingle();
        if (inserted.error) throw inserted.error;
        result.data = inserted.data;
      }
      state.profile = result.data || Object.assign({}, state.profile || {}, payload);

      var emailChanged = newEmail && newEmail !== currentEmail;
      if (emailChanged) {
        var emailResult = await client.auth.updateUser({ email: newEmail });
        if (emailResult.error) throw emailResult.error;
      }

      renderUserHeader();
      fillProfileForm();
      showAlert(
        emailChanged
          ? 'Profile saved. Check your new inbox to confirm the email change.'
          : 'Profile saved.',
        'success'
      );
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

      var update = await client.from(PROFILE_TABLE).update({ avatar_url: url }).eq('id', userId);
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
      await window.GaviomAuth.requestPasswordReset(email);
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

  async function handleSignOut(btn) {
    if (btn && btn.dataset.signoutBusy === '1') return;
    var label = btn ? btn.textContent : '';
    if (btn) {
      btn.dataset.signoutBusy = '1';
      btn.disabled = true;
      btn.textContent = 'Déconnexion…';
    }
    try {
      if (!window.GaviomAuth || !window.GaviomAuth.signOut) {
        throw new Error('Sign-out is unavailable. Refresh the page.');
      }
      await window.GaviomAuth.signOut();
      window.location.replace('/signin.html');
    } catch (err) {
      var msg =
        window.GaviomAuth && window.GaviomAuth.friendlyAuthError
          ? window.GaviomAuth.friendlyAuthError(err)
          : err.message || 'Could not sign out.';
      showAlert(msg, 'error');
      if (btn) {
        btn.dataset.signoutBusy = '0';
        btn.disabled = false;
        btn.textContent = label || 'Se déconnecter';
      }
    }
  }

  function bindSignOut() {
    document.addEventListener('click', function (ev) {
      var btn = ev.target.closest('[data-account-signout]');
      if (!btn) return;
      ev.preventDefault();
      ev.stopPropagation();
      handleSignOut(btn);
    });
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
  }

  async function init() {
    if (!isAccountPage()) return;

    debugLog('init:start', { href: window.location.href });

    if (!window.GaviomAuth) {
      showAlert('Auth failed to load. Disable ad blockers and refresh.', 'error');
      return;
    }

    ensureStateSelect();

    var session = null;
    try {
      if (window.GaviomAuth.waitForSession) {
        session = await window.GaviomAuth.waitForSession(12000);
      }
      if (!session && window.GaviomAuth.getSession) {
        session = await window.GaviomAuth.getSession();
      }
    } catch (err) {
      console.error('[Gaviom account] session', err);
      showAlert(window.GaviomAuth.friendlyAuthError(err), 'error');
      return;
    }

    if (!session || !session.user) {
      window.location.replace('/signin.html?next=' + encodeURIComponent('/account.html'));
      return;
    }

    if (window.GaviomAuth.syncSessionUser) {
      var syncedUser = await window.GaviomAuth.syncSessionUser();
      if (syncedUser) {
        session = Object.assign({}, session, { user: syncedUser });
        state.session = session;
      }
    } else if (window.GaviomAuth.refreshUser) {
      var refreshedUser = await window.GaviomAuth.refreshUser();
      if (refreshedUser) {
        session = Object.assign({}, session, { user: refreshedUser });
        state.session = session;
      }
    }

    if (window.GaviomAuth.isEmailConfirmed && !window.GaviomAuth.isEmailConfirmed(session.user)) {
      window.location.replace('/verify-email.html?verify=required&next=' + encodeURIComponent('/account.html'));
      return;
    }

    state.session = session;
    state.accessToken = session.access_token;
    applySessionShell(session);

    debugLog('init:session', {
      userId: session.user.id,
      email: session.user.email,
    });

    bindNav();
    bindTicketTabs();
    bindGotoOrders();
    bindForms();

    if (window.GaviomAuth.subscribe) {
      window.GaviomAuth.subscribe(function (nextSession) {
        if (!nextSession || !nextSession.user) return;
        state.session = nextSession;
        state.accessToken = nextSession.access_token;
        applySessionShell(nextSession);
        try {
          var subClient = window.GaviomAuth.getClient();
          loadProfile(subClient).catch(function (err) {
            debugLog('subscribe:profile-error', err.message);
          });
        } catch (err) {
          debugLog('subscribe:profile-error', err.message);
        }
      });
    }

    try {
      var client = window.GaviomAuth.getClient();
      await loadProfile(client);
      await Promise.all([loadOrders(), loadEntries(client), loadMembership(client), loadPromos(client)]);
    } catch (err) {
      console.error('[Gaviom account] init', err);
      showAlert(window.GaviomAuth.friendlyAuthError(err), 'error');
    }
  }

  function bootAccount() {
    if (!isAccountPage()) return;
    bindSignOut();
    init().catch(function (err) {
      console.error('[Gaviom account] boot', err);
      showAlert(err.message || 'Account page failed to start.', 'error');
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bootAccount);
  } else {
    bootAccount();
  }
})();
