const { adminAuthConfig } = require('./send-auth-confirmation');

function serviceHeaders(cfg, prefer) {
  const headers = {
    Authorization: `Bearer ${cfg.key}`,
    apikey: cfg.key,
    'Content-Type': 'application/json',
  };
  if (prefer) headers.Prefer = prefer;
  return headers;
}

async function restFetch(cfg, path, options = {}) {
  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      ...serviceHeaders(cfg, options.prefer),
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  let data = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }
  return { ok: res.ok, status: res.status, data };
}

async function supersedePendingCodes(cfg, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const now = new Date().toISOString();
  return restFetch(
    cfg,
    `email_verification_codes?email=eq.${encodeURIComponent(normalizedEmail)}&verified_at=is.null`,
    {
      method: 'PATCH',
      prefer: 'return=minimal',
      body: JSON.stringify({ expires_at: now }),
    }
  );
}

async function insertVerificationCode(cfg, row) {
  return restFetch(cfg, 'email_verification_codes', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify(row),
  });
}

async function getLatestActiveCode(cfg, email) {
  const row = await getLatestCodeRow(cfg, email);
  if (!row || row.verified_at) return null;
  if (new Date(row.expires_at).getTime() <= Date.now()) return null;
  return row;
}

async function getLatestCodeRow(cfg, email) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const params = new URLSearchParams({
    select: 'id,user_id,email,code_hash,expires_at,attempts,verified_at,created_at',
    email: `eq.${normalizedEmail}`,
    order: 'created_at.desc',
    limit: '1',
  });
  const result = await restFetch(cfg, `email_verification_codes?${params.toString()}`, {
    method: 'GET',
  });
  if (!result.ok || !Array.isArray(result.data) || !result.data[0]) return null;
  return result.data[0];
}

async function incrementCodeAttempts(cfg, id, attempts) {
  return restFetch(cfg, `email_verification_codes?id=eq.${id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ attempts }),
  });
}

async function repointVerificationCodeUserId(cfg, codeRowId, userId) {
  if (!codeRowId || !userId) return { ok: false };
  return restFetch(cfg, `email_verification_codes?id=eq.${codeRowId}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify({ user_id: userId }),
  });
}

async function markCodeVerified(cfg, id) {
  const now = new Date().toISOString();
  return restFetch(cfg, `email_verification_codes?id=eq.${id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({ verified_at: now }),
  });
}

module.exports = {
  restFetch,
  supersedePendingCodes,
  insertVerificationCode,
  getLatestActiveCode,
  getLatestCodeRow,
  incrementCodeAttempts,
  markCodeVerified,
  repointVerificationCodeUserId,
};
