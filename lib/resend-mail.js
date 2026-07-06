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

function resendErrorMessage(data) {
  const message = typeof data?.message === 'string' ? data.message : '';
  if (message.includes('domain is not verified')) {
    return 'Sender domain is not verified in Resend. Verify getgaviom.com in Resend.';
  }
  if (message.includes('API key is invalid')) {
    return 'Email delivery is misconfigured (invalid Resend API key).';
  }
  return message || 'Could not send email. Try again shortly.';
}

module.exports = { sendResendEmail, resendErrorMessage };
