const Stripe = require('stripe');
const {
  fulfillCheckoutSession,
  fulfillPaymentIntent,
  fulfillSubscription,
} = require('../lib/fulfill-order');

async function readRawBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
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

  try {
    if (event.type === 'checkout.session.completed') {
      await fulfillCheckoutSession(event.data.object);
    }

    if (event.type === 'payment_intent.succeeded') {
      await fulfillPaymentIntent(event.data.object);
    }

    if (
      event.type === 'customer.subscription.updated' ||
      event.type === 'customer.subscription.created'
    ) {
      const subscription = event.data.object;
      let email = null;
      if (subscription.customer) {
        try {
          const customer = await stripe.customers.retrieve(subscription.customer);
          email = customer.email || null;
        } catch (e) {
          /* ignore */
        }
      }
      await fulfillSubscription(subscription, email);
    }

    if (event.type === 'customer.subscription.deleted') {
      await fulfillSubscription(event.data.object, null);
    }
  } catch (err) {
    console.error('Webhook handler error:', err.message);
  }

  return res.status(200).json({ received: true });
}

handler.config = {
  api: {
    bodyParser: false,
  },
};

module.exports = handler;
