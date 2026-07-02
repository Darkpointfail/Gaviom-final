module.exports = function handler(req, res) {
  const pk = process.env.STRIPE_PUBLIC_KEY || process.env.NEXT_PUBLIC_STRIPE_PUBLIC_KEY || '';
  const sk = process.env.STRIPE_SECRET_KEY || '';
  const configured =
    pk.length > 0 &&
    !pk.includes('REPLACE') &&
    sk.length > 0 &&
    !sk.includes('REPLACE');

  res.setHeader('Cache-Control', 'no-store');
  return res.status(200).json({
    configured,
    publishableKey: configured ? pk : null,
  });
};
