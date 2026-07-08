function safeNext(value) {
  const next = typeof value === 'string' ? value.trim() : '';
  if (next && next.startsWith('/') && !next.startsWith('//')) return next;
  return '/account.html';
}

function extractActionLink(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.properties && payload.properties.action_link) {
    return payload.properties.action_link;
  }
  if (payload.action_link) return payload.action_link;
  return null;
}

function extractLinkProperties(payload) {
  const props = payload?.properties && typeof payload.properties === 'object' ? payload.properties : payload;
  const actionLink = extractActionLink(payload);
  let hashedToken = typeof props?.hashed_token === 'string' ? props.hashed_token.trim() : '';
  let verificationType =
    typeof props?.verification_type === 'string' ? props.verification_type.trim() : '';

  if (!hashedToken && actionLink) {
    try {
      const url = new URL(actionLink);
      hashedToken = (url.searchParams.get('token') || url.searchParams.get('token_hash') || '').trim();
      if (!verificationType) {
        verificationType = (url.searchParams.get('type') || '').trim();
      }
    } catch {
      /* ignore */
    }
  }

  return {
    action_link: actionLink,
    hashed_token: hashedToken,
    verification_type: verificationType,
  };
}

function buildConfirmUrlFromActionLink(actionLink, preferredType, linkProps) {
  try {
    const props =
      linkProps && typeof linkProps === 'object'
        ? linkProps
        : extractLinkProperties({ properties: { action_link: actionLink } });
    const token = (props.hashed_token || '').trim();
    const type = (preferredType || props.verification_type || 'signup').trim();
    if (!token) return actionLink;
    const origin = (process.env.AUTH_CONFIRM_ORIGIN || 'https://gaviom.com').replace(/\/$/, '');
    let next = '';
    const redirectTo = actionLink ? new URL(actionLink).searchParams.get('redirect_to') : '';
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
  const ordered = [primaryType, 'signup', 'invite', 'email', 'magiclink'];
  return ordered.filter(function (type, index, arr) {
    return type && arr.indexOf(type) === index;
  });
}

async function verifyEmailToken(url, anonKey, tokenHash, primaryType) {
  const hash = String(tokenHash || '').trim();
  if (!hash) {
    return { error: { message: 'missing token hash' } };
  }

  const types = verifyTypes(primaryType);
  let lastError = null;

  for (const type of types) {
    const verifyRes = await fetch(`${url}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ type, token_hash: hash }),
    });

    const data = await verifyRes.json().catch(() => ({}));
    if (verifyRes.ok && data.access_token && data.refresh_token) {
      return { data, verifyType: type };
    }
    lastError = data;
  }

  console.error('auth-confirm:verify-failed', {
    type: primaryType,
    error: lastError?.msg || lastError?.message || lastError?.error_description || lastError,
  });

  return { error: lastError || { message: 'verify failed' } };
}

async function confirmViaGeneratedLink(cfg, url, anonKey, email, preferredTypes) {
  const types = preferredTypes || ['signup', 'invite', 'email', 'magiclink'];
  let lastError = null;

  for (const type of types) {
    const res = await fetch(`${cfg.url}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        email,
        options: { redirect_to: 'https://gaviom.com/auth-callback.html' },
      }),
    });

    const data = await res.json().catch(() => ({}));
    const props = extractLinkProperties(data);
    if (!res.ok || !props.hashed_token) {
      lastError = data;
      continue;
    }

    const verified = await verifyEmailToken(
      url,
      anonKey,
      props.hashed_token,
      props.verification_type || type
    );
    if (verified.data?.access_token && verified.data?.refresh_token) {
      return { data: verified.data, verifyType: verified.verifyType || type };
    }
    lastError = verified.error || data;
  }

  console.error('auth-confirm:generated-link', lastError);
  return null;
}

async function forceConfirmUser(cfg, userId, email) {
  const { ensureUserEmailConfirmed } = require('./auth-user');
  const result = await ensureUserEmailConfirmed(cfg, userId, email);
  return result.ok;
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
  const type = (req.query?.type || 'signup').trim();
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
  confirmViaGeneratedLink,
  forceConfirmUser,
  isUserConfirmed,
  safeNext,
  extractLinkProperties,
};
