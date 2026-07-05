const Stripe = require('stripe');
const { verifyBearerUser } = require('./lib/supabase-user');

function resolveAction(req) {
  const q = req.query?.action;
  if (q) return String(q);
  const path = (req.url || '').split('?')[0] || '';
  if (path.includes('billing-portal')) return 'billing-portal';
  if (path.includes('orders')) return 'orders';
  if (req.method === 'POST') return 'billing-portal';
  return 'orders';
}

async function handleOrders(req, res) {
  const auth = await verifyBearerUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const email = (auth.user.email || '').toLowerCase();
  if (!email) return res.status(400).json({ error: 'Account email missing.' });

  const serviceKey = auth.cfg.serviceKey;
  if (!serviceKey) {
    return res.status(200).json({
      orders: [],
      note: 'Order history unavailable until Supabase service role is configured.',
    });
  }

  try {
    const params = new URLSearchParams({
      select:
        'id,stripe_session_id,stripe_payment_intent,customer_email,amount_total,currency,mode,metadata,status,created_at',
      customer_email: `eq.${email}`,
      order: 'created_at.desc',
      limit: '50',
    });

    const response = await fetch(`${auth.cfg.url}/rest/v1/orders?${params}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });

    const rows = await response.json().catch(() => []);
    if (!response.ok) {
      console.error('account orders:', response.status, rows);
      return res.status(502).json({ error: 'Could not load order history.' });
    }

    return res.status(200).json({ orders: Array.isArray(rows) ? rows : [] });
  } catch (err) {
    console.error('account orders:', err.message);
    return res.status(500).json({ error: 'Could not load order history.' });
  }
}

async function handleBillingPortal(req, res) {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('REPLACE')) {
    return res.status(503).json({ error: 'Payments are not configured.' });
  }

  const auth = await verifyBearerUser(req);
  if (auth.error) return res.status(auth.status).json({ error: auth.error });

  const email = auth.user.email;
  if (!email) return res.status(400).json({ error: 'Account email missing.' });

  const stripe = new Stripe(secretKey);
  const origin = req.headers.origin || 'https://gaviom.com';

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name:
          [auth.user.user_metadata?.first_name, auth.user.user_metadata?.last_name]
            .filter(Boolean)
            .join(' ') || undefined,
        metadata: { supabase_user_id: auth.user.id },
      });
    }

    const session = await stripe.billingPortal.sessions.create({
      customer: customer.id,
      return_url: `${origin}/account.html#payments`,
    });

    return res.status(200).json({ url: session.url });
  } catch (err) {
    console.error('account billing-portal:', err.message);
    return res.status(502).json({ error: 'Could not open billing portal.' });
  }
}

module.exports = async function handler(req, res) {
  const action = resolveAction(req);

  if (action === 'orders') {
    if (req.method !== 'GET') {
      res.setHeader('Allow', 'GET');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleOrders(req, res);
  }

  if (action === 'billing-portal') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleBillingPortal(req, res);
  }

  return res.status(400).json({ error: 'Unknown account action' });
};
