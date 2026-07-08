const crypto = require('crypto');
const publicCfg = require('./gaviom-supabase-public');
const { adminConfig } = require('./supabase-admin');
const { forceConfirmUser } = require('./auth-confirm-email');
const { verifyEmailToken, extractLinkProperties } = require('./auth-confirm-email');
const {
  isUserEmailConfirmed,
  fetchAdminUserById,
  fetchAdminUserByEmail,
  mergeCanonicalUser,
} = require('./auth-user');

const PROOF_TTL_MS = 72 * 60 * 60 * 1000;

function confirmSecret() {
  return (
    (process.env.AUTH_CONFIRM_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() ||
    null
  );
}

function signPayload(payload, secret) {
  return crypto.createHmac('sha256', secret).update(payload).digest('base64url');
}

function createEmailConfirmProof(userId, email) {
  const secret = confirmSecret();
  if (!secret || !userId || !email) return null;

  const normalizedEmail = String(email).trim().toLowerCase();
  const exp = Date.now() + PROOF_TTL_MS;
  const payload = `${userId}:${normalizedEmail}:${exp}`;
  const signature = signPayload(payload, secret);
  const proof = `${Buffer.from(payload, 'utf8').toString('base64url')}.${signature}`;
  return { proof, exp };
}

function verifyEmailConfirmProof(proof, email) {
  const secret = confirmSecret();
  if (!secret || !proof || !email) return null;

  const parts = String(proof).split('.');
  if (parts.length !== 2) return null;

  let payload = '';
  try {
    payload = Buffer.from(parts[0], 'base64url').toString('utf8');
  } catch {
    return null;
  }

  const expectedSig = signPayload(payload, secret);
  const sigBuf = Buffer.from(parts[1] || '');
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }

  const bits = payload.split(':');
  if (bits.length !== 3) return null;
  const userId = bits[0];
  const proofEmail = bits[1];
  const exp = Number(bits[2]);
  const normalizedEmail = String(email).trim().toLowerCase();

  if (!userId || proofEmail !== normalizedEmail || !exp || Date.now() > exp) {
    return null;
  }

  return { userId, email: normalizedEmail, exp };
}

async function issueSessionForEmail(cfg, url, anonKey, email) {
  const types = ['magiclink', 'email', 'signup', 'invite'];
  let lastError = null;

  for (const type of types) {
    const res = await fetch(`${url}/auth/v1/admin/generate_link`, {
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

  console.error('auth-confirm-proof:issue-session', lastError);
  return null;
}

async function completeEmailConfirmationByProof(email, proof) {
  const cfg = adminConfig();
  const anonKey = (process.env.SUPABASE_ANON_KEY || publicCfg.supabaseAnonKey || '').trim();
  const url = (process.env.SUPABASE_URL || publicCfg.supabaseUrl || '').trim();

  if (!cfg || !anonKey || !url) {
    return { error: 'Account confirmation is not configured.', status: 503 };
  }

  const parsed = verifyEmailConfirmProof(proof, email);
  if (!parsed) {
    return {
      error: 'This confirmation link is invalid or expired. Request a new one from sign in.',
      status: 401,
    };
  }

  const adminUser = await fetchAdminUserById(cfg, parsed.userId);
  if (!adminUser || (adminUser.email || '').toLowerCase() !== parsed.email) {
    return { error: 'Could not verify your account for this confirmation link.', status: 401 };
  }

  const confirmed = await forceConfirmUser(cfg, parsed.userId);
  if (!confirmed) {
    return {
      error: 'Could not confirm your email on the server. Try Resend confirmation from sign in.',
      status: 502,
    };
  }

  const freshAdminUser = await fetchAdminUserById(cfg, parsed.userId);
  if (!freshAdminUser || !isUserEmailConfirmed(freshAdminUser)) {
    return {
      error: 'Email confirmation did not complete. Request a new confirmation email from sign in.',
      status: 502,
    };
  }

  const session = await issueSessionForEmail(cfg, url, anonKey, parsed.email);
  if (!session?.data?.access_token) {
    return {
      error: 'Email confirmed but sign-in failed. Sign in with your password on the sign-in page.',
      status: 502,
      email_confirmed: true,
    };
  }

  const canonicalUser = mergeCanonicalUser(session.data.user, freshAdminUser);

  return {
    ok: true,
    access_token: session.data.access_token,
    refresh_token: session.data.refresh_token,
    expires_in: session.data.expires_in,
    expires_at: session.data.expires_at,
    user: canonicalUser,
    email_confirmed: true,
  };
}

function buildProofConfirmUrl(email, proof) {
  const origin = (process.env.AUTH_CONFIRM_ORIGIN || 'https://gaviom.com').replace(/\/$/, '');
  const params = new URLSearchParams({
    email: String(email || '').trim().toLowerCase(),
    proof: proof,
  });
  return `${origin}/auth-callback.html?${params.toString()}`;
}

async function handleConfirmProof(req, res) {
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

  const result = await completeEmailConfirmationByProof(body?.email || '', body?.proof || '');
  if (!result.ok) {
    return res.status(result.status || 502).json({
      error: result.error,
      email_confirmed: result.email_confirmed || false,
    });
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
  createEmailConfirmProof,
  verifyEmailConfirmProof,
  completeEmailConfirmationByProof,
  buildProofConfirmUrl,
  handleConfirmProof,
};
