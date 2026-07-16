const { rateLimitRequest } = require('../lib/rate-limit');
const { verifyVerifiedUser } = require('../lib/supabase-user');
const { listDashboard, updateListing } = require('../lib/creator-sweepstakes-service');

function parseBody(req) {
  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return { error: 'Invalid JSON body' };
    }
  }
  if (!body || typeof body !== 'object') {
    return { body: {} };
  }
  return { body };
}

module.exports = async function handler(req, res) {
  const action = (req.query.action || 'list').trim();

  if (req.method === 'GET' && action === 'list') {
    const rate = rateLimitRequest(req, 'creator-dashboard-list', 120, 60 * 60 * 1000);
    if (!rate.ok) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const auth = await verifyVerifiedUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const result = await listDashboard(auth.user.id);
    if (result.error) {
      return res.status(result.status || 502).json({ error: result.error });
    }
    return res.status(200).json(result);
  }

  if (req.method === 'PATCH' && action === 'listing') {
    const rate = rateLimitRequest(req, 'creator-dashboard-listing', 40, 60 * 60 * 1000);
    if (!rate.ok) {
      res.setHeader('Retry-After', String(rate.retryAfterSec));
      return res.status(429).json({ error: 'Too many requests. Try again later.' });
    }

    const auth = await verifyVerifiedUser(req);
    if (auth.error) {
      return res.status(auth.status).json({ error: auth.error });
    }

    const parsed = parseBody(req);
    if (parsed.error) {
      return res.status(400).json({ error: parsed.error });
    }

    const sweepstakesId = (parsed.body.sweepstakesId || parsed.body.id || '').trim();
    if (!sweepstakesId) {
      return res.status(400).json({ error: 'Missing sweepstakes id.' });
    }

    const result = await updateListing(auth.user.id, sweepstakesId, parsed.body);
    if (result.error) {
      return res.status(result.status || 502).json({ error: result.error });
    }

    return res.status(200).json({ ok: true, sweepstakesId });
  }

  res.setHeader('Allow', 'GET, PATCH');
  return res.status(405).json({ error: 'Method not allowed' });
};
