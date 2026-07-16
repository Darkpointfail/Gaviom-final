const { submitAmoeEntry } = require('../lib/amoe-service');

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
    return { error: 'Missing request body' };
  }
  return { body };
}

function clientIp(req) {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.length) {
    return forwarded.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || '';
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseBody(req);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  try {
    const result = await submitAmoeEntry(parsed.body, { ip: clientIp(req) });
    if (!result.ok) {
      return res.status(result.status || 400).json({ error: result.error });
    }
    return res.status(result.status || 201).json({
      ok: true,
      referenceId: result.referenceId,
      emailSent: result.emailSent,
      message: result.message,
      warning: result.warning || undefined,
    });
  } catch (err) {
    console.error('amoe handler:', err.message);
    return res.status(500).json({ error: 'Could not submit free entry.' });
  }
};
