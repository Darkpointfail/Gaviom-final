const { verifyEmailCode } = require('./email-verification-service');

function parseJsonBody(req) {
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

async function handleVerifyEmailCode(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const result = await verifyEmailCode(parsed.body?.email || '', parsed.body?.code || '', {
    req,
  });

  if (!result.ok) {
    return res.status(result.status || 400).json({
      success: false,
      error: result.error,
      code: result.code || null,
      attempts_remaining: result.attempts_remaining ?? null,
      already_verified: result.already_verified || false,
    });
  }

  return res.status(200).json({
    success: true,
    message: result.message || 'Email verified successfully.',
    already_verified: !!result.already_verified,
    user_id: result.user_id || null,
    email: result.email || null,
  });
}

module.exports = { handleVerifyEmailCode };
