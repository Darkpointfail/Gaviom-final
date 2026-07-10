(function () {
  'use strict';

  function qs(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qsa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  /* FAQ accordion */
  function initFaq() {
    qsa('.cr-faq__item').forEach(function (item) {
      var btn = qs('.cr-faq__q', item);
      if (!btn) return;
      btn.addEventListener('click', function () {
        var open = item.classList.contains('is-open');
        qsa('.cr-faq__item').forEach(function (i) {
          i.classList.remove('is-open');
          qs('.cr-faq__q', i).setAttribute('aria-expanded', 'false');
        });
        if (!open) {
          item.classList.add('is-open');
          btn.setAttribute('aria-expanded', 'true');
        }
      });
    });
  }

  /* Revenue calculator */
  function initRevenueCalc() {
    var slider = qs('[data-cr-tickets-slider]');
    if (!slider) return;

    var prizeVal = 5000;
    var ticketPrice = 10;
    var feePct = 0.2;

    function fmt(n) {
      return '$' + n.toLocaleString('en-US');
    }

    function update() {
      var tickets = parseInt(slider.value, 10) || 1000;
      var revenue = tickets * ticketPrice;
      var fee = Math.round(revenue * feePct);
      var creator = revenue - fee;

      var elTickets = qs('[data-cr-calc-tickets]');
      var elRevenue = qs('[data-cr-calc-revenue]');
      var elFee = qs('[data-cr-calc-fee]');
      var elCreator = qs('[data-cr-calc-creator]');
      var elSliderLabel = qs('[data-cr-slider-label]');

      if (elTickets) elTickets.textContent = tickets.toLocaleString('en-US');
      if (elRevenue) elRevenue.textContent = fmt(revenue);
      if (elFee) elFee.textContent = fmt(fee);
      if (elCreator) elCreator.textContent = fmt(creator);
      if (elSliderLabel) elSliderLabel.textContent = tickets.toLocaleString('en-US') + ' tickets';
    }

    slider.addEventListener('input', update);
    update();
  }

  /* Scroll reveal */
  function initReveal() {
    var els = qsa('.cr-reveal');
    if (!els.length) return;
    if (!('IntersectionObserver' in window)) {
      els.forEach(function (el) {
        el.classList.add('is-visible');
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add('is-visible');
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -40px 0px' }
    );
    els.forEach(function (el) {
      io.observe(el);
    });
  }

  /* Application form */
  function initApplyForm() {
    var form = qs('[data-cr-apply-form]');
    if (!form) return;

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var required = qsa('[required]', form);
      var valid = true;
      required.forEach(function (field) {
        if (!field.value.trim()) {
          valid = false;
          field.style.borderColor = '#c44';
        } else {
          field.style.borderColor = '';
        }
      });
      if (!valid) return;

      var success = qs('[data-cr-apply-success]');
      var card = qs('[data-cr-apply-card]');
      if (card) card.hidden = true;
      if (success) success.hidden = false;
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }

  /* Pre-fill apply form from signed-in account */
  function initApplyFromAccount() {
    var form = qs('[data-cr-apply-form]');
    if (!form) return;

    var params = new URLSearchParams(window.location.search || '');
    var fromAccount = params.get('from') === 'account';
    var backLink = qs('[data-cr-apply-back-account]');
    var cancelAccount = qs('[data-cr-apply-cancel-account]');
    var cancelDefault = qs('[data-cr-apply-cancel-default]');
    if (fromAccount) {
      if (backLink) backLink.hidden = false;
      if (cancelAccount) cancelAccount.hidden = false;
      if (cancelDefault) cancelDefault.hidden = true;
    }

    function fillFromProfile(profile, user) {
      var nameInput = qs('#cr_name', form);
      var emailInput = qs('#cr_email', form);
      var creatorNameInput = qs('#cr_creator_name', form);
      var countrySelect = qs('#cr_country', form);

      if (emailInput && user && user.email) emailInput.value = user.email;
      if (nameInput && profile) {
        var full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
        if (full) nameInput.value = full;
      }
      if (creatorNameInput && profile) {
        var display = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
        if (display && !creatorNameInput.value) creatorNameInput.value = display;
      }
      if (countrySelect && !countrySelect.value) countrySelect.value = 'US';
    }

    function gateAndPrefill() {
      if (!window.GaviomAuth) return;
      window.GaviomAuth.waitForSession(4000).then(function (session) {
        if (!session || !session.user) {
          if (fromAccount) {
            window.location.replace(
              '/signin.html?next=' + encodeURIComponent('/creators/apply?from=account')
            );
          }
          return;
        }
        var user = session.user;
        var meta = user.user_metadata || {};
        fillFromProfile(
          {
            first_name: meta.first_name || meta.given_name || '',
            last_name: meta.last_name || meta.family_name || '',
          },
          user
        );

        if (typeof window.GaviomAuth.getClient === 'function') {
          var client = window.GaviomAuth.getClient();
          if (client && user.id) {
            client
              .from('profiles')
              .select('first_name,last_name,email')
              .eq('id', user.id)
              .maybeSingle()
              .then(function (result) {
                if (result.data) fillFromProfile(result.data, user);
              })
              .catch(function () {});
          }
        }
      });
    }

    if (window.GaviomAuth) {
      gateAndPrefill();
    } else {
      window.addEventListener('load', gateAndPrefill, { once: true });
    }
  }

  /* Dashboard navigation */
  function initDashboard() {
    var root = qs('[data-cr-dashboard]');
    if (!root) return;

    var links = qsa('[data-cr-dash-nav]', root);
    var panels = qsa('[data-cr-dash-panel]', root);

    function showPanel(id) {
      panels.forEach(function (p) {
        p.classList.toggle('is-active', p.getAttribute('data-cr-dash-panel') === id);
      });
      links.forEach(function (l) {
        l.classList.toggle('is-active', l.getAttribute('data-cr-dash-nav') === id);
      });
    }

    links.forEach(function (link) {
      link.addEventListener('click', function (e) {
        e.preventDefault();
        showPanel(link.getAttribute('data-cr-dash-nav'));
      });
    });

    var hash = (location.hash || '#overview').replace('#', '');
    if (panels.some(function (p) { return p.getAttribute('data-cr-dash-panel') === hash; })) {
      showPanel(hash);
    }
  }

  /* Create giveaway wizard */
  function initWizard() {
    var wizard = qs('[data-cr-wizard]');
    if (!wizard) return;

    var steps = qsa('[data-cr-wizard-step]', wizard);
    var panes = qsa('[data-cr-wizard-pane]', wizard);
    var btnPrev = qs('[data-cr-wizard-prev]', wizard);
    var btnNext = qs('[data-cr-wizard-next]', wizard);
    var btnSubmit = qs('[data-cr-wizard-submit]', wizard);
    var current = 0;

    function syncPreview() {
      var title = (qs('[name="gw_title"]', wizard) || {}).value || 'Your Giveaway Title';
      var prize = (qs('[name="gw_prize"]', wizard) || {}).value || 'Prize name';
      var price = (qs('[name="gw_ticket_price"]', wizard) || {}).value || '10';
      var previewTitle = qs('[data-cr-preview-title]');
      var previewPrize = qs('[data-cr-preview-prize]');
      var previewPrice = qs('[data-cr-preview-price]');
      if (previewTitle) previewTitle.textContent = title;
      if (previewPrize) previewPrize.textContent = prize;
      if (previewPrice) previewPrice.textContent = '$' + price + ' per entry';
    }

    qsa('input, textarea, select', wizard).forEach(function (el) {
      el.addEventListener('input', syncPreview);
    });

    function goTo(idx) {
      current = Math.max(0, Math.min(idx, steps.length - 1));
      steps.forEach(function (s, i) {
        s.classList.toggle('is-active', i === current);
        s.classList.toggle('is-done', i < current);
      });
      panes.forEach(function (p, i) {
        p.classList.toggle('is-active', i === current);
      });
      if (btnPrev) btnPrev.hidden = current === 0;
      if (btnNext) btnNext.hidden = current === steps.length - 1;
      if (btnSubmit) btnSubmit.hidden = current !== steps.length - 1;
      if (current === steps.length - 2) syncPreview();
    }

    steps.forEach(function (step, i) {
      step.addEventListener('click', function () {
        if (i <= current) goTo(i);
      });
    });

    if (btnPrev) {
      btnPrev.addEventListener('click', function () {
        goTo(current - 1);
      });
    }
    if (btnNext) {
      btnNext.addEventListener('click', function () {
        goTo(current + 1);
      });
    }
    if (btnSubmit) {
      btnSubmit.addEventListener('click', function () {
        var submitted = qs('[data-cr-wizard-submitted]', wizard);
        var formArea = qs('[data-cr-wizard-form]', wizard);
        if (formArea) formArea.hidden = true;
        if (submitted) submitted.hidden = false;
      });
    }

    goTo(0);
  }

  /* Giveaway countdown */
  function initCountdown() {
    var root = qs('[data-cr-countdown]');
    if (!root) return;

    var end = root.getAttribute('data-cr-countdown-end');
    if (!end) return;
    var target = new Date(end).getTime();

    function pad(n) {
      return n < 10 ? '0' + n : String(n);
    }

    function tick() {
      var now = Date.now();
      var diff = Math.max(0, target - now);
      var d = Math.floor(diff / 86400000);
      var h = Math.floor((diff % 86400000) / 3600000);
      var m = Math.floor((diff % 3600000) / 60000);
      var s = Math.floor((diff % 60000) / 1000);

      var elD = qs('[data-cr-cd-d]', root);
      var elH = qs('[data-cr-cd-h]', root);
      var elM = qs('[data-cr-cd-m]', root);
      var elS = qs('[data-cr-cd-s]', root);
      if (elD) elD.textContent = pad(d);
      if (elH) elH.textContent = pad(h);
      if (elM) elM.textContent = pad(m);
      if (elS) elS.textContent = pad(s);

      if (diff > 0) requestAnimationFrame(function () {
        setTimeout(tick, 1000);
      });
    }

    tick();
  }

  /* Hero card progress animation */
  function initHeroProgress() {
    var fill = qs('[data-cr-hero-progress]');
    if (!fill) return;
    setTimeout(function () {
      fill.style.width = '68%';
    }, 400);
  }

  function init() {
    initFaq();
    initRevenueCalc();
    initReveal();
    initApplyForm();
    initApplyFromAccount();
    initDashboard();
    initWizard();
    initCountdown();
    initHeroProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
