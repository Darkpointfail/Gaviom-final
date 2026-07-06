const {
  buildTicketLineItems,
  buildSingleLineItem,
  buildMembershipLineItem,
} = require('./catalog');

function resolveOrder(body) {
  if (!body || typeof body !== 'object') {
    return { error: 'Missing request body' };
  }

  let built;
  let mode = 'payment';

  if (body.type === 'membership' || body.plan === 'monthly' || body.plan === 'annual') {
    built = buildMembershipLineItem();
    mode = 'subscription';
  } else if (body.type === 'cart' && Array.isArray(body.items)) {
    built = buildTicketLineItems(body.items);
  } else if (body.prize) {
    const qty = parseInt(body.qty || body.bundle, 10) || 5;
    built = buildSingleLineItem(String(body.prize).trim(), qty);
  } else if (Array.isArray(body.items) && body.items.length) {
    built = buildTicketLineItems(body.items);
  } else {
    return { error: 'Nothing to checkout' };
  }

  if (built.error) {
    return { error: built.error };
  }

  return { built, mode };
}

module.exports = { resolveOrder };
