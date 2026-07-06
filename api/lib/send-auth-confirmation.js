const publicCfg = require('./gaviom-supabase-public');
const { validateAccountEmail } = require('./email-validation');
const { sendResendEmail, resendErrorMessage } = require('./resend-mail');

const FROM = (process.env.AUTH_CONFIRM_FROM || 'Gaviom <noreply@getgaviom.com>').trim();
const REDIRECT = (process.env.AUTH_CONFIRM_REDIRECT || 'https://gaviom.com/signin.html?verified=1').trim();

function adminAuthConfig() {
  const url = (process.env.SUPABASE_URL || publicCfg.supabaseUrl || '').trim();
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  if (!url || url.includes('REPLACE') || !key || key.includes('REPLACE')) return null;
  return { url, key };
}

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

async function generateConfirmationLink(email) {
  const cfg = adminAuthConfig();
  if (!cfg) {
    return { error: 'Account email service is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel.', status: 503 };
  }

  const types = ['signup', 'invite'];
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
        email,
        options: { redirect_to: REDIRECT },
      }),
    });

    const data = await res.json().catch(() => ({}));
    const link = extractActionLink(data);
    if (res.ok && link) {
      return { link, type };
    }
    lastError = data?.msg || data?.message || data?.error_description || `generate_link failed (${type})`;
  }

  return { error: lastError || 'Could not create confirmation link.', status: 502 };
}

function buildConfirmationEmail(email, confirmUrl) {
  const safeEmail = escapeHtml(email);
  const subject = 'Confirm your Gaviom account';
  const text = [
    'Confirm your Gaviom account',
    '',
    'Click the link below to verify your email and activate your account:',
    confirmUrl,
    '',
    'If you did not create a Gaviom account, you can ignore this email.',
    '',
    '— Gaviom',
    'https://gaviom.com',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0a1628;max-width:560px">
  <h2 style="margin:0 0 16px">Confirm your Gaviom account</h2>
  <p>Hi,</p>
  <p>Please confirm <strong>${safeEmail}</strong> to activate your Gaviom account and purchase sweepstakes tickets.</p>
  <p style="margin:28px 0"><a href="${confirmUrl}" style="display:inline-block;background:#0a1628;color:#fff;text-decoration:none;padding:14px 24px;border-radius:8px;font-weight:600">Confirm my email</a></p>
  <p style="color:#64748b;font-size:14px">Or copy this link into your browser:<br><a href="${confirmUrl}">${confirmUrl}</a></p>
  <p style="margin-top:24px;color:#64748b;font-size:14px">If you did not create a Gaviom account, ignore this message.</p>
  <p style="color:#64748b;font-size:14px">— Gaviom · <a href="https://gaviom.com">gaviom.com</a></p>
</body></html>`;

  return { subject, text, html };
}

function parseEmailBody(req) {
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

async function sendAuthConfirmationEmail(req, res) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('REPLACE')) {
    return res.status(503).json({
      error: 'Email delivery is not configured. Add RESEND_API_KEY in Vercel.',
    });
  }

  const parsed = parseEmailBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const emailCheck = validateAccountEmail(parsed.body?.email || '');
  if (!emailCheck.ok) {
    return res.status(400).json({ error: emailCheck.error });
  }

  const linkResult = await generateConfirmationLink(emailCheck.email);
  if (linkResult.error) {
    console.error('auth-confirmation-email generate_link:', linkResult.error);
    return res.status(linkResult.status || 502).json({ error: linkResult.error });
  }

  const mail = buildConfirmationEmail(emailCheck.email, linkResult.link);
  const sendResult = await sendResendEmail(apiKey, {
    from: FROM,
    to: [emailCheck.email],
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  if (!sendResult.ok) {
    console.error('auth-confirmation-email resend:', sendResult.status, sendResult.data);
    return res.status(502).json({ error: resendErrorMessage(sendResult.data) });
  }

  return res.status(200).json({
    ok: true,
    id: sendResult.data.id || null,
  });
}

module.exports = { sendAuthConfirmationEmail };
