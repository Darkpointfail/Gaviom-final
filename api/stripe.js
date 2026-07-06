const Stripe = require('stripe');
const { resolveOrder } = require('../lib/resolve-order');
const { verifyVerifiedUser } = require('../lib/supabase-user');
const { validateAccountEmail } = require('../lib/email-validation');

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
  return validateAccountEmail(email).ok;
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

  const auth = await verifyVerifiedUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const userId = auth.user.id;

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
        customer_email: auth.user.email || '',
        supabase_user_id: userId,
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
  const auth = await verifyVerifiedUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });
  const userId = auth.user.id;

  if (!paymentIntentId.startsWith('pi_')) {
    return res.status(400).json({ error: 'Invalid payment reference' });
  }
  const emailCheck = validateAccountEmail(email);
  if (!emailCheck.ok) {
    return res.status(400).json({ error: emailCheck.error });
  }
  const accountEmail = (auth.user.email || '').trim().toLowerCase();
  if (accountEmail && emailCheck.email !== accountEmail) {
    return res.status(403).json({ error: 'Email must match your signed-in account.' });
  }

  const stripe = new Stripe(sk);
  try {
    const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
    const metadata = { ...(existing.metadata || {}), customer_email: emailCheck.email };
    metadata.supabase_user_id = userId;
    await stripe.paymentIntents.update(paymentIntentId, { receipt_email: emailCheck.email, metadata });
    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('stripe update-intent:', err.message);
    return res.status(500).json({ error: 'Could not update payment details' });
  }
}

async function handleCreateCheckout(req, res, sk) {
  const parsed = parseBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const resolved = resolveOrder(parsed.body);
  if (resolved.error) return res.status(400).json({ error: resolved.error });

  const { built, mode } = resolved;
  let email = (parsed.body?.email || '').trim().toLowerCase();
  let userId = null;

  if (mode === 'subscription') {
    const auth = await verifyVerifiedUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    userId = auth.user.id;
    email = (email || auth.user.email || '').trim().toLowerCase();
    const emailCheck = validateAccountEmail(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ error: emailCheck.error });
    }
    email = emailCheck.email;
    if (auth.user.email && email !== auth.user.email.trim().toLowerCase()) {
      return res.status(403).json({ error: 'Email must match your signed-in account.' });
    }
  } else {
    const auth = await verifyVerifiedUser(req);
    if (auth.error) return res.status(auth.status).json({ error: auth.error });
    userId = auth.user.id;
    email = (email || auth.user.email || '').trim().toLowerCase();
    const emailCheck = validateAccountEmail(email);
    if (!emailCheck.ok) {
      return res.status(400).json({ error: emailCheck.error });
    }
    email = emailCheck.email;
    if (auth.user.email && email !== auth.user.email.trim().toLowerCase()) {
      return res.status(403).json({ error: 'Email must match your signed-in account.' });
    }
  }

  const stripe = new Stripe(sk);
  const origin = siteOrigin(req);
  const embedded = parsed.body?.embedded === true;

  try {
    const sessionParams = {
      mode,
      customer_email: email,
      line_items: built.lineItems,
      metadata: {
        ...built.metadata,
        customer_email: email,
        ...(userId ? { supabase_user_id: userId } : {}),
      },
      allow_promotion_codes: false,
      billing_address_collection: 'auto',
    };

    if (embedded) {
      sessionParams.ui_mode = 'embedded';
      sessionParams.return_url = `${origin}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`;
    } else {
      sessionParams.success_url = `${origin}/checkout-success.html?session_id={CHECKOUT_SESSION_ID}`;
      sessionParams.cancel_url =
        mode === 'subscription'
          ? `${origin}/gaviom-plus-checkout.html?canceled=1`
          : `${origin}/checkout.html?canceled=1`;
      if (mode !== 'subscription') {
        sessionParams.payment_method_types = ['card'];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    return res.status(200).json({
      url: session.url || null,
      clientSecret: session.client_secret || null,
      sessionId: session.id,
    });
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
