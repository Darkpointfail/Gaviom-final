const { adminFetch } = require('./supabase-admin');

function parseTicketItems(metadata) {
  if (!metadata || metadata.type !== 'tickets') return [];
  try {
    const raw = metadata.items;
    const items = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return Array.isArray(items) ? items : [];
  } catch {
    return [];
  }
}

async function insertOrder(record) {
  if (record.stripe_payment_intent) {
    const existing = await adminFetch(
      `orders?stripe_payment_intent=eq.${encodeURIComponent(record.stripe_payment_intent)}&select=id&limit=1`,
    );
    const row = Array.isArray(existing.data) ? existing.data[0] : null;
    if (row) return { row, created: false };
  }

  if (record.stripe_session_id) {
    const existing = await adminFetch(
      `orders?stripe_session_id=eq.${encodeURIComponent(record.stripe_session_id)}&select=id&limit=1`,
    );
    const row = Array.isArray(existing.data) ? existing.data[0] : null;
    if (row) return { row, created: false };
  }

  const payload = {
    stripe_session_id: record.stripe_session_id || null,
    stripe_payment_intent: record.stripe_payment_intent || null,
    customer_email: record.customer_email || null,
    user_id: record.user_id || null,
    amount_total: record.amount_total,
    currency: record.currency || 'usd',
    mode: record.mode || 'payment',
    metadata: record.metadata || {},
    status: record.status || 'paid',
  };

  const result = await adminFetch('orders', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify(payload),
  });

  if (result.error) {
    console.error('fulfill insertOrder:', result.status, result.error);
    return { row: null, created: false };
  }

  const row = Array.isArray(result.data) ? result.data[0] : result.data;
  return { row: row && row.id ? row : null, created: true };
}

async function insertEntries({ userId, email, items, orderId, source }) {
  if (!items.length || !email) return;

  const rows = items.map((item) => ({
    user_id: userId || null,
    customer_email: email.toLowerCase(),
    prize_id: item.prizeId,
    quantity: parseInt(item.qty, 10) || 1,
    source: source || 'purchase',
    order_id: orderId || null,
    status: 'confirmed',
    draw_id: 'founding-2026-09',
  }));

  const result = await adminFetch('entries', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(rows),
  });

  if (result.error) {
    console.error('fulfill insertEntries:', result.status, result.error);
  }
}

async function clearUserCart(userId) {
  if (!userId) return;
  await adminFetch(`cart_items?user_id=eq.${userId}`, { method: 'DELETE' });
}

async function upsertMembership({
  userId,
  email,
  plan,
  status,
  stripeSubscriptionId,
  stripeCustomerId,
  periodStart,
  periodEnd,
  canceledAt,
}) {
  if (!email && !userId) return;

  const payload = {
    user_id: userId || null,
    customer_email: (email || '').toLowerCase(),
    plan: plan || 'monthly',
    status: status || 'active',
    stripe_subscription_id: stripeSubscriptionId || null,
    stripe_customer_id: stripeCustomerId || null,
    current_period_start: periodStart || null,
    current_period_end: periodEnd || null,
    canceled_at: canceledAt || null,
    updated_at: new Date().toISOString(),
  };

  if (stripeSubscriptionId) {
    const existing = await adminFetch(
      `memberships?stripe_subscription_id=eq.${encodeURIComponent(stripeSubscriptionId)}&select=id`,
    );
    const row = Array.isArray(existing.data) ? existing.data[0] : null;
    if (row && row.id) {
      await adminFetch(`memberships?id=eq.${row.id}`, {
        method: 'PATCH',
        prefer: 'return=minimal',
        body: JSON.stringify(payload),
      });
      return;
    }
  }

  await adminFetch('memberships', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(payload),
  });
}

async function fulfillTicketPayment({ metadata, email, userId, orderResult }) {
  const items = parseTicketItems(metadata);
  if (!items.length) return;

  const orderRow = orderResult && orderResult.row;

  if (orderResult && orderResult.created) {
    await insertEntries({
      userId,
      email,
      items,
      orderId: orderRow && orderRow.id,
      source: 'purchase',
    });
    await clearUserCart(userId);
  }
}

async function fulfillMembershipCheckout({ metadata, email, userId, session }) {
  const subscriptionId =
    typeof session.subscription === 'string'
      ? session.subscription
      : session.subscription && session.subscription.id;

  await upsertMembership({
    userId,
    email,
    plan: metadata.plan || 'monthly',
    status: 'active',
    stripeSubscriptionId: subscriptionId || null,
    stripeCustomerId: typeof session.customer === 'string' ? session.customer : session.customer?.id,
  });

  await insertEntries({
    userId,
    email,
    items: [{ prizeId: 'membership-pool', qty: 5 }],
    orderId: null,
    source: 'membership',
  });
}

async function fulfillCheckoutSession(session) {
  const metadata = session.metadata || {};
  const email =
    session.customer_details?.email ||
    metadata.customer_email ||
    session.customer_email ||
    null;
  const userId = metadata.supabase_user_id || null;

  const orderResult = await insertOrder({
    stripe_session_id: session.id,
    stripe_payment_intent:
      typeof session.payment_intent === 'string'
        ? session.payment_intent
        : session.payment_intent?.id || null,
    customer_email: email,
    user_id: userId,
    amount_total: session.amount_total,
    currency: session.currency,
    mode: session.mode,
    metadata,
    status: session.payment_status || session.status,
  });

  if (session.mode === 'subscription' || metadata.type === 'membership') {
    if (orderResult.created) {
      await fulfillMembershipCheckout({ metadata, email, userId, session });
    }
    return;
  }

  await fulfillTicketPayment({ metadata, email, userId, orderResult });
}

async function fulfillPaymentIntent(pi) {
  const metadata = pi.metadata || {};
  const email = pi.receipt_email || metadata.customer_email || null;
  const userId = metadata.supabase_user_id || null;

  const orderResult = await insertOrder({
    stripe_session_id: null,
    stripe_payment_intent: pi.id,
    customer_email: email,
    user_id: userId,
    amount_total: pi.amount_received || pi.amount,
    currency: pi.currency,
    mode: 'payment',
    metadata,
    status: pi.status,
  });

  await fulfillTicketPayment({ metadata, email, userId, orderResult });
}

async function fulfillSubscription(subscription, customerEmail) {
  const metadata = subscription.metadata || {};
  const userId = metadata.supabase_user_id || null;
  const email = customerEmail || subscription.customer_email || null;

  const statusMap = {
    active: 'active',
    trialing: 'trialing',
    past_due: 'past_due',
    canceled: 'canceled',
    incomplete: 'incomplete',
    unpaid: 'past_due',
  };

  await upsertMembership({
    userId,
    email,
    plan: metadata.plan || 'monthly',
    status: statusMap[subscription.status] || subscription.status,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId:
      typeof subscription.customer === 'string' ? subscription.customer : subscription.customer?.id,
    periodStart: subscription.current_period_start
      ? new Date(subscription.current_period_start * 1000).toISOString()
      : null,
    periodEnd: subscription.current_period_end
      ? new Date(subscription.current_period_end * 1000).toISOString()
      : null,
    canceledAt: subscription.canceled_at
      ? new Date(subscription.canceled_at * 1000).toISOString()
      : null,
  });
}

module.exports = {
  fulfillCheckoutSession,
  fulfillPaymentIntent,
  fulfillSubscription,
  parseTicketItems,
};
