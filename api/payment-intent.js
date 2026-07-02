const Stripe = require('stripe');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('REPLACE')) {
    return res.status(503).json({ error: 'Payments not configured' });
  }

  const id = (req.query.id || req.query.payment_intent || '').trim();
  if (!id.startsWith('pi_')) {
    return res.status(400).json({ error: 'Missing payment_intent id' });
  }

  const stripe = new Stripe(secretKey);

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
    console.error('payment-intent:', err.message);
    return res.status(404).json({ error: 'Payment not found' });
  }
};
