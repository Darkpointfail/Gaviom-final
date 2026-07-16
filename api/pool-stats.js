const { rateLimitRequest } = require('../lib/rate-limit');
const { getPoolStats } = require('../lib/pool-stats-service');

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rate = rateLimitRequest(req, 'pool-stats', 300, 60 * 60 * 1000);
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({ error: 'Too many requests. Try again later.' });
  }

  const result = await getPoolStats();
  if (result.error) {
    return res.status(result.status || 502).json({ error: result.error });
  }

  res.setHeader('Cache-Control', 'public, max-age=15, stale-while-revalidate=30');
  return res.status(200).json(result);
};
