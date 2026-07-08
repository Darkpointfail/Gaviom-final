function safeNext(value) {
  const next = typeof value === 'string' ? value.trim() : '';
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/account.html';
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
    const params = new URLSearchParams({ confirm_token: token, type });
    if (next && next !== '/account.html') params.set('next', next);
    return `${origin}/auth-callback.html?${params.toString()}`;
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

async function handleAuthConfirm(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }

  const token = (req.query?.token || req.query?.confirm_token || '').trim();
  const type = (req.query?.type || 'invite').trim();
  const nextPath = safeNext(req.query?.next);

  if (!token) {
    return res.redirect(302, '/signin.html?confirm=error');
  }

  const params = new URLSearchParams({ confirm_token: token, type });
  if (nextPath && nextPath !== '/account.html') params.set('next', nextPath);
  return res.redirect(302, `/auth-callback.html?${params.toString()}`);
}

module.exports = {
  handleAuthConfirm,
  buildConfirmUrlFromActionLink,
  verifyEmailToken,
  forceConfirmUser,
  isUserConfirmed,
  safeNext,
};
