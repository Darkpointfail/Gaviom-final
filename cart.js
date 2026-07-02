/**
 * Gaviom cart, localStorage, drawer, add-to-cart modal.
 * Ready for future Stripe integration via checkout.html.
 */
(function () {
  'use strict';

  var STORAGE_KEY = 'gaviom-cart-v1';

  var PRIZES = {
    msc: {
      id: 'msc',
      title: 'MSC Cruise · 7 Nights',
      url: '/prize.html',
      image: '/images/msc-cruise-hero.webp',
      draw: 'Draw September 6, 2026',
      odds: 6000,
      bundles: [
        { tickets: 1, price: 12 },
        { tickets: 5, price: 45 },
        { tickets: 20, price: 80 },
      ],
    },
    diving: {
      id: 'diving',
      title: 'Scuba Discovery · Cozumel',
      url: '/prize-diving.html',
      image: '/images/diving-turtle.webp',
      draw: 'Draw September 6, 2026',
      odds: 1000,
      bundles: [
        { tickets: 1, price: 12 },
        { tickets: 5, price: 45 },
        { tickets: 20, price: 80 },
      ],
    },
    iphone: {
      id: 'iphone',
      title: 'iPhone 17 Pro Max',
      url: '/prize-iphone.html',
      image: '/images/iphone-hero.webp',
      draw: 'Draw September 6, 2026',
      odds: 3000,
      bundles: [
        { tickets: 1, price: 7 },
        { tickets: 5, price: 28 },
        { tickets: 20, price: 50 },
      ],
    },
    vegas: {
      id: 'vegas',
      title: '5-Star Weekend · Las Vegas or Miami',
      url: '/prize-vegas.html',
      image: '/images/vegas-strip-mobile.webp',
      draw: 'Draw September 6, 2026',
      odds: 4800,
      bundles: [
        { tickets: 1, price: 10 },
        { tickets: 5, price: 40 },
        { tickets: 20, price: 70 },
      ],
    },
  };

  function fmt(n) {
    return '$' + parseFloat(n).toFixed(2);
  }

  function unitPrice(prize) {
    return prize.bundles[0].price / prize.bundles[0].tickets;
  }

  function linePrice(prize, qty) {
    var exact = prize.bundles.find(function (b) { return b.tickets === qty; });
    if (exact) return exact.price;
    return Math.round(qty * unitPrice(prize) * 100) / 100;
  }

  function loadCart() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      var data = JSON.parse(raw);
      return Array.isArray(data.items) ? data.items : [];
    } catch (e) {
      return [];
    }
  }

  function saveCart(items) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ items: items, updated: Date.now() }));
    } catch (e) {}
    updateBadge();
    renderDrawer();
    document.dispatchEvent(new CustomEvent('gaviom:cart-updated', { detail: { items: items } }));
  }

  function getTotals(items) {
    items = items || loadCart();
    var tickets = 0;
    var subtotal = 0;
    items.forEach(function (item) {
      tickets += item.qty;
      subtotal += item.lineTotal;
    });
    return { tickets: tickets, subtotal: subtotal };
  }

  function upsellMessage(items) {
    if (!items.length) return 'Add tickets from multiple sweepstakes to boost your odds in one checkout.';
    var missing = Object.keys(PRIZES).filter(function (id) {
      return !items.some(function (i) { return i.prizeId === id; });
    });
    if (missing.length) {
      var next = PRIZES[missing[0]];
      var unit = unitPrice(next);
      return 'You\'re only ' + fmt(unit * 3) + ' away from adding entries on <strong>' + next.title + '</strong>.';
    }
    var low = items.find(function (i) { return i.qty < 5; });
    if (low) {
      var p = PRIZES[low.prizeId];
      var bundle5 = p.bundles.find(function (b) { return b.tickets === 5; });
      if (bundle5) {
        var need = 5 - low.qty;
        var extra = linePrice(p, low.qty + need) - low.lineTotal;
        return 'Add <strong>' + need + ' more ticket' + (need > 1 ? 's' : '') + '</strong> on ' + p.title + ' for ' + fmt(extra) + ', better bundle odds.';
      }
    }
    return 'Add 3 more tickets on any sweepstakes for stronger odds across multiple draws.';
  }

  function addOrUpdate(prizeId, qty) {
    var prize = PRIZES[prizeId];
    if (!prize || qty < 1) return;
    var items = loadCart();
    var lineTotal = linePrice(prize, qty);
    var idx = items.findIndex(function (i) { return i.prizeId === prizeId; });
    var row = {
      prizeId: prizeId,
      title: prize.title,
      url: prize.url,
      image: prize.image,
      unitPrice: unitPrice(prize),
      qty: qty,
      lineTotal: lineTotal,
    };
    if (idx >= 0) items[idx] = row;
    else items.push(row);
    saveCart(items);
    return row;
  }

  function updateQty(prizeId, qty) {
    if (qty < 1) return removeItem(prizeId);
    addOrUpdate(prizeId, qty);
  }

  function removeItem(prizeId) {
    var items = loadCart().filter(function (i) { return i.prizeId !== prizeId; });
    saveCart(items);
  }

  function clearCart() {
    saveCart([]);
  }

  /* ── DOM shell (injected once) ── */
  function ensureShell() {
    if (document.getElementById('gaviom-cart-root')) return;

    var root = document.createElement('div');
    root.id = 'gaviom-cart-root';
    root.innerHTML =
      '<div class="cart-overlay" data-cart-overlay hidden></div>' +
      '<aside class="cart-drawer" data-cart-drawer aria-label="Shopping cart" hidden>' +
        '<header class="cart-drawer__head">' +
          '<h2 class="cart-drawer__title font-display">Your cart</h2>' +
          '<button type="button" class="cart-drawer__close" data-cart-close aria-label="Close cart">×</button>' +
        '</header>' +
        '<p class="cart-drawer__amoe font-mono">No purchase necessary. <a href="/free-entry.html">Free mail-in entry</a> · same odds.</p>' +
        '<div class="cart-drawer__body" data-cart-drawer-body></div>' +
        '<footer class="cart-drawer__foot" data-cart-drawer-foot hidden>' +
          '<p class="cart-upsell font-quote" data-cart-upsell></p>' +
          '<div class="cart-drawer__totals font-mono">' +
            '<span><span data-cart-total-tickets>0</span> tickets</span>' +
            '<strong class="cart-drawer__total font-display" data-cart-total-price>$0.00</strong>' +
          '</div>' +
          '<a href="/checkout.html" class="btn btn-primary btn-lg btn-block" data-cart-checkout>Checkout</a>' +
          '<button type="button" class="btn btn-ghost btn-block" data-cart-close>Keep browsing</button>' +
        '</footer>' +
      '</aside>' +
      '<div class="cart-modal" data-cart-modal hidden role="dialog" aria-modal="true" aria-labelledby="cart-modal-title">' +
        '<div class="cart-modal__backdrop" data-cart-modal-close></div>' +
        '<div class="cart-modal__panel">' +
          '<button type="button" class="cart-modal__close" data-cart-modal-close aria-label="Close">×</button>' +
          '<div class="cart-modal__hero" data-cart-modal-hero></div>' +
          '<h3 id="cart-modal-title" class="cart-modal__title font-display" data-cart-modal-title></h3>' +
          '<p class="cart-modal__sub font-mono" data-cart-modal-sub></p>' +
          '<p class="cart-modal__label font-mono">Number of tickets</p>' +
          '<div class="cart-modal__bundles" data-cart-modal-bundles></div>' +
          '<div class="cart-modal__qty">' +
            '<button type="button" class="cart-qty-btn" data-cart-qty-minus aria-label="Fewer tickets">−</button>' +
            '<input type="number" min="1" max="99" value="5" class="cart-qty-input" data-cart-qty-input aria-label="Ticket quantity" />' +
            '<button type="button" class="cart-qty-btn" data-cart-qty-plus aria-label="More tickets">+</button>' +
          '</div>' +
          '<p class="cart-modal__line font-mono">Subtotal: <strong data-cart-modal-subtotal>$0.00</strong></p>' +
          '<button type="button" class="btn btn-primary btn-lg btn-block" data-cart-modal-add>Add to cart</button>' +
        '</div>' +
      '</div>' +
      '<div class="cart-toast" data-cart-toast hidden role="status">' +
        '<p class="cart-toast__msg font-display">Added to your cart</p>' +
        '<div class="cart-toast__actions">' +
          '<button type="button" class="btn btn-ghost" data-cart-toast-browse>Continue</button>' +
          '<button type="button" class="btn btn-primary" data-cart-toast-view>View cart</button>' +
        '</div>' +
      '</div>';

    document.body.appendChild(root);

    root.querySelector('[data-cart-overlay]').addEventListener('click', closeDrawer);
    root.querySelectorAll('[data-cart-close]').forEach(function (el) {
      el.addEventListener('click', closeDrawer);
    });
    root.querySelectorAll('[data-cart-modal-close]').forEach(function (el) {
      el.addEventListener('click', closeModal);
    });
    root.querySelector('[data-cart-modal-add]').addEventListener('click', confirmModalAdd);
    root.querySelector('[data-cart-qty-minus]').addEventListener('click', function () {
      adjustModalQty(-1);
    });
    root.querySelector('[data-cart-qty-plus]').addEventListener('click', function () {
      adjustModalQty(1);
    });
    root.querySelector('[data-cart-qty-input]').addEventListener('change', syncModalSubtotal);
    root.querySelector('[data-cart-toast-browse]').addEventListener('click', hideToast);
    root.querySelector('[data-cart-toast-view]').addEventListener('click', function () {
      hideToast();
      openDrawer();
    });

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        closeDrawer();
        closeModal();
        hideToast();
      }
    });
  }

  function injectNavButtons() {
    document.querySelectorAll('.nav-right').forEach(function (nav) {
      if (nav.querySelector('[data-cart-open]')) return;
      var btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-cart';
      btn.setAttribute('data-cart-open', '');
      btn.setAttribute('aria-label', 'Open cart');
      btn.innerHTML =
        '<svg class="nav-cart__icon" width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
        '<path d="M6 6h15l-1.5 9H7.5L6 6Z" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/>' +
        '<path d="M6 6 5 3H2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>' +
        '<circle cx="9" cy="20" r="1.5" fill="currentColor"/><circle cx="18" cy="20" r="1.5" fill="currentColor"/>' +
        '</svg>' +
        '<span class="nav-cart__count" data-cart-count>0</span>';
      btn.addEventListener('click', openDrawer);
      var signIn = nav.querySelector('.nav-signin');
      if (signIn) nav.insertBefore(btn, signIn);
      else nav.prepend(btn);
    });
  }

  function updateBadge() {
    var totals = getTotals();
    document.querySelectorAll('[data-cart-count]').forEach(function (el) {
      el.textContent = String(totals.tickets);
      el.classList.toggle('is-empty', totals.tickets === 0);
    });
  }

  function renderDrawer() {
    var body = document.querySelector('[data-cart-drawer-body]');
    var foot = document.querySelector('[data-cart-drawer-foot]');
    if (!body) return;
    var items = loadCart();
    if (!items.length) {
      body.innerHTML =
        '<div class="cart-empty">' +
          '<p class="cart-empty__title font-display">Your cart is empty</p>' +
          '<p class="cart-empty__sub">Add tickets from any live sweepstakes, checkout once for every draw.</p>' +
          '<a href="/prizes.html" class="btn btn-primary">Browse sweepstakes</a>' +
        '</div>';
      if (foot) foot.hidden = true;
      return;
    }
    if (foot) foot.hidden = false;
    body.innerHTML = items.map(function (item) {
      return (
        '<article class="cart-line" data-cart-line="' + item.prizeId + '">' +
          '<a href="' + item.url + '" class="cart-line__thumb"><img src="' + item.image + '" alt="" loading="lazy" /></a>' +
          '<div class="cart-line__main">' +
            '<a href="' + item.url + '" class="cart-line__title">' + item.title + '</a>' +
            '<p class="cart-line__meta font-mono">' + fmt(item.unitPrice) + ' / ticket</p>' +
            '<div class="cart-line__qty">' +
              '<button type="button" class="cart-qty-btn" data-cart-line-minus="' + item.prizeId + '">−</button>' +
              '<span class="cart-line__qty-val">' + item.qty + '</span>' +
              '<button type="button" class="cart-qty-btn" data-cart-line-plus="' + item.prizeId + '">+</button>' +
            '</div>' +
          '</div>' +
          '<div class="cart-line__side">' +
            '<span class="cart-line__price font-display">' + fmt(item.lineTotal) + '</span>' +
            '<button type="button" class="cart-line__remove" data-cart-line-remove="' + item.prizeId + '">Remove</button>' +
          '</div>' +
        '</article>'
      );
    }).join('');

    body.querySelectorAll('[data-cart-line-minus]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cart-line-minus');
        var item = items.find(function (i) { return i.prizeId === id; });
        if (item) updateQty(id, item.qty - 1);
      });
    });
    body.querySelectorAll('[data-cart-line-plus]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var id = btn.getAttribute('data-cart-line-plus');
        var item = items.find(function (i) { return i.prizeId === id; });
        if (item) updateQty(id, item.qty + 1);
      });
    });
    body.querySelectorAll('[data-cart-line-remove]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        removeItem(btn.getAttribute('data-cart-line-remove'));
      });
    });

    var totals = getTotals(items);
    var upsell = document.querySelector('[data-cart-upsell]');
    if (upsell) upsell.innerHTML = upsellMessage(items);
    document.querySelectorAll('[data-cart-total-tickets]').forEach(function (el) {
      el.textContent = String(totals.tickets);
    });
    document.querySelectorAll('[data-cart-total-price]').forEach(function (el) {
      el.textContent = fmt(totals.subtotal);
    });
    var checkoutBtn = document.querySelector('[data-cart-checkout]');
    if (checkoutBtn) checkoutBtn.textContent = 'Checkout · ' + fmt(totals.subtotal);
  }

  function setPanelOpen(el, open) {
    if (!el) return;
    el.classList.toggle('is-open', open);
    el.hidden = !open;
  }

  function openDrawer() {
    ensureShell();
    renderDrawer();
    setPanelOpen(document.querySelector('[data-cart-drawer]'), true);
    setPanelOpen(document.querySelector('[data-cart-overlay]'), true);
    document.body.classList.add('cart-open');
  }

  function closeDrawer() {
    setPanelOpen(document.querySelector('[data-cart-drawer]'), false);
    setPanelOpen(document.querySelector('[data-cart-overlay]'), false);
    document.body.classList.remove('cart-open');
  }

  var modalPrizeId = null;
  var modalQty = 5;

  function openModal(prizeId, defaultQty) {
    var prize = PRIZES[prizeId];
    if (!prize) return;
    ensureShell();
    modalPrizeId = prizeId;
    modalQty = defaultQty || 5;

    var modal = document.querySelector('[data-cart-modal]');
    var hero = document.querySelector('[data-cart-modal-hero]');
    var title = document.querySelector('[data-cart-modal-title]');
    var sub = document.querySelector('[data-cart-modal-sub]');
    var bundles = document.querySelector('[data-cart-modal-bundles]');
    var input = document.querySelector('[data-cart-qty-input]');

    if (hero) hero.innerHTML = '<img src="' + prize.image + '" alt="" />';
    if (title) title.textContent = prize.title;
    if (sub) sub.textContent = prize.draw + ' · Odds 1 in ' + prize.odds.toLocaleString('en-US');
    if (bundles) {
      bundles.innerHTML = prize.bundles.map(function (b) {
        return '<button type="button" class="cart-bundle-chip' + (b.tickets === modalQty ? ' is-active' : '') + '" data-cart-bundle="' + b.tickets + '">' +
          b.tickets + ' · ' + fmt(b.price) + '</button>';
      }).join('');
      bundles.querySelectorAll('[data-cart-bundle]').forEach(function (chip) {
        chip.addEventListener('click', function () {
          modalQty = parseInt(chip.getAttribute('data-cart-bundle'), 10);
          input.value = String(modalQty);
          bundles.querySelectorAll('.cart-bundle-chip').forEach(function (c) {
            c.classList.toggle('is-active', c === chip);
          });
          syncModalSubtotal();
        });
      });
    }
    if (input) input.value = String(modalQty);
    syncModalSubtotal();
    setPanelOpen(modal, true);
    document.body.classList.add('cart-modal-open');
  }

  function closeModal() {
    setPanelOpen(document.querySelector('[data-cart-modal]'), false);
    document.body.classList.remove('cart-modal-open');
    modalPrizeId = null;
  }

  function adjustModalQty(delta) {
    var input = document.querySelector('[data-cart-qty-input]');
    if (!input) return;
    modalQty = Math.max(1, Math.min(99, parseInt(input.value, 10) + delta || 1));
    input.value = String(modalQty);
    document.querySelectorAll('.cart-bundle-chip').forEach(function (c) {
      c.classList.toggle('is-active', parseInt(c.getAttribute('data-cart-bundle'), 10) === modalQty);
    });
    syncModalSubtotal();
  }

  function syncModalSubtotal() {
    var input = document.querySelector('[data-cart-qty-input]');
    if (!input || !modalPrizeId) return;
    modalQty = Math.max(1, Math.min(99, parseInt(input.value, 10) || 1));
    input.value = String(modalQty);
    var prize = PRIZES[modalPrizeId];
    var sub = document.querySelector('[data-cart-modal-subtotal]');
    if (sub && prize) sub.textContent = fmt(linePrice(prize, modalQty));
  }

  function confirmModalAdd() {
    if (!modalPrizeId) return;
    var input = document.querySelector('[data-cart-qty-input]');
    var qty = input ? parseInt(input.value, 10) : modalQty;
    addOrUpdate(modalPrizeId, qty);
    closeModal();
    showToast();
  }

  function showToast() {
    var toast = document.querySelector('[data-cart-toast]');
    if (!toast) return;
    setPanelOpen(toast, true);
    clearTimeout(showToast._t);
    showToast._t = setTimeout(hideToast, 6000);
  }

  function hideToast() {
    setPanelOpen(document.querySelector('[data-cart-toast]'), false);
  }

  function getDefaultQtyFromPage(prizeId) {
    var root = document.querySelector('[data-bundle-root]');
    if (!root) return 5;
    var selected = root.querySelector('[data-bundle].selected, [data-bundle][data-default]');
    if (selected) return parseInt(selected.dataset.tickets || selected.dataset.entries, 10) || 5;
    return 5;
  }

  function addFromButton(addBtn) {
    var id = addBtn.getAttribute('data-cart-add');
    var prize = id && PRIZES[id];
    if (!prize) return;

    /* Only the main bundle CTA adds to cart, everything else goes to the detail page */
    if (!addBtn.hasAttribute('data-bundle-cta') && !addBtn.hasAttribute('data-sticky-cta')) {
      window.location.href = prize.url;
      return;
    }

    addOrUpdate(id, getDefaultQtyFromPage(id));
    showToast();
  }

  function bindAddButtons() {
    document.addEventListener('click', function (e) {
      var addBtn = e.target.closest('[data-cart-add]');
      if (addBtn) {
        e.preventDefault();
        addFromButton(addBtn);
        return;
      }
      var openBtn = e.target.closest('[data-cart-open]');
      if (openBtn) {
        e.preventDefault();
        openDrawer();
      }
    });
  }

  function init() {
    ensureShell();
    closeDrawer();
    closeModal();
    hideToast();
    injectNavButtons();
    updateBadge();
    renderDrawer();
    bindAddButtons();
  }

  window.GaviomCart = {
    PRIZES: PRIZES,
    load: loadCart,
    save: saveCart,
    add: addOrUpdate,
    updateQty: updateQty,
    remove: removeItem,
    clear: clearCart,
    getTotals: getTotals,
    linePrice: linePrice,
    fmt: fmt,
    openDrawer: openDrawer,
    openModal: openModal,
    upsellMessage: upsellMessage,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
