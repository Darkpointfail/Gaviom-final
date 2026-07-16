const crypto = require('crypto');
const { adminFetch } = require('./supabase-admin');
const { PRIZES, PRIZE_AMOE } = require('./catalog');
const { validateAccountEmail, normalizeEmail } = require('./email-validation');
const { sendResendEmail, resendErrorMessage } = require('./resend-mail');

const AMOE_FROM = (process.env.AMOE_FROM || process.env.AUTH_CONFIRM_FROM || 'Gaviom <noreply@getgaviom.com>').trim();
const SITE_ORIGIN = (process.env.AUTH_CONFIRM_ORIGIN || 'https://gaviom.com').replace(/\/$/, '');

const US_STATES = new Set([
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'DC', 'FL', 'GA', 'HI', 'ID', 'IL', 'IN', 'IA', 'KS',
  'KY', 'LA', 'ME', 'MD', 'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ', 'NM', 'NY', 'NC',
  'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC', 'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
]);

function clean(value, max = 500) {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, max);
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function isValidPhone(phone) {
  const digits = String(phone || '').replace(/\D/g, '');
  return digits.length >= 10 && digits.length <= 15;
}

function hashIp(ip) {
  if (!ip) return null;
  return crypto.createHash('sha256').update(`${ip}|amoe`).digest('hex').slice(0, 32);
}

async function findExistingAmoeEntry(email, prizeId) {
  const params = new URLSearchParams({
    select: 'id,created_at',
    customer_email: `eq.${email}`,
    prize_id: `eq.${prizeId}`,
    source: 'eq.amoe',
    status: 'in.(pending,confirmed)',
    limit: '1',
  });
  const result = await adminFetch(`entries?${params}`);
  if (result.error) return { error: 'Could not verify existing entries.' };
  const row = Array.isArray(result.data) ? result.data[0] : null;
  return { row: row || null };
}

function buildConfirmationEmail({ submission, meta, referenceId }) {
  const prizeTitle = PRIZES[submission.prizeId]?.title || submission.prizeId;
  const sweepstakesLabel = meta.label || `Sweepstakes #${meta.sweepstakesId || '—'}`;
  const rulesUrl = `${SITE_ORIGIN}/rules.html${meta.rulesSection ? `#${meta.rulesSection}` : ''}`;
  const shortRef = String(referenceId || '').slice(0, 8).toUpperCase();

  const subject = `Gaviom free entry confirmed — ${sweepstakesLabel}`;

  const text = [
    'Your free alternate method of entry (AMOE) has been received.',
    '',
    `Sweepstakes: ${sweepstakesLabel} — ${prizeTitle}`,
    `Confirmation: ${shortRef}`,
    `Name: ${submission.legalName}`,
    `Email: ${submission.email}`,
    '',
    'This free entry has the same odds of winning as a paid entry, subject to the Official Rules.',
    `Official Rules: ${rulesUrl}`,
    '',
    'Limit: one (1) free entry per person per sweepstakes per promotion period.',
    '',
    'Questions? Reply to this email or contact amoe@gaviom.com',
    '',
    '— Gaviom Inc.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.55;color:#0a1628;max-width:560px">
  <p style="margin:0 0 8px;font-size:12px;letter-spacing:.08em;text-transform:uppercase;color:#64748b">Free entry confirmed</p>
  <h1 style="margin:0 0 16px;font-size:22px;line-height:1.25">You're in the draw pool</h1>
  <p style="margin:0 0 20px">Your online AMOE for <strong>${escapeHtml(sweepstakesLabel)}</strong> (${escapeHtml(prizeTitle)}) was received. This free entry has the <strong>same odds</strong> as paid entries, per the <a href="${rulesUrl}">Official Rules</a>.</p>
  <table style="border-collapse:collapse;width:100%;margin:0 0 20px;font-size:14px">
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Confirmation</td><td><strong>${escapeHtml(shortRef)}</strong></td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Name</td><td>${escapeHtml(submission.legalName)}</td></tr>
    <tr><td style="padding:6px 12px 6px 0;color:#64748b">Email</td><td>${escapeHtml(submission.email)}</td></tr>
  </table>
  <p style="margin:0 0 8px;font-size:13px;color:#64748b">Keep this email for your records. Limit: one free entry per person per sweepstakes per promotion period.</p>
  <p style="margin:20px 0 0;font-size:13px;color:#64748b">— Gaviom Inc. · Wilmington, DE</p>
</body></html>`;

  return { subject, text, html };
}

function validateSubmission(body) {
  const honeypot = clean(body.website);
  if (honeypot) {
    return { ok: false, error: 'Invalid submission.' };
  }

  const prizeId = clean(body.prize_id || body.prizeId, 64);
  const meta = PRIZE_AMOE[prizeId];
  if (!meta || !PRIZES[prizeId]) {
    return { ok: false, error: 'Select a valid sweepstakes.' };
  }

  const legalName = clean(body.legal_name || body.legalName, 120);
  if (legalName.length < 2) {
    return { ok: false, error: 'Enter your full legal name as it appears on ID.' };
  }

  const addressLine1 = clean(body.address_line1 || body.addressLine1, 120);
  const addressLine2 = clean(body.address_line2 || body.addressLine2, 120);
  const city = clean(body.city, 80);
  const state = clean(body.state, 2).toUpperCase();
  const postalCode = clean(body.postal_code || body.postalCode, 10);

  if (!addressLine1 || !city || !state || !postalCode) {
    return { ok: false, error: 'Enter your complete US mailing address.' };
  }
  if (!US_STATES.has(state)) {
    return { ok: false, error: 'Enter a valid US state (2-letter code).' };
  }
  if (!/^\d{5}(-\d{4})?$/.test(postalCode)) {
    return { ok: false, error: 'Enter a valid ZIP code.' };
  }

  const emailCheck = validateAccountEmail(body.email);
  if (!emailCheck.ok) {
    return { ok: false, error: emailCheck.error };
  }

  const phone = clean(body.phone, 24);
  if (!isValidPhone(phone)) {
    return { ok: false, error: 'Enter a valid daytime phone number.' };
  }

  if (body.certify_eligible !== true && body.certify_eligible !== 'true' && body.certify_eligible !== 'on') {
    return { ok: false, error: 'Confirm that you meet eligibility requirements.' };
  }
  if (body.certify_rules !== true && body.certify_rules !== 'true' && body.certify_rules !== 'on') {
    return { ok: false, error: 'You must agree to the Official Rules.' };
  }

  return {
    ok: true,
    submission: {
      prizeId,
      meta,
      legalName,
      addressLine1,
      addressLine2: addressLine2 || null,
      city,
      state,
      postalCode,
      email: emailCheck.email,
      phone,
      userId: clean(body.user_id || body.userId, 64) || null,
    },
  };
}

async function submitAmoeEntry(body, { ip } = {}) {
  const validated = validateSubmission(body);
  if (!validated.ok) {
    return { ok: false, status: 400, error: validated.error };
  }

  const { submission, meta } = validated;
  const { prizeId, email } = submission;

  const existing = await findExistingAmoeEntry(email, prizeId);
  if (existing.error) {
    return { ok: false, status: 502, error: existing.error };
  }
  if (existing.row) {
    return {
      ok: false,
      status: 409,
      error: 'You already submitted a free entry for this sweepstakes.',
    };
  }

  const entryPayload = {
    user_id: submission.userId || null,
    customer_email: email,
    prize_id: prizeId,
    quantity: 1,
    source: 'amoe',
    order_id: null,
    status: 'confirmed',
    draw_id: 'founding-2026-09',
  };

  const entryResult = await adminFetch('entries', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify(entryPayload),
  });

  if (entryResult.error) {
    const msg = typeof entryResult.error === 'object' ? JSON.stringify(entryResult.error) : String(entryResult.error);
    if (msg.includes('entries_one_amoe_per_email_prize_idx') || msg.includes('duplicate')) {
      return {
        ok: false,
        status: 409,
        error: 'You already submitted a free entry for this sweepstakes.',
      };
    }
    console.error('amoe insert entry:', entryResult.status, entryResult.error);
    return { ok: false, status: 502, error: 'Could not record your free entry. Try again shortly.' };
  }

  const entryRow = Array.isArray(entryResult.data) ? entryResult.data[0] : entryResult.data;
  const entryId = entryRow && entryRow.id ? entryRow.id : null;

  const submissionPayload = {
    entry_id: entryId,
    prize_id: prizeId,
    sweepstakes_id: meta.sweepstakesId || null,
    legal_name: submission.legalName,
    address_line1: submission.addressLine1,
    address_line2: submission.addressLine2,
    city: submission.city,
    state: submission.state,
    postal_code: submission.postalCode,
    customer_email: email,
    phone: submission.phone,
    user_id: submission.userId || null,
    ip_hash: hashIp(ip),
  };

  const submissionResult = await adminFetch('amoe_submissions', {
    method: 'POST',
    prefer: 'return=minimal',
    body: JSON.stringify(submissionPayload),
  });

  if (submissionResult.error) {
    console.error('amoe insert submission:', submissionResult.status, submissionResult.error);
  }

  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) {
    console.error('amoe: RESEND_API_KEY missing');
    return {
      ok: true,
      status: 201,
      referenceId: entryId,
      emailSent: false,
      message: 'Free entry recorded. Email confirmation could not be sent — contact amoe@gaviom.com with your email.',
    };
  }

  const mail = buildConfirmationEmail({ submission, meta, referenceId: entryId });
  const sendResult = await sendResendEmail(apiKey, {
    from: AMOE_FROM,
    to: [email],
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    reply_to: 'amoe@gaviom.com',
  });

  if (!sendResult.ok) {
    console.error('amoe email:', sendResult.status, sendResult.data);
    return {
      ok: true,
      status: 201,
      referenceId: entryId,
      emailSent: false,
      message: 'Free entry recorded. Confirmation email failed — contact amoe@gaviom.com if needed.',
      warning: resendErrorMessage(sendResult.data),
    };
  }

  return {
    ok: true,
    status: 201,
    referenceId: entryId,
    emailSent: true,
    message: 'Free entry confirmed. Check your email for confirmation.',
  };
}

module.exports = {
  submitAmoeEntry,
  PRIZE_AMOE,
  PRIZES,
};
