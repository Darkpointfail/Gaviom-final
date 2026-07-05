const Stripe = require('stripe');
const { resolveOrder } = require('./lib/resolve-order');

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return { error: 'Invalid JSON body' };
    }
  }
  return { body };
}

function stripeKeys() {
  const pk = process.env.STRIPE_PUBLIC_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '';
  const sk = process.env.STRIPE_SECRET_KEY || '';
  const configured =
    pk.length > 0 && !pk.includes('REPLACE') && sk.length > 0 && !sk.includes('REPLACE');
  return { pk, sk, configured };
}

function siteOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'gaviom.com';
  return `${proto}://${host}`;
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function resolveAction(req) {
  const q = req.query?.action;
  if (q) return String(q);
  const path = (req.url || '').split('?')[0] || '';
  if (path.includes('stripe-config')) return 'config';
  if (path.includes('create-payment-intent')) return 'create-intent';
  if (path.includes('update-payment-intent')) return 'update-intent';
  if (path.includes('create-checkout-session')) return 'create-checkout';
  if (path.includes('payment-intent')) return 'verify-intent';
  if (path.includes('checkout-session')) return 'verify-session';
  if (req.method === 'GET') return 'config';
  return 'create-intent';
}

async function handleConfig(res) {
  const { pk, configured } = stripeKeys();
  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({ configured, publishableKey: configured ? pk : null });
}

async function handleCreateIntent(req, res, sk) {
  const parsed = parseBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const userId = String(parsed.body?.userId || parsed.body?.supabase_user_id || '').trim() || null;
  const resolved = resolveOrder(parsed.body);
  if (resolved.error) return res.status(400).json({ error: resolved.error });
  if (resolved.mode === 'subscription') {
    return res.status(400).json({ error: 'Membership checkout uses subscription billing' });
  }

  const stripe = new Stripe(sk);
  const { built } = resolved;

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: built.totalCents,
      currency: 'usd',
      automatic_payment_methods: { enabled: true, allow_redirects: 'never' },
      metadata: {
        ...built.metadata,
        customer_email: '',
        ...(userId ? { supabase_user_id: userId } : {}),
      },
    });
    return res.status(200).json({
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
      amount: built.totalCents,
    });
  } catch (err) {
    console.error('stripe create-intent:', err.message);
    return res.status(500).json({ error: 'Could not start payment. Please try again.' });
  }
}

async function handleUpdateIntent(req, res, sk) {
  const parsed = parseBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const paymentIntentId = String(parsed.body?.paymentIntentId || '').trim();
  const email = (parsed.body?.email || '').trim().toLowerCase();
  const userId = String(parsed.body?.userId || parsed.body?.supabase_user_id || '').trim() || null;

  if (!paymentIntentId.startsWith('pi_')) {
    return res.status(400).json({ error: 'Invalid payment reference' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const stripe = new Stripe(sk);
  try {
    const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
    const metadata = { ...(existing.metadata || {}), customer_email: email };
    if (userId) metadata.supabase_user_id = userId;
    await stripe.paymentIntents.update(paymentIntentId, { receipt_email: email, metadata });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('stripe update-intent:', err.message);
    return res.status(500).json({ error: 'Could not update payment details' });
  }
}

async function handleCreateCheckout(req, res, sk) {
  const parsed = parseBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const email = (parsed.body?.email || '').trim().toLowerCase();
  const userId = String(parsed.body?.userId || parsed.body?.supabase_user_id || '').trim() || null;
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const resolved = resolveOrder(parsed.body);
  if (resolved.error) return res.status(400).json({ error: resolved.error });

  const { built, mode } = resolved;
  const stripe = new Stripe(sk);
  const origin = siteOrigin(req);

  try {
    const session = await stripe.checkout.sessions.create({
      mode,
      customer_email: email,
      line_items: built.lineItems,
      success_url: `${origin}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/checkout.html?canceled=1`,
      metadata: {
        ...built.metadata,
        customer_email: email,
        ...(userId ? { supabase_user_id: userId } : {}),
      },
      payment_method_types: mode === 'subscription' ? undefined : ['card'],
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
    });
    return res.status(200).json({ url: session.url, sessionId: session.id });
  } catch (err) {
    console.error('stripe create-checkout:', err.message);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
}

async function handleVerifyIntent(req, res, sk) {
  const id = (req.query.id || req.query.payment_intent || '').trim();
  if (!id.startsWith('pi_')) {
    return res.status(400).json({ error: 'Missing payment_intent id' });
  }

  const stripe = new Stripe(sk);
  try {
    const pi = await stripe.paymentIntents.retrieve(id);
    if (pi.status !== 'succeeded') {
      return res.status(402).json({ error: 'Payment not completed', status: pi.status });
    }
    return res.status(200).json({
      id: pi.id,
      email: pi.receipt_email || pi.metadata?.customer_email || '',
      amountTotal: pi.amount,
      currency: pi.currency,
      mode: 'payment',
      metadata: pi.metadata || {},
    });
  } catch (err) {
    console.error('stripe verify-intent:', err.message);
    return res.status(404).json({ error: 'Payment not found' });
  }
}

async function handleVerifySession(req, res, sk) {
  const sessionId = (req.query.session_id || '').trim();
  if (!sessionId) return res.status(400).json({ error: 'Missing session_id' });

  const stripe = new Stripe(sk);
  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['line_items'] });
    if (session.payment_status !== 'paid' && session.status !== 'complete') {
      return res.status(402).json({ error: 'Payment not completed', status: session.payment_status });
    }
    return res.status(200).json({
      id: session.id,
      email: session.customer_details?.email || session.metadata?.customer_email || '',
      amountTotal: session.amount_total,
      currency: session.currency,
      mode: session.mode,
      metadata: session.metadata || {},
      lineItems: (session.line_items?.data || []).map((li) => ({
        description: li.description,
        quantity: li.quantity,
        amount: li.amount_total,
      })),
    });
  } catch (err) {
    console.error('stripe verify-session:', err.message);
    return res.status(404).json({ error: 'Session not found' });
  }
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);
  const { sk, configured } = stripeKeys();

  if (action === 'config') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleConfig(res);
  }

  if (!configured) {
    return res.status(503).json({
      error: 'Payments are not configured. Add STRIPE_SECRET_KEY in Vercel environment variables.',
    });
  }

  if (action === 'create-intent') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleCreateIntent(req, res, sk);
  }

  if (action === 'update-intent') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleUpdateIntent(req, res, sk);
  }

  if (action === 'create-checkout') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleCreateCheckout(req, res, sk);
  }

  if (action === 'verify-intent') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleVerifyIntent(req, res, sk);
  }

  if (action === 'verify-session') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleVerifySession(req, res, sk);
  }

  return res.status(400).json({ error: 'Unknown stripe action' });
};
