/** Public Supabase project URL + anon key (same as auth-config.js). Safe for token verification. */
const supabaseUrl = 'https://admpccwwoebhqkiorlwq.supabase.co';
const supabaseAnonKey =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFkbXBjY3d3b2ViaHFraW9ybHdxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODA2MjAxMzQsImV4cCI6MjA5NjE5NjEzNH0.jjfpngJlJnE8oT-rAlCkKjriUlJn1CMaY1IMVhb7dRI';

function projectRef(url) {
  const match = String(url || '').match(/https:\/\/([^.]+)\.supabase\.co/);
  return match ? match[1] : '';
}

function resolveSupabaseUrl() {
  return supabaseUrl.trim();
}

function resolveSupabaseAnonKey() {
  return supabaseAnonKey.trim();
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
