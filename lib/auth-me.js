const { adminConfig } = require('./supabase-admin');
const { verifyBearerUser } = require('./supabase-user');
const { isUserEmailConfirmed, resolveCanonicalUser } = require('./auth-user');

async function handleAuthMe(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const auth = await verifyBearerUser(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const adminCfg = adminConfig();
  let user = auth.user;

  if (adminCfg && user?.id) {
    user = await resolveCanonicalUser(adminCfg, user);
  }

  return res.status(200).json({
    ok: true,
    user,
    email_confirmed: isUserEmailConfirmed(user),
  });
}

module.exports = { handleAuthMe };
