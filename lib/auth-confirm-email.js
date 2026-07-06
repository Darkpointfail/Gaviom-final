const publicCfg = require('./gaviom-supabase-public');
const { adminConfig } = require('./supabase-admin');

function safeNext(value) {
  const next = typeof value === 'string' ? value.trim() : '';
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/account.html';
}

function escapeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildConfirmUrlFromActionLink(actionLink, preferredType) {
  try {
    const url = new URL(actionLink);
    const token = (url.searchParams.get('token') || '').trim();
    const type = (preferredType || url.searchParams.get('type') || 'invite').trim();
    if (!token) return actionLink;
    const origin = (process.env.AUTH_CONFIRM_ORIGIN || 'https://gaviom.com').replace(/\/$/, '');
    let next = '';
    const redirectTo = url.searchParams.get('redirect_to');
    if (redirectTo) {
      try {
        const dest = new URL(redirectTo);
        next = safeNext(dest.searchParams.get('next') || dest.pathname || '/account.html');
      } catch {
        next = '/account.html';
      }
    }
    const params = new URLSearchParams({ token, type });
    if (next && next !== '/account.html') params.set('next', next);
    return `${origin}/api/auth-confirm?${params.toString()}`;
  } catch {
    return actionLink;
  }
}

function verifyTypes(primaryType) {
  const ordered = [primaryType, 'invite', 'signup', 'magiclink', 'email'];
  return ordered.filter(function (type, index) {
    return type && ordered.indexOf(type) === index;
  });
}

async function verifyEmailToken(url, anonKey, token, primaryType) {
  const types = verifyTypes(primaryType);
  const payloads = types.flatMap(function (type) {
    return [
      { type, token },
      { type, token_hash: token },
    ];
  });

  let lastError = null;

  for (const body of payloads) {
    const verifyRes = await fetch(`${url}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await verifyRes.json().catch(() => ({}));
    if (verifyRes.ok && data.access_token && data.refresh_token) {
      return { data, verifyType: body.type };
    }
    lastError = data;
  }

  return { error: lastError || { message: 'verify failed' } };
}

async function forceConfirmUser(cfg, userId) {
  if (!cfg || !userId) return false;

  const res = await fetch(`${cfg.url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_confirm: true }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('auth-confirm:force-confirm', res.status, err);
    return false;
  }

  return true;
}

function isUserConfirmed(user) {
  return !!(user && (user.email_confirmed_at || user.confirmed_at));
}

function confirmLandingHtml(accessToken, refreshToken, nextPath) {
  const tokensJson = escapeJson({
    access_token: accessToken,
    refresh_token: refreshToken,
  });
  const nextJson = escapeJson(nextPath);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Signing in, Gaviom</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; color: #0a1628; background: #f8fafc; }
    .box { text-align: center; padding: 2rem; max-width: 28rem; }
    .box p { margin: 0; line-height: 1.6; }
  </style>
</head>
<body>
  <div class="box">
    <p>Email confirmed. Signing you in…</p>
  </div>
  <script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js"></script>
  <script src="/auth-config.js"></script>
  <script>
  (async function () {
    var tokens = ${tokensJson};
    var next = ${nextJson};
    try {
      var cfg = window.GAVIOM_AUTH_CONFIG;
      if (!cfg || !cfg.supabaseUrl || !cfg.supabaseAnonKey) throw new Error('config');
      var client = window.supabase.createClient(cfg.supabaseUrl, cfg.supabaseAnonKey, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false }
      });
      var result = await client.auth.setSession({
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token
      });
      if (result.error) throw result.error;
      await client.auth.refreshSession();
      var userResult = await client.auth.getUser();
      var user = userResult.data && userResult.data.user;
      if (!user || !(user.email_confirmed_at || user.confirmed_at)) {
        throw new Error('email not confirmed');
      }
      try { history.replaceState(null, '', '/auth-callback.html'); } catch (e) {}
      window.location.replace(next || '/account.html');
    } catch (e) {
      window.location.replace('/signin.html?verified=1&confirm=error');
    }
  })();
  </script>
</body>
</html>`;
}

async function handleAuthConfirm(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }

  const token = (req.query?.token || '').trim();
  const type = (req.query?.type || 'invite').trim();
  const nextPath = safeNext(req.query?.next);

  if (!token) {
    return res.redirect(302, '/signin.html?confirm=error');
  }

  const cfg = adminConfig();
  const anonKey = (process.env.SUPABASE_ANON_KEY || publicCfg.supabaseAnonKey || '').trim();
  const url = (process.env.SUPABASE_URL || publicCfg.supabaseUrl || '').trim();

  if (!cfg || !anonKey || !url) {
    return res.status(503).send('Account confirmation is not configured.');
  }

  try {
    const verified = await verifyEmailToken(url, anonKey, token, type);
    if (verified.error || !verified.data) {
      console.error('auth-confirm:verify', verified.error);
      return res.redirect(302, '/signin.html?verified=1&confirm=error');
    }

    const data = verified.data;
    const userId = data.user && data.user.id;

    if (userId) {
      await forceConfirmUser(cfg, userId);
    }

    if (userId && !isUserConfirmed(data.user)) {
      const refreshRes = await fetch(`${url}/auth/v1/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: {
          apikey: anonKey,
          Authorization: `Bearer ${anonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ refresh_token: data.refresh_token }),
      });
      const refreshed = await refreshRes.json().catch(() => ({}));
      if (refreshRes.ok && refreshed.access_token && refreshed.refresh_token) {
        data.access_token = refreshed.access_token;
        data.refresh_token = refreshed.refresh_token;
        if (refreshed.user) data.user = refreshed.user;
      }
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(confirmLandingHtml(data.access_token, data.refresh_token, nextPath));
  } catch (err) {
    console.error('auth-confirm:', err.message);
    return res.redirect(302, '/signin.html?verified=1&confirm=error');
  }
}

module.exports = {
  handleAuthConfirm,
  buildConfirmUrlFromActionLink,
};
