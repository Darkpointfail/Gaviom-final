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

    var submitBtn = qs('[type="submit"]', form);
    var errorEl = qs('[data-cr-apply-error]');

    function showError(message) {
      if (!errorEl) return;
      errorEl.textContent = message;
      errorEl.hidden = !message;
    }

    function setSubmitting(isSubmitting) {
      if (submitBtn) {
        submitBtn.disabled = isSubmitting;
        submitBtn.textContent = isSubmitting
          ? 'Envoi en cours…'
          : 'Soumettre ma candidature';
      }
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      showError('');

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
      if (!valid) {
        showError('Veuillez remplir tous les champs obligatoires.');
        return;
      }

      if (!window.GaviomAuth || !window.GaviomAuth.getAccessToken) {
        showError('Connectez-vous pour soumettre votre candidature.');
        return;
      }

      var params = new URLSearchParams(window.location.search || '');
      var payload = {};
      qsa('input, select, textarea', form).forEach(function (field) {
        if (!field.name) return;
        payload[field.name] = field.value.trim();
      });
      payload.source = params.get('from') === 'account' ? 'gaviom-account-creator' : 'gaviom-creator-apply';
      payload.submittedAt = new Date().toISOString();

      setSubmitting(true);

      window.GaviomAuth.getAccessToken()
        .then(function (token) {
          if (!token) {
            window.location.replace(
              '/signin.html?next=' + encodeURIComponent(window.location.pathname + window.location.search)
            );
            throw new Error('Sign in required');
          }
          return fetch('/api/creator-application', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: 'Bearer ' + token,
            },
            body: JSON.stringify(payload),
          });
        })
        .then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            return { ok: res.ok, status: res.status, data: data };
          });
        })
        .then(function (result) {
          if (!result.ok) {
            if (result.status === 401) {
              window.location.replace(
                '/signin.html?next=' + encodeURIComponent(window.location.pathname + window.location.search)
              );
              return;
            }
            throw new Error(
              (result.data && result.data.error) ||
                'Impossible d\'envoyer la candidature. Réessayez dans un instant.'
            );
          }

          var success = qs('[data-cr-apply-success]');
          var card = qs('[data-cr-apply-card]');
          if (card) card.hidden = true;
          if (success) success.hidden = false;
          window.scrollTo({ top: 0, behavior: 'smooth' });
        })
        .catch(function (err) {
          if (err.message !== 'Sign in required') {
            showError(err.message || 'Impossible d\'envoyer la candidature.');
          }
        })
        .finally(function () {
          setSubmitting(false);
        });
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
          window.location.replace(
            '/signin.html?next=' +
              encodeURIComponent(window.location.pathname + window.location.search)
          );
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

  /* One-page creator dashboard (sweepstakes selector + analytics) */
  var DASH_MOCK_SWEEPSTAKES = {
    miami: {
      id: 'miami',
      title: 'Miami Getaway — 5 nuits + vols',
      meta: 'Live · $12 / entrée',
      emoji: '🌴',
      status: 'live',
      statusLabel: 'En ligne',
      banner: '',
      ticketPrice: 12,
      prizeValue: 4200,
      cap: 1000,
      drawDate: '15 mars 2026',
      publicUrl: '/creators/demo/miami-getaway',
      defaultListing: {
        publicTitle: 'Gagnez 5 nuits à Miami + vols',
        description:
          'Rejoignez mon giveaway pour tenter de gagner un séjour de 5 nuits à Miami Beach avec vols inclus. Hôtel 4★ en bord de mer, petits-déjeuners et transferts aéroport — le rêve d\'une escapade Floride avec Gaviom, sweepstakes vérifié et tirage équitable.',
        coverImage: '/images/cruise-hero-1280w.webp',
        gallery: ['/images/cruise-hero-800w.webp', '/images/home-eight-oclock-villa-800w.webp'],
      },
      tickets: 684,
      ticketsDelta: '+12% vs sem. dernière',
      revenue: 8208,
      revenueDelta: '+18% vs sem. dernière',
      buyers: 412,
      buyersDelta: '+9% nouveaux acheteurs',
      feePct: 0.15,
      sales7: [42, 58, 51, 72, 88, 95, 110],
      sales30: [12, 18, 22, 28, 35, 40, 48, 52, 55, 60, 58, 62, 70, 75, 80, 88, 92, 98, 105, 110, 108, 115, 120, 118, 125, 130, 128, 132, 140, 145],
      purchases: [
        { name: 'Sarah M.', email: 's.m***@gmail.com', entries: 5, amount: 60, date: '10 juil. 2026', status: 'Payé' },
        { name: 'James K.', email: 'j.k***@yahoo.com', entries: 10, amount: 120, date: '10 juil. 2026', status: 'Payé' },
        { name: 'Emily R.', email: 'emily.r***@outlook.com', entries: 3, amount: 36, date: '9 juil. 2026', status: 'Payé' },
        { name: 'Marcus T.', email: 'marcus***@icloud.com', entries: 8, amount: 96, date: '9 juil. 2026', status: 'Payé' },
        { name: 'Lisa P.', email: 'lisa.p***@gmail.com', entries: 2, amount: 24, date: '8 juil. 2026', status: 'Payé' },
        { name: 'David W.', email: 'd.w***@hotmail.com', entries: 15, amount: 180, date: '8 juil. 2026', status: 'Payé' },
        { name: 'Anna C.', email: 'anna.c***@gmail.com', entries: 4, amount: 48, date: '7 juil. 2026', status: 'Payé' },
      ],
    },
    vegas: {
      id: 'vegas',
      title: 'Vegas Weekend Escape',
      meta: 'En revue · $8 / entrée',
      emoji: '🎰',
      status: 'review',
      statusLabel: 'En revue Gaviom',
      banner: 'Complétez votre annonce ci-dessous (photos + description) pendant la revue Gaviom. Les ventes démarreront après approbation.',
      ticketPrice: 8,
      prizeValue: 2800,
      cap: 500,
      drawDate: '—',
      publicUrl: '',
      defaultListing: {
        publicTitle: 'Vegas Weekend Escape',
        description: '',
        coverImage: '',
        gallery: [],
      },
      tickets: 0,
      ticketsDelta: '',
      revenue: 0,
      revenueDelta: '',
      buyers: 0,
      buyersDelta: '',
      feePct: 0.15,
      sales7: [0, 0, 0, 0, 0, 0, 0],
      sales30: [],
      purchases: [],
    },
  };

  function fmtMoney(n) {
    if (!n) return '$0';
    if (n >= 1000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + n.toLocaleString('en-US');
  }

  function initDashboardOnePage() {
    var root = qs('[data-cr-dashboard]');
    var one = qs('[data-cr-dash-content]');
    if (!root || !one || !one.classList.contains('cr-dash-one')) return;

    var state = { id: 'miami', range: 7 };
    var ids = Object.keys(DASH_MOCK_SWEEPSTAKES);
    var listingDraft = { publicTitle: '', description: '', coverImage: '', gallery: [] };

    function listingStorageKey(swId) {
      var uid = window.__crDashUserId || 'demo';
      return 'gaviom-sw-listing:v1:' + uid + ':' + swId;
    }

    function loadListingFromStorage(swId) {
      var sw = DASH_MOCK_SWEEPSTAKES[swId];
      var defaults = (sw && sw.defaultListing) || {
        publicTitle: sw ? sw.title : '',
        description: '',
        coverImage: '',
        gallery: [],
      };
      try {
        var raw = localStorage.getItem(listingStorageKey(swId));
        if (!raw) return Object.assign({}, defaults);
        return Object.assign({}, defaults, JSON.parse(raw));
      } catch (e) {
        return Object.assign({}, defaults);
      }
    }

    function saveListingToStorage(swId, data) {
      try {
        localStorage.setItem(listingStorageKey(swId), JSON.stringify(data));
        return true;
      } catch (e) {
        return false;
      }
    }

    function compressImageFile(file, maxWidth, targetBytes) {
      maxWidth = maxWidth || 1600;
      targetBytes = targetBytes || 450000;

      return new Promise(function (resolve, reject) {
        if (!file) {
          reject(new Error('Aucun fichier sélectionné.'));
          return;
        }
        if (!file.type || file.type.indexOf('image/') !== 0) {
          reject(new Error('Choisissez une image (JPG, PNG, HEIC…).'));
          return;
        }

        var reader = new FileReader();
        reader.onload = function () {
          var img = new Image();
          img.onload = function () {
            var scale = Math.min(1, maxWidth / img.width, maxWidth / img.height);
            var w = Math.max(1, Math.round(img.width * scale));
            var h = Math.max(1, Math.round(img.height * scale));
            var canvas = document.createElement('canvas');
            canvas.width = w;
            canvas.height = h;
            var ctx = canvas.getContext('2d');
            if (!ctx) {
              reject(new Error('Impossible de traiter l\'image.'));
              return;
            }
            ctx.drawImage(img, 0, 0, w, h);

            var quality = 0.88;
            var dataUrl = canvas.toDataURL('image/jpeg', quality);
            while (dataUrl.length > targetBytes * 1.4 && quality > 0.35) {
              quality -= 0.07;
              dataUrl = canvas.toDataURL('image/jpeg', quality);
            }
            if (dataUrl.length > targetBytes * 1.4) {
              reject(
                new Error(
                  'Image encore trop lourde après compression. Essayez une photo plus petite.'
                )
              );
              return;
            }
            resolve(dataUrl);
          };
          img.onerror = function () {
            reject(
              new Error(
                'Format non supporté par le navigateur. Exportez en JPG ou PNG et réessayez.'
              )
            );
          };
          img.src = reader.result;
        };
        reader.onerror = function () {
          reject(new Error('Impossible de lire le fichier.'));
        };
        reader.readAsDataURL(file);
      });
    }

    function setCoverLoading(isLoading) {
      var loading = qs('[data-cr-edit-cover-loading]', root);
      var btn = qs('[data-cr-edit-cover-btn]', root);
      if (loading) loading.hidden = !isLoading;
      if (btn) btn.disabled = isLoading;
    }

    function applyCoverFile(file) {
      if (!file) return;
      setCoverLoading(true);
      showEditMsg('', false);
      compressImageFile(file)
        .then(function (dataUrl) {
          listingDraft.coverImage = dataUrl;
          renderCoverPreview();
          syncListingPreview();
          showEditMsg('Photo ajoutée — cliquez « Enregistrer l\'annonce » pour sauvegarder.', false);
        })
        .catch(function (err) {
          showEditMsg(err.message || 'Impossible d\'ajouter la photo.', true);
        })
        .finally(function () {
          setCoverLoading(false);
        });
    }

    function syncListingPreview() {
      var titleEl = qs('[data-cr-preview-title]', root);
      var descEl = qs('[data-cr-preview-desc]', root);
      var coverImg = qs('[data-cr-preview-cover-img]', root);
      var coverEmpty = qs('.cr-dash-edit__preview-cover-empty', root);
      var galleryEl = qs('[data-cr-preview-gallery]', root);

      if (titleEl) titleEl.textContent = listingDraft.publicTitle || 'Titre du sweepstakes';
      if (descEl) {
        descEl.textContent =
          listingDraft.description ||
          'Ajoutez une description pour présenter votre lot à votre communauté.';
      }

      if (coverImg && coverEmpty) {
        if (listingDraft.coverImage) {
          coverImg.src = listingDraft.coverImage;
          coverImg.hidden = false;
          coverEmpty.hidden = true;
        } else {
          coverImg.removeAttribute('src');
          coverImg.hidden = true;
          coverEmpty.hidden = false;
        }
      }

      if (galleryEl) {
        galleryEl.innerHTML = (listingDraft.gallery || [])
          .map(function (src) {
            return '<img src="' + src + '" alt="" />';
          })
          .join('');
      }

      var statusEl = qs('[data-cr-edit-status]', root);
      if (statusEl) {
        var complete =
          listingDraft.publicTitle &&
          listingDraft.description &&
          listingDraft.description.length >= 80 &&
          listingDraft.coverImage;
        statusEl.textContent = complete ? 'Annonce complète' : 'À compléter';
        statusEl.classList.toggle('cr-status-pill--live', !!complete);
      }
    }

    function renderCoverPreview() {
      var empty = qs('[data-cr-edit-cover-empty]', root);
      var preview = qs('[data-cr-edit-cover-preview]', root);
      var img = qs('[data-cr-edit-cover-img]', root);
      if (!empty || !preview || !img) return;

      if (listingDraft.coverImage) {
        empty.hidden = true;
        preview.hidden = false;
        img.src = listingDraft.coverImage;
      } else {
        empty.hidden = false;
        preview.hidden = true;
        img.removeAttribute('src');
      }
    }

    function renderGalleryEditor() {
      var gallery = qs('[data-cr-edit-gallery]', root);
      var btn = qs('[data-cr-edit-gallery-btn]', root);
      if (!gallery) return;

      gallery.innerHTML = (listingDraft.gallery || [])
        .map(function (src, idx) {
          return (
            '<div class="cr-dash-gallery__item">' +
            '<img src="' +
            src +
            '" alt="" />' +
            '<button type="button" data-cr-gallery-remove="' +
            idx +
            '" aria-label="Supprimer">×</button></div>'
          );
        })
        .join('');

      if (btn) {
        btn.hidden = (listingDraft.gallery || []).length >= 4;
      }

      qsa('[data-cr-gallery-remove]', gallery).forEach(function (btnEl) {
        btnEl.addEventListener('click', function () {
          var i = parseInt(btnEl.getAttribute('data-cr-gallery-remove'), 10);
          listingDraft.gallery.splice(i, 1);
          renderGalleryEditor();
          syncListingPreview();
        });
      });
    }

    function loadListingForm(swId) {
      listingDraft = loadListingFromStorage(swId);

      var titleInput = qs('[data-cr-edit-title]', root);
      var descInput = qs('[data-cr-edit-description]', root);
      if (titleInput) titleInput.value = listingDraft.publicTitle || '';
      if (descInput) descInput.value = listingDraft.description || '';

      renderCoverPreview();
      renderGalleryEditor();
      syncListingPreview();

      var msg = qs('[data-cr-edit-msg]', root);
      if (msg) msg.hidden = true;
    }

    function showEditMsg(text, isError) {
      var msg = qs('[data-cr-edit-msg]', root);
      if (!msg) return;
      msg.hidden = !text;
      msg.textContent = text || '';
      msg.classList.toggle('is-error', !!isError);
    }

    function initListingEditor() {
      var form = qs('[data-cr-listing-form]', root);
      if (!form) return;

      var coverInput = qs('[data-cr-edit-cover-input]', root);
      var coverBtn = qs('[data-cr-edit-cover-btn]', root);
      var coverZone = qs('[data-cr-edit-cover-zone]', root);
      var coverRemove = qs('[data-cr-edit-cover-remove]', root);
      var galleryInput = qs('[data-cr-edit-gallery-input]', root);
      var galleryBtn = qs('[data-cr-edit-gallery-btn]', root);

      if (coverBtn && coverInput) {
        coverBtn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          coverInput.click();
        });
      }

      if (coverZone && coverInput) {
        coverZone.addEventListener('click', function (e) {
          if (e.target.closest('[data-cr-edit-cover-remove]')) return;
          if (e.target.closest('[data-cr-edit-cover-btn]')) return;
          if (!listingDraft.coverImage || e.target.closest('[data-cr-edit-cover-empty]')) {
            coverInput.click();
          }
        });

        coverZone.addEventListener('dragover', function (e) {
          e.preventDefault();
          coverZone.classList.add('is-dragover');
        });
        coverZone.addEventListener('dragleave', function () {
          coverZone.classList.remove('is-dragover');
        });
        coverZone.addEventListener('drop', function (e) {
          e.preventDefault();
          coverZone.classList.remove('is-dragover');
          var file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
          applyCoverFile(file);
        });

        coverInput.addEventListener('change', function () {
          var file = coverInput.files && coverInput.files[0];
          coverInput.value = '';
          applyCoverFile(file);
        });
      }

      if (coverRemove) {
        coverRemove.addEventListener('click', function (e) {
          e.stopPropagation();
          listingDraft.coverImage = '';
          renderCoverPreview();
          syncListingPreview();
        });
      }

      if (galleryBtn && galleryInput) {
        galleryBtn.addEventListener('click', function () {
          galleryInput.click();
        });
        galleryInput.addEventListener('change', function () {
          var files = Array.prototype.slice.call(galleryInput.files || []);
          galleryInput.value = '';
          var room = 4 - (listingDraft.gallery || []).length;
          if (room <= 0) return;

          showEditMsg('Compression des photos…', false);
          Promise.all(
            files.slice(0, room).map(function (f) {
              return compressImageFile(f);
            })
          )
            .then(function (urls) {
              listingDraft.gallery = (listingDraft.gallery || []).concat(urls);
              renderGalleryEditor();
              syncListingPreview();
              showEditMsg(urls.length + ' photo(s) ajoutée(s).', false);
            })
            .catch(function (err) {
              showEditMsg(err.message, true);
            });
        });
      }

      qsa('[data-cr-edit-title], [data-cr-edit-description]', form).forEach(function (el) {
        el.addEventListener('input', function () {
          listingDraft.publicTitle = (qs('[data-cr-edit-title]', root) || {}).value || '';
          listingDraft.description = (qs('[data-cr-edit-description]', root) || {}).value || '';
          syncListingPreview();
        });
      });

      form.addEventListener('submit', function (e) {
        e.preventDefault();
        listingDraft.publicTitle = (qs('[data-cr-edit-title]', root) || {}).value.trim();
        listingDraft.description = (qs('[data-cr-edit-description]', root) || {}).value.trim();

        if (!listingDraft.publicTitle) {
          showEditMsg('Ajoutez un titre public.', true);
          return;
        }
        if (listingDraft.description.length < 80) {
          showEditMsg('La description doit contenir au moins 80 caractères.', true);
          return;
        }
        if (!listingDraft.coverImage) {
          showEditMsg('Ajoutez une photo de couverture.', true);
          return;
        }

        if (!saveListingToStorage(state.id, listingDraft)) {
          showEditMsg('Erreur de sauvegarde — images peut-être trop lourdes.', true);
          return;
        }

        showEditMsg('Annonce enregistrée avec succès.', false);
        syncListingPreview();
      });
    }

    initListingEditor();

    function renderPickerMenu() {
      var menu = qs('[data-cr-dash-picker-menu]', root);
      if (!menu) return;
      menu.innerHTML = ids
        .map(function (id) {
          var sw = DASH_MOCK_SWEEPSTAKES[id];
          return (
            '<li role="option">' +
            '<button type="button" class="cr-dash-picker__option' +
            (id === state.id ? ' is-active' : '') +
            '" data-cr-dash-pick="' +
            id +
            '">' +
            '<span class="cr-dash-picker__thumb">' +
            sw.emoji +
            '</span>' +
            '<span class="cr-dash-picker__text"><strong>' +
            sw.title +
            '</strong><small>' +
            sw.meta +
            '</small></span>' +
            '</button></li>'
          );
        })
        .join('');
    }

    function renderChart(values) {
      var svg = qs('[data-cr-chart-svg]', root);
      var empty = qs('[data-cr-chart-empty]', root);
      var chart = qs('[data-cr-dash-chart]', root);
      if (!svg) return;

      if (!values || !values.length || values.every(function (v) { return !v; })) {
        if (chart) chart.hidden = true;
        if (empty) empty.hidden = false;
        svg.innerHTML = '';
        return;
      }

      if (chart) chart.hidden = false;
      if (empty) empty.hidden = true;

      var w = 640;
      var h = 220;
      var pad = { t: 16, r: 12, b: 28, l: 12 };
      var max = Math.max.apply(null, values.concat([1]));
      var step = (w - pad.l - pad.r) / Math.max(values.length - 1, 1);

      var points = values.map(function (v, i) {
        var x = pad.l + i * step;
        var y = pad.t + (h - pad.t - pad.b) * (1 - v / max);
        return x + ',' + y;
      });

      var area =
        'M' +
        pad.l +
        ',' +
        (h - pad.b) +
        ' L' +
        points.join(' L') +
        ' L' +
        (pad.l + (values.length - 1) * step) +
        ',' +
        (h - pad.b) +
        ' Z';

      var grids = [0.25, 0.5, 0.75].map(function (pct) {
        var y = pad.t + (h - pad.t - pad.b) * pct;
        return '<line class="cr-dash-chart-grid" x1="' + pad.l + '" y1="' + y + '" x2="' + (w - pad.r) + '" y2="' + y + '"/>';
      });

      svg.innerHTML =
        '<defs><linearGradient id="crChartGradient" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#c8a96a"/><stop offset="100%" stop-color="#c8a96a" stop-opacity="0"/></linearGradient></defs>' +
        grids.join('') +
        '<path class="cr-dash-chart-area" d="' +
        area +
        '"/>' +
        '<polyline class="cr-dash-chart-line" points="' +
        points.join(' ') +
        '"/>';
    }

    function renderSweepstakes(id) {
      var sw = DASH_MOCK_SWEEPSTAKES[id];
      if (!sw) return;
      state.id = id;

      var title = qs('[data-cr-dash-picker-title]', root);
      var meta = qs('[data-cr-dash-picker-meta]', root);
      if (title) title.textContent = sw.title;
      if (meta) meta.textContent = sw.meta;

      var banner = qs('[data-cr-dash-banner]', root);
      if (banner) {
        if (sw.banner) {
          banner.hidden = false;
          banner.textContent = sw.banner;
        } else {
          banner.hidden = true;
        }
      }

      var earnings = Math.round(sw.revenue * (1 - sw.feePct));
      qs('[data-cr-metric-tickets]', root).textContent = sw.tickets.toLocaleString('en-US');
      qs('[data-cr-metric-revenue]', root).textContent = fmtMoney(sw.revenue);
      qs('[data-cr-metric-buyers]', root).textContent = sw.buyers.toLocaleString('en-US');
      qs('[data-cr-metric-earnings]', root).textContent = fmtMoney(earnings);

      qs('[data-cr-metric-tickets-delta]', root).textContent = sw.ticketsDelta || '';
      qs('[data-cr-metric-revenue-delta]', root).textContent = sw.revenueDelta || '';
      qs('[data-cr-metric-buyers-delta]', root).textContent = sw.buyersDelta || '';
      qs('[data-cr-metric-earnings-note]', root).textContent =
        sw.revenue > 0 ? 'Après commission Gaviom (' + Math.round(sw.feePct * 100) + '%)' : '';

      var progress = sw.cap ? Math.min(100, Math.round((sw.tickets / sw.cap) * 100)) : 0;
      qs('[data-cr-summary-price]', root).textContent = '$' + sw.ticketPrice + ' / entrée';
      qs('[data-cr-summary-prize-value]', root).textContent = fmtMoney(sw.prizeValue);
      qs('[data-cr-summary-cap]', root).textContent = sw.cap.toLocaleString('en-US') + ' max';
      qs('[data-cr-summary-progress]', root).textContent = progress + '%';
      var bar = qs('[data-cr-summary-progress-bar]', root);
      if (bar) bar.style.width = progress + '%';
      qs('[data-cr-summary-draw]', root).textContent = sw.drawDate;
      qs('[data-cr-summary-status]', root).textContent = sw.statusLabel;

      var pageBtn = qs('[data-cr-summary-page]', root);
      if (pageBtn) {
        if (sw.publicUrl) {
          pageBtn.hidden = false;
          pageBtn.href = sw.publicUrl;
        } else {
          pageBtn.hidden = true;
        }
      }

      var values = state.range === 7 ? sw.sales7 : sw.sales30;
      qs('[data-cr-chart-subtitle]', root).textContent =
        state.range === 7 ? '7 derniers jours' : '30 derniers jours';
      renderChart(values);

      var tbody = qs('[data-cr-buyers-body]', root);
      var empty = qs('[data-cr-buyers-empty]', root);
      var table = qs('[data-cr-buyers-table]', root);
      var count = qs('[data-cr-buyers-count]', root);

      if (count) count.textContent = sw.purchases.length + ' achat' + (sw.purchases.length > 1 ? 's' : '');

      if (!sw.purchases.length) {
        if (table) table.hidden = true;
        if (empty) empty.hidden = false;
        if (tbody) tbody.innerHTML = '';
      } else {
        if (table) table.hidden = false;
        if (empty) empty.hidden = true;
        if (tbody) {
          tbody.innerHTML = sw.purchases
            .map(function (p) {
              return (
                '<tr><td><strong>' +
                p.name +
                '</strong></td><td>' +
                p.email +
                '</td><td>' +
                p.entries +
                '</td><td>' +
                fmtMoney(p.amount) +
                '</td><td>' +
                p.date +
                '</td><td><span class="cr-status-pill cr-status-pill--live">' +
                p.status +
                '</span></td></tr>'
              );
            })
            .join('');
        }
      }

      renderPickerMenu();
      loadListingForm(id);
    }

    var trigger = qs('[data-cr-dash-picker-trigger]', root);
    var menu = qs('[data-cr-dash-picker-menu]', root);

    if (trigger && menu) {
      trigger.addEventListener('click', function () {
        var open = !menu.hidden;
        menu.hidden = open;
        trigger.setAttribute('aria-expanded', open ? 'false' : 'true');
      });

      menu.addEventListener('click', function (e) {
        var btn = e.target.closest('[data-cr-dash-pick]');
        if (!btn) return;
        renderSweepstakes(btn.getAttribute('data-cr-dash-pick'));
        menu.hidden = true;
        trigger.setAttribute('aria-expanded', 'false');
      });

      document.addEventListener('click', function (e) {
        if (!e.target.closest('[data-cr-dash-picker]')) {
          menu.hidden = true;
          trigger.setAttribute('aria-expanded', 'false');
        }
      });
    }

    qsa('[data-cr-chart-range] [data-range]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('[data-cr-chart-range] [data-range]', root).forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
        state.range = parseInt(btn.getAttribute('data-range'), 10) || 7;
        renderSweepstakes(state.id);
      });
    });

    renderSweepstakes(state.id);
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

  /* Dashboard access gate (approved creators only) */
  function initDashboardGate() {
    var root = qs('[data-cr-dashboard]');
    if (!root) return;

    var gate = qs('[data-cr-dash-gate]');
    var content = qs('[data-cr-dash-content]');

    function showGate(kind, message) {
      if (content) content.hidden = true;
      if (!gate) return;
      gate.hidden = false;
      qsa('[data-cr-dash-gate-panel]', gate).forEach(function (panel) {
        panel.hidden = panel.getAttribute('data-cr-dash-gate-panel') !== kind;
      });
      var msgEl = qs('[data-cr-dash-gate-message]', gate);
      if (msgEl && message) msgEl.textContent = message;
    }

    function allowDashboard(profile) {
      if (gate) gate.hidden = true;
      if (content) content.hidden = false;
      if (profile) {
        var nameEl = qs('[data-cr-dash-creator-name]');
        if (nameEl) {
          var full = [profile.first_name, profile.last_name].filter(Boolean).join(' ').trim();
          if (full) nameEl.textContent = full.split(' ')[0];
        }
      }
    }

    function checkProfile(client, user) {
      client
        .from('profiles')
        .select('creator_status,first_name,last_name,creator_slug')
        .eq('id', user.id)
        .maybeSingle()
        .then(function (result) {
          var status = (result.data && result.data.creator_status) || 'none';
          if (status === 'approved') {
            window.__crDashUserId = user.id;
            allowDashboard(result.data);
            return;
          }
          if (status === 'pending') {
            showGate('pending');
            return;
          }
          if (status === 'rejected') {
            showGate('rejected');
            return;
          }
          showGate('none');
        })
        .catch(function () {
          showGate('none', 'Impossible de vérifier votre accès creator.');
        });
    }

    function start() {
      if (!window.GaviomAuth) {
        window.location.replace('/signin.html?next=' + encodeURIComponent('/creators/dashboard'));
        return;
      }
      window.GaviomAuth.waitForSession(6000).then(function (session) {
        if (!session || !session.user) {
          window.location.replace('/signin.html?next=' + encodeURIComponent('/creators/dashboard'));
          return;
        }
        if (window.GaviomAuth.isEmailConfirmed && !window.GaviomAuth.isEmailConfirmed(session.user)) {
          window.location.replace(
            '/verify-email.html?verify=required&next=' + encodeURIComponent('/creators/dashboard')
          );
          return;
        }
        var client =
          typeof window.GaviomAuth.getClient === 'function' ? window.GaviomAuth.getClient() : null;
        if (!client) {
          showGate('none', 'Auth client unavailable.');
          return;
        }
        checkProfile(client, session.user);
      });
    }

    if (window.GaviomAuth) start();
    else window.addEventListener('load', start, { once: true });
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
    initDashboardOnePage();
    initWizard();
    initCountdown();
    initDashboardGate();
    initHeroProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
