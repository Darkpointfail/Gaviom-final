function isUserEmailConfirmed(user) {
  return !!(user && (user.email_confirmed_at || user.confirmed_at));
}

async function fetchAdminUserById(cfg, userId) {
  if (!cfg?.key || !cfg?.url || !userId) return null;

  const res = await fetch(`${cfg.url}/auth/v1/admin/users/${userId}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
    },
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) return null;
  return data;
}

async function fetchAdminUserByEmail(cfg, email) {
  if (!cfg?.key || !cfg?.url || !email) return null;

  const res = await fetch(`${cfg.url}/auth/v1/admin/users?email=${encodeURIComponent(email)}`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
    },
  });

  const data = await res.json().catch(() => ({}));
  return Array.isArray(data?.users) && data.users[0] ? data.users[0] : null;
}

async function ensureUserEmailConfirmed(cfg, userId, email) {
  if (!cfg?.key || !cfg?.url || !userId) {
    return { ok: false, user: null };
  }

  let user = await fetchAdminUserById(cfg, userId);
  if (user && isUserEmailConfirmed(user)) {
    return { ok: true, user };
  }

  const normalizedEmail = String(email || user?.email || '').trim().toLowerCase();
  const payloads = [
    { email_confirm: true },
    normalizedEmail ? { email_confirm: true, email: normalizedEmail } : null,
  ].filter(Boolean);

  for (const body of payloads) {
    const res = await fetch(`${cfg.url}/auth/v1/admin/users/${userId}`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      user = data?.id ? data : await fetchAdminUserById(cfg, userId);
      if (user && isUserEmailConfirmed(user)) {
        return { ok: true, user };
      }
    } else {
      console.error('ensureUserEmailConfirmed:put', res.status, data);
    }
  }

  user = await fetchAdminUserById(cfg, userId);
  if (user && isUserEmailConfirmed(user)) {
    return { ok: true, user };
  }

  return { ok: false, user };
}

function mergeCanonicalUser(tokenUser, adminUser) {
  if (!adminUser) return tokenUser || null;
  if (!tokenUser) return adminUser;
  return Object.assign({}, tokenUser, {
    id: adminUser.id || tokenUser.id,
    email: adminUser.email || tokenUser.email,
    email_confirmed_at: adminUser.email_confirmed_at || tokenUser.email_confirmed_at || null,
    confirmed_at: adminUser.confirmed_at || tokenUser.confirmed_at || null,
    user_metadata: Object.assign({}, tokenUser.user_metadata || {}, adminUser.user_metadata || {}),
    app_metadata: Object.assign({}, tokenUser.app_metadata || {}, adminUser.app_metadata || {}),
  });
}

async function resolveCanonicalUser(cfg, tokenUser) {
  if (!tokenUser?.id) return tokenUser || null;
  const adminUser = await fetchAdminUserById(cfg, tokenUser.id);
  return mergeCanonicalUser(tokenUser, adminUser);
}

module.exports = {
  isUserEmailConfirmed,
  fetchAdminUserById,
  fetchAdminUserByEmail,
  ensureUserEmailConfirmed,
  mergeCanonicalUser,
  resolveCanonicalUser,
};
