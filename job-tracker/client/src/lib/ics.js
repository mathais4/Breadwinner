// iCalendar (.ics) export so interviews, closing dates and follow-ups land in Google/Outlook/Apple Calendar.

const pad = (n) => String(n).padStart(2, '0');
const utcStamp = (d) => `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`;
const dateOnly = (iso) => iso.replaceAll('-', '');
const nextDay = (iso) => {
  const d = new Date(Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10) + 1));
  return `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}`;
};

export const escapeText = (s) => String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');

// Lines longer than 75 octets must be folded: continue on a new line that starts with one space.
export function fold(line) {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const parts = [];
  let current = '';
  let bytes = 0;
  let limit = 75;
  for (const ch of line) {
    const size = enc.encode(ch).length;
    if (bytes + size > limit) {
      parts.push(current);
      current = '';
      bytes = 0;
      limit = 74; // continuation lines lose one octet to the leading space
    }
    current += ch;
    bytes += size;
  }
  parts.push(current);
  return parts.join('\r\n ');
}

// item: { uid, summary, description?, start (ISO datetime) | day ('YYYY-MM-DD'), minutes?, alarm? }
// alarm: an ISO 8601 duration like '-P1D' (1 day before) or '-PT1H'.
export function buildIcs(items, now = new Date()) {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Launchpad//Job Tracker//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const it of items) {
    lines.push('BEGIN:VEVENT', `UID:${it.uid}`, `DTSTAMP:${utcStamp(now)}`);
    if (it.day) {
      lines.push(`DTSTART;VALUE=DATE:${dateOnly(it.day)}`, `DTEND;VALUE=DATE:${nextDay(it.day)}`);
    } else {
      const start = new Date(it.start);
      lines.push(`DTSTART:${utcStamp(start)}`, `DTEND:${utcStamp(new Date(start.getTime() + (it.minutes ?? 60) * 60_000))}`);
    }
    lines.push(`SUMMARY:${escapeText(it.summary)}`);
    if (it.description) lines.push(`DESCRIPTION:${escapeText(it.description)}`);
    if (it.alarm) lines.push('BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${escapeText(it.summary)}`, `TRIGGER:${it.alarm}`, 'END:VALARM');
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(fold).join('\r\n')}\r\n`;
}

// Turn applications into calendar items: interviews, closing dates (wishlist) and follow-ups (applied).
export function calendarItems(apps) {
  const items = [];
  for (const a of apps) {
    const who = `${a.company} (${a.role})`;
    if (a.interview_date) {
      items.push({ uid: `app-${a.id}-interview@launchpad`, summary: `Interview: ${who}`, start: a.interview_date, minutes: 60, alarm: '-PT1H', description: [a.location, a.job_url].filter(Boolean).join('\n') });
    }
    if (a.status === 'wishlist' && a.deadline_date) {
      items.push({ uid: `app-${a.id}-deadline@launchpad`, summary: `Applications close: ${who}`, day: a.deadline_date, alarm: '-P1D', description: a.job_url || '' });
    }
    if (a.status === 'applied' && a.follow_up_date) {
      items.push({ uid: `app-${a.id}-followup@launchpad`, summary: `Follow up: ${who}`, day: a.follow_up_date });
    }
  }
  return items;
}
