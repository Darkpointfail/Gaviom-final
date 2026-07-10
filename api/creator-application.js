const { sendResendEmail, resendErrorMessage } = require('../lib/resend-mail');
const { rateLimitRequest } = require('../lib/rate-limit');
const { verifyVerifiedUser } = require('../lib/supabase-user');
const { saveCreatorApplication, reviewUrls } = require('../lib/creator-application-service');

const APPLICATION_TO = (process.env.CREATOR_APPLICATION_TO || 'info@getgaviom.com').trim();
const APPLICATION_FROM =
  (process.env.CREATOR_APPLICATION_FROM || 'Gaviom Creators <inquiries@getgaviom.com>').trim();

function resolveOrigin(req) {
  const configured = (process.env.CREATOR_APPLICATION_ORIGIN || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const origin = req.headers.origin || req.headers.Origin;
  if (origin) return String(origin).replace(/\/$/, '');
  return 'https://gaviom.com';
}

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

function isValidEmail(email) {
  return typeof email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function row(label, value) {
  const display = value || '—';
  return `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top">${escapeHtml(label)}</td><td>${escapeHtml(display)}</td></tr>`;
}

function buildAdminEmail(payload, application, origin) {
  const name = clean(payload.name) || '—';
  const email = clean(payload.email).toLowerCase();
  const country = clean(payload.country) || '—';
  const social = clean(payload.social) || '—';
  const creatorName = clean(payload.creator_name) || '—';
  const category = clean(payload.category) || '—';
  const audience = clean(payload.audience) || '—';
  const platforms = clean(payload.platforms) || '—';
  const engagement = clean(payload.engagement) || '—';
  const prize = clean(payload.prize) || '—';
  const prizeValue = clean(payload.prize_value) || '—';
  const description = clean(payload.description) || '—';
  const expected = clean(payload.expected) || '—';
  const launch = clean(payload.launch) || '—';
  const source = clean(payload.source) || 'gaviom-creator-apply';
  const submittedAt = clean(payload.submittedAt) || new Date().toISOString();
  const applicationId = application?.id || '—';
  const userId = application?.user_id || '—';

  const links = application?.review_token ? reviewUrls(origin, application.review_token) : null;

  const subject = `Gaviom Creator application — ${creatorName !== '—' ? creatorName : name}`;

  const text = [
    'New Gaviom Creator application',
    '',
    `Application ID: ${applicationId}`,
    `User ID: ${userId}`,
    `Name: ${name}`,
    `Email: ${email}`,
    `Country: ${country}`,
    `Social profile: ${social}`,
    '',
    `Creator / brand: ${creatorName}`,
    `Category: ${category}`,
    `Audience size: ${audience}`,
    `Platforms: ${platforms}`,
    `Engagement: ${engagement}`,
    '',
    `Prize: ${prize}`,
    `Estimated value (USD): ${prizeValue}`,
    `Expected participants: ${expected}`,
    `Desired launch: ${launch}`,
    '',
    'Sweepstakes description:',
    description,
    '',
    `Source: ${source}`,
    `Submitted: ${submittedAt}`,
    '',
    links ? `Approve: ${links.approve}` : '',
    links ? `Reject: ${links.reject}` : '',
  ]
    .filter(Boolean)
    .join('\n');

  const reviewBlock = links
    ? `<p style="margin:24px 0 0">
        <a href="${escapeHtml(links.approve)}" style="display:inline-block;margin-right:12px;padding:10px 16px;background:#166534;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Approve</a>
        <a href="${escapeHtml(links.reject)}" style="display:inline-block;padding:10px 16px;background:#991b1b;color:#fff;text-decoration:none;border-radius:8px;font-weight:600">Reject</a>
      </p>`
    : '';

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0a1628">
  <h2 style="margin:0 0 16px">New Gaviom Creator application</h2>
  <table style="border-collapse:collapse;width:100%;max-width:640px">
    ${row('Application ID', applicationId)}
    ${row('User ID', userId)}
    ${row('Name', name)}
    ${row('Email', email)}
    ${row('Country', country)}
    ${row('Social profile', social)}
    ${row('Creator / brand', creatorName)}
    ${row('Category', category)}
    ${row('Audience size', audience)}
    ${row('Platforms', platforms)}
    ${row('Engagement', engagement)}
    ${row('Prize', prize)}
    ${row('Est. value (USD)', prizeValue)}
    ${row('Expected participants', expected)}
    ${row('Desired launch', launch)}
    ${row('Source', source)}
    ${row('Submitted', submittedAt)}
  </table>
  <p style="margin:24px 0 8px;color:#64748b">Sweepstakes description</p>
  <p style="margin:0;white-space:pre-wrap">${escapeHtml(description)}</p>
  ${reviewBlock}
</body></html>`;

  return { subject, text, html, replyTo: email };
}

function buildConfirmationEmail(payload) {
  const name = clean(payload.name) || 'there';
  const creatorName = clean(payload.creator_name) || 'your creator brand';

  const subject = 'We received your Gaviom Creator application';
  const text = [
    `Hi ${name},`,
    '',
    'Thanks for applying to the Gaviom Creator program.',
    '',
    `We received your application for ${creatorName}.`,
    'Our team will review it within 3–5 business days and email you when your status updates.',
    '',
    '— Gaviom Creators',
    'info@getgaviom.com',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0a1628;max-width:560px">
  <p>Hi ${escapeHtml(name)},</p>
  <p>Thanks for applying to the <strong>Gaviom Creator</strong> program.</p>
  <p>We received your application for <strong>${escapeHtml(creatorName)}</strong>.</p>
  <p>Our team will review it within <strong>3–5 business days</strong> and email you when your status updates.</p>
  <p style="margin-top:24px;color:#64748b;font-size:14px">— Gaviom Creators · <a href="mailto:info@getgaviom.com">info@getgaviom.com</a></p>
</body></html>`;

  return { subject, text, html };
}

function validatePayload(body) {
  const required = [
    'name',
    'email',
    'country',
    'social',
    'creator_name',
    'category',
    'audience',
    'platforms',
    'engagement',
    'prize',
    'prize_value',
    'description',
  ];

  for (const field of required) {
    if (!clean(body[field])) {
      return { error: 'Please complete all required fields.' };
    }
  }

  const email = clean(body.email).toLowerCase();
  if (!isValidEmail(email)) {
    return { error: 'Enter a valid email address.' };
  }

  const prizeValue = Number(clean(body.prize_value));
  if (!Number.isFinite(prizeValue) || prizeValue < 100) {
    return { error: 'Estimated prize value must be at least $100.' };
  }

  return { ok: true, email };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const rate = rateLimitRequest(req, 'creator-application', 5, 60 * 60 * 1000);
  if (!rate.ok) {
    res.setHeader('Retry-After', String(rate.retryAfterSec));
    return res.status(429).json({
      error: 'Too many applications from this connection. Try again later.',
    });
  }

  const auth = await verifyVerifiedUser(req);
  if (auth.error) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('REPLACE')) {
    return res.status(503).json({
      error: 'Email delivery is not configured. Add RESEND_API_KEY in Vercel.',
    });
  }

  const parsed = parseBody(req);
  if (parsed.error) {
    return res.status(400).json({ error: parsed.error });
  }

  const validation = validatePayload(parsed.body);
  if (validation.error) {
    return res.status(400).json({ error: validation.error });
  }

  const origin = resolveOrigin(req);

  const saved = await saveCreatorApplication(auth.user, parsed.body);
  if (saved.error) {
    return res.status(saved.status || 502).json({ error: saved.error });
  }

  const mail = buildAdminEmail(parsed.body, saved.application, origin);
  const confirm = buildConfirmationEmail(parsed.body);

  try {
    const adminResult = await sendResendEmail(apiKey, {
      from: APPLICATION_FROM,
      to: [APPLICATION_TO],
      reply_to: [mail.replyTo],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!adminResult.ok) {
      console.error('creator-application resend (admin):', adminResult.status, adminResult.data);
      return res.status(502).json({ error: resendErrorMessage(adminResult.data) });
    }

    const confirmResult = await sendResendEmail(apiKey, {
      from: APPLICATION_FROM,
      to: [validation.email],
      reply_to: [APPLICATION_TO],
      subject: confirm.subject,
      text: confirm.text,
      html: confirm.html,
    });

    if (!confirmResult.ok) {
      console.error('creator-application resend (confirm):', confirmResult.status, confirmResult.data);
    }

    return res.status(200).json({
      ok: true,
      applicationId: saved.application.id,
      id: adminResult.data.id || null,
      confirmationSent: confirmResult.ok,
    });
  } catch (err) {
    console.error('creator-application:', err.message);
    return res.status(500).json({ error: 'Could not send application email.' });
  }
};
