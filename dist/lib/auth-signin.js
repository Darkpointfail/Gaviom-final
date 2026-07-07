const publicCfg = require('./gaviom-supabase-public');
const { validateAccountEmail } = require('./email-validation');
const { formatServiceError } = require('./send-auth-confirmation');
const { supabaseConfig } = require('./supabase-user');

async function findUserByEmail(cfg, email) {
  if (!cfg?.serviceKey) return null;
  const res = await fetch(`${cfg.url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cfg.serviceKey}`,
      apikey: cfg.serviceKey,
    },
  });
  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.users) && data.users[0] ? data.users[0] : null;
}

async function forceConfirmUser(cfg, userId) {
  if (!cfg?.serviceKey || !userId) return false;
  const res = await fetch(`${cfg.url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.serviceKey}`,
      apikey: cfg.serviceKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_confirm: true }),
  });
  return res.ok;
}

function mapSignInError(data) {
  const message = formatServiceError(data);
  const code = String(data?.error_code || data?.code || '').trim();
  if (code === 'email_not_confirmed' || /email not confirmed/i.test(message)) {
    return {
      status: 403,
      code: 'email_not_confirmed',
      error: 'Confirm your email before signing in. Check your inbox or use Resend confirmation.',
    };
  }
  return {
    status: 401,
    code: 'invalid_credentials',
    error: 'Incorrect email or password. Try again or use Forgot password.',
  };
}

async function passwordGrant(cfg, email, password) {
  const res = await fetch(`${cfg.url}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: {
      apikey: cfg.anonKey,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function signInWithPassword(email, password) {
  const cfg = supabaseConfig();
  if (!cfg) {
    return { error: 'Account service is not configured.', status: 503 };
  }

  const emailCheck = validateAccountEmail(email || '');
  if (!emailCheck.ok) {
    return { error: emailCheck.error, status: 400 };
  }

  let attempt = await passwordGrant(cfg, emailCheck.email, password);
  if (attempt.ok && attempt.data?.access_token && attempt.data?.refresh_token) {
    return {
      ok: true,
      access_token: attempt.data.access_token,
      refresh_token: attempt.data.refresh_token,
      expires_in: attempt.data.expires_in,
      expires_at: attempt.data.expires_at,
      user: attempt.data.user || null,
    };
  }

  const firstError = mapSignInError(attempt.data);
  if (firstError.code === 'email_not_confirmed' && cfg.serviceKey) {
    const user = await findUserByEmail(cfg, emailCheck.email);
    if (user?.id) {
      await forceConfirmUser(cfg, user.id);
      attempt = await passwordGrant(cfg, emailCheck.email, password);
      if (attempt.ok && attempt.data?.access_token && attempt.data?.refresh_token) {
        return {
          ok: true,
          access_token: attempt.data.access_token,
          refresh_token: attempt.data.refresh_token,
          user: attempt.data.user || null,
        };
      }
    }
  }

  return { error: firstError.error, status: firstError.status, code: firstError.code };
}

async function handleAuthSignin(req, res) {
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

  const result = await signInWithPassword(body?.email || '', body?.password || '');
  if (!result.ok) {
    return res.status(result.status || 401).json({
      error: result.error,
      code: result.code || null,
    });
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
  handleAuthSignin,
  signInWithPassword,
};
