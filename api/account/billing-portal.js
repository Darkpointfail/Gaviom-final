const Stripe = require('stripe');
const { verifyBearerUser } = require('../lib/supabase-user');

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey || secretKey.includes('REPLACE')) {
    return res.status(503).json({ error: 'Payments are not configured.' });
  }

  const auth = await verifyBearerUser(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const email = auth.user.email;
  if (!email) {
    return res.status(400).json({ error: 'Account email missing.' });
  }

  const stripe = new Stripe(secretKey);
  const origin = req.headers.origin || 'https://gaviom.com';

  try {
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      customer = await stripe.customers.create({
        email,
        name: [auth.user.user_metadata?.first_name, auth.user.user_metadata?.last_name]
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
    console.error('billing-portal:', err.message);
    return res.status(502).json({ error: 'Could not open billing portal.' });
  }
};
