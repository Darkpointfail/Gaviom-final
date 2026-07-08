const crypto = require('crypto');
const { publicAuthConfig } = require('./gaviom-supabase-public');
const { adminConfig } = require('./supabase-admin');
const { completeEmailConfirmation } = require('./auth-complete-confirm');
const {
  fetchAdminUserById,
  fetchAdminUserByEmail,
  ensureUserEmailConfirmed,
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

function buildSessionSuccess(sessionData, adminUser) {
  const canonicalUser = mergeCanonicalUser(sessionData.user, adminUser);
  return {
    ok: true,
    access_token: sessionData.access_token,
    refresh_token: sessionData.refresh_token,
    expires_in: sessionData.expires_in,
    expires_at: sessionData.expires_at,
    user: canonicalUser,
    email_confirmed: true,
  };
}

async function completeEmailConfirmationByProof(email, proof, confirmToken, confirmType) {
  const cfg = adminConfig();
  const authCfg = publicAuthConfig();

  if (!cfg || !authCfg.url || !authCfg.anonKey) {
    return { error: 'Account confirmation is not configured.', status: 503 };
  }

  const token = String(confirmToken || '').trim();
  if (token) {
    const parsed = verifyEmailConfirmProof(proof, email);
    if (!parsed) {
      return {
        error: 'This confirmation link is invalid or expired. Request a new one from sign in.',
        status: 401,
      };
    }
    const adminUser = await fetchAdminUserByEmail(cfg, parsed.email);
    if (!adminUser?.id || (adminUser.email || '').toLowerCase() !== parsed.email) {
      return { error: 'Could not verify your account for this confirmation link.', status: 401 };
    }
    return completeEmailConfirmation(token, confirmType || 'signup');
  }

  const parsed = verifyEmailConfirmProof(proof, email);
  if (!parsed) {
    return {
      error: 'This confirmation link is invalid or expired. Request a new one from sign in.',
      status: 401,
    };
  }

  const adminUser = await fetchAdminUserByEmail(cfg, parsed.email);
  if (!adminUser?.id || (adminUser.email || '').toLowerCase() !== parsed.email) {
    return { error: 'Could not verify your account for this confirmation link.', status: 401 };
  }

  const confirmResult = await ensureUserEmailConfirmed(cfg, adminUser.id, parsed.email);
  if (confirmResult.session?.access_token) {
    const freshAdminUser = confirmResult.user || (await fetchAdminUserById(cfg, adminUser.id));
    return buildSessionSuccess(confirmResult.session, freshAdminUser);
  }

  if (confirmResult.ok) {
    return {
      error: 'Email confirmed. Sign in with your password on the sign-in page.',
      status: 200,
      email_confirmed: true,
      signin_required: true,
    };
  }

  console.error('auth-confirm-proof:confirm-failed', { userId: adminUser.id, email: parsed.email });
  return {
    error: 'Could not confirm your email on the server. Try Resend confirmation from sign in.',
    status: 502,
  };
}

function buildProofConfirmUrl(email, proof, linkMeta) {
  const origin = (process.env.AUTH_CONFIRM_ORIGIN || 'https://gaviom.com').replace(/\/$/, '');
  const params = new URLSearchParams({
    email: String(email || '').trim().toLowerCase(),
    proof: proof,
  });
  const token = String(linkMeta?.confirm_token || linkMeta?.hashed_token || '').trim();
  const type = String(linkMeta?.type || linkMeta?.verification_type || 'signup').trim();
  if (token) params.set('confirm_token', token);
  if (type) params.set('type', type);
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

  const result = await completeEmailConfirmationByProof(
    body?.email || '',
    body?.proof || '',
    body?.confirm_token || body?.token || '',
    body?.type || 'signup'
  );
  if (!result.ok) {
    return res.status(result.status || 502).json({
      error: result.error,
      email_confirmed: result.email_confirmed || false,
      signin_required: result.signin_required || false,
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
