import { useState } from 'react';
import { apiBlob } from '../api.js';
import { useAuth } from '../auth.jsx';
import { saveBlob } from '../lib/files.js';
import { useWorkspace } from '../workspace.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function Settings() {
  const { user, updateProfile } = useAuth();
  const { notify, refresh } = useWorkspace();
  const [name, setName] = useState(user.display_name ?? '');
  const [goal, setGoal] = useState(user.weekly_goal);
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function save(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await updateProfile({ display_name: name, weekly_goal: Number(goal) });
      refresh();
      notify('Settings saved');
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <div className="page-head"><h1>Settings</h1></div>
      <form className="card settings" onSubmit={save}>
        <h2>Profile</h2>
        <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} /><small className="hint">Used in your greeting and signed onto email drafts.</small></label>
        <label>Weekly application goal
          <input type="number" min="1" max="100" value={goal} onChange={(e) => setGoal(e.target.value)} required />
          <small className="hint">Powers the ring and streak on your dashboard.</small>
        </label>
        <p className="muted small">Signed in as {user.email}</p>
        <ErrorMessage error={error} />
        <div className="actions"><button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Save'}</button></div>
      </form>

      <section className="card settings">
        <h2>Your data</h2>
        <p className="muted">Download everything you've tracked as a spreadsheet.</p>
        <button className="btn ghost" onClick={async () => { try { saveBlob('applications.csv', await apiBlob('/api/applications/export.csv')); } catch (e) { notify(e.message); } }}>Export CSV</button>
        <p className="muted small">Your CV text and interview stories live only in this browser (they never reach the server).</p>
      </section>

      <section className="card settings">
        <h2>Shortcuts</h2>
        <dl className="shortcuts">
          <div><dt><kbd>n</kbd></dt><dd>New application</dd></div>
          <div><dt><kbd>Ctrl</kbd> + <kbd>K</kbd></dt><dd>Search and jump anywhere</dd></div>
          <div><dt><kbd>Esc</kbd></dt><dd>Close the open panel</dd></div>
        </dl>
      </section>
    </>
  );
}
