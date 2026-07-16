const { adminFetch } = require('./supabase-admin');
const { POOL_CAPS } = require('./catalog');

const PRIZE_IDS = Object.keys(POOL_CAPS);

async function fetchConfirmedEntries() {
  const params = new URLSearchParams({
    select: 'prize_id,quantity',
    status: 'eq.confirmed',
    prize_id: `in.(${PRIZE_IDS.join(',')})`,
    limit: '50000',
  });
  const result = await adminFetch(`entries?${params}`);
  if (result.error) {
    return { error: result.error, status: result.status || 502 };
  }
  return { rows: Array.isArray(result.data) ? result.data : [] };
}

function aggregatePools(rows) {
  const totals = {};
  PRIZE_IDS.forEach((id) => {
    totals[id] = 0;
  });

  rows.forEach((row) => {
    const id = row.prize_id;
    if (!Object.prototype.hasOwnProperty.call(totals, id)) return;
    totals[id] += Number(row.quantity) || 0;
  });

  const pools = {};
  PRIZE_IDS.forEach((id) => {
    const cap = POOL_CAPS[id] || 3000;
    const entries = totals[id] || 0;
    const remaining = Math.max(0, cap - entries);
    const pct = cap > 0 ? Math.min(100, Math.round((entries / cap) * 100)) : 0;
    pools[id] = {
      entries,
      cap,
      remaining,
      pct,
      soldOut: entries >= cap,
    };
  });

  return pools;
}

async function getPoolStats() {
  const fetched = await fetchConfirmedEntries();
  if (fetched.error) {
    return { error: 'Could not load pool stats.', status: fetched.status || 502 };
  }
  const pools = aggregatePools(fetched.rows);
  return {
    ok: true,
    pools,
    updatedAt: new Date().toISOString(),
  };
}

module.exports = {
  PRIZE_IDS,
  getPoolStats,
  aggregatePools,
};
