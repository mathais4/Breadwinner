import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../auth.jsx';
import { TARGET_COMPANIES, firstName, formatDateTime } from '../lib/constants.js';
import { buildIcs, calendarItems } from '../lib/ics.js';
import { saveText } from '../lib/files.js';
import { formatDay, weekdayLong, localIso } from '../lib/dates.js';
import { isAbort } from '../hooks.js';
import { useWorkspace } from '../workspace.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import { DeadlineChip, Funnel, ProgressRing, WeeklyBars } from '../components/Visuals.jsx';

const greeting = (hour) => (hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening');
const pct = (n) => `${Math.round(n * 100)}%`;

export default function Dashboard() {
  const { user } = useAuth();
  const { version, openApplication, openEditor, notify } = useWorkspace();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api('/api/dashboard', { signal: ctrl.signal }).then((d) => { setData(d); setError(null); }).catch((e) => !isAbort(e) && setError(e));
    return () => ctrl.abort();
  }, [version]);

  async function exportCalendar() {
    try {
      const { data: apps } = await api('/api/applications?limit=200');
      const items = calendarItems(apps);
      if (!items.length) return notify('Nothing to add yet: set a closing date, follow-up or interview first');
      saveText('launchpad.ics', buildIcs(items), 'text/calendar');
      notify(`Calendar file saved with ${items.length} event${items.length === 1 ? '' : 's'}`);
    } catch (e) {
      notify(e.message);
    }
  }

  if (error) return <ErrorMessage error={error} />;
  if (!data) return <p className="muted">Loading…</p>;

  const now = new Date();
  const name = firstName(user);
  const { goal } = data;
  const attention = data.deadlines.length + data.followUps.length + data.upcomingInterviews.length;

  return (
    <>
      <section className="hero card">
        <div className="hero-text">
          <p className="muted small">{weekdayLong(localIso(now))} {formatDay(localIso(now))}</p>
          <h1>{greeting(now.getHours())}{name ? `, ${name}` : ''}</h1>
          <p className="muted">
            {goal.thisWeek >= goal.target
              ? `You've hit your goal of ${goal.target} this week. Anything more is a bonus.`
              : `${goal.target - goal.thisWeek} more application${goal.target - goal.thisWeek === 1 ? '' : 's'} to hit this week's goal.`}
            {goal.streak > 0 && ` ${goal.streak}-week streak.`}
          </p>
          <div className="row-actions">
            <button className="btn primary" onClick={() => openEditor()}>+ New application</button>
            <button className="btn ghost" onClick={exportCalendar}>Add dates to calendar</button>
          </div>
        </div>
        <ProgressRing value={goal.thisWeek} max={goal.target} label="applications this week" sub="this week" />
      </section>

      {data.total === 0 && (
        <section className="card">
          <h2>Start with companies on your radar</h2>
          <p className="muted">Tap one to add it to your wishlist. Check each company's own site for what is open and when it closes.</p>
          <div className="chips">
            {TARGET_COMPANIES.map((c) => (
              <button key={c} className="chip-btn" onClick={() => openEditor(null, { company: c, status: 'wishlist' })}>{c}</button>
            ))}
          </div>
        </section>
      )}

      <section className="card attention" aria-labelledby="att">
        <h2 id="att">Needs attention</h2>
        {attention === 0 ? (
          <p className="muted">Nothing urgent right now. A good moment to work through your wishlist.</p>
        ) : (
          <ul className="list">
            {data.deadlines.map((d) => (
              <li key={`d${d.id}`}>
                <button className="row-link" onClick={() => openApplication(d.id)}><strong>{d.company}</strong> · {d.role}</button>
                <DeadlineChip iso={d.deadline_date} daysLeft={d.daysLeft} />
              </li>
            ))}
            {data.followUps.map((f) => (
              <li key={`f${f.id}`}>
                <button className="row-link" onClick={() => openApplication(f.id)}><strong>{f.company}</strong> · {f.role}</button>
                <span className="chip chip-warm">{f.reason === 'due' ? `Follow up ${f.daysOverdue === 0 ? 'due today' : `overdue by ${f.daysOverdue}d`}` : `No reply in ${f.daysQuiet} days`}</span>
              </li>
            ))}
            {data.upcomingInterviews.map((i) => (
              <li key={`i${i.id}`}>
                <button className="row-link" onClick={() => openApplication(i.id)}><strong>{i.company}</strong> · {i.role}</button>
                <span className="chip chip-cool">Interview {formatDateTime(i.interview_date)}</span>
              </li>
            ))}
          </ul>
        )}
        {data.missedDeadlines > 0 && <p className="muted small">{data.missedDeadlines} wishlist role{data.missedDeadlines === 1 ? ' has' : 's have'} passed their closing date. Move or delete them to keep this list honest.</p>}
      </section>

      <div className="grid-2">
        <section className="card">
          <h2>Your funnel</h2>
          <Funnel funnel={data.funnel} />
          <dl className="mini-stats">
            <div><dt>Heard back</dt><dd>{data.responseRate === null ? '-' : pct(data.responseRate)}</dd></div>
            <div><dt>Avg. reply time</dt><dd>{data.avgDaysToResponse === null ? '-' : `${data.avgDaysToResponse} days`}</dd></div>
            <div><dt>Wishlist</dt><dd>{data.byStatus.wishlist}</dd></div>
          </dl>
        </section>
        <section className="card">
          <h2>Applications per week</h2>
          <WeeklyBars weekly={data.weekly} goal={goal.target} />
        </section>
      </div>

      <section className="card">
        <h2>Recent activity</h2>
        {data.recent.length === 0 ? <p className="muted">No applications yet.</p> : (
          <ul className="list">
            {data.recent.map((a) => (
              <li key={a.id}><button className="row-link" onClick={() => openApplication(a.id)}><strong>{a.company}</strong> · {a.role}</button><StatusBadge status={a.status} /></li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
