const publicCfg = require('./gaviom-supabase-public');
const { adminConfig } = require('./supabase-admin');
const { verifyEmailToken, forceConfirmUser } = require('./auth-confirm-email');
const {
  isUserEmailConfirmed,
  fetchAdminUserById,
  mergeCanonicalUser,
} = require('./auth-user');

async function refreshVerifiedSession(url, anonKey, refreshToken) {
  const refreshRes = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
    method: 'POST',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });
  const refreshed = await refreshRes.json().catch(() => ({}));
  if (!refreshRes.ok || !refreshed.access_token || !refreshed.refresh_token) {
    return null;
  }
  return refreshed;
}

async function completeEmailConfirmation(token, type) {
  const cfg = adminConfig();
  const anonKey = (process.env.SUPABASE_ANON_KEY || publicCfg.supabaseAnonKey || '').trim();
  const url = (process.env.SUPABASE_URL || publicCfg.supabaseUrl || '').trim();

  if (!cfg || !anonKey || !url) {
    return { error: 'Account confirmation is not configured.', status: 503 };
  }

  const confirmToken = String(token || '').trim();
  if (!confirmToken) {
    return { error: 'Confirmation link is invalid or expired.', status: 400 };
  }

  const verified = await verifyEmailToken(url, anonKey, confirmToken, type || 'signup');
  if (verified.error || !verified.data?.access_token) {
    return {
      error: 'This confirmation link expired or was already used. Request a new one from sign in.',
      status: 401,
    };
  }

  const data = verified.data;
  const userId = data.user && data.user.id;

  if (!userId) {
    return { error: 'Could not identify your account from this confirmation link.', status: 502 };
  }

  const confirmed = await forceConfirmUser(cfg, userId, data.user?.email);
  if (!confirmed) {
    return {
      error: 'Could not confirm your email on the server. Try Resend confirmation from sign in.',
      status: 502,
    };
  }

  const adminUser = await fetchAdminUserById(cfg, userId);
  if (!adminUser || !isUserEmailConfirmed(adminUser)) {
    console.error('auth-complete-confirm:admin-user-unconfirmed', { userId });
    return {
      error: 'Email confirmation did not complete. Request a new confirmation email from sign in.',
      status: 502,
    };
  }

  const refreshed = await refreshVerifiedSession(url, anonKey, data.refresh_token);
  if (refreshed) {
    data.access_token = refreshed.access_token;
    data.refresh_token = refreshed.refresh_token;
    if (refreshed.expires_in) data.expires_in = refreshed.expires_in;
    if (refreshed.expires_at) data.expires_at = refreshed.expires_at;
    if (refreshed.user) data.user = refreshed.user;
  }

  const canonicalUser = mergeCanonicalUser(data.user, adminUser);

  return {
    ok: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at,
    user: canonicalUser,
    email_confirmed: true,
  };
}

async function handleCompleteConfirm(req, res) {
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

  const token = body?.confirm_token || body?.token || '';
  const result = await completeEmailConfirmation(token, body?.type || 'signup');
  if (!result.ok) {
    return res.status(result.status || 502).json({ error: result.error });
  }

  return res.status(200).json({
    ok: true,
    access_token: result.access_token,
    refresh_token: result.refresh_token,
    expires_in: result.expires_in,
    expires_at: result.expires_at,
    user: result.user,
    email_confirmed: result.email_confirmed,
  });
}

module.exports = {
  completeEmailConfirmation,
  handleCompleteConfirm,
};
