/** Public Supabase project URL + anon key (same as auth-config.js). Safe for token verification. */
const supabaseUrl = 'https://admpccwwoebhqkiorlwq.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbXBjY3d3b2ViaHFraW9ybHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MjAxMzQsImV4cCI6MjA5NjE5NjEzNH0.jjfpngJlJnE8oT-rAlCkKjriUlJn1CMaY1IMVhb7dRI';

function projectRef(url) {
  const match = String(url || '').match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : '';
}

function resolveSupabaseUrl() {
  const envUrl = (process.env.SUPABASE_URL || '').trim();
  const publicUrl = supabaseUrl.trim();
  if (!envUrl || envUrl.includes('REPLACE')) return publicUrl;
  const envRef = projectRef(envUrl);
  const publicRef = projectRef(publicUrl);
  if (envRef && publicRef && envRef !== publicRef) {
    console.warn('supabase:url-mismatch', { envRef, publicRef });
    return publicUrl;
  }
  return envUrl;
}

function resolveSupabaseAnonKey() {
  const envKey = (process.env.SUPABASE_ANON_KEY || '').trim();
  if (!envKey || envKey.includes('REPLACE')) return supabaseAnonKey.trim();
  return envKey;
}

function publicAuthConfig() {
  return {
    url: resolveSupabaseUrl(),
    anonKey: resolveSupabaseAnonKey(),
  };
}

module.exports = {
  supabaseUrl,
  supabaseAnonKey,
  projectRef,
  resolveSupabaseUrl,
  resolveSupabaseAnonKey,
  publicAuthConfig,
};
