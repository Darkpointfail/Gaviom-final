const { adminConfig } = require('./supabase-admin');

function safeNext(value) {
  const next = typeof value === 'string' ? value.trim() : '';
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/account.html';
}

function escapeJson(value) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}

function buildConfirmUrlFromActionLink(actionLink) {
  try {
    const url = new URL(actionLink);
    const token = (url.searchParams.get('token') || '').trim();
    const type = (url.searchParams.get('type') || 'signup').trim();
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
  const type = (req.query?.type || 'signup').trim();
  const nextPath = safeNext(req.query?.next);

  if (!token) {
    return res.redirect(302, '/signin.html?confirm=error');
  }

  const cfg = adminConfig();
  if (!cfg) {
    return res.status(503).send('Account confirmation is not configured.');
  }

  try {
    const verifyRes = await fetch(`${cfg.url}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: cfg.key,
        Authorization: `Bearer ${cfg.key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, token }),
    });

    const data = await verifyRes.json().catch(() => ({}));
    if (!verifyRes.ok || !data.access_token || !data.refresh_token) {
      console.error('auth-confirm:verify', verifyRes.status, data);
      return res.redirect(302, '/signin.html?verified=1&confirm=error');
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
