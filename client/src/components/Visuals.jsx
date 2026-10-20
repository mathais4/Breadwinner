// Small presentational components (no data fetching, no router): easy to render in isolation.
import { formatDay, relativeDay } from '../lib/dates.js';

// Circular progress, e.g. "3 of 5 applications this week".
export function ProgressRing({ value, max, size = 132, label, sub }) {
  const stroke = 12;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = max > 0 ? Math.min(1, value / max) : 0;
  const done = max > 0 && value >= max;
  return (
    <figure className={`ring ${done ? 'done' : ''}`} style={{ width: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${value} of ${max}${label ? ` ${label}` : ''}`}>
        <circle cx={size / 2} cy={size / 2} r={r} className="ring-track" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} className="ring-fill" strokeWidth={stroke} fill="none"
          strokeDasharray={c} strokeDashoffset={c * (1 - pct)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
        <text x="50%" y="50%" textAnchor="middle" dominantBaseline="central" className="ring-num">{value}<tspan className="ring-of">/{max}</tspan></text>
      </svg>
      {sub && <figcaption>{sub}</figcaption>}
    </figure>
  );
}

// Applied -> interview -> offer, each bar sized against "applied".
export function Funnel({ funnel }) {
  const base = Math.max(1, funnel.applied);
  const rows = [['Applied', funnel.applied], ['Interview', funnel.interview], ['Offer', funnel.offer]];
  return (
    <ul className="funnel">
      {rows.map(([label, n], i) => (
        <li key={label}>
          <span className="funnel-label">{label}</span>
          <span className="funnel-bar"><span className={`funnel-fill f${i}`} style={{ width: `${(n / base) * 100}%` }} /></span>
          <span className="funnel-n">{n}{i > 0 && funnel.applied > 0 && <small> {Math.round((n / funnel.applied) * 100)}%</small>}</span>
        </li>
      ))}
    </ul>
  );
}

// Applications sent per week for the last N weeks, with the weekly goal as a dashed line.
export function WeeklyBars({ weekly, goal }) {
  const max = Math.max(goal, ...weekly.map((w) => w.count), 1);
  return (
    <div className="weekly" role="img" aria-label={`Applications per week: ${weekly.map((w) => w.count).join(', ')}. Goal ${goal}.`}>
      <div className="weekly-goal" style={{ bottom: `${(goal / max) * 100}%` }}><span>goal {goal}</span></div>
      {weekly.map((w, i) => (
        <div className="weekly-col" key={w.weekStart}>
          <span className="weekly-n">{w.count}</span>
          <span className={`weekly-bar ${w.count >= goal ? 'met' : ''} ${i === weekly.length - 1 ? 'current' : ''}`} style={{ height: `${(w.count / max) * 100}%` }} />
          <span className="weekly-label">{formatDay(w.weekStart)}</span>
        </div>
      ))}
    </div>
  );
}

// "Closes in 3 days" chip. Urgency drives the colour.
export function DeadlineChip({ iso, daysLeft, prefix = 'Closes' }) {
  if (!iso) return null;
  const tone = daysLeft < 0 ? 'late' : daysLeft <= 3 ? 'hot' : daysLeft <= 7 ? 'warm' : 'cool';
  return <span className={`chip chip-${tone}`}>{daysLeft < 0 ? 'Closed' : prefix} {formatDay(iso)} · {relativeDay(daysLeft)}</span>;
}
