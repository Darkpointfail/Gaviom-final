const INQUIRY_TO = (process.env.BUSINESS_INQUIRY_TO || 'info@getgaviom.com').trim();
const INQUIRY_FROM =
  (process.env.BUSINESS_INQUIRY_FROM || 'Gaviom Business <inquiries@getgaviom.com>').trim();

function resendErrorMessage(data) {
  const message = typeof data?.message === 'string' ? data.message : '';
  if (message.includes('domain is not verified')) {
    return 'Email sender domain is not verified in Resend. Verify getgaviom.com or set BUSINESS_INQUIRY_FROM on Vercel.';
  }
  if (message.includes('API key is invalid')) {
    return 'Email delivery is misconfigured (invalid Resend API key).';
  }
  return 'Could not send inquiry email. Try again shortly.';
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

function buildEmail(payload) {
  const name = clean(payload.name) || '—';
  const company = clean(payload.company) || '—';
  const email = clean(payload.email).toLowerCase();
  const employees = clean(payload.employees) || clean(payload.team_size) || '—';
  const packageInterest =
    clean(payload.packageInterest) || clean(payload.interest) || '—';
  const message = clean(payload.message) || '—';
  const source = clean(payload.source) || 'gaviom-business';
  const submittedAt = clean(payload.submittedAt) || new Date().toISOString();

  const subjectCompany = company !== '—' ? company : email;
  const subject = `Gaviom Business inquiry — ${subjectCompany}`;

  const text = [
    'New Gaviom Business inquiry',
    '',
    `Name: ${name}`,
    `Company: ${company}`,
    `Email: ${email}`,
    `Team size: ${employees}`,
    `Interest: ${packageInterest}`,
    `Source: ${source}`,
    `Submitted: ${submittedAt}`,
    '',
    'Message:',
    message,
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0a1628">
  <h2 style="margin:0 0 16px">New Gaviom Business inquiry</h2>
  <table style="border-collapse:collapse;width:100%;max-width:560px">
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Name</td><td><strong>${escapeHtml(name)}</strong></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Company</td><td><strong>${escapeHtml(company)}</strong></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Email</td><td><a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Team size</td><td>${escapeHtml(employees)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Interest</td><td>${escapeHtml(packageInterest)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Source</td><td>${escapeHtml(source)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Submitted</td><td>${escapeHtml(submittedAt)}</td></tr>
  </table>
  <p style="margin:24px 0 8px;color:#64748b">Message</p>
  <p style="margin:0;white-space:pre-wrap">${escapeHtml(message)}</p>
</body></html>`;

  return { subject, text, html, replyTo: email };
}

function buildConfirmationEmail(payload) {
  const name = clean(payload.name) || 'there';
  const company = clean(payload.company) || 'your company';
  const packageInterest =
    clean(payload.packageInterest) || clean(payload.interest) || 'your program';

  const subject = 'We received your Gaviom Business inquiry';
  const text = [
    `Hi ${name},`,
    '',
    'Thanks for reaching out about Gaviom for Business.',
    '',
    `Company: ${company}`,
    `Interest: ${packageInterest}`,
    '',
    'Our team will review your message and respond within one business day.',
    'If you prefer to book time directly, use our discovery call link:',
    'https://calendly.com/getgaviom/discovery',
    '',
    '— Gaviom Business',
    'info@getgaviom.com',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0a1628;max-width:560px">
  <p>Hi ${escapeHtml(name)},</p>
  <p>Thanks for reaching out about <strong>Gaviom for Business</strong>.</p>
  <p>We received your inquiry for <strong>${escapeHtml(company)}</strong> (${escapeHtml(packageInterest)}).</p>
  <p>Our team will review your message and respond within <strong>one business day</strong>.</p>
  <p>Prefer to talk sooner? <a href="https://calendly.com/getgaviom/discovery">Book a 15-min discovery call</a>.</p>
  <p style="margin-top:24px;color:#64748b;font-size:14px">— Gaviom Business · <a href="mailto:info@getgaviom.com">info@getgaviom.com</a></p>
</body></html>`;

  return { subject, text, html };
}

async function sendResendEmail(apiKey, message) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(message),
  });
  const data = await response.json().catch(() => ({}));
  return { ok: response.ok, status: response.status, data };
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
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

  const email = clean(parsed.body.email).toLowerCase();
  if (!isValidEmail(email)) {
    return res.status(400).json({ error: 'Enter a valid work email address.' });
  }

  const mail = buildEmail(parsed.body);
  const confirm = buildConfirmationEmail(parsed.body);

  try {
    const adminResult = await sendResendEmail(apiKey, {
      from: INQUIRY_FROM,
      to: [INQUIRY_TO],
      reply_to: [mail.replyTo],
      subject: mail.subject,
      text: mail.text,
      html: mail.html,
    });

    if (!adminResult.ok) {
      console.error('business-inquiry resend (admin):', adminResult.status, adminResult.data);
      return res.status(502).json({ error: resendErrorMessage(adminResult.data) });
    }

    const confirmResult = await sendResendEmail(apiKey, {
      from: INQUIRY_FROM,
      to: [email],
      reply_to: [INQUIRY_TO],
      subject: confirm.subject,
      text: confirm.text,
      html: confirm.html,
    });

    if (!confirmResult.ok) {
      console.error('business-inquiry resend (confirm):', confirmResult.status, confirmResult.data);
      // Admin notification succeeded — don't fail the whole request for confirmation only.
    }

    return res.status(200).json({
      ok: true,
      id: adminResult.data.id || null,
      confirmationSent: confirmResult.ok,
    });
  } catch (err) {
    console.error('business-inquiry:', err.message);
    return res.status(500).json({ error: 'Could not send inquiry email.' });
  }
};
