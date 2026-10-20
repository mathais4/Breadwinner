// Everything the dashboard shows, computed from plain rows. No database access, so it's unit tested.
//
// Dates are 'YYYY-MM-DD' strings (see the DATE type parser in db.js); timestamps may be Dates or ISO strings.
// "Today" is taken in UTC. For an Irish user that can be an hour off around midnight in summer, which is
// irrelevant for day-level reminders.

const DAY = 86_400_000;
const RESPONSE = new Set(['interview', 'offer', 'rejected']);

export const STALE_DAYS = 14; // applied this long ago with no follow-up date set => suggest chasing

const toUtcDay = (iso) => Date.UTC(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
export const isoDay = (value) => new Date(value).toISOString().slice(0, 10);
export const daysBetween = (fromIso, toIso) => Math.round((toUtcDay(toIso) - toUtcDay(fromIso)) / DAY);
export const addDays = (iso, n) => new Date(toUtcDay(iso) + n * DAY).toISOString().slice(0, 10);
// Weeks start on Monday.
export const weekStart = (iso) => addDays(iso, -((new Date(toUtcDay(iso)).getUTCDay() + 6) % 7));

export function weeklyCounts(apps, today, weeks = 8) {
  const thisWeek = weekStart(today);
  const buckets = Array.from({ length: weeks }, (_, i) => ({ weekStart: addDays(thisWeek, -7 * (weeks - 1 - i)), count: 0 }));
  const index = new Map(buckets.map((b, i) => [b.weekStart, i]));
  for (const a of apps) {
    if (!a.applied_date) continue;
    const i = index.get(weekStart(a.applied_date));
    if (i !== undefined) buckets[i].count += 1;
  }
  return buckets;
}

// Consecutive weeks (ending now) that met the goal. The current week is still in progress, so
// missing the goal so far this week doesn't break a streak: it just isn't counted yet.
export function goalStreak(weekly, goal) {
  let i = weekly.length - 1;
  if (i >= 0 && weekly[i].count < goal) i -= 1;
  let streak = 0;
  while (i >= 0 && weekly[i].count >= goal) {
    streak += 1;
    i -= 1;
  }
  return streak;
}

export function computeInsights({ apps, events, weeklyGoal = 5, now = new Date() }) {
  const today = isoDay(now);

  const byStatus = { wishlist: 0, applied: 0, interview: 0, offer: 0, rejected: 0 };
  for (const a of apps) byStatus[a.status] += 1;

  const eventsByApp = new Map();
  for (const e of events) {
    if (!eventsByApp.has(e.application_id)) eventsByApp.set(e.application_id, []);
    eventsByApp.get(e.application_id).push(e);
  }
  const reached = (a, ...statuses) => (eventsByApp.get(a.id) || []).some((e) => statuses.includes(e.to_status));

  // Funnel. Offers count as having reached the interview stage.
  const submitted = apps.filter((a) => a.status !== 'wishlist');
  const gotInterview = submitted.filter((a) => a.status === 'interview' || a.status === 'offer' || reached(a, 'interview', 'offer'));
  const gotOffer = submitted.filter((a) => a.status === 'offer' || reached(a, 'offer'));
  const responded = submitted.filter((a) => RESPONSE.has(a.status) || reached(a, ...RESPONSE));

  // Average days from applying to the first reply (interview, offer or rejection).
  const gaps = [];
  for (const a of submitted) {
    if (!a.applied_date) continue;
    const first = (eventsByApp.get(a.id) || [])
      .filter((e) => e.type === 'status_change' && RESPONSE.has(e.to_status))
      .map((e) => isoDay(e.created_at))
      .sort()[0];
    if (first) gaps.push(Math.max(0, daysBetween(a.applied_date, first)));
  }

  const weekly = weeklyCounts(apps, today);

  // Who needs chasing: an explicit follow-up date that has arrived, or applications gone quiet.
  const followUps = [];
  for (const a of apps) {
    if (a.status !== 'applied') continue;
    if (a.follow_up_date && a.follow_up_date <= today) {
      followUps.push({ id: a.id, company: a.company, role: a.role, reason: 'due', daysOverdue: daysBetween(a.follow_up_date, today) });
    } else if (!a.follow_up_date && a.applied_date && daysBetween(a.applied_date, today) >= STALE_DAYS) {
      followUps.push({ id: a.id, company: a.company, role: a.role, reason: 'stale', daysQuiet: daysBetween(a.applied_date, today) });
    }
  }
  followUps.sort((x, y) => (x.reason === y.reason ? (y.daysOverdue ?? y.daysQuiet) - (x.daysOverdue ?? x.daysQuiet) : x.reason === 'due' ? -1 : 1));

  // Closing dates for roles you haven't applied to yet.
  const withDeadline = apps
    .filter((a) => a.status === 'wishlist' && a.deadline_date)
    .map((a) => ({ id: a.id, company: a.company, role: a.role, deadline_date: a.deadline_date, daysLeft: daysBetween(today, a.deadline_date) }));
  const deadlines = withDeadline.filter((d) => d.daysLeft >= 0 && d.daysLeft <= 30).sort((x, y) => x.daysLeft - y.daysLeft);

  const upcomingInterviews = apps
    .filter((a) => a.interview_date && new Date(a.interview_date) >= now)
    .sort((x, y) => new Date(x.interview_date) - new Date(y.interview_date))
    .slice(0, 5)
    .map((a) => ({ id: a.id, company: a.company, role: a.role, status: a.status, interview_date: a.interview_date }));

  const recent = [...apps]
    .sort((x, y) => new Date(y.updated_at) - new Date(x.updated_at))
    .slice(0, 5)
    .map((a) => ({ id: a.id, company: a.company, role: a.role, status: a.status, updated_at: a.updated_at }));

  return {
    total: apps.length,
    byStatus,
    goal: { target: weeklyGoal, thisWeek: weekly[weekly.length - 1].count, streak: goalStreak(weekly, weeklyGoal) },
    weekly,
    funnel: { applied: submitted.length, interview: gotInterview.length, offer: gotOffer.length },
    responseRate: submitted.length ? responded.length / submitted.length : null,
    avgDaysToResponse: gaps.length ? Math.round((gaps.reduce((s, n) => s + n, 0) / gaps.length) * 10) / 10 : null,
    followUps,
    deadlines,
    missedDeadlines: withDeadline.filter((d) => d.daysLeft < 0).length,
    upcomingInterviews,
    recent,
  };
}
