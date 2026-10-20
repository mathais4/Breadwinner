import { useState } from 'react';
import { api } from '../api.js';
import { LOCATIONS, SOURCES, STATUSES, toLocalInput } from '../lib/constants.js';
import { localIso } from '../lib/dates.js';
import ErrorMessage from './ErrorMessage.jsx';
import Modal from './Modal.jsx';

// Create (no `application`) or edit. `preset` pre-fills a new application (e.g. a quick-add company).
export default function ApplicationForm({ application, preset, onSaved, onCancel }) {
  const start = application ?? preset ?? {};
  const [form, setForm] = useState(() => {
    const status = start.status ?? 'applied';
    return {
      company: start.company ?? '',
      role: start.role ?? '',
      status,
      source: start.source ?? '',
      location: start.location ?? '',
      salary: start.salary ?? '',
      job_url: start.job_url ?? '',
      contact_name: start.contact_name ?? '',
      applied_date: start.applied_date ?? (application || status === 'wishlist' ? '' : localIso()),
      deadline_date: start.deadline_date ?? '',
      follow_up_date: start.follow_up_date ?? '',
      interview_date: toLocalInput(start.interview_date),
      notes: start.notes ?? '',
    };
  });
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setStatus = (e) => {
    const status = e.target.value;
    // Moving a wishlist role forward means you've applied today, unless you already set a date.
    setForm((f) => ({ ...f, status, applied_date: status !== 'wishlist' && !f.applied_date ? localIso() : f.applied_date }));
  };

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    const body = { ...form, interview_date: form.interview_date ? new Date(form.interview_date).toISOString() : null };
    try {
      const saved = application
        ? await api(`/api/applications/${application.id}`, { method: 'PATCH', body })
        : await api('/api/applications', { method: 'POST', body });
      onSaved(saved, !application);
    } catch (err) {
      setError(err);
      setBusy(false);
    }
  }

  return (
    <Modal onClose={onCancel} label={application ? 'Edit application' : 'New application'}>
      <form className="sheet" onSubmit={submit}>
        <h2>{application ? 'Edit application' : 'New application'}</h2>
        <div className="row">
          <label>Company<input value={form.company} onChange={set('company')} required maxLength={200} autoFocus /></label>
          <label>Role<input value={form.role} onChange={set('role')} required maxLength={200} placeholder="e.g. Graduate Software Engineer" /></label>
        </div>
        <div className="row">
          <label>Status
            <select value={form.status} onChange={setStatus}>{STATUSES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}</select>
          </label>
          <label>Source
            <input value={form.source} onChange={set('source')} list="sources" maxLength={80} placeholder="Where you found it" />
          </label>
        </div>
        <div className="row">
          <label>Location<input value={form.location} onChange={set('location')} list="locations" maxLength={120} /></label>
          <label>Salary<input value={form.salary} onChange={set('salary')} maxLength={100} placeholder="e.g. €42,000" /></label>
        </div>
        <div className="row">
          <label>Closing date<input type="date" value={form.deadline_date} onChange={set('deadline_date')} /><small className="hint">When applications close</small></label>
          <label>Applied on<input type="date" value={form.applied_date} onChange={set('applied_date')} /></label>
        </div>
        <div className="row">
          <label>Follow up on<input type="date" value={form.follow_up_date} onChange={set('follow_up_date')} /></label>
          <label>Interview<input type="datetime-local" value={form.interview_date} onChange={set('interview_date')} /></label>
        </div>
        <div className="row">
          <label>Contact<input value={form.contact_name} onChange={set('contact_name')} maxLength={120} placeholder="Recruiter or hiring manager" /></label>
          <label>Job link<input type="url" value={form.job_url} onChange={set('job_url')} maxLength={2000} placeholder="https://" /></label>
        </div>
        <label>Notes<textarea rows={3} value={form.notes} onChange={set('notes')} maxLength={5000} /></label>
        <datalist id="sources">{SOURCES.map((s) => <option key={s} value={s} />)}</datalist>
        <datalist id="locations">{LOCATIONS.map((s) => <option key={s} value={s} />)}</datalist>
        <ErrorMessage error={error} />
        <div className="actions">
          <button type="button" className="btn ghost" onClick={onCancel}>Cancel</button>
          <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button>
        </div>
      </form>
    </Modal>
  );
}
