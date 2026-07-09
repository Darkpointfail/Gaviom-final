function createConfirmRequestId() {
  return `cfm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function tokenPreview(value) {
  const token = String(value || '').trim();
  if (!token) return null;
  return token.slice(0, 8);
}

function auditConfirm(stage, data) {
  const payload = {
    ts: new Date().toISOString(),
    stage,
    ...(data && typeof data === 'object' ? data : { detail: data }),
  };
  console.info('[confirm-audit]', JSON.stringify(payload));
}

module.exports = {
  createConfirmRequestId,
  tokenPreview,
  auditConfirm,
};
