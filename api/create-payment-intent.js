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

  const parsed = parseBody(req);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const userId = String(parsed.body?.userId || parsed.body?.supabase_user_id || '').trim() || null;

  const resolved = resolveOrder(parsed.body);
  if (resolved.error) {
    return res.status(400).json({ error: resolved.error });
  }

  if (resolved.mode === 'subscription') {
    return res.status(400).json({ error: 'Membership checkout uses subscription billing' });
  }

  const { built } = resolved;
  const stripe = new Stripe(secretKey);

  try {
    const paymentIntent = await stripe.paymentIntents.create({
      amount: built.totalCents,
      currency: 'usd',
      automatic_payment_methods: {
        enabled: true,
        allow_redirects: 'never',
      },
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
    console.error('create-payment-intent:', err.message);
    return res.status(500).json({ error: 'Could not start payment. Please try again.' });
  }
};
