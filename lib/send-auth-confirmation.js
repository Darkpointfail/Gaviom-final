const publicCfg = require('./gaviom-supabase-public');
const { validateAccountEmail } = require('./email-validation');
const { sendResendEmail, resendErrorMessage } = require('./resend-mail');

const { buildEmailConfirmUrl, extractLinkProperties } = require('./auth-confirm-email');
const { auditConfirm, tokenPreview } = require('./auth-audit-log');

const FROM = (process.env.AUTH_CONFIRM_FROM || 'Gaviom <noreply@getgaviom.com>').trim();
const REDIRECT = (process.env.AUTH_CONFIRM_REDIRECT || 'https://gaviom.com/auth-callback.html').trim();

function adminAuthConfig() {
  const url = publicCfg.resolveSupabaseUrl();
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

function formatServiceError(data) {
  if (!data || typeof data !== 'object') return '';
  const fields = [data.msg, data.message, data.error_description, data.error];
  for (const field of fields) {
    if (typeof field === 'string' && field.trim()) return field.trim();
  }
  return '';
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
        options: {
          redirect_to: REDIRECT,
          data: { confirm_issued: String(Date.now()) },
        },
      }),
    });

    const data = await res.json().catch(() => ({}));
    const props = extractLinkProperties(data);
    if (res.ok && props.hashed_token) {
      console.info('auth-confirmation:link-created', {
        email,
        type: props.verification_type || type,
        token: props.hashed_token.slice(0, 8),
        issued: Date.now(),
      });
      auditConfirm('email:link-created', {
        email,
        type: props.verification_type || type,
        token: tokenPreview(props.hashed_token),
        issued: Date.now(),
      });
      return {
        link: props.action_link,
        type: props.verification_type || type,
        hashed_token: props.hashed_token,
        verification_type: props.verification_type || type,
      };
    }
    lastError = formatServiceError(data) || `generate_link failed (${type})`;
  }

  return { error: lastError || 'Could not create confirmation link.', status: 502 };
}

function buildConfirmationEmail(email, confirmUrl) {
  const safeEmail = escapeHtml(email);
  const subject = 'Confirm your Gaviom account';
  const text = [
    'Confirm your Gaviom account',
    '',
    'Click the button below once to confirm your email and open your account:',
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
  <p style="color:#64748b;font-size:14px">This link is unique and works once. If it fails, use Resend confirmation on the sign-in page.</p>
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

async function deliverAuthConfirmationEmail(email) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('REPLACE')) {
    return { ok: false, error: 'Email delivery is not configured. Add RESEND_API_KEY in Vercel.' };
  }

  const emailCheck = validateAccountEmail(email || '');
  if (!emailCheck.ok) {
    return { ok: false, error: emailCheck.error };
  }

  const linkResult = await generateConfirmationLink(emailCheck.email);
  if (linkResult.error) {
    return { ok: false, error: linkResult.error };
  }

  const confirmUrl = buildEmailConfirmUrl(
    linkResult.hashed_token,
    linkResult.verification_type || linkResult.type
  );
  const mail = buildConfirmationEmail(emailCheck.email, confirmUrl);
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

async function sendAuthConfirmationEmail(req, res) {
  const parsed = parseEmailBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const sendResult = await deliverAuthConfirmationEmail(parsed.body?.email || '');
  if (!sendResult.ok) {
    console.error('auth-confirmation-email:', sendResult.error);
    return res.status(502).json({ error: sendResult.error });
  }

  return res.status(200).json({
    ok: true,
    id: sendResult.id || null,
  });
}

module.exports = {
  sendAuthConfirmationEmail,
  deliverAuthConfirmationEmail,
  adminAuthConfig,
  formatServiceError,
};
