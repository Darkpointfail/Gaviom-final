const crypto = require('crypto');

const CODE_MIN = 100000;
const CODE_MAX = 1000000;

function verificationPepper() {
  return (
    (process.env.EMAIL_VERIFICATION_PEPPER || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim() ||
    'gaviom-email-verification'
  );
}

function generateSixDigitCode() {
  return String(crypto.randomInt(CODE_MIN, CODE_MAX));
}

function hashVerificationCode(email, code) {
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedCode = String(code || '').trim();
  return crypto
    .createHmac('sha256', verificationPepper())
    .update(`${normalizedEmail}:${normalizedCode}`)
    .digest('hex');
}

function codesMatch(email, code, storedHash) {
  const expected = hashVerificationCode(email, code);
  const a = Buffer.from(expected, 'utf8');
  const b = Buffer.from(String(storedHash || ''), 'utf8');
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

function isValidCodeFormat(code) {
  return /^\d{6}$/.test(String(code || '').trim());
}

module.exports = {
  generateSixDigitCode,
  hashVerificationCode,
  codesMatch,
  isValidCodeFormat,
};
