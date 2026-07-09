const { sendResendEmail, resendErrorMessage } = require('./resend-mail');
const { validateAccountEmail } = require('./email-validation');
const { adminAuthConfig } = require('./send-auth-confirmation');
const { fetchAdminUserByEmail, fetchAdminUserById, isUserEmailConfirmed } = require('./auth-user');
const {
  generateSixDigitCode,
  hashVerificationCode,
  codesMatch,
  isValidCodeFormat,
} = require('./email-verification-crypto');
const {
  supersedePendingCodes,
  insertVerificationCode,
  getLatestActiveCode,
  getLatestCodeRow,
  incrementCodeAttempts,
  markCodeVerified,
} = require('./email-verification-store');
const { rateLimitRequest } = require('./rate-limit');

const CODE_TTL_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 5;
const RESEND_COOLDOWN_MS = 60 * 1000;
const FROM = (process.env.AUTH_CONFIRM_FROM || 'Gaviom <noreply@getgaviom.com>').trim();

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildVerificationEmail(code) {
  const subject = 'Your Gaviom verification code';
  const text = [
    'Your Gaviom verification code is:',
    '',
    code,
    '',
    'This code expires in 10 minutes.',
    '',
    'If you did not create this account, ignore this email.',
    '',
    '— Gaviom',
    'https://gaviom.com',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.6;color:#0a1628;max-width:560px">
  <p>Your Gaviom verification code is:</p>
  <p style="font-size:28px;font-weight:700;letter-spacing:0.2em;margin:24px 0">${escapeHtml(code)}</p>
  <p>This code expires in 10 minutes.</p>
  <p style="color:#64748b;font-size:14px">If you did not create this account, ignore this email.</p>
  <p style="color:#64748b;font-size:14px">— Gaviom · <a href="https://gaviom.com">gaviom.com</a></p>
</body></html>`;

  return { subject, text, html };
}

async function sendVerificationCodeEmail(email, code) {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey || apiKey.includes('REPLACE')) {
    return { ok: false, error: 'Email delivery is not configured. Add RESEND_API_KEY in Vercel.' };
  }

  const mail = buildVerificationEmail(code);
  const sendResult = await sendResendEmail(apiKey, {
    from: FROM,
    to: [email],
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
  });

  if (!sendResult.ok) {
    return { ok: false, error: resendErrorMessage(sendResult.data) };
  }

  return { ok: true, id: sendResult.data?.id || null };
}

async function confirmSupabaseUser(cfg, userId) {
  const res = await fetch(`${cfg.url}/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email_confirm: true }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const detail =
      data?.msg || data?.message || data?.error_description || data?.error || `HTTP ${res.status}`;
    console.error('email-verification:confirm-user', { userId, status: res.status, detail });
    return { ok: false, user: null, detail };
  }

  let user = data?.id ? data : await fetchAdminUserById(cfg, userId);
  if (!user?.email_confirmed_at && !user?.confirmed_at) {
    await new Promise((resolve) => setTimeout(resolve, 400));
    user = (await fetchAdminUserById(cfg, userId)) || user;
  }

  if (!isUserEmailConfirmed(user)) {
    return {
      ok: false,
      user,
      detail: 'Supabase did not mark the email as confirmed after update.',
    };
  }

  return { ok: true, user };
}

async function issueVerificationCodeForUser(userId, email, meta) {
  const cfg = adminAuthConfig();
  if (!cfg) {
    return { error: 'Account verification is not configured.', status: 503 };
  }

  const emailCheck = validateAccountEmail(email || '');
  if (!emailCheck.ok) {
    return { error: emailCheck.error, status: 400 };
  }

  if (meta?.req) {
    const ipLimit = rateLimitRequest(meta.req, 'issue-code', 20, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      return {
        error: `Too many requests. Try again in ${ipLimit.retryAfterSec} seconds.`,
        status: 429,
      };
    }
    const emailLimit = rateLimitRequest(meta.req, `issue-code:${emailCheck.email}`, 8, 15 * 60 * 1000);
    if (!emailLimit.ok) {
      return {
        error: `Too many code requests for this email. Try again in ${emailLimit.retryAfterSec} seconds.`,
        status: 429,
      };
    }
  }

  if (meta?.enforceCooldown) {
    const latest = await getLatestCodeRow(cfg, emailCheck.email);
    if (latest?.created_at) {
      const elapsed = Date.now() - new Date(latest.created_at).getTime();
      if (elapsed < RESEND_COOLDOWN_MS) {
        const waitSec = Math.ceil((RESEND_COOLDOWN_MS - elapsed) / 1000);
        return {
          error: `Please wait ${waitSec} seconds before requesting a new code.`,
          status: 429,
          retry_after_sec: waitSec,
        };
      }
    }
  }

  let resolvedUserId = userId;
  if (!resolvedUserId) {
    const adminUser = await fetchAdminUserByEmail(cfg, emailCheck.email);
    if (!adminUser?.id) {
      return { error: 'No account found for this email.', status: 404 };
    }
    if (adminUser.email_confirmed_at) {
      return { error: 'This email is already verified. You can sign in.', status: 409, already_verified: true };
    }
    resolvedUserId = adminUser.id;
  }

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + CODE_TTL_MS).toISOString();

  await supersedePendingCodes(cfg, emailCheck.email);

  const insertResult = await insertVerificationCode(cfg, {
    user_id: resolvedUserId,
    email: emailCheck.email,
    code_hash: hashVerificationCode(emailCheck.email, code),
    expires_at: expiresAt,
    attempts: 0,
  });

  if (!insertResult.ok) {
    const insertErr = JSON.stringify(insertResult.data || '');
    console.error('email-verification:insert', insertResult.status, insertResult.data);
    if (
      insertResult.status === 404 ||
      /relation.*does not exist|email_verification_codes/i.test(insertErr)
    ) {
      return {
        error:
          'Verification database is not set up. Run scripts/supabase-email-verification-codes.sql in Supabase.',
        status: 503,
      };
    }
    return { error: 'Could not create verification code. Try again.', status: 502 };
  }

  const sendResult = await sendVerificationCodeEmail(emailCheck.email, code);
  if (!sendResult.ok) {
    return { error: sendResult.error || 'Could not send verification email.', status: 502 };
  }

  console.info('email-verification:code-sent', {
    userId: resolvedUserId,
    email: emailCheck.email,
    expiresAt,
  });

  return {
    ok: true,
    email: emailCheck.email,
    user_id: resolvedUserId,
    expires_at: expiresAt,
    resend_id: sendResult.id || null,
  };
}

async function verifyEmailCode(email, code, meta) {
  const cfg = adminAuthConfig();
  if (!cfg) {
    return { error: 'Account verification is not configured.', status: 503 };
  }

  const emailCheck = validateAccountEmail(email || '');
  if (!emailCheck.ok) {
    return { error: emailCheck.error, status: 400 };
  }

  if (!isValidCodeFormat(code)) {
    return { error: 'Enter the 6-digit verification code from your email.', status: 400 };
  }

  if (meta?.req) {
    const ipLimit = rateLimitRequest(meta.req, 'verify-code', 40, 15 * 60 * 1000);
    if (!ipLimit.ok) {
      return {
        error: `Too many attempts. Try again in ${ipLimit.retryAfterSec} seconds.`,
        status: 429,
      };
    }
  }

  const adminUser = await fetchAdminUserByEmail(cfg, emailCheck.email);
  if (!adminUser?.id) {
    return { error: 'No account found for this email.', status: 404 };
  }

  if (adminUser.email_confirmed_at) {
    return {
      ok: true,
      success: true,
      message: 'Email verified successfully.',
      already_verified: true,
      user_id: adminUser.id,
    };
  }

  const row = await getLatestActiveCode(cfg, emailCheck.email);
  if (!row) {
    const stale = await getLatestCodeRow(cfg, emailCheck.email);
    if (stale && new Date(stale.expires_at).getTime() <= Date.now()) {
      return { error: 'This verification code expired. Request a new code.', status: 410, code: 'expired' };
    }
    return { error: 'No active verification code found. Request a new code.', status: 404, code: 'missing' };
  }

  if (row.attempts >= MAX_ATTEMPTS) {
    return {
      error: 'Too many incorrect attempts. Request a new verification code.',
      status: 429,
      code: 'too_many_attempts',
    };
  }

  if (!codesMatch(emailCheck.email, code, row.code_hash)) {
    const nextAttempts = Number(row.attempts || 0) + 1;
    await incrementCodeAttempts(cfg, row.id, nextAttempts);
    const remaining = Math.max(0, MAX_ATTEMPTS - nextAttempts);
    if (nextAttempts >= MAX_ATTEMPTS) {
      return {
        error: 'Too many incorrect attempts. Request a new verification code.',
        status: 429,
        code: 'too_many_attempts',
      };
    }
    return {
      error: `Incorrect verification code. ${remaining} attempt${remaining === 1 ? '' : 's'} remaining.`,
      status: 401,
      code: 'incorrect',
      attempts_remaining: remaining,
    };
  }

  const confirmResult = await confirmSupabaseUser(cfg, row.user_id || adminUser.id);
  if (!confirmResult.ok) {
    console.error('email-verification:confirm-failed', {
      email: emailCheck.email,
      userId: row.user_id || adminUser.id,
      detail: confirmResult.detail || null,
    });
    return {
      error:
        confirmResult.detail && String(confirmResult.detail).length < 120
          ? `Could not confirm your email: ${confirmResult.detail}`
          : 'Could not confirm your email. Try again or contact support.',
      status: 502,
      code: 'confirm_failed',
    };
  }

  const refreshedUser = confirmResult.user || (await fetchAdminUserById(cfg, row.user_id || adminUser.id));
  if (!isUserEmailConfirmed(refreshedUser)) {
    return { error: 'Email confirmation did not complete. Try again.', status: 502, code: 'confirm_incomplete' };
  }

  await markCodeVerified(cfg, row.id);

  console.info('email-verification:verified', {
    userId: adminUser.id,
    email: emailCheck.email,
    adminEmailConfirmedAt: refreshedUser.email_confirmed_at,
    confirmationSuccess: true,
  });

  return {
    ok: true,
    success: true,
    message: 'Email verified successfully.',
    user_id: adminUser.id,
    email: emailCheck.email,
    email_confirmed_at: refreshedUser.email_confirmed_at,
  };
}

module.exports = {
  CODE_TTL_MS,
  MAX_ATTEMPTS,
  RESEND_COOLDOWN_MS,
  issueVerificationCodeForUser,
  verifyEmailCode,
  sendVerificationCodeEmail,
};
