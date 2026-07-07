const publicCfg = require('./gaviom-supabase-public');
const { adminConfig } = require('./supabase-admin');
const { verifyEmailToken, forceConfirmUser, isUserConfirmed } = require('./auth-confirm-email');

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

  const verified = await verifyEmailToken(url, anonKey, confirmToken, type || 'invite');
  if (verified.error || !verified.data?.access_token) {
    return {
      error: 'This confirmation link expired or was already used. Request a new one from sign in.',
      status: 401,
    };
  }

  const data = verified.data;
  const userId = data.user && data.user.id;

  if (userId) {
    await forceConfirmUser(cfg, userId);
  }

  if (userId && !isUserConfirmed(data.user)) {
    const refreshed = await refreshVerifiedSession(url, anonKey, data.refresh_token);
    if (refreshed) {
      data.access_token = refreshed.access_token;
      data.refresh_token = refreshed.refresh_token;
      if (refreshed.user) data.user = refreshed.user;
      if (refreshed.expires_in) data.expires_in = refreshed.expires_in;
      if (refreshed.expires_at) data.expires_at = refreshed.expires_at;
    }
  }

  if (userId && data.user && !isUserConfirmed(data.user)) {
    data.user = Object.assign({}, data.user, {
      email_confirmed_at: data.user.email_confirmed_at || new Date().toISOString(),
      confirmed_at: data.user.confirmed_at || new Date().toISOString(),
    });
  }

  return {
    ok: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at,
    user: data.user || null,
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
  const result = await completeEmailConfirmation(token, body?.type || 'invite');
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
  });
}

module.exports = {
  completeEmailConfirmation,
  handleCompleteConfirm,
};
