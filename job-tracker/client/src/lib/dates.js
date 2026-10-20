// Day-level date helpers. Application dates are plain 'YYYY-MM-DD' strings, so everything here works in
// calendar days and never goes through time zones (which is how "tomorrow" turns into "today").
const DAY = 86_400_000;
const utc = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));

// The user's own calendar day (local time), as YYYY-MM-DD.
export const localIso = (date = new Date()) => {
  const p = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${p(date.getMonth() + 1)}-${p(date.getDate())}`;
};

export const addDays = (iso, n) => new Date(utc(iso) + n * DAY).toISOString().slice(0, 10);
export const daysBetween = (fromIso, toIso) => Math.round((utc(toIso) - utc(fromIso)) / DAY);
export const daysFromToday = (iso, now = new Date()) => daysBetween(localIso(now), iso);

export const formatDay = (iso, withYear = false) =>
  iso
    ? new Date(utc(iso)).toLocaleDateString('en-IE', { day: 'numeric', month: 'short', ...(withYear && { year: 'numeric' }), timeZone: 'UTC' })
    : '';

export function relativeDay(n) {
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}

export const weekdayLong = (iso) => new Date(utc(iso)).toLocaleDateString('en-IE', { weekday: 'long', timeZone: 'UTC' });
