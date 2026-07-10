const { issueVerificationCodeForUser } = require('./email-verification-service');

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

async function handleResendEmailCode(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const parsed = parseJsonBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const result = await issueVerificationCodeForUser(null, parsed.body?.email || '', {
    req,
    enforceCooldown: true,
  });

  if (!result.ok) {
    return res.status(result.status || 400).json({
      success: false,
      error: result.error,
      retry_after_sec: result.retry_after_sec ?? null,
      already_verified: result.already_verified || false,
    });
  }

  return res.status(200).json({
    success: true,
    message: 'Verification code sent. Check your inbox.',
    email: result.email,
    expires_at: result.expires_at,
  });
}

module.exports = { handleResendEmailCode };
