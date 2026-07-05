function supabaseConfig() {
  const url = (process.env.SUPABASE_URL || '').trim();
  const anonKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || url.includes('REPLACE')) return null;
  if (!anonKey || anonKey.includes('REPLACE')) return null;
  return { url, anonKey, serviceKey: serviceKey && !serviceKey.includes('REPLACE') ? serviceKey : null };
}

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

module.exports = { supabaseConfig, verifyBearerUser };
