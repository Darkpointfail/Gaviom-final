/** Server-side catalog — prices must stay in sync with cart.js */
const PRIZES = {
  msc: {
    id: 'msc',
    title: 'MSC Cruise · 7 Nights',
    bundles: [
      { tickets: 1, price: 12 },
      { tickets: 5, price: 45 },
      { tickets: 20, price: 80 },
    ],
  },
  diving: {
    id: 'diving',
    title: 'Scuba Discovery · Cozumel',
    bundles: [
      { tickets: 1, price: 5 },
      { tickets: 5, price: 20 },
      { tickets: 20, price: 70 },
    ],
  },
  iphone: {
    id: 'iphone',
    title: 'iPhone 17 Pro Max',
    bundles: [
      { tickets: 1, price: 2 },
      { tickets: 5, price: 8 },
      { tickets: 20, price: 28 },
    ],
  },
  vegas: {
    id: 'vegas',
    title: '5-Star Weekend · Las Vegas or Miami',
    bundles: [
      { tickets: 1, price: 5 },
      { tickets: 5, price: 20 },
      { tickets: 20, price: 70 },
    ],
  },
};

const MEMBERSHIP = {
  monthly: {
    title: 'Gaviom+ · Monthly',
    priceCents: 1700,
    description: '5–8 sweepstakes tickets per month · Cancel anytime',
  },
};

function unitPrice(prize) {
  return prize.bundles[0].price / prize.bundles[0].tickets;
}

function linePrice(prizeId, qty) {
  const prize = PRIZES[prizeId];
  if (!prize) return null;
  const exact = prize.bundles.find((b) => b.tickets === qty);
  if (exact) return exact.price;
  return Math.round(qty * unitPrice(prize) * 100) / 100;
}

/**
 * @param {{ prizeId: string, qty: number }[]} items
 * @returns {{ lineItems: object[], totalCents: number, metadata: object } | { error: string }}
 */
function buildTicketLineItems(items) {
  if (!Array.isArray(items) || !items.length) {
    return { error: 'Cart is empty' };
  }

  const lineItems = [];
  let totalCents = 0;
  const summary = [];

  for (const raw of items) {
    const prizeId = String(raw.prizeId || '').trim();
    const qty = parseInt(raw.qty, 10);
    if (!PRIZES[prizeId] || !Number.isFinite(qty) || qty < 1 || qty > 100) {
      return { error: 'Invalid cart item' };
    }
    const price = linePrice(prizeId, qty);
    if (price == null || price <= 0) {
      return { error: 'Invalid price for item' };
    }
    const prize = PRIZES[prizeId];
    const unitCents = Math.round(price * 100);
    totalCents += unitCents;
    summary.push({ prizeId, qty, price });
    lineItems.push({
      quantity: 1,
      price_data: {
        currency: 'usd',
        unit_amount: unitCents,
        product_data: {
          name: `${prize.title} — ${qty} sweepstakes ticket${qty === 1 ? '' : 's'}`,
          description: 'Sweepstakes entry tickets only · Not the prize itself',
          metadata: { prizeId, qty: String(qty) },
        },
      },
    });
  }

  return {
    lineItems,
    totalCents,
    metadata: {
      type: 'tickets',
      items: JSON.stringify(summary),
    },
  };
}

function buildSingleLineItem(prizeId, qty) {
  return buildTicketLineItems([{ prizeId, qty }]);
}

function buildMembershipLineItem() {
  const m = MEMBERSHIP.monthly;
  return {
    lineItems: [
      {
        quantity: 1,
        price_data: {
          currency: 'usd',
          unit_amount: m.priceCents,
          recurring: { interval: 'month' },
          product_data: {
            name: m.title,
            description: m.description,
          },
        },
      },
    ],
    totalCents: m.priceCents,
    metadata: { type: 'membership', plan: 'monthly' },
  };
}

module.exports = {
  PRIZES,
  MEMBERSHIP,
  linePrice,
  buildTicketLineItems,
  buildSingleLineItem,
  buildMembershipLineItem,
};
