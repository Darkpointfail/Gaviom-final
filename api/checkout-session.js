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

  const sessionId = (req.query.session_id || '').trim();
  if (!sessionId) {
    return res.status(400).json({ error: 'Missing session_id' });
  }

  const stripe = new Stripe(secretKey);

  try {
    const session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ['line_items'],
    });

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
    console.error('checkout-session:', err.message);
    return res.status(404).json({ error: 'Session not found' });
  }
};
