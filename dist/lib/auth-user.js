function isUserEmailConfirmed(user) {
  return !!(user && (user.email_confirmed_at || user.confirmed_at));
}

function pickMatchingUser(users, normalizedEmail) {
  if (!Array.isArray(users) || !users.length) return null;
  const match = users.find((user) => (user.email || '').trim().toLowerCase() === normalizedEmail);
  if (match) return match;
  if (users.length === 1 && (users[0].email || '').trim().toLowerCase() === normalizedEmail) {
    return users[0];
  }
  return null;
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
  const users = await listAdminUsersByEmail(cfg, email);
  if (!users.length) return null;
  const normalizedEmail = String(email).trim().toLowerCase();
  return users.find((user) => (user.email || '').trim().toLowerCase() === normalizedEmail) || users[0];
}

async function listAdminUsersByEmail(cfg, email) {
  if (!cfg?.key || !cfg?.url || !email) return [];

  const normalizedEmail = String(email).trim().toLowerCase();
  const endpoints = [
    `${cfg.url}/auth/v1/admin/users?email=${encodeURIComponent(normalizedEmail)}`,
    `${cfg.url}/auth/v1/admin/users?filter=${encodeURIComponent(normalizedEmail)}`,
  ];
  const seen = new Set();
  const users = [];

  for (const endpoint of endpoints) {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok || !Array.isArray(data?.users)) continue;

    for (const user of data.users) {
      if (!user?.id || seen.has(user.id)) continue;
      if ((user.email || '').trim().toLowerCase() !== normalizedEmail) continue;
      seen.add(user.id);
      users.push(user);
    }
  }

  return users;
}

async function deleteAdminUser(cfg, userId) {
  if (!cfg?.key || !cfg?.url || !userId) return { ok: false };

  const res = await fetch(`${cfg.url}/auth/v1/admin/users/${userId}`, {
    method: 'DELETE',
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
    },
  });

  return { ok: res.ok, status: res.status };
}

async function reconcileAuthUsersForEmail(cfg, email, preferredUserId) {
  const normalizedEmail = String(email).trim().toLowerCase();
  const withEmail = await listAdminUsersByEmail(cfg, normalizedEmail);
  const preferred = preferredUserId ? await fetchAdminUserById(cfg, preferredUserId) : null;
  const preferredHasEmail = (preferred?.email || '').trim().toLowerCase() === normalizedEmail;

  let canonical =
    withEmail.find((user) => user.id === preferredUserId) ||
    withEmail.find((user) => isUserEmailConfirmed(user)) ||
    withEmail[0] ||
    null;

  if (!canonical && preferredHasEmail) {
    canonical = preferred;
  } else if (!canonical && preferred) {
    canonical = preferred;
  }

  let cleaned = 0;

  if (canonical && preferred && preferred.id !== canonical.id) {
    const preferredIsOrphan = !(preferred.email || '').trim();
    if (!isUserEmailConfirmed(preferred) && (preferredIsOrphan || !preferredHasEmail)) {
      const deleted = await deleteAdminUser(cfg, preferred.id);
      if (deleted.ok) cleaned += 1;
    }
  }

  for (const user of withEmail) {
    if (!canonical || user.id === canonical.id || isUserEmailConfirmed(user)) continue;
    const deleted = await deleteAdminUser(cfg, user.id);
    if (deleted.ok) cleaned += 1;
  }

  return { userId: canonical?.id || preferredUserId || null, cleaned };
}

async function fetchUserWithAccessToken(url, anonKey, accessToken) {
  if (!url || !anonKey || !accessToken) return null;
  const res = await fetch(`${url}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${accessToken}`,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data?.id) return null;
  return data;
}

/** Read-only: checks auth.users via admin API. Never mutates confirmation state. */
async function ensureUserEmailConfirmed(cfg, userId) {
  if (!cfg?.key || !cfg?.url || !userId) {
    return { ok: false, user: null };
  }

  const user = await fetchAdminUserById(cfg, userId);
  const ok = !!(user && isUserEmailConfirmed(user));
  return { ok, user };
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
  listAdminUsersByEmail,
  reconcileAuthUsersForEmail,
  deleteAdminUser,
  fetchUserWithAccessToken,
  ensureUserEmailConfirmed,
  mergeCanonicalUser,
  resolveCanonicalUser,
};
