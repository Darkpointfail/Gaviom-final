/**
 * Syncs cart to Supabase when user is signed in.
 */
(function () {
  'use strict';

  var syncing = false;
  var merged = false;

  function loadScripts() {
    return new Promise(function (resolve, reject) {
      if (window.GaviomAuth && window.GaviomAuth.getSession) {
        resolve();
        return;
      }
      var cfg = document.createElement('script');
      cfg.src = '/auth-config.js';
      cfg.onload = function () {
        if (!window.GAVIOM_AUTH_CONFIG || window.GAVIOM_AUTH_CONFIG.supabaseUrl.includes('REPLACE')) {
          resolve();
          return;
        }
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

  async function getSession() {
    try {
      if (!window.GaviomAuth) await loadScripts();
      if (!window.GaviomAuth || !window.GaviomAuth.configReady()) return null;
      return await window.GaviomAuth.waitForSession();
    } catch (e) {
      return null;
    }
  }

  function getClient() {
    if (!window.GaviomAuth) return null;
    return window.GaviomAuth.getClient();
  }

  function lineTotalForPrize(prize, qty) {
    var exact = prize.bundles.find(function (b) { return b.tickets === qty; });
    if (exact) return exact.price;
    var unit = prize.bundles[0].price / prize.bundles[0].tickets;
    return Math.round(qty * unit * 100) / 100;
  }

  function rowsToCartItems(rows) {
    if (!window.GaviomCart || !window.GaviomCart.PRIZES) return [];
    var PRIZES = window.GaviomCart.PRIZES;
    return rows
      .map(function (row) {
        var prize = PRIZES[row.prize_id];
        if (!prize) return null;
        return {
          prizeId: row.prize_id,
          title: prize.title,
          url: prize.url,
          image: prize.image,
          unitPrice: prize.bundles[0].price / prize.bundles[0].tickets,
          qty: row.qty,
          lineTotal: parseFloat(row.line_total) || lineTotalForPrize(prize, row.qty),
        };
      })
      .filter(Boolean);
  }

  async function pullRemoteCart(userId) {
    var client = getClient();
    if (!client) return [];

    var result = await client
      .from('cart_items')
      .select('prize_id, qty, line_total, updated_at')
      .eq('user_id', userId)
      .order('updated_at', { ascending: false });

    if (result.error) {
      console.warn('[Gaviom cart-sync] pull', result.error.message);
      return [];
    }
    return rowsToCartItems(result.data || []);
  }

  async function pushRemoteCart(userId, items) {
    var client = getClient();
    if (!client || syncing) return;
    syncing = true;

    try {
      await client.from('cart_items').delete().eq('user_id', userId);

      if (!items.length) return;

      var rows = items.map(function (item) {
        return {
          user_id: userId,
          prize_id: item.prizeId,
          qty: item.qty,
          line_total: item.lineTotal,
          updated_at: new Date().toISOString(),
        };
      });

      var insert = await client.from('cart_items').insert(rows);
      if (insert.error) {
        console.warn('[Gaviom cart-sync] push', insert.error.message);
      }
    } finally {
      syncing = false;
    }
  }

  async function mergeOnLogin() {
    if (merged || !window.GaviomCart) return;
    var session = await getSession();
    if (!session) return;

    merged = true;
    var userId = session.user.id;
    var remote = await pullRemoteCart(userId);
    var local = window.GaviomCart.load();

    if (remote.length && !local.length) {
      window.GaviomCart.save(remote, { skipSync: true });
    } else if (local.length && !remote.length) {
      await pushRemoteCart(userId, local);
    } else if (remote.length && local.length) {
      var mergedItems = remote.slice();
      local.forEach(function (localItem) {
        var idx = mergedItems.findIndex(function (r) {
          return r.prizeId === localItem.prizeId;
        });
        if (idx >= 0) {
          if (localItem.qty > mergedItems[idx].qty) mergedItems[idx] = localItem;
        } else {
          mergedItems.push(localItem);
        }
      });
      window.GaviomCart.save(mergedItems, { skipSync: true });
      await pushRemoteCart(userId, mergedItems);
    }
  }

  async function push(items) {
    var session = await getSession();
    if (!session) return;
    await pushRemoteCart(session.user.id, items || []);
  }

  function scheduleMerge() {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(function () {
        mergeOnLogin();
      }, { timeout: 3000 });
    } else {
      setTimeout(mergeOnLogin, 500);
    }
  }

  window.GaviomCartSync = {
    push: push,
    pull: pullRemoteCart,
    mergeOnLogin: mergeOnLogin,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scheduleMerge);
  } else {
    scheduleMerge();
  }

  document.addEventListener('gaviom:auth-changed', function () {
    merged = false;
    scheduleMerge();
  });
})();
