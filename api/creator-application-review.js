const { reviewCreatorApplication } = require('../lib/creator-application-service');

function resolveOrigin(req) {
  const configured = (process.env.CREATOR_APPLICATION_ORIGIN || '').trim();
  if (configured) return configured.replace(/\/$/, '');
  const origin = req.headers.origin || req.headers.Origin;
  if (origin) return String(origin).replace(/\/$/, '');
  const host = req.headers['x-forwarded-host'] || req.headers.host;
  if (host) return `https://${host}`.replace(/\/$/, '');
  return 'https://gaviom.com';
}

function renderPage(title, message, ok) {
  const color = ok ? '#166534' : '#991b1b';
  return `<!DOCTYPE html>
<html lang="en"><head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${title}</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; min-height: 100vh; display: grid; place-items: center; }
    .card { background: #fff; border: 1px solid #e2e8f0; border-radius: 16px; padding: 32px; max-width: 520px; box-shadow: 0 10px 30px rgba(15,23,42,.06); }
    h1 { margin: 0 0 12px; font-size: 24px; color: ${color}; }
    p { margin: 0; line-height: 1.6; color: #475569; }
    a { color: #0f172a; }
  </style>
</head><body>
  <div class="card">
    <h1>${title}</h1>
    <p>${message}</p>
    <p style="margin-top:20px"><a href="/">← Back to Gaviom</a></p>
  </div>
</body></html>`;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).send('Method not allowed');
  }

  const token = String(req.query?.token || '').trim();
  const action = String(req.query?.action || '').trim().toLowerCase();
  const origin = resolveOrigin(req);

  try {
    const result = await reviewCreatorApplication(token, action, origin);

    if (result.error) {
      const status = result.status || 400;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res
        .status(status)
        .send(renderPage('Review failed', String(result.error), false));
    }

    const name = result.application?.creator_name || result.application?.name || 'Creator';
    if (result.already) {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(
        renderPage(
          'Already processed',
          `The application for <strong>${name}</strong> was already ${result.application.status}.`,
          true
        )
      );
    }

    if (action === 'approve') {
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      return res.send(
        renderPage(
          'Application approved',
          `<strong>${name}</strong> now has creator dashboard access. An approval email was sent to ${result.application.email}.`,
          true
        )
      );
    }

    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(
      renderPage(
        'Application rejected',
        `The application for <strong>${name}</strong> was rejected. The applicant was notified by email.`,
        true
      )
    );
  } catch (err) {
    console.error('creator-application-review:', err.message);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(500).send(renderPage('Server error', 'Could not process review.', false));
  }
};
