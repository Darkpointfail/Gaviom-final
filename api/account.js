const Stripe = require('stripe');
const { verifyBearerUser } = require('../lib/supabase-user');
const { handleAuthSignup } = require('../lib/auth-signup');
const { sendPasswordResetEmail, handleAuthReset } = require('../lib/auth-reset-password');
const { handleSetPassword } = require('../lib/auth-set-password');
const { handleAuthSignin } = require('../lib/auth-signin');
const { handleCompleteReset } = require('../lib/auth-complete-reset');
const { handleAuthMe } = require('../lib/auth-me');
const { handleVerifyEmailCode } = require('../lib/verify-email-code');
const { handleResendEmailCode } = require('../lib/resend-email-code');

const LEGACY_CONFIRM_MESSAGE =
  'Email confirmation links are no longer used. Enter your 6-digit verification code on the verify page.';

function resolveAction(req) {
  const q = req.query?.action;
  if (q) return String(q);
  const path = (req.url || '').split('?')[0] || '';
  if (path.includes('verify-email-code')) return 'verify-email-code';
  if (path.includes('resend-email-code')) return 'resend-email-code';
  if (path.includes('auth-signup')) return 'signup';
  if (path.includes('auth-me')) return 'auth-me';
  if (path.includes('auth-complete-reset')) return 'complete-reset';
  if (path.includes('auth-signin')) return 'signin';
  if (path.includes('auth-set-password')) return 'set-password';
  if (path.includes('auth-reset-password')) return 'reset-password-email';
  if (path.includes('auth-reset')) return 'reset-password';
  if (path.includes('auth-confirmation-email') || path.includes('confirmation-email')) {
    return 'resend-email-code';
  }
  if (path.includes('auth-confirm')) return 'legacy-confirm';
  if (path.includes('auth-confirm-proof')) return 'legacy-confirm';
  if (path.includes('auth-complete-confirm')) return 'legacy-confirm';
  if (path.includes('billing-portal')) return 'billing-portal';
  if (path.includes('orders')) return 'orders';
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

async function fetchProfileName(cfg, userId) {
  const serviceKey = cfg.serviceKey;
  if (!serviceKey || !userId) return null;
  try {
    const params = new URLSearchParams({
      select: 'first_name,last_name',
      id: `eq.${userId}`,
    });
    const response = await fetch(`${cfg.url}/rest/v1/profiles?${params}`, {
      headers: { apikey: serviceKey, Authorization: `Bearer ${serviceKey}` },
    });
    const rows = await response.json().catch(() => []);
    if (!response.ok || !Array.isArray(rows) || !rows[0]) return null;
    return rows[0];
  } catch (err) {
    console.warn('account profile lookup:', err.message);
    return null;
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
    const profile = await fetchProfileName(auth.cfg, auth.user.id);
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customer = customers.data[0];

    if (!customer) {
      const name = profile
        ? [profile.first_name, profile.last_name].filter(Boolean).join(' ')
        : '';
      customer = await stripe.customers.create({
        email,
        name: name || undefined,
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

function handleLegacyConfirm(req, res) {
  return res.status(410).json({
    error: LEGACY_CONFIRM_MESSAGE,
    verify_url: '/verify-email.html',
  });
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

  if (action === 'verify-email-code') {
    return handleVerifyEmailCode(req, res);
  }

  if (action === 'resend-email-code') {
    return handleResendEmailCode(req, res);
  }

  if (action === 'legacy-confirm') {
    return handleLegacyConfirm(req, res);
  }

  if (action === 'signup') {
    if (req.method !== 'POST') {
      res.setHeader('Allow', 'POST');
      return res.status(405).json({ error: 'Method not allowed' });
    }
    return handleAuthSignup(req, res);
  }

  if (action === 'reset-password-email') {
    return sendPasswordResetEmail(req, res);
  }

  if (action === 'reset-password') {
    return handleAuthReset(req, res);
  }

  if (action === 'set-password') {
    return handleSetPassword(req, res);
  }

  if (action === 'signin') {
    return handleAuthSignin(req, res);
  }

  if (action === 'complete-reset') {
    return handleCompleteReset(req, res);
  }

  if (action === 'auth-me') {
    return handleAuthMe(req, res);
  }

  return res.status(400).json({ error: 'Unknown account action' });
};
