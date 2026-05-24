(function () {
  'use strict';

  /* Pre-launch: site opens early July 2026 · first Sunday draw after launch */
  const LAUNCH_AT = Date.parse('2026-07-01T16:00:00.000Z'); /* Jul 1, 2026 · 12:00 ET */
  const FIRST_DRAW_AT = Date.parse('2026-07-06T00:00:00.000Z'); /* Jul 5, 2026 · 8:00 PM ET */
  const FIRST_DRAW_DATE_LABEL = 'Sunday, July 5 · 8pm ET';
  const FIRST_DRAW_DATE_SHORT = 'July 5, 8pm ET';
  const PRESALE_CTA_LABEL = 'Pre-order a ticket';

  function pad2(n) {
    return String(Math.max(0, n)).padStart(2, '0');
  }

  function formatCompact(ms) {
    const diff = Math.max(0, ms);
    const s = Math.floor(diff / 1000) % 60;
    const m = Math.floor(diff / 60000) % 60;
    const h = Math.floor(diff / 3600000) % 24;
    const d = Math.floor(diff / 86400000);
    return {
      d,
      h,
      m,
      s,
      compact: `${pad2(d)}d ${pad2(h)}h ${pad2(m)}m ${pad2(s)}s`,
      clock: `${pad2(h)}:${pad2(m)}:${pad2(s)}`,
      blocks: `${pad2(d)} days ${pad2(h)} hrs ${pad2(m)} min ${pad2(s)} sec`,
    };
  }

  function nextSundayDrawET(fromMs) {
    const t = new Date(fromMs);
    const utc = new Date(
      Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate(), 0, 0, 0, 0)
    );
    const day = utc.getUTCDay();
    const daysUntilSun = (7 - day) % 7 || 7;
    utc.setUTCDate(utc.getUTCDate() + daysUntilSun);
    return utc.getTime() + 20 * 3600000 + 4 * 3600000;
  }

  function getDrawTarget() {
    const now = Date.now();
    if (now < FIRST_DRAW_AT) return FIRST_DRAW_AT;
    let target = nextSundayDrawET(now);
    if (target <= now) target = nextSundayDrawET(now + 86400000);
    return target;
  }

  function applyCountdownEl(el, targetMs) {
    const now = Date.now();
    el.classList.remove('cd-soon');
    const parts = formatCompact(targetMs - now);
    const fmt = el.dataset.cdFormat || 'compact';
    if (fmt === 'clock') el.textContent = parts.clock;
    else if (fmt === 'blocks') el.textContent = parts.blocks;
    else if (fmt === 'short') el.textContent = parts.compact.replace(/ /g, ' ');
    else el.textContent = parts.compact;
  }

  function initLaunchMode() {
    const now = Date.now();
    const preLaunch = now < LAUNCH_AT;
    const preDraw = now < FIRST_DRAW_AT;
    document.body.classList.toggle('gv-prelaunch', preLaunch);
    document.body.classList.toggle('gv-predraw', preDraw);

    document.querySelectorAll('[data-cd="launch"]').forEach((el) => {
      applyCountdownEl(el, LAUNCH_AT);
    });

    document.querySelectorAll('[data-cd="draw"]').forEach((el) => {
      applyCountdownEl(el, getDrawTarget());
    });

    document.querySelectorAll('[data-cd="compact"]').forEach((el) => {
      const scope = el.dataset.cdScope || (preLaunch ? 'launch' : 'draw');
      if (scope === 'launch') applyCountdownEl(el, LAUNCH_AT);
      else applyCountdownEl(el, getDrawTarget());
    });

    document.querySelectorAll('[data-cd="clock"]').forEach((el) => {
      applyCountdownEl(el, getDrawTarget());
    });

    document.querySelectorAll('[data-first-draw-date]').forEach((el) => {
      el.textContent = el.dataset.firstDrawFormat === 'short' ? FIRST_DRAW_DATE_SHORT : FIRST_DRAW_DATE_LABEL;
    });

    const launchParts = formatCompact(Math.max(0, LAUNCH_AT - now));
    document.querySelectorAll('[data-cd="d"]').forEach((el) => {
      el.textContent = pad2(launchParts.d);
    });
    document.querySelectorAll('[data-cd="h"]').forEach((el) => {
      el.textContent = pad2(launchParts.h);
    });
    document.querySelectorAll('[data-cd="m"]').forEach((el) => {
      el.textContent = pad2(launchParts.m);
    });
    document.querySelectorAll('[data-cd="s"]').forEach((el) => {
      el.textContent = pad2(launchParts.s);
    });

    document.querySelectorAll('[data-cd-label="launch"]').forEach((el) => {
      el.textContent = preLaunch ? 'Gaviom launches in' : 'Next launch milestone';
    });
    document.querySelectorAll('[data-cd-label="draw"]').forEach((el) => {
      if (preDraw) {
        el.textContent = el.dataset.cdLabelPredraw || 'First draw';
      } else {
        el.textContent = el.dataset.cdLabelLive || 'Closes in';
      }
    });
    document.querySelectorAll('[data-stat-draw]').forEach((el) => {
      el.textContent = preDraw ? FIRST_DRAW_DATE_SHORT : el.dataset.statLive || 'Live';
    });

    document.querySelectorAll('[data-topbar-label]').forEach((el) => {
      const prize = el.dataset.topbarPrize;
      if (preLaunch) el.textContent = 'Gaviom launches in';
      else if (preDraw) {
        el.textContent = prize ? `${prize} · first draw in` : 'First draw in';
      } else {
        el.textContent = prize ? `${prize} closes in` : 'Grand Sweepstakes closes in';
      }
    });

    document.querySelectorAll('[data-topbar-extra]').forEach((el) => {
      el.textContent = preLaunch || preDraw
        ? '· Pre-sale open · First draw July 5, 8pm ET'
        : '· Drawn live every Sunday, 8pm ET';
    });

    document.querySelectorAll('[data-sticky-label]').forEach((el) => {
      const prize = el.dataset.stickyPrize;
      if (preLaunch) el.textContent = 'Pre-sale · launches in';
      else if (preDraw) el.textContent = prize ? `${prize} · first draw in` : 'First draw in';
      else el.textContent = prize ? `${prize} closes in` : 'Grand Sweepstakes closes in';
    });

    document.querySelectorAll('.live-dot').forEach((dot) => {
      const wrap = dot.closest('.badge-live, .topbar-left > span');
      if (preDraw && wrap) {
        dot.classList.add('soon-dot');
      } else {
        dot.classList.remove('soon-dot');
      }
    });

    document.querySelectorAll('[data-presale-cta], [data-entry-cta], [data-sticky-cta], [data-bundle-cta]').forEach((el) => {
      if (preLaunch) {
        el.textContent = el.dataset.presaleLabel || PRESALE_CTA_LABEL;
      }
    });

    document.querySelectorAll('[data-progress-label]').forEach((el) => {
      el.textContent = preLaunch ? 'Pre-sale entries reserved' : 'Entries received';
    });
  }

  function tickCountdown() {
    initLaunchMode();
  }

  function initStickyCta() {
    const bar = document.querySelector('.sticky-cta');
    const footer = document.querySelector('.footer');
    if (!bar) return;

    function update() {
      const y = window.scrollY;
      let show = y > 520;
      if (footer) {
        const rect = footer.getBoundingClientRect();
        if (rect.top < window.innerHeight - 80) show = false;
      }
      bar.classList.toggle('show', show);
      bar.setAttribute('aria-hidden', show ? 'false' : 'true');
      document.body.classList.toggle('has-sticky-cta', show);
    }

    window.addEventListener('scroll', update, { passive: true });
    update();
  }

  function initMobileNav() {
    const mq = window.matchMedia('(max-width: 980px)');

    document.querySelectorAll('.nav-inner').forEach((inner) => {
      const links = inner.querySelector('.nav-links');
      if (!links || inner.querySelector('.nav-menu-btn')) return;

      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'nav-menu-btn';
      btn.setAttribute('aria-label', 'Open menu');
      btn.setAttribute('aria-expanded', 'false');
      btn.innerHTML = '<span class="nav-menu-icon" aria-hidden="true"></span>';

      const backdrop = document.createElement('div');
      backdrop.className = 'nav-mobile-backdrop';

      const panel = document.createElement('div');
      panel.className = 'nav-mobile-panel';
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      panel.setAttribute('aria-label', 'Site menu');

      const closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'nav-mobile-close';
      closeBtn.setAttribute('aria-label', 'Close menu');
      closeBtn.textContent = '×';

      const panelInner = document.createElement('div');
      panelInner.className = 'nav-mobile-panel__inner';

      const mobileLinks = links.cloneNode(true);
      mobileLinks.classList.remove('nav-links');
      mobileLinks.classList.add('nav-mobile-links');
      panelInner.appendChild(mobileLinks);

      const navRight = inner.querySelector('.nav-right');
      if (navRight) {
        const actions = document.createElement('div');
        actions.className = 'nav-mobile-actions';
        navRight.querySelectorAll('a.btn').forEach((a) => {
          actions.appendChild(a.cloneNode(true));
        });
        if (actions.childElementCount) panelInner.appendChild(actions);
      }

      panel.append(closeBtn, panelInner);
      document.body.append(backdrop, panel);

      const navRightEl = inner.querySelector('.nav-right');
      if (navRightEl) inner.insertBefore(btn, navRightEl);

      function setOpen(open) {
        document.body.classList.toggle('nav-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        btn.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        backdrop.classList.toggle('is-visible', open);
        panel.classList.toggle('is-visible', open);
      }

      btn.addEventListener('click', () => setOpen(!document.body.classList.contains('nav-open')));
      backdrop.addEventListener('click', () => setOpen(false));
      closeBtn.addEventListener('click', () => setOpen(false));
      panel.querySelectorAll('a').forEach((a) => {
        a.addEventListener('click', () => setOpen(false));
      });
      window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && document.body.classList.contains('nav-open')) setOpen(false);
      });
      mq.addEventListener('change', () => {
        if (!mq.matches) setOpen(false);
      });
    });
  }

  function setupBundleSelector() {
    document.querySelectorAll('[data-bundle-root]').forEach((root) => {
      const opts = root.querySelectorAll('[data-bundle]');
      const totalEl = document.querySelector('[data-bundle-total]');
      const ticketsEl = root.closest('.pd-sticky')?.querySelector('[data-bundle-tickets]') || document.querySelector('[data-bundle-tickets]');
      const ctaEl = document.querySelector('[data-bundle-cta]');
      const coTotal = document.querySelector('[data-co-total]');
      const coLines = document.querySelector('[data-co-lines]');

      function select(opt) {
        opts.forEach((o) => o.classList.toggle('selected', o === opt));
        const entries = opt.dataset.tickets || opt.dataset.entries;
        const price = opt.dataset.price;
        if (totalEl) totalEl.textContent = `$${parseFloat(price).toFixed(2)}`;
        if (ticketsEl) {
          ticketsEl.textContent = `${entries} ticket${entries === '1' ? '' : 's'}`;
        }
        const presale = document.body.classList.contains('gv-prelaunch');
        if (ctaEl) {
          ctaEl.textContent = presale
            ? PRESALE_CTA_LABEL
            : (ctaEl.dataset.presaleLabel
              ? ctaEl.dataset.presaleLabel.replace('{price}', price)
              : `Enter — $${price}`);
          const href = ctaEl.getAttribute('href') || '/checkout.html?prize=msc';
          const base = href.split('?')[0];
          const qs = new URLSearchParams(href.split('?')[1] || 'prize=msc');
          qs.set('bundle', entries);
          ctaEl.href = `${base}?${qs.toString()}`;
        }
        if (coTotal) coTotal.textContent = `$${parseFloat(price).toFixed(2)}`;
        if (coLines) {
          const unit = (parseFloat(price) / parseInt(entries, 10)).toFixed(2);
          coLines.textContent = `${entries} entries × $${unit}`;
        }
        const submit = document.querySelector('[data-checkout-submit], [data-bundle-cta]');
        if (submit) {
          const n = parseInt(entries, 10);
          const tw = n === 1 ? 'ticket' : 'tickets';
          submit.textContent = document.body.classList.contains('gv-prelaunch')
            ? `Pre-order ${n} ${tw} — $${parseFloat(price).toFixed(2)}`
            : `Pay $${parseFloat(price).toFixed(2)} for ${n} ${tw}`;
        }
      }

      opts.forEach((opt) => {
        opt.addEventListener('click', () => select(opt));
      });
      const def = root.querySelector('[data-bundle].selected') || root.querySelector('[data-default]') || opts[1] || opts[0];
      if (def) select(def);

      document.querySelectorAll('[data-pick-bundle]').forEach((link) => {
        link.addEventListener('click', (e) => {
          const n = link.getAttribute('data-pick-bundle');
          const match = Array.from(opts).find((o) => (o.dataset.tickets || o.dataset.entries) === n);
          if (match) {
            e.preventDefault();
            select(match);
            root.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
      });
    });
  }

  function syncProgressFromCounter(val, cap) {
    const pct = Math.min(99, Math.round((val / cap) * 100));
    document.querySelectorAll('[data-progress-dynamic]').forEach((track) => {
      const fill = track.querySelector('.progress-fill, i');
      if (fill) fill.style.width = pct + '%';
      track.classList.toggle('hot', pct > 80);
      track.setAttribute('data-progress', String(pct));
    });
  }

  function initLiveCounters() {
    const capEl = document.querySelector('[data-live-counter][data-live-pair]');
    if (!capEl) return;

    const group = capEl.dataset.liveGroup || 'msc';
    const cap = parseInt(capEl.dataset.liveMax, 10) || 6000;
    let val = parseInt(capEl.dataset.liveCounter, 10) || 0;
    const dripEl = document.querySelector(`[data-live-group="${group}"]:not([data-live-pair])`);
    const dripMax = dripEl ? parseInt(dripEl.dataset.liveMax, 10) || cap - 1 : cap - 1;
    const targets = document.querySelectorAll(`[data-live-group="${group}"]`);
    const head = document.querySelector('[data-live-head]');

    function render() {
      const text = val.toLocaleString('en-US');
      targets.forEach((el) => {
        el.textContent = text;
      });
      if (head) head.textContent = text;
      syncProgressFromCounter(val, cap);
    }

    render();
    if (capEl.dataset.liveStatic !== undefined) return;
    setInterval(() => {
      if (Math.random() < 0.45 && val < dripMax) {
        val += Math.floor(Math.random() * 2) + 1;
        render();
      }
    }, 3200);
  }

  function initProgress() {
    document.querySelectorAll('[data-progress]:not([data-progress-dynamic])').forEach((track) => {
      const pct = track.getAttribute('data-progress');
      const fill = track.querySelector('i, .progress-fill');
      if (fill && pct) {
        requestAnimationFrame(() => {
          fill.style.width = pct + '%';
          track.classList.toggle('hot', parseInt(pct, 10) > 80);
        });
      }
    });
    document.querySelectorAll('[data-progress-dynamic]').forEach((track) => {
      const pct = track.getAttribute('data-progress');
      const fill = track.querySelector('i, .progress-fill');
      if (fill && pct) {
        requestAnimationFrame(() => {
          fill.style.width = pct + '%';
          track.classList.toggle('hot', parseInt(pct, 10) > 80);
        });
      }
    });
  }

  function initChips() {
    document.querySelectorAll('.chips[data-filter]').forEach((wrap) => {
      wrap.querySelectorAll('.chip').forEach((chip) => {
        chip.addEventListener('click', () => {
          wrap.querySelectorAll('.chip').forEach((c) => c.classList.remove('active'));
          chip.classList.add('active');
        });
      });
    });
  }

  function initThumbs() {
    document.querySelectorAll('.pd-thumbs').forEach((wrap) => {
      const thumbs = wrap.querySelectorAll('.pd-thumb');
      thumbs.forEach((t) => {
        t.addEventListener('click', () => {
          thumbs.forEach((x) => x.classList.remove('active'));
          t.classList.add('active');
        });
      });
    });
  }

  function stripeSvg(cat, label) {
    const colors = {
      cars: { bg: 'oklch(0.94 0.025 158)', stroke: 'oklch(0.86 0.05 158)' },
      cash: { bg: 'oklch(0.93 0.035 230)', stroke: 'oklch(0.86 0.05 230)' },
      travel: { bg: 'oklch(0.94 0.04 60)', stroke: 'oklch(0.86 0.06 55)' },
      tech: { bg: 'oklch(0.94 0.03 280)', stroke: 'oklch(0.86 0.05 280)' },
      watches: { bg: 'oklch(0.93 0.03 25)', stroke: 'oklch(0.86 0.05 25)' },
      property: { bg: 'oklch(0.94 0.035 165)', stroke: 'oklch(0.86 0.05 165)' },
    };
    const c = colors[cat] || colors.cars;
    const id = 'p' + Math.random().toString(36).slice(2, 9);
    return `<svg width="100%" height="100%" preserveAspectRatio="none" aria-hidden="true">
      <defs><pattern id="${id}" patternUnits="userSpaceOnUse" width="16" height="16" patternTransform="rotate(45)">
        <rect width="16" height="16" fill="${c.bg}"/>
        <line x1="0" y1="0" x2="0" y2="16" stroke="${c.stroke}" stroke-width="5"/>
      </pattern></defs>
      <rect width="100%" height="100%" fill="url(#${id})"/>
    </svg><span class="ph-label">${label}</span>`;
  }

  function initPlaceholders() {
    document.querySelectorAll('[data-ph]').forEach((el) => {
      const cat = el.dataset.ph;
      const label = el.dataset.phLabel || `[ photo · placeholder ]`;
      el.classList.add('ph', 'ph-' + cat);
      if (!el.style.height && !el.style.minHeight) {
        el.style.width = '100%';
        el.style.height = '100%';
      }
      el.innerHTML = stripeSvg(cat, label);
    });
  }

    function initGallery() {
      document.querySelectorAll('[data-gallery]').forEach((gallery) => {
        const mainImg = gallery.querySelector('[data-gallery-main-img]');
        const mainVideo = gallery.querySelector('[data-gallery-video]');
        const mainLegacy = gallery.querySelector('img[data-gallery-main]');

        function showVideo() {
          if (mainVideo) {
            mainVideo.classList.add('is-active');
            mainVideo.muted = true;
            const p = mainVideo.play();
            if (p && typeof p.catch === 'function') p.catch(() => {});
          }
          if (mainImg) {
            mainImg.classList.remove('is-active');
            mainImg.setAttribute('hidden', '');
          }
        }

        function showImage(src) {
          if (mainVideo) {
            mainVideo.classList.remove('is-active');
            mainVideo.pause();
          }
          if (mainImg) {
            if (src) {
              const large = src.replace(/w=\d+/, 'w=1200').replace(/q=\d+/, 'q=90');
              mainImg.src = large;
            }
            mainImg.classList.add('is-active');
            mainImg.removeAttribute('hidden');
          } else if (mainLegacy && src) {
            mainLegacy.src = src.replace(/w=\d+/, 'w=1200').replace(/q=\d+/, 'q=90');
          }
        }

        gallery.querySelectorAll('[data-gallery-thumb]').forEach((thumb) => {
          thumb.addEventListener('click', () => {
            gallery.querySelectorAll('[data-gallery-thumb]').forEach((t) => t.classList.remove('active'));
            thumb.classList.add('active');
            if (thumb.hasAttribute('data-gallery-thumb-video')) showVideo();
            else {
              const img = thumb.querySelector('img');
              if (img) showImage(img.src);
            }
          });
        });

        if (mainVideo) {
          const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
          if (reduced) {
            mainVideo.pause();
            mainVideo.removeAttribute('autoplay');
            if (mainImg) {
              mainImg.removeAttribute('hidden');
              showImage(mainImg.getAttribute('src'));
            }
          } else {
            showVideo();
          }
        }
      });
    }

    function initCheckoutMembership(plan) {
      const plans = {
        monthly: {
          title: 'Gaviom+ · Monthly',
          detail: '5–8 tickets/month · Renews monthly',
          price: 17,
          cta: 'Pay $17.00 / month',
          help: 'Billed monthly · Cancel anytime · See membership.html',
        },
        annual: {
          title: 'Gaviom+ · Monthly',
          detail: '5–8 tickets/month · Renews monthly',
          price: 17,
          cta: 'Pay $17.00 / month',
          help: 'Billed monthly · Cancel anytime · See membership.html',
        },
      };
      const m = plans[plan] || plans.monthly;
      const fmt = (n) => '$' + parseFloat(n).toFixed(2);

      document.title = 'Checkout Gaviom+ — Gaviom';

      const kicker = document.querySelector('[data-checkout-kicker]');
      const titleEl = document.querySelector('[data-checkout-title]');
      const detailLine = document.querySelector('[data-checkout-detail-line]');
      const coTotal = document.querySelector('[data-co-total]');
      const back = document.querySelector('[data-checkout-back]');
      const submit = document.querySelector('[data-checkout-submit], [data-bundle-cta]');
      const help = document.querySelector('[data-checkout-fine]');
      const amoe = document.querySelector('[data-checkout-amoe]');

      const clarify = document.querySelector('[data-checkout-clarify]');
      const ticketCount = document.querySelector('[data-checkout-ticket-count]');
      const eventName = document.querySelector('[data-checkout-event-name]');
      const totalLabel = document.querySelector('.co-order-total-label');

      if (kicker) kicker.textContent = 'Membership tickets';
      if (titleEl) titleEl.textContent = m.title;
      if (detailLine) detailLine.textContent = m.detail;
      if (clarify) {
        clarify.innerHTML =
          'You are purchasing a <strong>monthly ticket bundle</strong> for Gaviom+ sweepstakes. You are <em>not</em> buying any specific prize or trip.';
      }
      if (ticketCount) ticketCount.hidden = true;
      if (eventName) eventName.hidden = true;
      if (totalLabel) totalLabel.textContent = 'Monthly total';
      if (coTotal) coTotal.textContent = fmt(m.price);
      if (back) {
        back.href = '/membership.html';
        back.textContent = '← Back';
      }
      if (submit) submit.textContent = m.cta;
      if (help) help.textContent = m.help;
      if (amoe) amoe.hidden = true;
    }

    const CHECKOUT_PRIZES = {
      msc: {
        back: '/prize.html',
        title: 'MSC Cruise · 7 Nights',
        cat: 'Travel · #1',
        value: '$12,000 value',
        draw: 'Draw July 5, 2026',
        maxEntries: 6000,
        hook: 'Seven nights at sea. Balcony cabin. Mediterranean sunsets on repeat.',
        images: [
          '/images/cruise-hero.webp',
          '/images/cruise-balcony.webp',
          '/images/cruise-pool-deck.webp',
        ],
        lede: 'Win a balcony cabin for two aboard MSC Magnifica, seven nights through the Mediterranean with meals, entertainment, and up to $2,000 in airfare coordination included. Prefer cash? Take the full $12,000 equivalent instead.',
        sections: [
          {
            title: 'Package includes',
            type: 'includes',
            items: [
              '7 nights · balcony cabin · 2 guests',
              'All-inclusive meals and onboard entertainment',
              'Mediterranean port itinerary (Barcelona, Marseille, Genoa region)',
              'Airfare coordination up to $2,000 included',
              '$12,000 cash equivalent option',
            ],
          },
          {
            title: 'Ports & moments worth the flight',
            type: 'list',
            items: [
              'Barcelona, Gothic Quarter evenings and harbor views from the ship',
              'Marseille, Calanques coastline day trips or old port cafés',
              'Genoa / Italian Riviera, pesto, pastel harbors, slow lunches',
              'Sea days, pool deck, spa, and sunrise coffee on your balcony',
            ],
          },
          {
            title: 'Onboard experience',
            type: 'pills',
            items: ['Balcony cabin', 'Main dining & buffet', 'Live shows', 'Pools & spa', 'Kids club', 'Casino'],
          },
          {
            title: 'Perfect if you want',
            type: 'list',
            items: [
              'A real vacation without planning every detail',
              'A story that starts with "we woke up in another country"',
              'Flexibility to sail or take the cash, your call within 24h of winning',
            ],
          },
        ],
        odds: 6000,
        bundles: { 1: { entries: 1, price: 12 }, 5: { entries: 5, price: 45, strike: 60, save: 15 }, 20: { entries: 20, price: 80, strike: 240, save: 160 } },
      },
      diving: {
        back: '/prize-diving.html',
        title: 'Scuba Diving Discovery · Cozumel, Mexico',
        cat: 'Experiences · #2',
        value: '$4,000',
        draw: 'Draw July 5, 2026',
        maxEntries: 1000,
        hook: 'No certification needed. Two guided dives in water so clear it looks edited.',
        images: [
          '/images/diving-turtle.webp',
          '/images/diving-cozumel.webp',
          '/images/diving-reef.webp',
        ],
        lede: 'Round-trip from Montreal, seven nights at a 3–4 star all-inclusive resort, and a PADI discovery session with two boat dives in Cozumel, one of the Caribbean\'s top-rated dive destinations. We handle flights, hotel, transfers, and your instructor.',
        sections: [
          {
            title: 'Package includes',
            type: 'includes',
            items: [
              'Round-trip flight Montreal → Cozumel (direct)',
              '7 nights hotel (3–4 stars, all-inclusive)',
              '1 discovery scuba session (2 dives, certified instructor)',
              'Airport transfers',
            ],
          },
          {
            title: 'Your hotel & base',
            text: 'Stay at an all-inclusive beach resort (3–4★) on Cozumel\'s west coast, meals, drinks, pool, and reef access included. Quiet evenings after dive days, no resort-hopping stress.',
            type: 'text',
          },
          {
            title: 'Dive sites & island highlights',
            type: 'list',
            items: [
              'Palancar Reef, dramatic coral walls and swim-throughs',
              'Columbia Deep, drop-offs for your second guided dive',
              'San Miguel Reef, shallow, colorful, ideal for beginners',
              'San Gervasio ruins, Mayan history inland',
              'San Miguel de Cozumel, tacos, waterfront, local markets',
            ],
          },
          {
            title: 'Perfect if you want',
            type: 'list',
            items: [
              'Your first scuba experience without buying gear or courses upfront',
              'A warm-weather trip that feels adventurous, not exhausting',
              'Bragging rights that start with "we dove in Cozumel"',
            ],
          },
        ],
        odds: 1000,
        bundles: { 1: { entries: 1, price: 12 }, 5: { entries: 5, price: 45, strike: 60, save: 15 }, 20: { entries: 20, price: 80, strike: 240, save: 160 } },
      },
      vegas: {
        back: '/prize-vegas.html',
        title: 'Las Vegas Trip · 4 Nights',
        cat: 'Travel · #3',
        value: '$4,200 value',
        draw: 'Draw July 5, 2026',
        maxEntries: 4800,
        hook: 'Four nights on the Strip. Suite views. Flights covered. No itinerary spreadsheet required.',
        images: [
          'https://images.unsplash.com/photo-1623107935331-7164fb0d6978?ixlib=rb-4.0.3&auto=format&fit=crop&w=1200&q=85',
          'https://images.unsplash.com/photo-1581351721010-8cf859cb14a4?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85',
          'https://images.unsplash.com/photo-1664020361093-79cdc912cfb2?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85',
          'https://images.unsplash.com/photo-1634400139456-292e44ca5327?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=85',
        ],
        lede: 'Four nights in a Strip-view suite at a 5-star property, round-trip flights, and resort credits toward shows and dining, built for a long weekend that feels bigger than four days.',
        sections: [
          {
            title: 'Package includes',
            type: 'includes',
            items: [
              'Round-trip flights to Las Vegas',
              '4 nights · Strip-view suite · 5-star hotel',
              'Resort fee coverage where applicable',
              'Dining & show credits (as specified in winner packet)',
            ],
          },
          {
            title: 'Where you\'ll spend your time',
            type: 'list',
            items: [
              'The Strip, Bellagio fountains, Caesars, LINQ, night walks without a plan',
              'Fremont Street, live music and classic Vegas energy',
              'Sphere / big-room shows, book with your included credits',
              'Red Rock Canyon, half-day escape if you want desert light',
              'High-end pools, cabana mornings before dinner reservations',
            ],
          },
          {
            title: 'Perfect if you want',
            type: 'list',
            items: [
              'A blowout weekend without coordinating flights and hotel separately',
              'A suite you\'d never book "just because" on a random weekend',
              'Photos that look like a campaign, not a staycation',
            ],
          },
        ],
        odds: 4800,
        bundles: { 1: { entries: 1, price: 10 }, 5: { entries: 5, price: 40, strike: 50, save: 10 }, 20: { entries: 20, price: 70, strike: 200, save: 130 } },
      },
      iphone: {
        back: '/prize-iphone.html',
        title: 'iPhone 17 Pro Max',
        cat: 'Tech · #4',
        value: '$1,299 value',
        draw: 'Draw July 5, 2026',
        maxEntries: 3000,
        hook: 'The phone you would have bought anyway, except someone else pays.',
        images: [
          '/images/iphone-hero.webp',
          '/images/iphone-closeup.webp',
          '/images/iphone-flat.webp',
        ],
        lede: 'Win a factory-unlocked iPhone 17 Pro Max (256GB) in Natural Titanium with AppleCare+ included, shipped to your door within days of the draw, ready to activate on your carrier.',
        sections: [
          {
            title: 'What\'s in the box',
            type: 'includes',
            items: [
              'iPhone 17 Pro Max · 256GB · Natural Titanium',
              'USB-C fast charging cable',
              'AppleCare+ (2 years), drops, battery, priority support',
              'Factory unlocked, works with major US carriers',
            ],
          },
          {
            title: 'Why this Pro Max',
            type: 'list',
            items: [
              'A19 Pro chip, fastest iPhone for games, video, and everyday speed',
              'Pro camera system, 48MP main, 5× optical telephoto, cinematic 4K',
              'All-day battery with USB-C fast charge',
              'Titanium frame, lighter feel, premium finish',
              'Action button, shortcuts to camera, voice memos, whatever you use daily',
            ],
          },
          {
            title: 'Built for',
            type: 'pills',
            items: ['4K video', 'Night photos', 'Mobile gaming', 'Face ID', 'MagSafe', 'Satellite SOS'],
          },
          {
            title: 'Perfect if you want',
            type: 'list',
            items: [
              'An upgrade without trading in or financing',
              'AppleCare from day one, no "should I add it?" debate at the store',
              'A prize you\'ll actually use every hour of every day',
            ],
          },
        ],
        odds: 3000,
        bundles: { 1: { entries: 1, price: 7 }, 5: { entries: 5, price: 28, strike: 35, save: 7 }, 20: { entries: 20, price: 50, strike: 140, save: 90 } },
      },
    };

    function showCheckoutNotice(message, isError) {
      const notice = document.querySelector('[data-checkout-notice]');
      if (!notice) return;
      notice.hidden = false;
      notice.textContent = message;
      notice.classList.toggle('is-error', Boolean(isError));
    }

    function initCheckoutPayMethods() {
      const form = document.getElementById('gaviom-checkout');
      const cardPanel = document.querySelector('[data-checkout-card-panel]');
      if (!form || !cardPanel) return;

      const sync = () => {
        const method = form.querySelector('input[name="pay_method"]:checked');
        const isCard = method && method.value === 'card';
        cardPanel.hidden = !isCard;
        if (isCard) {
          const card = cardPanel.querySelector('#card');
          if (card) card.focus({ preventScroll: true });
        }
      };

      form.querySelectorAll('input[name="pay_method"]').forEach((radio) => {
        radio.addEventListener('change', sync);
      });
      sync();
    }

    function initCheckoutForm() {
      const form = document.getElementById('gaviom-checkout');
      if (!form) return;

      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = form.querySelector('#email');
        const consent = form.querySelector('.co-consent input[type="checkbox"]');
        const method = form.querySelector('input[name="pay_method"]:checked');
        if (email && !email.value.trim()) {
          email.focus();
          showCheckoutNotice('Enter your email to continue.', true);
          return;
        }
        if (consent && !consent.checked) {
          consent.focus();
          showCheckoutNotice('Please confirm eligibility to continue.', true);
          return;
        }
        if (method && method.value === 'card') {
          const card = form.querySelector('#card');
          if (card && !card.value.trim()) {
            card.focus();
            showCheckoutNotice('Enter your card number.', true);
            return;
          }
        }
        const submit = form.querySelector('[data-checkout-submit], [data-bundle-cta]');
        if (submit) {
          submit.disabled = true;
          submit.textContent = 'Processing…';
        }
        const methodLabel = method ? method.value : 'payment';
        showCheckoutNotice(
          `Pre-sale preview — ${methodLabel} checkout opens at launch. You are not charged yet.`,
          false
        );
      });
    }

    function initCheckoutPrize() {
      const form = document.getElementById('gaviom-checkout');
      if (!form) return;

      const params = new URLSearchParams(window.location.search);
      const plan = params.get('plan');

      if (plan === 'monthly' || plan === 'annual') {
        initCheckoutMembership(plan);
        return;
      }

      const key = params.get('prize') || 'msc';
      const p = CHECKOUT_PRIZES[key] || CHECKOUT_PRIZES.msc;
      const bundleKey = params.get('bundle') || '5';
      const b = p.bundles[bundleKey] || p.bundles[5] || p.bundles[1];
      if (!b) return;

      const price = b.price;
      const entries = b.entries;
      const fmt = (n) => '$' + parseFloat(n).toFixed(2);

      const ticketWord = entries === 1 ? 'ticket' : 'tickets';
      const back = document.querySelector('[data-checkout-back]');
      const kicker = document.querySelector('[data-checkout-kicker]');
      const titleEl = document.querySelector('[data-checkout-title]');
      const detailLine = document.querySelector('[data-checkout-detail-line]');
      const ticketCount = document.querySelector('[data-checkout-ticket-count]');
      const eventName = document.querySelector('[data-checkout-event-name]');
      const coTotal = document.querySelector('[data-co-total]');
      const submit = document.querySelector('[data-checkout-submit], [data-bundle-cta]');
      const totalLabel = document.querySelector('.co-order-total-label');

      if (back) {
        back.href = p.back;
        back.textContent = '← Back';
      }
      if (kicker) kicker.textContent = 'Sweepstakes tickets';
      if (titleEl) titleEl.textContent = p.title;
      if (ticketCount) ticketCount.textContent = `${entries} ${ticketWord}`;
      if (eventName) eventName.textContent = p.title;
      if (detailLine) {
        detailLine.textContent = `${p.draw} · Odds 1 in ${p.odds.toLocaleString('en-US')}`;
      }
      if (totalLabel) totalLabel.textContent = 'Total for tickets';
      if (coTotal) coTotal.textContent = fmt(price);
      if (submit) {
        submit.textContent = document.body.classList.contains('gv-prelaunch')
          ? `Pre-order ${entries} ${ticketWord} — ${fmt(price)}`
          : `Pay ${fmt(price)} for ${entries} ${ticketWord}`;
      }
    }

    function initBrandHome() {
      document.querySelectorAll('header a.brand, .co-head a.brand, .footer-brand a.brand').forEach((el) => {
        const href = el.getAttribute('href');
        if (!href || href === '#') el.setAttribute('href', '/');
      });
    }

    function initHeroDreamVideo() {
      const section = document.querySelector('.hero-home--video');
      const root = document.querySelector('[data-hero-video]');
      const slideRoot = document.querySelector('[data-hero-slides]');
      if (!section || !root) return;

      const video = root.querySelector('.hero-home__clip');
      const content = section.querySelector('.hero-home__content');
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      let videoOk = false;
      let fallbackTimer = null;

      function ensureHeroContentVisible() {
        if (content) {
          content.style.opacity = '1';
          content.style.transform = 'none';
        }
      }

      function playClip() {
        if (!video) return Promise.resolve(false);
        video.muted = true;
        video.setAttribute('playsinline', '');
        video.loop = true;
        video.classList.add('is-active');
        const p = video.play();
        if (p && typeof p.then === 'function') return p.then(() => true).catch(() => false);
        return Promise.resolve(true);
      }

      function markVideoReady() {
        if (videoOk) return;
        videoOk = true;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        section.classList.add('hero-home--video-ready', 'hero-home--video-live');
        section.classList.remove('hero-home--video-fallback', 'hero-home--video-pending');
        if (slideRoot) slideRoot.hidden = true;
        ensureHeroContentVisible();
      }

      function markVideoFallback() {
        videoOk = false;
        if (fallbackTimer) clearTimeout(fallbackTimer);
        section.classList.remove('hero-home--video-ready', 'hero-home--video-live', 'hero-home--video-pending');
        section.classList.add('hero-home--video-fallback');
        if (slideRoot) {
          slideRoot.hidden = false;
        }
        if (video) {
          video.classList.remove('is-active');
          video.pause();
        }
        ensureHeroContentVisible();
      }

      function canUseVideo() {
        return video && video.readyState >= 2 && video.videoWidth > 0;
      }

      function startHeroVideo() {
        ensureHeroContentVisible();

        if (reducedMotion || !video) {
          markVideoFallback();
          return;
        }

        if (section.classList.contains('hero-home--video-live')) {
          playClip().catch(function () {});
          return;
        }

        section.classList.add('hero-home--video-pending');
        section.classList.remove('hero-home--video-fallback');
        if (slideRoot) slideRoot.hidden = true;

        if (canUseVideo()) {
          video.classList.add('is-active');
          playClip().then((ok) => {
            if (ok && canUseVideo()) markVideoReady();
            else if (!videoOk) markVideoFallback();
          });
          return;
        }

        videoOk = false;
        section.classList.remove('hero-home--video-ready', 'hero-home--video-live');

        if (fallbackTimer) clearTimeout(fallbackTimer);
        fallbackTimer = setTimeout(() => {
          if (!videoOk) markVideoFallback();
        }, 3500);

        playClip().then((ok) => {
          if (ok && canUseVideo()) markVideoReady();
          else if (!ok && !videoOk) markVideoFallback();
        });
      }

      if (!section.dataset.heroVideoBound) {
        section.dataset.heroVideoBound = '1';

        if (video) {
          if (section.classList.contains('hero-home--video-live')) {
            videoOk = true;
          } else {
            video.load();
          }
          video.addEventListener('playing', () => {
            if (video.videoWidth > 0) markVideoReady();
          });
          video.addEventListener('loadeddata', () => {
            if (canUseVideo()) {
              playClip().then((ok) => {
                if (ok) markVideoReady();
              });
            }
          });
          video.addEventListener('canplay', () => {
            if (canUseVideo() && !videoOk) {
              playClip().then((ok) => {
                if (ok) markVideoReady();
              });
            }
          });
          video.addEventListener('error', () => {
            if (!videoOk) markVideoFallback();
          });
        }

        document.addEventListener('visibilitychange', () => {
          if (!video) return;
          if (document.hidden) {
            video.pause();
            return;
          }
          ensureHeroContentVisible();
          if (videoOk) {
            playClip().then((ok) => {
              if (!ok) markVideoFallback();
            });
          } else {
            startHeroVideo();
          }
        });

        window.addEventListener('pageshow', (e) => {
          if (!e.persisted) return;
          ensureHeroContentVisible();
          startHeroVideo();
        });
      }

      startHeroVideo();
    }

    function initMemCard() {
      const scene = document.querySelector('[data-mem-card]');
      if (!scene) return;
      const inner = scene.querySelector('[data-mem-card-inner]');
      const glare = scene.querySelector('.mem-card-glare');
      const holo = scene.querySelector('.mem-pass__holo');
      const hint = scene.parentElement?.querySelector('.mem-card-hint');
      const isCoarse = window.matchMedia('(hover: none) and (pointer: coarse)').matches;
      const maxTilt = isCoarse ? 9 : 12;
      let flipped = false;
      let pressStart = null;

      if (hint && isCoarse) {
        hint.textContent = 'Touch to tilt · Tap to flip';
      }

      const setFlip = (on) => {
        flipped = on;
        scene.classList.toggle('is-flipped', flipped);
        const back = scene.querySelector('.mem-pass--back');
        const front = scene.querySelector('.mem-pass--front');
        if (back) back.setAttribute('aria-hidden', flipped ? 'false' : 'true');
        if (front) front.setAttribute('aria-hidden', flipped ? 'true' : 'false');
        if (inner) inner.style.transform = '';
        if (glare) glare.style.background = '';
        if (holo) holo.style.transform = '';
      };

      scene.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setFlip(!flipped);
        }
      });

      const applyTilt = (clientX, clientY) => {
        if (flipped) return;
        const rect = scene.getBoundingClientRect();
        const x = (clientX - rect.left) / rect.width - 0.5;
        const y = (clientY - rect.top) / rect.height - 0.5;
        if (inner) {
          inner.style.transform = `rotateY(${x * maxTilt * 2}deg) rotateX(${-y * maxTilt * 2}deg)`;
        }
        if (glare) {
          glare.style.background = `radial-gradient(circle at ${(x + 0.5) * 100}% ${(y + 0.5) * 100}%, rgba(255,255,255,0.22) 0%, transparent 52%)`;
        }
        if (holo) holo.style.transform = `translate(${x * 18}px, ${y * 14}px)`;
      };

      const resetTilt = () => {
        if (inner) inner.style.transform = '';
        if (glare) glare.style.background = '';
        if (holo) holo.style.transform = '';
      };

      scene.addEventListener('pointerdown', (e) => {
        if (e.pointerType === 'mouse' && e.button !== 0) return;
        pressStart = { x: e.clientX, y: e.clientY };
        scene.classList.add('is-pressed');
        if (typeof scene.setPointerCapture === 'function') {
          try {
            scene.setPointerCapture(e.pointerId);
          } catch (_) {
            /* ignore */
          }
        }
        applyTilt(e.clientX, e.clientY);
      });

      scene.addEventListener('pointermove', (e) => {
        if (flipped) return;
        applyTilt(e.clientX, e.clientY);
      });

      const endPress = (e) => {
        scene.classList.remove('is-pressed');
        if (isCoarse && pressStart && e) {
          const dx = e.clientX - pressStart.x;
          const dy = e.clientY - pressStart.y;
          if (dx * dx + dy * dy < 144) setFlip(!flipped);
        }
        pressStart = null;
        resetTilt();
        if (typeof scene.releasePointerCapture === 'function' && e) {
          try {
            scene.releasePointerCapture(e.pointerId);
          } catch (_) {
            /* ignore */
          }
        }
      };

      scene.addEventListener('pointerup', endPress);
      scene.addEventListener('pointercancel', endPress);
      scene.addEventListener('pointerleave', (e) => {
        if (e.pointerType === 'mouse') resetTilt();
      });

      if (!isCoarse) {
        scene.addEventListener('click', () => setFlip(!flipped));
      }
    }

    function initTouchPressFeedback() {
      if (!window.matchMedia('(hover: none) and (pointer: coarse)').matches) return;

      const targets = document.querySelectorAll(
        '.prize-card, a.spotlight, .grand-banner, .launch-card, .bundle-opt, .pd-thumb, .chip, a.btn, button.btn'
      );

      targets.forEach((el) => {
        el.addEventListener(
          'pointerdown',
          () => {
            el.classList.add('is-pressed');
          },
          { passive: true }
        );
        const clear = () => el.classList.remove('is-pressed');
        el.addEventListener('pointerup', clear);
        el.addEventListener('pointercancel', clear);
        el.addEventListener('pointerleave', clear);
      });
    }

    function initCorporateDemo() {
      document.querySelectorAll('[data-corp-pills]').forEach((group) => {
        const key = group.dataset.corpPills;
        const input = document.querySelector(`[data-corp-pill-input="${key}"]`);
        group.querySelectorAll('.corp-pill').forEach((pill) => {
          pill.addEventListener('click', () => {
            group.querySelectorAll('.corp-pill').forEach((p) => p.classList.remove('is-active'));
            pill.classList.add('is-active');
            if (input) input.value = pill.dataset.value || '';
          });
        });
      });

      const form = document.querySelector('[data-corp-demo]');
      if (!form) return;
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const email = form.querySelector('#corp-email');
        if (email && !email.value.trim()) {
          email.focus();
          return;
        }
        const btn = form.querySelector('[type="submit"]');
        if (btn) {
          btn.textContent = 'Request received';
          btn.disabled = true;
        }
      });
    }

    function boot() {
      tickCountdown();
      if (!window.__gaviomCdInterval) {
        window.__gaviomCdInterval = setInterval(tickCountdown, 1000);
      }
      const run = (fn) => {
        try {
          fn();
        } catch (err) {
          console.error('[Gaviom]', err);
        }
      };
      run(initBrandHome);
      run(initCorporateDemo);
      run(initMemCard);
      run(initTouchPressFeedback);
      run(initHeroDreamVideo);
      run(initStickyCta);
      run(initMobileNav);
      run(setupBundleSelector);
      run(initLiveCounters);
      run(initProgress);
      run(initChips);
      run(initThumbs);
      run(initPlaceholders);
      run(initGallery);
      run(initCheckoutPrize);
      run(initCheckoutPayMethods);
      run(initCheckoutForm);
    }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
