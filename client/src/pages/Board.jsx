import { useCallback, useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { STATUSES, formatDateTime, statusLabel } from '../lib/constants.js';
import { daysFromToday, formatDay, localIso } from '../lib/dates.js';
import { isAbort } from '../hooks.js';
import { useWorkspace } from '../workspace.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { DeadlineChip } from '../components/Visuals.jsx';

const byDeadline = (a, b) => (a.deadline_date || '9999').localeCompare(b.deadline_date || '9999');
const byUpdated = (a, b) => new Date(b.updated_at) - new Date(a.updated_at);

export default function Board() {
  const { version, openApplication, openEditor, notify } = useWorkspace();
  const [apps, setApps] = useState(null);
  const [total, setTotal] = useState(0);
  const [error, setError] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [overCol, setOverCol] = useState(null);

  useEffect(() => {
    const ctrl = new AbortController();
    api('/api/applications?limit=200&sort=updated_at', { signal: ctrl.signal })
      .then((d) => { setApps(d.data); setTotal(d.total); setError(null); })
      .catch((e) => !isAbort(e) && setError(e));
    return () => ctrl.abort();
  }, [version]);

  const columns = useMemo(() => {
    const groups = Object.fromEntries(STATUSES.map((s) => [s.value, []]));
    for (const a of apps || []) groups[a.status].push(a);
    groups.wishlist.sort(byDeadline);
    for (const s of ['applied', 'interview', 'offer', 'rejected']) groups[s].sort(byUpdated);
    return groups;
  }, [apps]);

  // Optimistic move: update the card immediately, roll back if the server refuses.
  const move = useCallback(async (app, status) => {
    if (app.status === status) return;
    const before = apps;
    setApps((list) => list.map((a) => (a.id === app.id ? { ...a, status } : a)));
    try {
      const saved = await api(`/api/applications/${app.id}`, { method: 'PATCH', body: { status } });
      setApps((list) => list.map((a) => (a.id === saved.id ? saved : a)));
      notify(`${app.company} moved to ${statusLabel(status)}`);
    } catch (e) {
      setApps(before);
      notify(`Couldn't move ${app.company}: ${e.message}`);
    }
  }, [apps, notify]);

  if (error) return <ErrorMessage error={error} />;
  if (!apps) return <p className="muted">Loading…</p>;
  const today = localIso();

  return (
    <>
      <div className="page-head">
        <h1>Board</h1>
        <button className="btn primary" onClick={() => openEditor()}>+ New application</button>
      </div>
      {total > apps.length && <p className="muted small">Showing your {apps.length} most recently updated of {total} applications.</p>}
      {apps.length === 0 && <div className="card center muted">Nothing here yet. Press <kbd>n</kbd> to add your first application.</div>}

      <div className="board">
        {STATUSES.map((s) => (
          <section
            key={s.value}
            className={`column ${overCol === s.value ? 'over' : ''}`}
            aria-label={`${s.label}, ${columns[s.value].length} applications`}
            onDragOver={(e) => { if (dragId) { e.preventDefault(); setOverCol(s.value); } }}
            onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget)) setOverCol(null); }}
            onDrop={(e) => {
              e.preventDefault();
              setOverCol(null);
              const app = apps.find((a) => a.id === dragId);
              setDragId(null);
              if (app) move(app, s.value);
            }}
          >
            <h2><span className={`dot dot-${s.value}`} aria-hidden="true" />{s.label}<span className="count">{columns[s.value].length}</span></h2>
            {columns[s.value].map((a) => (
              <article key={a.id} className={`kcard ${dragId === a.id ? 'dragging' : ''}`} draggable onDragStart={(e) => { setDragId(a.id); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(a.id)); }} onDragEnd={() => { setDragId(null); setOverCol(null); }}>
                <button className="kcard-main" onClick={() => openApplication(a.id)}>
                  <strong>{a.company}</strong>
                  <span className="muted">{a.role}</span>
                  {a.location && <span className="muted small">{a.location}</span>}
                  {a.status === 'wishlist' && a.deadline_date && <DeadlineChip iso={a.deadline_date} daysLeft={daysFromToday(a.deadline_date)} />}
                  {a.status === 'applied' && a.follow_up_date && a.follow_up_date <= today && <span className="chip chip-warm">Follow up due</span>}
                  {a.status === 'applied' && a.applied_date && !a.follow_up_date && <span className="chip chip-cool">Applied {formatDay(a.applied_date)}</span>}
                  {a.interview_date && new Date(a.interview_date) >= new Date() && <span className="chip chip-cool">{formatDateTime(a.interview_date)}</span>}
                </button>
                <label className="move">Move to
                  <select value={a.status} onChange={(e) => move(a, e.target.value)}>{STATUSES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>
                </label>
              </article>
            ))}
          </section>
        ))}
      </div>
    </>
  );
}
