const crypto = require('crypto');
const { adminConfig, adminFetch } = require('./supabase-admin');

const STATUS_LABELS = {
  draft: 'Brouillon',
  review: 'En revue Gaviom',
  live: 'En ligne',
  ended: 'Terminé',
  cancelled: 'Annulé',
};

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function slugify(value) {
  const base = clean(value)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || 'giveaway';
}

function prizeIdFromApplicationId(applicationId) {
  return `cr-${String(applicationId || '').replace(/-/g, '').slice(0, 12)}`;
}

function formatMeta(row) {
  const price = Number(row.ticket_price_usd) || 0;
  const status = row.status || 'review';
  const statusWord = status === 'live' ? 'Live' : STATUS_LABELS[status] || status;
  return `${statusWord} · $${price} / entrée`;
}

function formatDrawDate(drawAt) {
  if (!drawAt) return '—';
  try {
    return new Date(drawAt).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function publicUrl(creatorSlug, sweepstakesSlug, status) {
  if (!creatorSlug || !sweepstakesSlug || status !== 'live') return '';
  return `/creators/${creatorSlug}/${sweepstakesSlug}`;
}

function reviewBanner(status) {
  if (status === 'review') {
    return 'Complétez votre annonce ci-dessous (photos + description) pendant la revue Gaviom. Les ventes démarreront après approbation.';
  }
  if (status === 'draft') {
    return 'Finalisez votre annonce avant soumission à Gaviom.';
  }
  return '';
}

function maskEmail(email) {
  const value = clean(email).toLowerCase();
  if (!value || !value.includes('@')) return '—';
  const [local, domain] = value.split('@');
  const visible = local.length <= 2 ? local.charAt(0) + '*' : local.slice(0, 2) + '***';
  return `${visible}@${domain}`;
}

function formatPurchaseDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
}

function pctDelta(current, previous) {
  if (!current && !previous) return '';
  if (!previous) return current > 0 ? '+100% vs période préc.' : '';
  const pct = Math.round(((current - previous) / previous) * 100);
  if (!pct) return 'Stable vs période préc.';
  return `${pct > 0 ? '+' : ''}${pct}% vs période préc.`;
}

function dayKey(date) {
  return date.toISOString().slice(0, 10);
}

function buildDaySeries(entries, days) {
  const buckets = {};
  const now = new Date();
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() - i);
    buckets[dayKey(d)] = 0;
  }

  entries.forEach((entry) => {
    const created = new Date(entry.created_at);
    const key = dayKey(created);
    if (Object.prototype.hasOwnProperty.call(buckets, key)) {
      buckets[key] += Number(entry.quantity) || 0;
    }
  });

  return Object.keys(buckets)
    .sort()
    .map((key) => buckets[key]);
}

function sumSeries(values, start, end) {
  return values.slice(start, end).reduce((sum, value) => sum + (value || 0), 0);
}

async function fetchProfile(userId) {
  const params = new URLSearchParams({
    select: 'id,creator_status,creator_slug,first_name,last_name',
    id: `eq.${userId}`,
    limit: '1',
  });
  const result = await adminFetch(`profiles?${params}`);
  if (result.error) return { error: result.error, status: result.status || 502 };
  const row = Array.isArray(result.data) ? result.data[0] : null;
  return { profile: row };
}

async function fetchLatestApplication(userId) {
  const params = new URLSearchParams({
    select: '*',
    user_id: `eq.${userId}`,
    order: 'created_at.desc',
    limit: '1',
  });
  const result = await adminFetch(`creator_applications?${params}`);
  if (result.error) return { error: result.error, status: result.status || 502 };
  const row = Array.isArray(result.data) ? result.data[0] : null;
  return { application: row };
}

async function fetchSweepstakesForCreator(userId) {
  const params = new URLSearchParams({
    select: '*',
    creator_id: `eq.${userId}`,
    order: 'created_at.desc',
  });
  const result = await adminFetch(`creator_sweepstakes?${params}`);
  if (result.error) return { error: result.error, status: result.status || 502 };
  return { rows: Array.isArray(result.data) ? result.data : [] };
}

async function fetchSweepstakesById(id, userId) {
  const params = new URLSearchParams({
    select: '*',
    id: `eq.${id}`,
    creator_id: `eq.${userId}`,
    limit: '1',
  });
  const result = await adminFetch(`creator_sweepstakes?${params}`);
  if (result.error) return { error: result.error, status: result.status || 502 };
  const row = Array.isArray(result.data) ? result.data[0] : null;
  if (!row) return { error: 'Sweepstakes not found.', status: 404 };
  return { row };
}

async function insertSweepstakes(payload) {
  const result = await adminFetch('creator_sweepstakes', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify(payload),
  });
  if (result.error) {
    const code = result.error?.code;
    if (code === '23505') return { error: 'Sweepstakes already exists.', status: 409 };
    return { error: result.error, status: result.status || 502 };
  }
  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return { row };
}

function mapApplicationToSweepstakes(application, creatorSlug) {
  const short = String(application.id || crypto.randomUUID()).replace(/-/g, '').slice(0, 6);
  const baseSlug = slugify(application.prize || application.creator_name || 'giveaway');
  const slug = `${baseSlug}-${short}`;

  return {
    creator_id: application.user_id,
    application_id: application.id,
    slug,
    prize_id: prizeIdFromApplicationId(application.id),
    title: clean(application.prize) || 'Creator giveaway',
    public_title: clean(application.prize) || null,
    description: clean(application.description) || null,
    cover_image_url: null,
    gallery: [],
    prize_name: clean(application.prize) || 'Prize',
    prize_value_usd: Number(application.prize_value_usd) || 0,
    ticket_price_usd: 10,
    entry_cap: 1000,
    fee_pct: 0.15,
    status: application.status === 'approved' ? 'review' : 'review',
    emoji: '🎁',
    draw_at: application.desired_launch_date
      ? new Date(`${application.desired_launch_date}T20:00:00Z`).toISOString()
      : null,
  };
}

async function ensureSweepstakesForApplication(application) {
  if (!application || !application.user_id) return { row: null };

  const existingParams = new URLSearchParams({
    select: 'id',
    application_id: `eq.${application.id}`,
    limit: '1',
  });
  const existing = await adminFetch(`creator_sweepstakes?${existingParams}`);
  if (existing.error) return { error: existing.error, status: existing.status || 502 };

  const found = Array.isArray(existing.data) ? existing.data[0] : null;
  if (found) return { row: found, created: false };

  const payload = mapApplicationToSweepstakes(application);
  const inserted = await insertSweepstakes(payload);
  if (inserted.error) return inserted;
  return { row: inserted.row, created: true };
}

async function bootstrapSweepstakesForUser(userId) {
  const list = await fetchSweepstakesForCreator(userId);
  if (list.error) return list;
  if (list.rows.length) return { rows: list.rows };

  const appResult = await fetchLatestApplication(userId);
  if (appResult.error) return appResult;
  if (!appResult.application) return { rows: [] };

  const created = await ensureSweepstakesForApplication(appResult.application);
  if (created.error) return created;
  if (!created.row) return { rows: [] };

  const refreshed = await fetchSweepstakesForCreator(userId);
  if (refreshed.error) return refreshed;
  return { rows: refreshed.rows };
}

async function fetchEntriesForSweepstakes(row) {
  const params = new URLSearchParams({
    select: 'id,user_id,customer_email,quantity,order_id,created_at,status,source',
    prize_id: `eq.${row.prize_id}`,
    status: 'eq.confirmed',
    order: 'created_at.desc',
    limit: '5000',
  });
  const result = await adminFetch(`entries?${params}`);
  if (result.error) return { error: result.error, status: result.status || 502 };
  const rows = Array.isArray(result.data) ? result.data : [];
  const purchases = rows.filter((entry) => entry.source === 'purchase');
  return { entries: purchases };
}

async function fetchOrdersMap(orderIds) {
  if (!orderIds.length) return {};
  const unique = [...new Set(orderIds.filter(Boolean))];
  const params = new URLSearchParams({
    select: 'id,customer_email,user_id,amount_total,created_at,status',
    id: `in.(${unique.join(',')})`,
  });
  const result = await adminFetch(`orders?${params}`);
  if (result.error) return {};
  const map = {};
  (Array.isArray(result.data) ? result.data : []).forEach((order) => {
    map[order.id] = order;
  });
  return map;
}

async function fetchProfileNames(userIds) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return {};
  const params = new URLSearchParams({
    select: 'id,first_name,last_name,email',
    id: `in.(${unique.join(',')})`,
  });
  const result = await adminFetch(`profiles?${params}`);
  if (result.error) return {};
  const map = {};
  (Array.isArray(result.data) ? result.data : []).forEach((profile) => {
    map[profile.id] = profile;
  });
  return map;
}

async function buildAnalytics(row) {
  const entryResult = await fetchEntriesForSweepstakes(row);
  if (entryResult.error) return { error: entryResult.error, status: entryResult.status || 502 };

  const entries = entryResult.entries || [];
  const orderIds = entries.map((entry) => entry.order_id).filter(Boolean);
  const ordersMap = await fetchOrdersMap(orderIds);
  const profileMap = await fetchProfileNames(
    entries.map((entry) => entry.user_id).concat(Object.values(ordersMap).map((o) => o.user_id)),
  );

  const tickets = entries.reduce((sum, entry) => sum + (Number(entry.quantity) || 0), 0);
  const buyers = new Set(entries.map((entry) => clean(entry.customer_email).toLowerCase()).filter(Boolean))
    .size;

  function revenueInWindow(daysAgoStart, daysAgoEnd) {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);
    start.setDate(start.getDate() - daysAgoStart);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);
    end.setDate(end.getDate() - daysAgoEnd);

    let cents = 0;
    const seen = new Set();
    entries.forEach((entry) => {
      if (!entry.order_id || seen.has(entry.order_id)) return;
      const order = ordersMap[entry.order_id];
      if (!order || order.amount_total == null || !order.created_at) return;
      const created = new Date(order.created_at);
      if (created < start || created > end) return;
      seen.add(entry.order_id);
      cents += Number(order.amount_total) || 0;
    });
    return cents / 100;
  }

  let revenueCents = 0;
  const seenOrders = new Set();
  entries.forEach((entry) => {
    if (!entry.order_id || seenOrders.has(entry.order_id)) return;
    const order = ordersMap[entry.order_id];
    if (!order || order.amount_total == null) return;
    seenOrders.add(entry.order_id);
    revenueCents += Number(order.amount_total) || 0;
  });
  const revenue = Math.round(revenueCents) / 100;
  const revenue7 = revenueInWindow(6, 0);
  const revenuePrev7 = revenueInWindow(13, 7);

  const sales7 = buildDaySeries(entries, 7);
  const sales30 = buildDaySeries(entries, 30);

  const cur7 = sumSeries(sales7, 0, 7);
  const prev7 = sumSeries(sales30, 23, 30);
  const cur30 = sumSeries(sales30, 0, 30);
  const prev30 = 0;

  const purchasesByOrder = {};
  entries.forEach((entry) => {
    if (!entry.order_id) return;
    if (!purchasesByOrder[entry.order_id]) {
      purchasesByOrder[entry.order_id] = {
        orderId: entry.order_id,
        entries: 0,
        email: entry.customer_email,
        userId: entry.user_id,
        date: entry.created_at,
      };
    }
    purchasesByOrder[entry.order_id].entries += Number(entry.quantity) || 0;
  });

  const purchases = Object.values(purchasesByOrder)
    .map((purchase) => {
      const order = ordersMap[purchase.orderId];
      const profile = profileMap[purchase.userId] || (order && profileMap[order.user_id]);
      const first = profile && profile.first_name ? profile.first_name : '';
      const last = profile && profile.last_name ? profile.last_name.charAt(0) + '.' : '';
      const name = [first, last].filter(Boolean).join(' ').trim() || 'Participant';
      const amount = order && order.amount_total != null ? Math.round(order.amount_total) / 100 : 0;
      const status = order && order.status === 'paid' ? 'Payé' : 'Payé';
      return {
        name,
        email: maskEmail(purchase.email || (order && order.customer_email)),
        entries: purchase.entries,
        amount,
        date: formatPurchaseDate((order && order.created_at) || purchase.date),
        status,
      };
    })
    .sort((a, b) => {
      const da = new Date(a.date).getTime();
      const db = new Date(b.date).getTime();
      return Number.isFinite(db) && Number.isFinite(da) ? db - da : 0;
    })
    .slice(0, 50);

  return {
    analytics: {
      tickets,
      ticketsDelta: pctDelta(cur7, prev7),
      revenue,
      revenueDelta: pctDelta(revenue7, revenuePrev7),
      buyers,
      buyersDelta: buyers > 0 ? `${buyers} participant${buyers > 1 ? 's' : ''}` : '',
      feePct: Number(row.fee_pct) || 0.15,
      sales7,
      sales30,
      purchases,
      chartTotals: {
        cur7,
        prev7,
        cur30,
      },
    },
  };
}

function mapSweepstakesRow(row, creatorSlug, analytics) {
  const status = row.status || 'review';
  const gallery = Array.isArray(row.gallery) ? row.gallery : [];
  return {
    id: row.id,
    prizeId: row.prize_id,
    title: row.title,
    meta: formatMeta(row),
    emoji: row.emoji || '🎁',
    status,
    statusLabel: STATUS_LABELS[status] || status,
    banner: reviewBanner(status),
    ticketPrice: Number(row.ticket_price_usd) || 0,
    prizeValue: Number(row.prize_value_usd) || 0,
    cap: Number(row.entry_cap) || 0,
    drawDate: formatDrawDate(row.draw_at),
    publicUrl: publicUrl(creatorSlug, row.slug, status),
    listing: {
      publicTitle: row.public_title || row.title || '',
      description: row.description || '',
      coverImage: row.cover_image_url || '',
      gallery,
    },
    analytics: analytics || {
      tickets: 0,
      ticketsDelta: '',
      revenue: 0,
      revenueDelta: '',
      buyers: 0,
      buyersDelta: '',
      feePct: Number(row.fee_pct) || 0.15,
      sales7: [0, 0, 0, 0, 0, 0, 0],
      sales30: Array.from({ length: 30 }, () => 0),
      purchases: [],
    },
  };
}

async function listDashboard(userId) {
  const profileResult = await fetchProfile(userId);
  if (profileResult.error) return { error: 'Could not load creator profile.', status: 502 };

  const profile = profileResult.profile;
  if (!profile) return { error: 'Profile not found.', status: 404 };

  const status = profile.creator_status || 'none';
  if (!['approved', 'pending'].includes(status)) {
    return { error: 'Creator dashboard access required.', status: 403 };
  }

  const bootstrap = await bootstrapSweepstakesForUser(userId);
  if (bootstrap.error) return { error: 'Could not load sweepstakes.', status: 502 };

  const creatorSlug = profile.creator_slug || null;
  const sweepstakes = [];

  for (const row of bootstrap.rows) {
    const analyticsResult = await buildAnalytics(row);
    if (analyticsResult.error) return analyticsResult;
    sweepstakes.push(mapSweepstakesRow(row, creatorSlug, analyticsResult.analytics));
  }

  return {
    ok: true,
    creatorStatus: status,
    creatorSlug,
    sweepstakes,
  };
}

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.+)$/.exec(dataUrl || '');
  if (!match) return null;
  return { mime: match[1], buffer: Buffer.from(match[2], 'base64') };
}

async function uploadListingImage(userId, sweepstakesId, kind, dataUrl) {
  const cfg = adminConfig();
  if (!cfg) return { error: 'Storage not configured.', status: 503 };

  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return { url: dataUrl };

  if (parsed.buffer.length > 900000) {
    return { error: 'Image too large after compression.', status: 400 };
  }

  const ext = parsed.mime.includes('png') ? 'png' : 'jpg';
  const objectPath = `${userId}/${sweepstakesId}/${kind}-${Date.now()}.${ext}`;

  const res = await fetch(`${cfg.url}/storage/v1/object/creator-listings/${objectPath}`, {
    method: 'POST',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': parsed.mime,
      'x-upsert': 'true',
    },
    body: parsed.buffer,
  });

  if (!res.ok) {
    const text = await res.text().catch(() => '');
    console.error('creator listing upload:', res.status, text);
    return { error: 'Could not upload image.', status: 502 };
  }

  return { url: `${cfg.url}/storage/v1/object/public/creator-listings/${objectPath}` };
}

async function normalizeGallery(userId, sweepstakesId, gallery) {
  if (!Array.isArray(gallery)) return [];
  const out = [];
  for (let i = 0; i < gallery.length && i < 4; i += 1) {
    const item = gallery[i];
    if (!item) continue;
    if (typeof item === 'string' && item.startsWith('data:')) {
      const uploaded = await uploadListingImage(userId, sweepstakesId, `gallery-${i}`, item);
      if (uploaded.error) return uploaded;
      out.push(uploaded.url);
    } else if (typeof item === 'string') {
      out.push(item);
    }
  }
  return out;
}

async function updateListing(userId, sweepstakesId, body) {
  const found = await fetchSweepstakesById(sweepstakesId, userId);
  if (found.error) return found;

  const publicTitle = clean(body.publicTitle || body.public_title);
  const description = clean(body.description);

  if (!publicTitle) return { error: 'Public title is required.', status: 400 };
  if (description.length < 80) {
    return { error: 'Description must be at least 80 characters.', status: 400 };
  }

  let coverImageUrl = found.row.cover_image_url || null;
  const cover = body.coverImage || body.cover_image_url;
  if (cover) {
    if (typeof cover === 'string' && cover.startsWith('data:')) {
      const uploaded = await uploadListingImage(userId, sweepstakesId, 'cover', cover);
      if (uploaded.error) return uploaded;
      coverImageUrl = uploaded.url;
    } else if (typeof cover === 'string') {
      coverImageUrl = cover;
    }
  }

  if (!coverImageUrl) {
    return { error: 'Cover image is required.', status: 400 };
  }

  let gallery = Array.isArray(found.row.gallery) ? found.row.gallery : [];
  if (body.gallery !== undefined) {
    const galleryResult = await normalizeGallery(userId, sweepstakesId, body.gallery || []);
    if (galleryResult.error) return galleryResult;
    gallery = galleryResult;
  }

  const patch = await adminFetch(`creator_sweepstakes?id=eq.${sweepstakesId}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({
      public_title: publicTitle,
      description,
      cover_image_url: coverImageUrl,
      gallery: gallery,
      updated_at: new Date().toISOString(),
    }),
  });

  if (patch.error) return { error: 'Could not save listing.', status: 502 };
  const row = Array.isArray(patch.data) ? patch.data[0] : found.row;
  return { ok: true, row };
}

module.exports = {
  STATUS_LABELS,
  ensureSweepstakesForApplication,
  bootstrapSweepstakesForUser,
  listDashboard,
  updateListing,
  mapSweepstakesRow,
  buildAnalytics,
};
