import { useState } from 'react';
import { useAuth } from '../auth.jsx';
import { APP_NAME, COHORT } from '../lib/constants.js';
import ErrorMessage from '../components/ErrorMessage.jsx';

export default function AuthPage() {
  const { authenticate } = useAuth();
  const [mode, setMode] = useState('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      await authenticate(mode, email, password, name);
    } catch (err) {
      setError(err);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="auth-wrap">
      <div className="card auth-card">
        <p className="brand">{APP_NAME}</p>
        <p className="cohort">{COHORT}</p>
        <h1>{mode === 'login' ? 'Welcome back' : 'Create your account'}</h1>
        <p className="muted">Closing dates, follow-ups and interviews, all in one place.</p>
        <form onSubmit={submit}>
          {mode === 'register' && (
            <label>Your name<input value={name} onChange={(e) => setName(e.target.value)} maxLength={60} autoComplete="name" /></label>
          )}
          <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus autoComplete="email" /></label>
          <label>Password
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={mode === 'register' ? 8 : undefined} required autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
            {mode === 'register' && <small className="hint">At least 8 characters</small>}
          </label>
          <ErrorMessage error={error} />
          <button className="btn primary block" disabled={busy}>{busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Sign up'}</button>
        </form>
        <p className="small center">
          {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
          <button className="link" type="button" onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null); }}>
            {mode === 'login' ? 'Sign up' : 'Log in'}
          </button>
        </p>
      </div>
    </div>
  );
}
