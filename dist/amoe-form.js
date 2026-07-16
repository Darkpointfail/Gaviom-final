(function () {
  'use strict';

  var PRIZE_OPTIONS = [
    { id: 'msc', label: 'Sweepstakes #1 — MSC Cruise', title: 'MSC Cruise · 7 Nights' },
    { id: 'diving', label: 'Sweepstakes #2 — Cozumel Diving', title: 'Scuba Discovery · Cozumel' },
    { id: 'vegas', label: 'Sweepstakes #3 — Las Vegas', title: '5-Star Weekend · Las Vegas or Miami' },
    { id: 'iphone', label: 'Sweepstakes #4 — iPhone 17 Pro Max', title: 'iPhone 17 Pro Max' },
  ];

  var US_STATES = [
    ['AL', 'Alabama'], ['AK', 'Alaska'], ['AZ', 'Arizona'], ['AR', 'Arkansas'], ['CA', 'California'],
    ['CO', 'Colorado'], ['CT', 'Connecticut'], ['DE', 'Delaware'], ['DC', 'District of Columbia'],
    ['FL', 'Florida'], ['GA', 'Georgia'], ['HI', 'Hawaii'], ['ID', 'Idaho'], ['IL', 'Illinois'],
    ['IN', 'Indiana'], ['IA', 'Iowa'], ['KS', 'Kansas'], ['KY', 'Kentucky'], ['LA', 'Louisiana'],
    ['ME', 'Maine'], ['MD', 'Maryland'], ['MA', 'Massachusetts'], ['MI', 'Michigan'], ['MN', 'Minnesota'],
    ['MS', 'Mississippi'], ['MO', 'Missouri'], ['MT', 'Montana'], ['NE', 'Nebraska'], ['NV', 'Nevada'],
    ['NH', 'New Hampshire'], ['NJ', 'New Jersey'], ['NM', 'New Mexico'], ['NY', 'New York'],
    ['NC', 'North Carolina'], ['ND', 'North Dakota'], ['OH', 'Ohio'], ['OK', 'Oklahoma'], ['OR', 'Oregon'],
    ['PA', 'Pennsylvania'], ['RI', 'Rhode Island'], ['SC', 'South Carolina'], ['SD', 'South Dakota'],
    ['TN', 'Tennessee'], ['TX', 'Texas'], ['UT', 'Utah'], ['VT', 'Vermont'], ['VA', 'Virginia'],
    ['WA', 'Washington'], ['WV', 'West Virginia'], ['WI', 'Wisconsin'], ['WY', 'Wyoming'],
  ];

  function $(sel, root) {
    return (root || document).querySelector(sel);
  }

  function showAlert(message, type) {
    var el = $('[data-amoe-alert]');
    if (!el) return;
    el.hidden = false;
    el.textContent = message;
    el.className = 'auth-alert' + (type === 'success' ? ' auth-alert--success' : type === 'error' ? ' auth-alert--error' : '');
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  function hideAlert() {
    var el = $('[data-amoe-alert]');
    if (el) el.hidden = true;
  }

  function prizeFromQuery() {
    var params = new URLSearchParams(location.search);
    var prize = (params.get('prize') || '').trim();
    if (prize && PRIZE_OPTIONS.some(function (p) { return p.id === prize; })) return prize;
    var sweepstakes = parseInt(params.get('sweepstakes') || '', 10);
    if (sweepstakes >= 1 && sweepstakes <= 4) {
      return PRIZE_OPTIONS[sweepstakes - 1].id;
    }
    return 'msc';
  }

  function populateStateSelect(select) {
    US_STATES.forEach(function (pair) {
      var opt = document.createElement('option');
      opt.value = pair[0];
      opt.textContent = pair[1];
      select.appendChild(opt);
    });
  }

  function updateContextLabels(prizeId) {
    var opt = PRIZE_OPTIONS.find(function (p) { return p.id === prizeId; }) || PRIZE_OPTIONS[0];
    document.querySelectorAll('[data-fe-sweepstakes-label]').forEach(function (el) {
      el.textContent = opt.label.split(' — ')[0];
    });
    document.querySelectorAll('[data-fe-sweepstakes-id]').forEach(function (el) {
      var idx = PRIZE_OPTIONS.findIndex(function (p) { return p.id === prizeId; });
      el.textContent = '#' + (idx >= 0 ? idx + 1 : 1);
    });
    var titleEl = $('[data-amoe-prize-title]');
    if (titleEl) titleEl.textContent = opt.title;
  }

  function showSuccess(result) {
    var formWrap = $('[data-amoe-form-wrap]');
    var success = $('[data-amoe-success]');
    if (formWrap) formWrap.hidden = true;
    if (success) {
      success.hidden = false;
      var refEl = $('[data-amoe-ref]');
      if (refEl && result.referenceId) {
        refEl.textContent = String(result.referenceId).slice(0, 8).toUpperCase();
      }
      var msgEl = $('[data-amoe-success-msg]');
      if (msgEl) msgEl.textContent = result.message || 'Check your email for confirmation.';
    }
    showAlert(result.message || 'Free entry confirmed.', 'success');
  }

  async function handleSubmit(ev) {
    ev.preventDefault();
    hideAlert();

    var form = ev.target;
    var submitBtn = form.querySelector('[type="submit"]');
    if (submitBtn) submitBtn.disabled = true;

    var fd = new FormData(form);
    var payload = {
      prize_id: fd.get('prize_id'),
      legal_name: fd.get('legal_name'),
      address_line1: fd.get('address_line1'),
      address_line2: fd.get('address_line2'),
      city: fd.get('city'),
      state: fd.get('state'),
      postal_code: fd.get('postal_code'),
      email: fd.get('email'),
      phone: fd.get('phone'),
      certify_eligible: fd.get('certify_eligible') ? 'on' : '',
      certify_rules: fd.get('certify_rules') ? 'on' : '',
      website: fd.get('website') || '',
    };

    try {
      var res = await fetch('/api/amoe-submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      var data = await res.json().catch(function () { return {}; });
      if (!res.ok) {
        throw new Error(data.error || 'Could not submit free entry.');
      }
      showSuccess(data);
    } catch (err) {
      showAlert(err.message || 'Could not submit free entry.', 'error');
      if (submitBtn) submitBtn.disabled = false;
    }
  }

  function init() {
    if (!/\/free-entry\.html$/i.test(location.pathname)) return;

    var prizeSelect = $('[data-amoe-prize-select]');
    var stateSelect = $('[data-amoe-state]');
    var form = $('[data-amoe-form]');

    if (prizeSelect) {
      var selected = prizeFromQuery();
      prizeSelect.value = selected;
      updateContextLabels(selected);
      prizeSelect.addEventListener('change', function () {
        updateContextLabels(prizeSelect.value);
      });
    }

    if (stateSelect) populateStateSelect(stateSelect);
    if (form) form.addEventListener('submit', handleSubmit);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
