const { verifyBearerUser } = require('./supabase-user');
const { formatServiceError } = require('./send-auth-confirmation');
const { signInWithPassword } = require('./auth-signin');

async function handleSetPassword(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const password = typeof body?.password === 'string' ? body.password : '';
  if (password.length < 8) {
    return res.status(400).json({ error: 'Choose a password with at least 8 characters.' });
  }

  const auth = await verifyBearerUser(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const serviceKey = auth.cfg.serviceKey;
  if (!serviceKey) {
    return res.status(503).json({ error: 'Password update is not configured on the server.' });
  }

  const userEmail = (auth.user.email || '').trim().toLowerCase();
  if (!userEmail) {
    return res.status(400).json({ error: 'Account email missing.' });
  }

  try {
    const updateRes = await fetch(`${auth.cfg.url}/auth/v1/admin/users/${auth.user.id}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${serviceKey}`,
        apikey: serviceKey,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        password,
        email_confirm: true,
      }),
    });

    const data = await updateRes.json().catch(() => ({}));
    if (!updateRes.ok) {
      console.error('auth-set-password:update', updateRes.status, data);
      return res.status(502).json({
        error: formatServiceError(data) || 'Could not save your new password. Try again.',
      });
    }

    const login = await signInWithPassword(userEmail, password);
    if (!login.ok) {
      console.error('auth-set-password:verify-login', login.error);
      return res.status(502).json({
        error: 'Password saved but sign-in verification failed. Try signing in manually.',
      });
    }

    return res.status(200).json({
      ok: true,
      access_token: login.access_token,
      refresh_token: login.refresh_token,
      user: login.user,
    });
  } catch (err) {
    console.error('auth-set-password:', err.message);
    return res.status(500).json({ error: 'Could not save your new password. Try again.' });
  }
}

module.exports = { handleSetPassword };
