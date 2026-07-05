const Stripe = require('stripe');
const { resolveOrder } = require('./lib/resolve-order');

function siteOrigin(req) {
  const proto = req.headers['x-forwarded-proto'] || 'https';
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'gaviom.com';
  return `${proto}://${host}`;
}

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('REPLACE')) {
    return res.status(503).json({
      error: 'Payments are not configured. Add STRIPE_SECRET_KEY in Vercel environment variables.',
    });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const email = (body?.email || '').trim().toLowerCase();
  const userId = String(body?.userId || body?.supabase_user_id || '').trim() || null;
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const resolved = resolveOrder(body);
  if (resolved.error) {
    return res.status(400).json({ error: resolved.error });
  }

  const { built, mode } = resolved;
  const origin = siteOrigin(req);
  const stripe = new Stripe(secretKey);

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

    return res.status(200).json({
      url: session.url,
      sessionId: session.id,
    });
  } catch (err) {
    console.error('create-checkout-session:', err.message);
    return res.status(500).json({ error: 'Could not start checkout. Please try again.' });
  }
};
