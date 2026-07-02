const Stripe = require('stripe');

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

async function persistOrder(session) {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key || key.includes('REPLACE')) return;

  const payload = {
    stripe_session_id: session.id,
    stripe_payment_intent: typeof session.payment_intent === 'string' ? session.payment_intent : session.payment_intent?.id || null,
    customer_email: session.customer_details?.email || session.metadata?.customer_email || null,
    amount_total: session.amount_total,
    currency: session.currency,
    mode: session.mode,
    metadata: session.metadata || {},
    status: session.payment_status || session.status,
  };

  try {
    const res = await fetch(`${url}/rest/v1/orders`, {
      method: 'POST',
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const text = await res.text();
      console.error('Supabase order insert failed:', res.status, text);
    }
  } catch (err) {
    console.error('Supabase order insert error:', err.message);
  }
}

async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method not allowed');
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secretKey || !webhookSecret) {
    return res.status(503).end('Webhook not configured');
  }

  const stripe = new Stripe(secretKey);
  const sig = req.headers['stripe-signature'];

  let event;
  try {
    const rawBody = await readRawBody(req);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    await persistOrder(event.data.object);
  }

  return res.status(200).json({ received: true });
}

handler.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = handler;
