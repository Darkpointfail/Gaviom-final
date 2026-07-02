const Stripe = require('stripe');

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
    return res.status(503).json({ error: 'Payments not configured' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const paymentIntentId = String(body?.paymentIntentId || '').trim();
  const email = (body?.email || '').trim().toLowerCase();

  if (!paymentIntentId.startsWith('pi_')) {
    return res.status(400).json({ error: 'Invalid payment reference' });
  }
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid email address' });
  }

  const stripe = new Stripe(secretKey);

  try {
    const existing = await stripe.paymentIntents.retrieve(paymentIntentId);
    const metadata = { ...(existing.metadata || {}), customer_email: email };

    await stripe.paymentIntents.update(paymentIntentId, {
      receipt_email: email,
      metadata,
    });

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('update-payment-intent:', err.message);
    return res.status(500).json({ error: 'Could not update payment details' });
  }
};
