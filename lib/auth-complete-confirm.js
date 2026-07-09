const publicCfg = require('./gaviom-supabase-public');
const { adminConfig } = require('./supabase-admin');
const { verifyEmailToken } = require('./auth-confirm-email');
const { createConfirmRequestId, tokenPreview, auditConfirm } = require('./auth-audit-log');
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

async function completeEmailConfirmation(token, type, meta) {
  const cfg = adminConfig();
  const authCfg = publicCfg.publicAuthConfig();
  const requestId = meta?.requestId || createConfirmRequestId();

  if (!cfg || !authCfg.url || !authCfg.anonKey) {
    auditConfirm('complete:config-missing', { requestId });
    return { error: 'Account confirmation is not configured.', status: 503 };
  }

  const confirmToken = String(token || '').trim();
  const confirmType = String(type || 'signup').trim();
  auditConfirm('complete:start', {
    requestId,
    type: confirmType,
    token: tokenPreview(confirmToken),
    issued: meta?.issued || null,
  });

  if (!confirmToken) {
    return { error: 'Confirmation link is invalid or expired.', status: 400 };
  }

  const verified = await verifyEmailToken(
    authCfg.url,
    authCfg.anonKey,
    confirmToken,
    confirmType,
    { requestId, source: 'completeEmailConfirmation' }
  );
  if (verified.error || !verified.data?.access_token) {
    auditConfirm('complete:verify-rejected', {
      requestId,
      type: confirmType,
      token: tokenPreview(confirmToken),
      error:
        verified.error?.msg ||
        verified.error?.message ||
        verified.error?.error_description ||
        verified.error?.error ||
        'verify failed',
    });
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

  let adminUser = await fetchAdminUserById(cfg, userId);
  const refreshed = await refreshVerifiedSession(authCfg.url, authCfg.anonKey, data.refresh_token);
  if (refreshed) {
    data.access_token = refreshed.access_token;
    data.refresh_token = refreshed.refresh_token;
    if (refreshed.expires_in) data.expires_in = refreshed.expires_in;
    if (refreshed.expires_at) data.expires_at = refreshed.expires_at;
    if (refreshed.user) data.user = refreshed.user;
    adminUser = (await fetchAdminUserById(cfg, userId)) || adminUser;
  }

  const canonicalUser = mergeCanonicalUser(data.user, adminUser);
  const confirmed =
    isUserEmailConfirmed(adminUser) ||
    isUserEmailConfirmed(canonicalUser) ||
    isUserEmailConfirmed(data.user);

  auditConfirm('complete:success', {
    requestId,
    userId,
    type: confirmType,
    email_confirmed: confirmed,
  });

  return {
    ok: true,
    access_token: data.access_token,
    refresh_token: data.refresh_token,
    expires_in: data.expires_in,
    expires_at: data.expires_at,
    user: canonicalUser,
    email_confirmed: confirmed,
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

  const requestId = createConfirmRequestId();
  const token = body?.confirm_token || body?.token || '';
  auditConfirm('api:complete-confirm', {
    requestId,
    type: body?.type || 'signup',
    token: tokenPreview(token),
    issued: body?.issued || null,
    userAgent: req.headers['user-agent'] || null,
  });
  const result = await completeEmailConfirmation(token, body?.type || 'signup', {
    requestId,
    issued: body?.issued || null,
  });
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
