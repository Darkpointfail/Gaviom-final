const publicCfg = require('./gaviom-supabase-public');
const { formatServiceError } = require('./send-auth-confirmation');
const { verifyRecoveryToken } = require('./auth-reset-password');
const { signInWithPassword } = require('./auth-signin');
const { supabaseConfig } = require('./supabase-user');

async function fetchUserFromAccessToken(cfg, accessToken) {
  const res = await fetch(`${cfg.url}/auth/v1/user`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      apikey: cfg.anonKey,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) return null;
  return data;
}

async function completePasswordReset(token, type, password) {
  const cfg = supabaseConfig();
  if (!cfg?.serviceKey) {
    return { error: 'Password reset is not configured on the server.', status: 503 };
  }

  const resetToken = String(token || '').trim();
  if (!resetToken) {
    return { error: 'Reset link is invalid or expired.', status: 400 };
  }

  const verified = await verifyRecoveryToken(cfg.url, cfg.anonKey, resetToken, type || 'recovery');
  if (verified.error || !verified.data?.access_token) {
    return {
      error: 'This reset link expired or was already used. Request a new one from sign in.',
      status: 401,
    };
  }

  let user = verified.data.user || null;
  if (!user?.id) {
    user = await fetchUserFromAccessToken(cfg, verified.data.access_token);
  }
  if (!user?.id) {
    return { error: 'Could not verify your account from this reset link.', status: 502 };
  }

  const userEmail = (user.email || '').trim().toLowerCase();
  if (!userEmail) {
    return { error: 'Account email missing.', status: 400 };
  }

  const updateRes = await fetch(`${cfg.url}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.serviceKey}`,
      apikey: cfg.serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      password,
      email_confirm: true,
    }),
  });

  const updateData = await updateRes.json().catch(() => ({}));
  if (!updateRes.ok) {
    console.error('auth-complete-reset:update', updateRes.status, updateData);
    return {
      error: formatServiceError(updateData) || 'Could not save your new password. Try again.',
      status: 502,
    };
  }

  const login = await signInWithPassword(userEmail, password);
  if (!login.ok) {
    console.error('auth-complete-reset:verify-login', login.error, { userId: user.id, email: userEmail });
    return {
      error: 'Password saved but sign-in verification failed. Try signing in manually.',
      status: 502,
    };
  }

  return {
    ok: true,
    access_token: login.access_token,
    refresh_token: login.refresh_token,
    user: login.user || user,
    email: userEmail,
  };
}

async function handleCompleteReset(req, res) {
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

  const result = await completePasswordReset(body?.token || '', body?.type || 'recovery', password);
  if (!result.ok) {
    return res.status(result.status || 502).json({ error: result.error });
  }

  return res.status(200).json({
    ok: true,
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    user: result.user,
    email: result.email,
  });
}

module.exports = {
  completePasswordReset,
  handleCompleteReset,
};
