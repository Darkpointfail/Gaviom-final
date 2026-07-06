function adminConfig() {
  const publicCfg = require('./gaviom-supabase-public');
  const url = (process.env.SUPABASE_URL || publicCfg.supabaseUrl || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || url.includes('REPLACE') || !key || key.includes('REPLACE')) return null;
  return { url, key };
}

async function adminFetch(path, options = {}) {
  const cfg = adminConfig();
  if (!cfg) return { error: 'Supabase admin not configured', status: 503 };

  const res = await fetch(`${cfg.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: cfg.key,
      Authorization: `Bearer ${cfg.key}`,
      'Content-Type': 'application/json',
      ...(options.prefer ? { Prefer: options.prefer } : {}),
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

  if (!res.ok) {
    return { error: data, status: res.status };
  }
  return { data, status: res.status };
}

module.exports = { adminConfig, adminFetch };
