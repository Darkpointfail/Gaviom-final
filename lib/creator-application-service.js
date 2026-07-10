const crypto = require('crypto');
const { adminFetch } = require('./supabase-admin');
const { sendResendEmail } = require('./resend-mail');

const APPLICATION_FROM = (
  process.env.CREATOR_APPLICATION_FROM ||
  process.env.AUTH_CONFIRM_FROM ||
  'Gaviom Creators <noreply@getgaviom.com>'
).trim();

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function slugifyCreatorName(name) {
  const base = clean(name)
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48);
  return base || null;
}

function mapFormToRow(userId, body) {
  const prizeValue = Number(clean(body.prize_value));
  const launch = clean(body.launch);

  return {
    user_id: userId,
    name: clean(body.name),
    email: clean(body.email).toLowerCase(),
    country: clean(body.country),
    social_url: clean(body.social),
    creator_name: clean(body.creator_name),
    category: clean(body.category),
    audience_size: clean(body.audience),
    platforms: clean(body.platforms),
    engagement: clean(body.engagement),
    prize: clean(body.prize),
    prize_value_usd: prizeValue,
    description: clean(body.description),
    expected_participants: clean(body.expected) || null,
    desired_launch_date: launch || null,
    status: 'pending',
    source: clean(body.source) || 'gaviom-creator-apply',
    review_token: crypto.randomBytes(24).toString('hex'),
  };
}

async function fetchOpenApplication(userId) {
  const params = new URLSearchParams({
    select: 'id,status,created_at',
    user_id: `eq.${userId}`,
    status: 'in.(pending,under_review)',
    limit: '1',
  });
  const result = await adminFetch(`creator_applications?${params}`);
  if (result.error) return { error: result.error, status: result.status || 502 };
  const row = Array.isArray(result.data) ? result.data[0] : null;
  return { row };
}

async function setProfileCreatorStatus(userId, status) {
  const payload = { creator_status: status, updated_at: new Date().toISOString() };
  if (status === 'approved') {
    payload.creator_approved_at = new Date().toISOString();
  }
  return adminFetch(`profiles?id=eq.${userId}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify(payload),
  });
}

async function saveCreatorApplication(user, body) {
  const userId = user.id;
  const userEmail = (user.email || '').toLowerCase();
  const formEmail = clean(body.email).toLowerCase();

  if (userEmail && formEmail && userEmail !== formEmail) {
    return { error: 'Application email must match your signed-in account.', status: 400 };
  }

  const existing = await fetchOpenApplication(userId);
  if (existing.error) {
    console.error('creator-application open check:', existing.error);
    return { error: 'Could not verify existing applications.', status: 502 };
  }
  if (existing.row) {
    return {
      error: 'You already have a creator application under review.',
      status: 409,
      applicationId: existing.row.id,
    };
  }

  const profileParams = new URLSearchParams({
    select: 'creator_status',
    id: `eq.${userId}`,
    limit: '1',
  });
  const profileResult = await adminFetch(`profiles?${profileParams}`);
  if (profileResult.error) {
    console.error('creator-application profile check:', profileResult.error);
    return { error: 'Could not verify creator status.', status: 502 };
  }
  const profile = Array.isArray(profileResult.data) ? profileResult.data[0] : null;
  if (profile && profile.creator_status === 'approved') {
    return { error: 'Your creator account is already approved.', status: 409 };
  }
  if (profile && profile.creator_status === 'pending') {
    return { error: 'You already have a creator application under review.', status: 409 };
  }

  const row = mapFormToRow(userId, body);
  row.email = userEmail || formEmail;

  const insertResult = await adminFetch('creator_applications', {
    method: 'POST',
    prefer: 'return=representation',
    body: JSON.stringify(row),
  });

  if (insertResult.error) {
    console.error('creator-application insert:', insertResult.error);
    const code = insertResult.error?.code;
    if (code === '23505') {
      return { error: 'You already have a creator application under review.', status: 409 };
    }
    return { error: 'Could not save creator application.', status: 502 };
  }

  const saved = Array.isArray(insertResult.data) ? insertResult.data[0] : insertResult.data;
  const profileUpdate = await setProfileCreatorStatus(userId, 'pending');
  if (profileUpdate.error) {
    console.error('creator-application profile pending:', profileUpdate.error);
  }

  return { application: saved };
}

function reviewUrls(origin, token) {
  const base = `${origin.replace(/\/$/, '')}/api/creator-application-review`;
  const q = `token=${encodeURIComponent(token)}`;
  return {
    approve: `${base}?${q}&action=approve`,
    reject: `${base}?${q}&action=reject`,
  };
}

async function fetchApplicationByToken(token) {
  const params = new URLSearchParams({
    select: '*',
    review_token: `eq.${token}`,
    limit: '1',
  });
  const result = await adminFetch(`creator_applications?${params}`);
  if (result.error) return { error: result.error, status: result.status || 502 };
  const row = Array.isArray(result.data) ? result.data[0] : null;
  if (!row) return { error: 'Application not found or link expired.', status: 404 };
  return { application: row };
}

async function sendApprovedEmail(application, origin) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('REPLACE')) return { ok: false };

  const dashboardUrl = `${origin.replace(/\/$/, '')}/creators/dashboard`;
  const name = application.name || 'there';

  return sendResendEmail(apiKey, {
    from: APPLICATION_FROM,
    to: [application.email],
    reply_to: ['info@getgaviom.com'],
    subject: 'Your Gaviom Creator application was approved',
    text: [
      `Hi ${name},`,
      '',
      'Great news — your Gaviom Creator application has been approved.',
      '',
      `Open your dashboard: ${dashboardUrl}`,
      '',
      '— Gaviom Creators',
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0a1628;max-width:560px">
      <p>Hi ${name},</p>
      <p>Great news — your <strong>Gaviom Creator</strong> application has been approved.</p>
      <p><a href="${dashboardUrl}">Open your creator dashboard</a></p>
      <p style="margin-top:24px;color:#64748b;font-size:14px">— Gaviom Creators</p>
    </body></html>`,
  });
}

async function sendRejectedEmail(application) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('REPLACE')) return { ok: false };

  const name = application.name || 'there';
  const applyUrl = 'https://gaviom.com/creators/apply?from=account';

  return sendResendEmail(apiKey, {
    from: APPLICATION_FROM,
    to: [application.email],
    reply_to: ['info@getgaviom.com'],
    subject: 'Update on your Gaviom Creator application',
    text: [
      `Hi ${name},`,
      '',
      'Thank you for applying to Gaviom Creator. After review, we are unable to approve this application at this time.',
      '',
      `You may contact us at info@getgaviom.com or submit a new application later: ${applyUrl}`,
      '',
      '— Gaviom Creators',
    ].join('\n'),
    html: `<!DOCTYPE html><html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0a1628;max-width:560px">
      <p>Hi ${name},</p>
      <p>Thank you for applying to <strong>Gaviom Creator</strong>. After review, we are unable to approve this application at this time.</p>
      <p>Contact <a href="mailto:info@getgaviom.com">info@getgaviom.com</a> or <a href="${applyUrl}">submit a new application</a> later.</p>
      <p style="margin-top:24px;color:#64748b;font-size:14px">— Gaviom Creators</p>
    </body></html>`,
  });
}

async function reviewCreatorApplication(token, action, origin) {
  if (!token) return { error: 'Missing review token.', status: 400 };
  if (action !== 'approve' && action !== 'reject') {
    return { error: 'Invalid action.', status: 400 };
  }

  const lookup = await fetchApplicationByToken(token);
  if (lookup.error) return { error: lookup.error, status: lookup.status || 404 };

  const application = lookup.application;
  if (application.status === 'approved' && action === 'approve') {
    return { ok: true, already: true, application, action };
  }
  if (application.status === 'rejected' && action === 'reject') {
    return { ok: true, already: true, application, action };
  }
  if (application.status === 'approved' || application.status === 'rejected') {
    return {
      error: `Application already ${application.status}.`,
      status: 409,
      application,
      action,
    };
  }

  const now = new Date().toISOString();
  const nextStatus = action === 'approve' ? 'approved' : 'rejected';
  const patchResult = await adminFetch(`creator_applications?id=eq.${application.id}`, {
    method: 'PATCH',
    prefer: 'return=representation',
    body: JSON.stringify({
      status: nextStatus,
      reviewed_at: now,
      reviewed_by: 'email-review-link',
      review_token: null,
    }),
  });

  if (patchResult.error) {
    console.error('creator-application review patch:', patchResult.error);
    return { error: 'Could not update application.', status: 502 };
  }

  const profilePayload = {
    creator_status: nextStatus,
    updated_at: now,
  };
  if (action === 'approve') {
    profilePayload.creator_approved_at = now;
    const slug = slugifyCreatorName(application.creator_name);
    if (slug) profilePayload.creator_slug = slug;
  }

  const profileResult = await adminFetch(`profiles?id=eq.${application.user_id}`, {
    method: 'PATCH',
    prefer: 'return=minimal',
    body: JSON.stringify(profilePayload),
  });
  if (profileResult.error) {
    console.error('creator-application review profile:', profileResult.error);
  }

  const updated = Array.isArray(patchResult.data) ? patchResult.data[0] : application;

  if (action === 'approve') {
    await sendApprovedEmail(updated, origin);
  } else {
    await sendRejectedEmail(updated);
  }

  return { ok: true, application: updated, action };
}

module.exports = {
  saveCreatorApplication,
  reviewUrls,
  reviewCreatorApplication,
  slugifyCreatorName,
};
