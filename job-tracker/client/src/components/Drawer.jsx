import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { STATUSES, firstName, formatDateTime, statusLabel } from '../lib/constants.js';
import { addDays, daysFromToday, formatDay, localIso, relativeDay } from '../lib/dates.js';
import { EMAIL_KINDS, buildEmail, suggestedKind } from '../lib/emails.js';
import { buildIcs, calendarItems } from '../lib/ics.js';
import { checklistFor } from '../lib/prep.js';
import { copyText, saveText } from '../lib/files.js';
import { isAbort, useLocalStorage } from '../hooks.js';
import { useAuth } from '../auth.jsx';
import ErrorMessage from './ErrorMessage.jsx';
import Modal from './Modal.jsx';
import StatusBadge from './StatusBadge.jsx';
import { DeadlineChip } from './Visuals.jsx';

const Fact = ({ label, children }) => (children ? <div className="fact"><dt>{label}</dt><dd>{children}</dd></div> : null);

export default function Drawer({ id, version, onClose, onEdit, onChanged, onDeleted, notify }) {
  const { user } = useAuth();
  const [app, setApp] = useState(null);
  const [events, setEvents] = useState([]);
  const [error, setError] = useState(null);
  const [kind, setKind] = useState('follow_up');
  const [showEmail, setShowEmail] = useState(false);
  const [checked, setChecked] = useLocalStorage('lp.checklists', {});

  useEffect(() => {
    const ctrl = new AbortController();
    Promise.all([api(`/api/applications/${id}`, { signal: ctrl.signal }), api(`/api/applications/${id}/events`, { signal: ctrl.signal })])
      .then(([a, e]) => {
        setApp(a);
        setEvents(e.data);
        setKind(suggestedKind(a.status));
        setError(null);
      })
      .catch((err) => !isAbort(err) && setError(err));
    return () => ctrl.abort();
  }, [id, version]);

  const email = useMemo(() => (app ? buildEmail(kind, app, user?.display_name || firstName(user)) : null), [app, kind, user]);

  async function patch(changes, message) {
    try {
      await api(`/api/applications/${id}`, { method: 'PATCH', body: changes });
      if (message) notify(message);
      onChanged();
    } catch (err) {
      setError(err);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete ${app.company} - ${app.role}? This can't be undone.`)) return;
    try {
      await api(`/api/applications/${id}`, { method: 'DELETE' });
      onDeleted();
    } catch (err) {
      setError(err);
    }
  }

  const toggle = (item) => setChecked((c) => ({ ...c, [`${id}:${item}`]: !c[`${id}:${item}`] }));

  if (!app) {
    return (
      <Modal onClose={onClose} label="Application details" className="drawer">
        <div className="sheet">{error ? <ErrorMessage error={error} /> : <p className="muted">Loading…</p>}<button className="btn ghost" onClick={onClose}>Close</button></div>
      </Modal>
    );
  }

  const today = localIso();
  const items = checklistFor(app.status);
  const closing = app.status === 'wishlist' && app.deadline_date ? daysFromToday(app.deadline_date) : null;
  const followUpIn = app.follow_up_date ? daysFromToday(app.follow_up_date) : null;

  return (
    <Modal onClose={onClose} label={`${app.company}, ${app.role}`} className="drawer">
      <div className="sheet">
        <header className="drawer-head">
          <div>
            <h2>{app.company}</h2>
            <p className="muted">{app.role}</p>
          </div>
          <button className="btn ghost small" onClick={onClose} aria-label="Close details">Close</button>
        </header>

        <div className="drawer-status">
          <StatusBadge status={app.status} />
          <label className="inline">Move to
            <select value={app.status} onChange={(e) => patch({ status: e.target.value }, `Moved to ${statusLabel(e.target.value)}`)}>
              {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
          </label>
        </div>
        {closing !== null && <p><DeadlineChip iso={app.deadline_date} daysLeft={closing} /></p>}
        <ErrorMessage error={error} />

        <dl className="facts">
          <Fact label="Location">{app.location}</Fact>
          <Fact label="Source">{app.source}</Fact>
          <Fact label="Salary">{app.salary}</Fact>
          <Fact label="Contact">{app.contact_name}</Fact>
          <Fact label="Applied">{app.applied_date && `${formatDay(app.applied_date, true)} (${relativeDay(daysFromToday(app.applied_date))})`}</Fact>
          <Fact label="Closing date">{app.deadline_date && formatDay(app.deadline_date, true)}</Fact>
          <Fact label="Follow up">{app.follow_up_date && `${formatDay(app.follow_up_date, true)} (${relativeDay(followUpIn)})`}</Fact>
          <Fact label="Interview">{app.interview_date && formatDateTime(app.interview_date)}</Fact>
          <Fact label="Link">{app.job_url && <a href={app.job_url} target="_blank" rel="noreferrer noopener">Open job posting</a>}</Fact>
        </dl>
        {app.notes && <p className="notes-full">{app.notes}</p>}

        <div className="drawer-actions">
          <button className="btn primary small" onClick={() => onEdit(app)}>Edit</button>
          {app.status === 'applied' && (
            <button className="btn ghost small" onClick={() => patch({ follow_up_date: addDays(today, 7) }, 'Reminder set for next week')}>Remind me in a week</button>
          )}
          <button className="btn ghost small" onClick={() => setShowEmail((v) => !v)} aria-expanded={showEmail}>Draft email</button>
          {calendarItems([app]).length > 0 && (
            <button className="btn ghost small" onClick={() => saveText(`${app.company}.ics`, buildIcs(calendarItems([app])), 'text/calendar')}>Add to calendar</button>
          )}
          <button className="btn ghost small danger" onClick={remove}>Delete</button>
        </div>

        {showEmail && email && (
          <section className="email-box">
            <label>Template
              <select value={kind} onChange={(e) => setKind(e.target.value)}>{EMAIL_KINDS.map((k) => <option key={k.value} value={k.value}>{k.label}</option>)}</select>
            </label>
            <p className="small"><strong>Subject:</strong> {email.subject}</p>
            <textarea readOnly rows={9} value={email.body} aria-label="Email body" onFocus={(e) => e.target.select()} />
            <div className="actions">
              <button className="btn ghost small" onClick={async () => notify((await copyText(`Subject: ${email.subject}\n\n${email.body}`)) ? 'Email copied' : 'Copy blocked: select the text instead')}>Copy</button>
            </div>
          </section>
        )}

        {items.length > 0 && (
          <section>
            <h3>Prep checklist</h3>
            <ul className="checklist">
              {items.map((item) => (
                <li key={item}><label className="check"><input type="checkbox" checked={Boolean(checked[`${id}:${item}`])} onChange={() => toggle(item)} />{item}</label></li>
              ))}
            </ul>
          </section>
        )}

        <section>
          <h3>History</h3>
          <ol className="timeline">
            {[...events].reverse().map((e) => (
              <li key={e.id}>
                <span className="dot" aria-hidden="true" />
                <span>{e.type === 'created' ? `Added as ${statusLabel(e.to_status)}` : `${statusLabel(e.from_status)} → ${statusLabel(e.to_status)}`}</span>
                <span className="muted small">{formatDateTime(e.created_at)}</span>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </Modal>
  );
}
