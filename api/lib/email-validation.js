const DISPOSABLE_DOMAINS = new Set([
  '10minutemail.com',
  '10minutemail.net',
  'dispostable.com',
  'dropmail.me',
  'fakeinbox.com',
  'getnada.com',
  'guerrillamail.com',
  'guerrillamail.net',
  'guerrillamail.org',
  'maildrop.cc',
  'mailinator.com',
  'mailnesia.com',
  'mintemail.com',
  'moakt.com',
  'sharklasers.com',
  'spam4.me',
  'temp-mail.org',
  'tempmail.com',
  'tempmail.net',
  'throwaway.email',
  'trashmail.com',
  'trashmail.net',
  'yopmail.com',
]);

function normalizeEmail(email) {
  return typeof email === 'string' ? email.trim().toLowerCase() : '';
}

function isValidEmail(email) {
  const e = normalizeEmail(email);
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e);
}

function getEmailDomain(email) {
  const e = normalizeEmail(email);
  const at = e.lastIndexOf('@');
  return at === -1 ? '' : e.slice(at + 1);
}

function isDisposableEmail(email) {
  const domain = getEmailDomain(email);
  return !!(domain && DISPOSABLE_DOMAINS.has(domain));
}

function validateAccountEmail(email) {
  const e = normalizeEmail(email);
  if (!isValidEmail(e)) {
    return { ok: false, error: 'Enter a valid email address.' };
  }
  if (isDisposableEmail(e)) {
    return {
      ok: false,
      error: 'Use a permanent email address — temporary inbox providers are not allowed.',
    };
  }
  return { ok: true, email: e };
}

module.exports = {
  normalizeEmail,
  isValidEmail,
  isDisposableEmail,
  validateAccountEmail,
};
