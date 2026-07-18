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
  function fmtMoney(n) {
    if (!n) return '$0';
    if (n >= 1000) return '$' + (n / 1000).toFixed(1).replace(/\.0$/, '') + 'K';
    return '$' + n.toLocaleString('en-US');
  }

  function normalizeSweepstakes(item) {
    var a = item.analytics || {};
    return {
      id: item.id,
      title: item.title,
      meta: item.meta,
      emoji: item.emoji || '🎁',
      status: item.status,
      statusLabel: item.statusLabel,
      banner: item.banner || '',
      ticketPrice: item.ticketPrice,
      prizeValue: item.prizeValue,
      cap: item.cap,
      drawDate: item.drawDate,
      publicUrl: item.publicUrl || '',
      defaultListing: item.listing || {
        publicTitle: item.title || '',
        description: '',
        coverImage: '',
        gallery: [],
      },
      tickets: a.tickets || 0,
      ticketsDelta: a.ticketsDelta || '',
      revenue: a.revenue || 0,
      revenueDelta: a.revenueDelta || '',
      buyers: a.buyers || 0,
      buyersDelta: a.buyersDelta || '',
      feePct: a.feePct || 0.15,
      sales7: a.sales7 || [0, 0, 0, 0, 0, 0, 0],
      sales30: a.sales30 || [],
      purchases: a.purchases || [],
    };
  }

  function initDashboardOnePage() {
    var root = qs('[data-cr-dashboard]');
    var one = qs('[data-cr-dash-content]');
    if (!root || !one || !one.classList.contains('cr-dash-one')) return;

    var state = { id: null, range: 7, sweepstakes: {}, loaded: false, loading: false, error: null };
    var listingDraft = { publicTitle: '', description: '', coverImage: '', gallery: [] };

    function sweepstakesIds() {
      return Object.keys(state.sweepstakes);
    }

    function dashboardApi(path, options) {
      options = options || {};
      if (!window.GaviomAuth || !window.GaviomAuth.getAccessToken) {
        return Promise.reject(new Error('Connectez-vous pour accéder au dashboard.'));
      }
      return window.GaviomAuth.getAccessToken().then(function (token) {
        if (!token) throw new Error('Connectez-vous pour accéder au dashboard.');
        return fetch(path, {
          method: options.method || 'GET',
          headers: Object.assign(
            { Authorization: 'Bearer ' + token },
            options.body ? { 'Content-Type': 'application/json' } : {},
            options.headers || {}
          ),
          body: options.body ? JSON.stringify(options.body) : undefined,
        }).then(function (res) {
          return res.json().catch(function () {
            return {};
          }).then(function (data) {
            if (!res.ok) {
              throw new Error((data && data.error) || 'Impossible de charger le dashboard.');
            }
            return data;
          });
        });
      });
    }

    function setDashboardLoading(isLoading) {
      state.loading = !!isLoading;
      var sub = qs('.cr-dash-one__sub', root);
      if (sub && isLoading) sub.textContent = 'Chargement de vos données…';
    }

    function setDashboardError(message) {
      state.error = message || null;
      var sub = qs('.cr-dash-one__sub', root);
      if (sub && message) sub.textContent = message;
    }

    function loadDashboardData() {
      if (state.loading) return Promise.resolve();
      setDashboardLoading(true);
      setDashboardError(null);

      return dashboardApi('/api/creator-dashboard?action=list')
        .then(function (data) {
          var map = {};
          (data.sweepstakes || []).forEach(function (item) {
            map[item.id] = normalizeSweepstakes(item);
          });
          state.sweepstakes = map;
          state.loaded = true;
          var ids = sweepstakesIds();
          if (!state.id && ids.length) state.id = ids[0];
          if (state.id && !map[state.id] && ids.length) state.id = ids[0];

          var sub = qs('.cr-dash-one__sub', root);
          if (sub) {
            sub.textContent =
              ids.length === 0
                ? 'Aucun sweepstakes pour le moment — soumettez une candidature creator.'
                : 'Vue d\'ensemble de vos ventes, participants et revenus.';
          }

          if (state.id) renderSweepstakes(state.id);
          else renderEmptyDashboard();
          renderPickerMenu();

          if (window.__crDashPendingMode && typeof window.__crDashApplyPendingSetup === 'function') {
            window.__crDashApplyPendingSetup();
          }
        })
        .catch(function (err) {
          setDashboardError(err.message || 'Impossible de charger le dashboard.');
        })
        .finally(function () {
          setDashboardLoading(false);
        });
    }

    window.__crDashLoadData = loadDashboardData;

    function renderEmptyDashboard() {
      var title = qs('[data-cr-dash-picker-title]', root);
      var meta = qs('[data-cr-dash-picker-meta]', root);
      if (title) title.textContent = 'Aucun sweepstakes';
      if (meta) meta.textContent = 'Soumettez une candidature';
      var menu = qs('[data-cr-dash-picker-menu]', root);
      if (menu) menu.innerHTML = '';
    }

    function loadListingFromSweepstakes(swId) {
      var sw = state.sweepstakes[swId];
      var defaults = (sw && sw.defaultListing) || {
        publicTitle: sw ? sw.title : '',
        description: '',
        coverImage: '',
        gallery: [],
      };
      return Object.assign({}, defaults);
    }

    function saveListingToApi(swId, data) {
      return dashboardApi('/api/creator-dashboard?action=listing', {
        method: 'PATCH',
        body: {
          sweepstakesId: swId,
          publicTitle: data.publicTitle,
          description: data.description,
          coverImage: data.coverImage,
          gallery: data.gallery || [],
        },
      });
    }

    function compressImageFile(file, maxWidth, targetBytes) {
      maxWidth = maxWidth || 1600;
      targetBytes = targetBytes || 450000;

      return new Promise(function (resolve, reject) {
        if (!file) {
          reject(new Error('Aucun fichier sélectionné.'));
          return;
        }
        if (file.type && file.type.indexOf('image/') !== 0) {
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
      var zone = qs('[data-cr-edit-cover-zone]', root);
      if (loading) loading.hidden = !isLoading;
      if (zone) zone.classList.toggle('is-loading', !!isLoading);
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
      var coverInput = qs('[data-cr-edit-cover-input]', root);
      if (!empty || !preview || !img) return;

      if (listingDraft.coverImage) {
        empty.hidden = true;
        preview.hidden = false;
        img.src = listingDraft.coverImage;
        if (coverInput) coverInput.classList.add('is-disabled');
      } else {
        empty.hidden = false;
        preview.hidden = true;
        img.removeAttribute('src');
        if (coverInput) coverInput.classList.remove('is-disabled');
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
      listingDraft = loadListingFromSweepstakes(swId);

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

      var coverZone = qs('[data-cr-edit-cover-zone]', root);
      var coverRemove = qs('[data-cr-edit-cover-remove]', root);

      root.addEventListener('change', function (e) {
        var target = e.target;
        if (!target || !target.matches) return;

        if (target.matches('[data-cr-edit-cover-input]')) {
          var coverFile = target.files && target.files[0];
          target.value = '';
          applyCoverFile(coverFile);
          return;
        }

        if (target.matches('[data-cr-edit-gallery-input]')) {
          var files = Array.prototype.slice.call(target.files || []);
          target.value = '';
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
        }
      });

      if (coverZone) {
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
      }

      if (coverRemove) {
        coverRemove.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          listingDraft.coverImage = '';
          renderCoverPreview();
          syncListingPreview();
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

        saveListingToApi(state.id, listingDraft)
          .then(function () {
            var sw = state.sweepstakes[state.id];
            if (sw) sw.defaultListing = Object.assign({}, listingDraft);
            showEditMsg('Annonce enregistrée avec succès.', false);
            syncListingPreview();
          })
          .catch(function (err) {
            showEditMsg(err.message || 'Erreur de sauvegarde.', true);
          });
      });
    }

    function applyPendingSetupMode() {
      if (!window.__crDashPendingMode) return;
      one.classList.add('is-pending-setup');
      var sub = qs('.cr-dash-one__sub', root);
      if (sub) {
        sub.textContent =
          'Votre sweepstakes est en revue — complétez photos et description pendant l\'examen Gaviom.';
      }
      var ids = sweepstakesIds();
      var pick =
        ids.find(function (id) {
          return state.sweepstakes[id] && state.sweepstakes[id].status === 'review';
        }) || ids[0];
      if (pick) {
        renderSweepstakes(pick);
        var editSection = qs('[data-cr-dash-edit]', root);
        if (editSection) {
          setTimeout(function () {
            editSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }, 150);
        }
      }
    }

    window.__crDashApplyPendingSetup = applyPendingSetupMode;

    initListingEditor();

    function renderPickerMenu() {
      var menu = qs('[data-cr-dash-picker-menu]', root);
      if (!menu) return;
      var ids = sweepstakesIds();
      menu.innerHTML = ids
        .map(function (id) {
          var sw = state.sweepstakes[id];
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

    function formatChartTick(value) {
      if (value >= 1000) return (value / 1000).toFixed(1).replace(/\.0$/, '') + 'k';
      return String(Math.round(value));
    }

    function niceChartMax(value) {
      var v = Math.max(value, 1);
      if (v <= 5) return 5;
      var magnitude = Math.pow(10, Math.floor(Math.log10(v)));
      var normalized = v / magnitude;
      var nice = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
      return nice * magnitude;
    }

    function buildSmoothPath(points) {
      if (!points.length) return '';
      if (points.length === 1) return 'M' + points[0].x + ',' + points[0].y;
      var path = 'M' + points[0].x + ',' + points[0].y;
      for (var i = 0; i < points.length - 1; i++) {
        var p0 = points[Math.max(0, i - 1)];
        var p1 = points[i];
        var p2 = points[i + 1];
        var p3 = points[Math.min(points.length - 1, i + 2)];
        var cp1x = p1.x + (p2.x - p0.x) / 6;
        var cp1y = p1.y + (p2.y - p0.y) / 6;
        var cp2x = p2.x - (p3.x - p1.x) / 6;
        var cp2y = p2.y - (p3.y - p1.y) / 6;
        path += ' C' + cp1x + ',' + cp1y + ' ' + cp2x + ',' + cp2y + ' ' + p2.x + ',' + p2.y;
      }
      return path;
    }

    function chartDayLabels(count) {
      var labels = [];
      var now = new Date();
      for (var i = 0; i < count; i++) {
        var day = new Date(now);
        day.setDate(day.getDate() - (count - 1 - i));
        labels.push(day.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
      }
      return labels;
    }

    function pickChartLabelIndices(count, maxLabels) {
      if (count <= maxLabels) {
        var all = [];
        for (var i = 0; i < count; i++) all.push(i);
        return all;
      }
      var indices = [];
      var step = (count - 1) / (maxLabels - 1);
      for (var j = 0; j < maxLabels; j++) {
        indices.push(Math.round(j * step));
      }
      return indices;
    }

    function setMetricDelta(el, text) {
      if (!el) return;
      el.textContent = text || '';
      el.classList.toggle('is-positive', !!(text && text.charAt(0) === '+'));
      el.hidden = !text;
    }

    function renderChart(values, rangeDays) {
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

      var w = 720;
      var h = 260;
      var pad = { t: 24, r: 24, b: 48, l: 56 };
      var plotW = w - pad.l - pad.r;
      var plotH = h - pad.t - pad.b;
      var max = niceChartMax(Math.max.apply(null, values));
      var step = plotW / Math.max(values.length - 1, 1);
      var dayLabels = chartDayLabels(values.length);
      var labelIndices = pickChartLabelIndices(values.length, rangeDays === 7 ? 7 : 6);

      var points = values.map(function (v, i) {
        return {
          x: pad.l + i * step,
          y: pad.t + plotH * (1 - (v || 0) / max),
          v: v || 0,
        };
      });

      var linePath = buildSmoothPath(points);
      var areaPath =
        linePath +
        ' L' +
        points[points.length - 1].x +
        ',' +
        (h - pad.b) +
        ' L' +
        points[0].x +
        ',' +
        (h - pad.b) +
        ' Z';

      var yTicks = [0, max * 0.33, max * 0.66, max];
      var grid = yTicks
        .map(function (tick) {
          var y = pad.t + plotH * (1 - tick / max);
          return (
            '<line class="cr-dash-chart-grid" x1="' +
            pad.l +
            '" y1="' +
            y +
            '" x2="' +
            (w - pad.r) +
            '" y2="' +
            y +
            '"/>' +
            '<text class="cr-dash-chart-axis-y" x="' +
            (pad.l - 10) +
            '" y="' +
            (y + 4) +
            '" text-anchor="end">' +
            formatChartTick(tick) +
            '</text>'
          );
        })
        .join('');

      var xLabels = labelIndices
        .map(function (idx) {
          var point = points[idx];
          if (!point) return '';
          return (
            '<text class="cr-dash-chart-axis-x" x="' +
            point.x +
            '" y="' +
            (h - 16) +
            '" text-anchor="middle">' +
            dayLabels[idx] +
            '</text>'
          );
        })
        .join('');

      var dots = points
        .map(function (point, idx) {
          var isLast = idx === points.length - 1;
          return (
            '<circle class="cr-dash-chart-dot' +
            (isLast ? ' cr-dash-chart-dot--active' : '') +
            '" cx="' +
            point.x +
            '" cy="' +
            point.y +
            '" r="' +
            (isLast ? 4.5 : 3) +
            '"/>'
          );
        })
        .join('');

      svg.innerHTML =
        '<defs>' +
        '<linearGradient id="crChartGradient" x1="0" y1="0" x2="0" y2="1">' +
        '<stop offset="0%" stop-color="#0d2b45" stop-opacity="0.12"/>' +
        '<stop offset="100%" stop-color="#0d2b45" stop-opacity="0"/>' +
        '</linearGradient>' +
        '</defs>' +
        '<line class="cr-dash-chart-baseline" x1="' +
        pad.l +
        '" y1="' +
        (h - pad.b) +
        '" x2="' +
        (w - pad.r) +
        '" y2="' +
        (h - pad.b) +
        '"/>' +
        grid +
        xLabels +
        '<path class="cr-dash-chart-area" d="' +
        areaPath +
        '"/>' +
        '<path class="cr-dash-chart-line" d="' +
        linePath +
        '"/>' +
        dots;
    }

    function renderSweepstakes(id) {
      var sw = state.sweepstakes[id];
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

      setMetricDelta(qs('[data-cr-metric-tickets-delta]', root), sw.ticketsDelta || '');
      setMetricDelta(qs('[data-cr-metric-revenue-delta]', root), sw.revenueDelta || '');
      setMetricDelta(qs('[data-cr-metric-buyers-delta]', root), sw.buyersDelta || '');
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
      var total = (values || []).reduce(function (sum, value) {
        return sum + (value || 0);
      }, 0);
      var totalEl = qs('[data-cr-chart-total]', root);
      var totalLabelEl = qs('[data-cr-chart-total-label]', root);
      if (totalEl) totalEl.textContent = total.toLocaleString('fr-FR');
      if (totalLabelEl) {
        totalLabelEl.textContent =
          state.range === 7 ? 'entrées · 7 derniers jours' : 'entrées · 30 derniers jours';
      }
      renderChart(values, state.range);

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
          var active = b === btn;
          b.classList.toggle('is-active', active);
          b.setAttribute('aria-selected', active ? 'true' : 'false');
        });
        state.range = parseInt(btn.getAttribute('data-range'), 10) || 7;
        renderSweepstakes(state.id);
      });
    });

    renderPickerMenu();
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
      if (typeof window.__crDashLoadData === 'function') {
        window.__crDashLoadData();
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
            window.__crDashUserId = user.id;
            window.__crDashPendingMode = true;
            allowDashboard(result.data);
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

    var continueBtn = qs('[data-cr-dash-gate-continue]', root);
    if (continueBtn) {
      continueBtn.addEventListener('click', function () {
        window.__crDashPendingMode = true;
        allowDashboard(null);
        if (typeof window.__crDashApplyPendingSetup === 'function') {
          window.__crDashApplyPendingSetup();
        }
        var editSection = qs('[data-cr-dash-edit]', root);
        if (editSection) editSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  /* Hero card progress animation */
  function initHeroProgress() {
    var fill = qs('[data-cr-hero-progress]');
    if (!fill) return;
    setTimeout(function () {
      fill.style.width = '68%';
      var label = qs('[data-cr-hero-progress-label]');
      if (label) label.textContent = '68%';
    }, 400);
  }

  /* Demo giveaway — gallery, bundles, live feed */
  var DEMO_FEED_POOL = [
    { initials: 'NB', name: 'Nina B.', city: 'Boston', entries: '3 entries' },
    { initials: 'RW', name: 'Ryan W.', city: 'Phoenix', entries: '1 entry' },
    { initials: 'EL', name: 'Emma L.', city: 'Nashville', entries: '10 entries' },
    { initials: 'KH', name: 'Kai H.', city: 'San Diego', entries: 'Free AMOE' },
    { initials: 'LM', name: 'Leah M.', city: 'Atlanta', entries: '5 entries' },
    { initials: 'JP', name: 'James P.', city: 'Dallas', entries: '20 entries' },
    { initials: 'SC', name: 'Sara C.', city: 'Minneapolis', entries: '1 entry' },
  ];

  function initDemoGallery() {
    var main = qs('[data-cr-demo-gallery-main]');
    if (!main) return;
    qsa('[data-cr-demo-thumb]').forEach(function (btn) {
      btn.addEventListener('click', function () {
        var src = btn.getAttribute('data-cr-demo-thumb');
        if (!src) return;
        main.src = src;
        qsa('[data-cr-demo-thumb]').forEach(function (b) {
          b.classList.toggle('is-active', b === btn);
        });
      });
    });
  }

  function initDemoBundles() {
    var root = qs('.cr-demo-bundles');
    if (!root) return;
    var label = qs('[data-cr-demo-bundle-label]');
    var priceEl = qs('[data-cr-demo-buy-price]');

    qsa('[data-cr-demo-bundle]', root).forEach(function (btn) {
      btn.addEventListener('click', function () {
        qsa('[data-cr-demo-bundle]', root).forEach(function (b) {
          b.classList.toggle('is-selected', b === btn);
        });
        var tickets = btn.getAttribute('data-tickets') || '1';
        var price = btn.getAttribute('data-price') || '12';
        if (label) {
          label.textContent =
            tickets === '1'
              ? '1 entry'
              : tickets + ' entries · ' + (tickets === '20' ? 'best odds' : 'better odds');
        }
        if (priceEl) priceEl.textContent = '$' + price;
      });
    });
  }

  function initDemoActivityFeed() {
    var feed = qs('[data-cr-demo-feed]');
    if (!feed) return;
    var idx = 0;

    function prependEntry() {
      var data = DEMO_FEED_POOL[idx % DEMO_FEED_POOL.length];
      idx += 1;
      var li = document.createElement('li');
      li.className = 'cr-demo-feed__item';
      li.innerHTML =
        '<span class="cr-demo-feed__avatar">' +
        data.initials +
        '</span><span><strong>' +
        data.name +
        '</strong> from ' +
        data.city +
        ' · <em>' +
        data.entries +
        '</em></span><span class="cr-demo-feed__time">Just now</span>';
      feed.insertBefore(li, feed.firstChild);
      while (feed.children.length > 6) {
        feed.removeChild(feed.lastChild);
      }
      qsa('.cr-demo-feed__time', feed).forEach(function (el, i) {
        if (i === 0) return;
        var mins = i * 2;
        el.textContent = mins <= 1 ? '1m ago' : mins + 'm ago';
      });
    }

    setInterval(prependEntry, 5200);
  }

  function initDemoProgress() {
    var fill = qs('[data-cr-demo-progress]');
    if (!fill) return;
    setTimeout(function () {
      fill.style.width = '68%';
    }, 300);
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
    initDemoGallery();
    initDemoBundles();
    initDemoActivityFeed();
    initDemoProgress();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
