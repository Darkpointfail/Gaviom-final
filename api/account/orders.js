const { verifyBearerUser, supabaseConfig } = require('../lib/supabase-user');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyBearerUser(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const email = (auth.user.email || '').toLowerCase();
  if (!email) {
    return res.status(400).json({ error: 'Account email missing.' });
  }

  const serviceKey = auth.cfg.serviceKey;
  if (!serviceKey) {
    return res.status(200).json({ orders: [], note: 'Order history unavailable until Supabase service role is configured.' });
  }

  try {
    const params = new URLSearchParams({
      select: 'id,stripe_session_id,stripe_payment_intent,customer_email,amount_total,currency,mode,metadata,status,created_at',
      customer_email: `eq.${email}`,
      order: 'created_at.desc',
      limit: '50',
    });

    const response = await fetch(`${auth.cfg.url}/rest/v1/orders?${params}`, {
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
      },
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
};
