const publicCfg = require('./gaviom-supabase-public');

function supabaseConfig() {
  const authCfg = publicCfg.publicAuthConfig();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!authCfg.url || authCfg.url.includes('REPLACE')) return null;
  if (!authCfg.anonKey || authCfg.anonKey.includes('REPLACE')) return null;
  return {
    url: authCfg.url,
    anonKey: authCfg.anonKey,
    serviceKey: serviceKey && !serviceKey.includes('REPLACE') ? serviceKey : null,
  };
}

const { isUserEmailConfirmed } = require('./auth-user');

async function verifyBearerUser(req) {
  const cfg = supabaseConfig();
  if (!cfg) {
    return { error: 'Account service is not configured.', status: 503 };
  }

  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) {
    return { error: 'Sign in required.', status: 401 };
  }

  try {
    const res = await fetch(`${cfg.url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: cfg.anonKey,
      },
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { error: 'Session expired. Sign in again.', status: 401 };
    }
    if (!data || !data.id) {
      return { error: 'Invalid session.', status: 401 };
    }
    return { user: data, cfg };
  } catch (err) {
    console.error('supabase-user verify:', err.message);
    return { error: 'Could not verify session.', status: 500 };
  }
}

async function verifyVerifiedUser(req) {
  const auth = await verifyBearerUser(req);
  if (auth.error) return auth;
  if (!isUserEmailConfirmed(auth.user)) {
    return { error: 'Confirm your email before continuing.', status: 403 };
  }
  return auth;
}

async function optionalBearerUser(req) {
  const header = req.headers.authorization || req.headers.Authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7).trim() : '';
  if (!token) return { user: null };
  return verifyBearerUser(req);
}

module.exports = {
  supabaseConfig,
  isUserEmailConfirmed,
  verifyBearerUser,
  verifyVerifiedUser,
  optionalBearerUser,
};
