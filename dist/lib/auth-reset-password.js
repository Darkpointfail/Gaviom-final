const { adminAuthConfig, formatServiceError } = require('./send-auth-confirmation');
const { validateAccountEmail } = require('./email-validation');
const { fetchAdminUserByEmail } = require('./auth-user');
const { sendResendEmail, resendErrorMessage } = require('./resend-mail');

const FROM = (process.env.AUTH_RESET_FROM || process.env.AUTH_CONFIRM_FROM || 'Gaviom <noreply@getgaviom.com>').trim();
const RESET_PAGE = (process.env.AUTH_RESET_REDIRECT || 'https://gaviom.com/reset-password.html').trim();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function extractActionLink(payload) {
  if (!payload || typeof payload !== 'object') return null;
  if (payload.properties && payload.properties.action_link) {
    return payload.properties.action_link;
  }
  if (payload.action_link) return payload.action_link;
  return null;
}

function buildResetUrlFromActionLink(actionLink, preferredType) {
  try {
    const url = new URL(actionLink);
    const token = (url.searchParams.get('token') || '').trim();
    const type = (preferredType || url.searchParams.get('type') || 'recovery').trim();
    if (!token) return actionLink;
    const origin = (process.env.AUTH_CONFIRM_ORIGIN || 'https://gaviom.com').replace(/\/$/, '');
    const params = new URLSearchParams({ token, type });
    return `${origin}/reset-password.html?${params.toString()}`;
  } catch {
    return actionLink;
  }
}

async function findUserByEmail(cfg, email) {
  return fetchAdminUserByEmail(cfg, email);
}

async function ensureUserConfirmed(cfg, user) {
  if (!user || user.email_confirmed_at) return;
  await fetch(`${cfg.url}/auth/v1/admin/users/${user.id}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_confirm: true }),
  });
}

function mapResetLinkError(data) {
  const message = formatServiceError(data);
  if (/user with this email not found/i.test(message)) {
    return 'No account found for this email. Check the spelling or create an account first.';
  }
  return message || 'Could not create password reset link.';
}

async function generateRecoveryLink(email) {
  const cfg = adminAuthConfig();
  if (!cfg) {
    return { error: 'Password reset is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel.', status: 503 };
  }

  const normalizedEmail = String(email || '').trim().toLowerCase();
  const user = await findUserByEmail(cfg, normalizedEmail);
  if (!user) {
    return { error: 'No account found for this email. Check the spelling or create an account first.', status: 404 };
  }

  await ensureUserConfirmed(cfg, user);

  const types = ['recovery', 'magiclink', 'invite'];
  let lastError = null;

  for (const type of types) {
    const res = await fetch(`${cfg.url}/auth/v1/admin/generate_link`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cfg.key}`,
        apikey: cfg.key,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        type,
        email: user.email || normalizedEmail,
        options: { redirect_to: RESET_PAGE },
      }),
    });

    const data = await res.json().catch(() => ({}));
    const link = extractActionLink(data);
    if (res.ok && link) {
      return { link, type };
    }
    lastError = mapResetLinkError(data);
  }

  return {
    error: lastError || 'Could not create password reset link.',
    status: 502,
  };
}

function buildResetEmail(email, resetUrl) {
  const safeEmail = escapeHtml(email);
  const subject = 'Reset your Gaviom password';
  const text = [
    'Reset your Gaviom password',
    '',
    'Click the link below to choose a new password:',
    resetUrl,
    '',
    'If you did not request this, you can ignore this email.',
    '',
    '— Gaviom',
    'https://gaviom.com',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0a1628;max-width:560px">
  <h2 style="margin:0 0 16px">Reset your Gaviom password</h2>
  <p>Hi,</p>
  <p>We received a request to reset the password for <strong>${safeEmail}</strong>.</p>
  <p style="margin:28px 0"><a href="${resetUrl}" style="display:inline-block;background:#0a1628;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600">Choose a new password</a></p>
  <p style="color:#64748b;font-size:14px">Or copy this link into your browser:<br><a href="${resetUrl}">${resetUrl}</a></p>
  <p style="margin-top:24px;color:#64748b;font-size:14px">If you did not request a password reset, ignore this message.</p>
  <p style="color:#64748b;font-size:14px">— Gaviom · <a href="https://gaviom.com">gaviom.com</a></p>
</body></html>`;

  return { subject, text, html };
}

async function verifyRecoveryToken(url, anonKey, token, primaryType) {
  const types = [primaryType || 'recovery', 'magiclink', 'invite', 'signup', 'email'].filter(
    function (type, index, arr) {
      return type && arr.indexOf(type) === index;
    }
  );
  const payloads = types.flatMap(function (type) {
    return [
      { type, token },
      { type, token_hash: token },
    ];
  });

  let lastError = null;

  for (const body of payloads) {
    const verifyRes = await fetch(`${url}/auth/v1/verify`, {
      method: 'POST',
      headers: {
        apikey: anonKey,
        Authorization: `Bearer ${anonKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const data = await verifyRes.json().catch(() => ({}));
    if (verifyRes.ok && data.access_token && data.refresh_token) {
      return { data };
    }
    lastError = data;
  }

  return { error: lastError || { message: 'verify failed' } };
}

async function deliverPasswordResetEmail(email) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('REPLACE')) {
    return { ok: false, error: 'Email delivery is not configured. Add RESEND_API_KEY in Vercel.' };
  }

  const emailCheck = validateAccountEmail(email || '');
  if (!emailCheck.ok) {
    return { ok: false, error: emailCheck.error };
  }

  const linkResult = await generateRecoveryLink(emailCheck.email);
  if (linkResult.error) {
    return { ok: false, error: linkResult.error };
  }

  const resetUrl = buildResetUrlFromActionLink(linkResult.link, linkResult.type);
  const mail = buildResetEmail(emailCheck.email, resetUrl);
  const sendResult = await sendResendEmail(apiKey, {
    from: FROM,
    to: [emailCheck.email],
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  if (!sendResult.ok) {
    return { ok: false, error: resendErrorMessage(sendResult.data) };
  }

  return { ok: true, id: sendResult.data.id || null };
}

async function sendPasswordResetEmail(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let body = req.body;
  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({ error: 'Invalid JSON body' });
    }
  }

  const sendResult = await deliverPasswordResetEmail(body?.email || '');
  if (!sendResult.ok) {
    console.error('auth-reset-password:', sendResult.error);
    return res.status(502).json({ error: sendResult.error });
  }

  return res.status(200).json({ ok: true, id: sendResult.id || null });
}

async function handleAuthReset(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }

  const token = (req.query?.token || '').trim();
  const type = (req.query?.type || 'recovery').trim();

  if (!token) {
    return res.redirect(302, '/reset-password.html?reset=error');
  }

  const params = new URLSearchParams({ token, type });
  return res.redirect(302, `/reset-password.html?${params.toString()}`);
}

module.exports = {
  deliverPasswordResetEmail,
  sendPasswordResetEmail,
  handleAuthReset,
  buildResetUrlFromActionLink,
  verifyRecoveryToken,
};
