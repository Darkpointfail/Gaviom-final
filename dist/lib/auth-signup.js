const { validateAccountEmail } = require('./email-validation');
const {
  adminAuthConfig,
  deliverAuthConfirmationEmail,
  formatServiceError,
} = require('./send-auth-confirmation');

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

function cleanText(value, maxLen) {
  return typeof value === 'string' ? value.trim().slice(0, maxLen || 120) : '';
}

function validateSignupPayload(body) {
  const emailCheck = validateAccountEmail(body.email || '');
  if (!emailCheck.ok) {
    return { error: emailCheck.error };
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (password.length < 8) {
    return { error: 'Choose a password with at least 8 characters.' };
  }

  const firstName = cleanText(body.first_name, 80);
  const lastName = cleanText(body.last_name, 80);
  if (!firstName) return { error: 'Please enter your first name.' };
  if (!lastName) return { error: 'Please enter your last name.' };

  const dob = cleanText(body.date_of_birth, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) {
    return { error: 'Please enter a valid date of birth.' };
  }

  const state = cleanText(body.state, 2).toUpperCase();
  if (!/^[A-Z]{2}$/.test(state)) {
    return { error: 'Please select your state.' };
  }

  const born = new Date(`${dob}T12:00:00`);
  if (Number.isNaN(born.getTime())) {
    return { error: 'Please enter a valid date of birth.' };
  }
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) age--;
  if (age < 18) {
    return { error: 'You must be 18 or older to create an account.' };
  }

  return {
    email: emailCheck.email,
    password,
    metadata: {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dob,
      state,
      marketing_opt_in: !!body.marketing_opt_in,
    },
  };
}

async function adminFetch(cfg, path, options = {}) {
  const res = await fetch(`${cfg.url}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

async function findUserByEmail(cfg, email) {
  const result = await adminFetch(
    cfg,
    `/auth/v1/admin/users?email=${encodeURIComponent(email)}`,
    { method: 'GET' }
  );
  if (!result.ok) return null;
  const users = result.data?.users;
  return Array.isArray(users) && users[0] ? users[0] : null;
}

async function adminCreateUser(cfg, email, password, metadata) {
  return adminFetch(cfg, '/auth/v1/admin/users', {
    method: 'POST',
    body: JSON.stringify({
      email,
      password,
      email_confirm: false,
      user_metadata: metadata,
    }),
  });
}

function mapCreateUserError(data) {
  const code = String(data?.error_code || data?.code || '').trim();
  const message = formatServiceError(data);

  if (code === 'email_exists' || /already (registered|exists)/i.test(message)) {
    return { type: 'email_exists', message };
  }
  if (code === 'weak_password' || /password/i.test(message)) {
    return { type: 'weak_password', message: 'Choose a stronger password (at least 8 characters).' };
  }
  if (code === 'over_email_send_rate_limit') {
    return {
      type: 'rate_limit',
      message: 'Too many signup attempts. Wait a few minutes, then try again.',
    };
  }

  return { type: 'unknown', message: message || 'Could not create account.' };
}

async function upsertProfile(cfg, userId, email, metadata) {
  const row = {
    id: userId,
    email,
    first_name: metadata.first_name,
    last_name: metadata.last_name,
    date_of_birth: metadata.date_of_birth,
    state: metadata.state,
    marketing_opt_in: !!metadata.marketing_opt_in,
    updated_at: new Date().toISOString(),
  };

  const res = await fetch(`${cfg.url}/rest/v1/profiles?on_conflict=id`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${cfg.key}`,
      apikey: cfg.key,
      'Content-Type': 'application/json',
      Prefer: 'resolution=merge-duplicates,return=minimal',
    },
    body: JSON.stringify(row),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => '');
    console.error('auth-signup profile upsert:', res.status, err);
  }
  return res.ok;
}

async function adminUpdateUserMetadata(cfg, userId, metadata) {
  return adminFetch(cfg, `/auth/v1/admin/users/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ user_metadata: metadata }),
  });
}

async function handleAuthSignup(req, res) {
  const cfg = adminAuthConfig();
  if (!cfg) {
    return res.status(503).json({
      error: 'Account signup is not configured. Add SUPABASE_SERVICE_ROLE_KEY in Vercel.',
    });
  }

  const parsed = parseJsonBody(req);
  if (parsed.error) return res.status(400).json({ error: parsed.error });

  const validated = validateSignupPayload(parsed.body);
  if (validated.error) return res.status(400).json({ error: validated.error });

  const createResult = await adminCreateUser(
    cfg,
    validated.email,
    validated.password,
    validated.metadata
  );

  if (!createResult.ok) {
    const mapped = mapCreateUserError(createResult.data);

    if (mapped.type === 'email_exists') {
      const existing = await findUserByEmail(cfg, validated.email);
      if (existing && existing.email_confirmed_at) {
        return res.status(409).json({
          error: 'This email is already registered. Sign in instead.',
        });
      }

      if (existing && existing.id) {
        await adminUpdateUserMetadata(cfg, existing.id, validated.metadata);
        await upsertProfile(cfg, existing.id, validated.email, validated.metadata);
      }

      const sendResult = await deliverAuthConfirmationEmail(validated.email);
      if (sendResult.ok) {
        return res.status(200).json({ ok: true, resent: true });
      }

      return res.status(409).json({
        error:
          'This email is already registered. Sign in and use Resend confirmation, or try Forgot password.',
      });
    }

    return res.status(createResult.status >= 400 ? createResult.status : 502).json({
      error: mapped.message,
    });
  }

  const createdUser = createResult.data || {};
  const userId = createdUser.id;
  if (userId) {
    await upsertProfile(cfg, userId, validated.email, validated.metadata);
  }

  const sendResult = await deliverAuthConfirmationEmail(validated.email);
  if (!sendResult.ok) {
    console.error('auth-signup confirmation:', sendResult.error);
    return res.status(502).json({
      error:
        sendResult.error ||
        'Account created, but we could not send the confirmation email. Use Resend confirmation on the sign-in page.',
      created: true,
    });
  }

  return res.status(200).json({ ok: true, id: sendResult.id || null });
}

module.exports = { handleAuthSignup };
