// Small pure rules shared by the schemas and routes.
export const STATUSES = ['wishlist', 'applied', 'interview', 'offer', 'rejected'];

// Only http(s) links are allowed: a stored "javascript:" URL rendered as a link would be an XSS hole.
export function isHttpUrl(value) {
  try {
    const { protocol } = new URL(value);
    return protocol === 'http:' || protocol === 'https:';
  } catch {
    return false;
  }
}

// Strict YYYY-MM-DD that is also a real calendar date (rejects 2026-02-31).
export function isIsoDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export const todayIso = (now = new Date()) => now.toISOString().slice(0, 10);

// New applications get today's date as "applied" unless they're only a wishlist item.
export function appliedDateOnCreate({ status, applied_date }, now = new Date()) {
  if (applied_date) return applied_date;
  return status === 'wishlist' ? null : todayIso(now);
}

// On update: an explicit value wins; moving a wishlist item forward stamps today; otherwise leave alone.
// Returns undefined when the column should not be touched.
export function appliedDateOnUpdate(existing, patch, now = new Date()) {
  if ('applied_date' in patch) return patch.applied_date;
  if (patch.status && patch.status !== 'wishlist' && !existing.applied_date) return todayIso(now);
  return undefined;
}
