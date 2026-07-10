const publicCfg = require('./gaviom-supabase-public');

function adminAuthConfig() {
  const url = publicCfg.resolveSupabaseUrl();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || url.includes('REPLACE') || !key || key.includes('REPLACE')) return null;
  return { url, key };
}

function formatServiceError(data) {
  if (!data || typeof data !== 'object') return '';
  const fields = [data.msg, data.message, data.error_description, data.error];
  for (const field of fields) {
    if (typeof field === 'string' && field.trim()) return field.trim();
  }
  return '';
}

module.exports = {
  adminAuthConfig,
  formatServiceError,
};
