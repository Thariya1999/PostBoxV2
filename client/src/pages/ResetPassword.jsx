import { useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorText } from '../api.js';
import PasswordInput from '../components/PasswordInput.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import { passwordProblem } from '../validation.js';

export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get('token') || '';
  const [form, setForm] = useState({ password: '', confirm: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  const passErr = submitted ? passwordProblem(form.password) : '';
  const confirmErr = submitted && form.confirm !== form.password ? 'Passwords do not match.' : '';

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (passwordProblem(form.password) || form.confirm !== form.password) return;
    setBusy(true);
    try {
      await api.post('/auth/reset-password', { token, password: form.password });
      setDone(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>Password updated</h1>
          <p className="muted">Log in with your new password. You were logged out on all other devices.</p>
          <Link className="btn primary wide linkbtn" to="/login">Log in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Choose a new password</h1>
        {error && (
          <div className="alert" role="alert">
            {error} <Link to="/forgot-password">Request a new link</Link>
          </div>
        )}
        <PasswordInput id="password" label="New password" autoComplete="new-password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} error={passErr}>
          <PasswordStrength password={form.password} />
        </PasswordInput>
        <PasswordInput id="confirm" label="Confirm new password" autoComplete="new-password" value={form.confirm}
          onChange={(e) => setForm({ ...form, confirm: e.target.value })} error={confirmErr} />
        <button className="btn primary wide" disabled={busy}>{busy ? 'Saving…' : 'Save new password'}</button>
      </form>
    </div>
  );
}
