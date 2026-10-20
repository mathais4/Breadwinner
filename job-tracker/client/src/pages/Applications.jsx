import { useEffect, useState } from 'react';
import { api, apiBlob } from '../api.js';
import { SORT_OPTIONS, STATUSES, formatDateTime } from '../lib/constants.js';
import { daysFromToday, formatDay } from '../lib/dates.js';
import { buildIcs, calendarItems } from '../lib/ics.js';
import { saveBlob, saveText } from '../lib/files.js';
import { isAbort, useDebounced } from '../hooks.js';
import { useWorkspace } from '../workspace.jsx';
import StatusBadge from '../components/StatusBadge.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import { DeadlineChip } from '../components/Visuals.jsx';

export default function Applications() {
  const { version, openApplication, openEditor, notify } = useWorkspace();
  const [search, setSearch] = useState('');
  const q = useDebounced(search.trim(), 300);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('created_at');
  const [order, setOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => setPage(1), [q, status, sort, order]);

  useEffect(() => {
    const ctrl = new AbortController();
    const params = new URLSearchParams({ page, limit: 10, sort, order });
    if (q) params.set('q', q);
    if (status) params.set('status', status);
    api(`/api/applications?${params}`, { signal: ctrl.signal })
      .then((d) => { setResult(d); setError(null); })
      .catch((e) => !isAbort(e) && setError(e));
    return () => ctrl.abort();
  }, [q, status, sort, order, page, version]);

  async function exportCsv() {
    try {
      saveBlob('applications.csv', await apiBlob('/api/applications/export.csv'));
    } catch (e) {
      notify(e.message);
    }
  }
  async function exportCalendar() {
    try {
      const { data } = await api('/api/applications?limit=200');
      const items = calendarItems(data);
      if (!items.length) return notify('No interviews, closing dates or follow-ups to add yet');
      saveText('launchpad.ics', buildIcs(items), 'text/calendar');
    } catch (e) {
      notify(e.message);
    }
  }

  return (
    <>
      <div className="page-head">
        <h1>Applications</h1>
        <div className="row-actions">
          <button className="btn ghost" onClick={exportCalendar}>Calendar (.ics)</button>
          <button className="btn ghost" onClick={exportCsv}>Export CSV</button>
          <button className="btn primary" onClick={() => openEditor()}>+ New application</button>
        </div>
      </div>

      <div className="filters">
        <input type="search" placeholder="Search company, role, location, notes…" aria-label="Search applications" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Filter by status">
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort by">
          {SORT_OPTIONS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
        </select>
        <button className="btn ghost" onClick={() => setOrder(order === 'desc' ? 'asc' : 'desc')} aria-label={`Order: ${order === 'desc' ? 'descending' : 'ascending'}. Click to reverse`}>{order === 'desc' ? '↓' : '↑'}</button>
      </div>

      <ErrorMessage error={error} />

      {!result ? (
        <p className="muted">Loading…</p>
      ) : result.data.length === 0 ? (
        <div className="card center muted">{q || status ? 'No applications match those filters.' : 'No applications yet. Press n to add one.'}</div>
      ) : (
        <div className="card table-wrap">
          <table>
            <thead>
              <tr><th>Company</th><th>Role</th><th>Status</th><th>Key date</th><th>Location</th><th /></tr>
            </thead>
            <tbody>
              {result.data.map((a) => (
                <tr key={a.id}>
                  <td><button className="row-link" onClick={() => openApplication(a.id)}><strong>{a.company}</strong></button></td>
                  <td>{a.role}</td>
                  <td><StatusBadge status={a.status} /></td>
                  <td className="nowrap">
                    {a.status === 'wishlist' && a.deadline_date ? <DeadlineChip iso={a.deadline_date} daysLeft={daysFromToday(a.deadline_date)} />
                      : a.interview_date ? formatDateTime(a.interview_date)
                      : a.applied_date ? `Applied ${formatDay(a.applied_date)}` : <span className="muted">-</span>}
                  </td>
                  <td className="muted">{a.location}</td>
                  <td className="nowrap"><button className="btn ghost small" onClick={() => openEditor(a)}>Edit</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {result && result.totalPages > 1 && (
        <div className="pager">
          <button className="btn ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>← Prev</button>
          <span className="muted small">Page {result.page} of {result.totalPages} · {result.total} total</span>
          <button className="btn ghost" disabled={page >= result.totalPages} onClick={() => setPage(page + 1)}>Next →</button>
        </div>
      )}
    </>
  );
}
