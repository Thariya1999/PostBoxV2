import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorText } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Field from '../components/Field.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import ResendVerification from '../components/ResendVerification.jsx';
import { emailProblem } from '../validation.js';

export default function Login() {
  const { saveSession } = useApp();
  const [form, setForm] = useState({ email: '', password: '' });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [unverified, setUnverified] = useState('');
  const [busy, setBusy] = useState(false);

  const emailErr = submitted ? emailProblem(form.email) : '';
  const passErr = submitted && !form.password ? 'Enter your password.' : '';

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    setUnverified('');
    if (emailProblem(form.email) || !form.password) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/login', form);
      saveSession(data);
    } catch (err) {
      setError(errorText(err));
      if (err.response?.data?.code === 'EMAIL_NOT_VERIFIED') setUnverified(err.response.data.email);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Log in to Postbox</h1>
        <p className="muted">See your messages and who has read yours.</p>
        {error && <div className="alert" role="alert">{error}</div>}
        {unverified && <ResendVerification email={unverified} />}

        <Field id="email" label="Email" error={emailErr}>
          <input id="email" type="email" autoComplete="email" autoFocus value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            aria-invalid={!!emailErr} aria-describedby={emailErr ? 'email-error' : undefined} />
        </Field>
        <PasswordInput id="password" label="Password" autoComplete="current-password" value={form.password}
          onChange={(e) => setForm({ ...form, password: e.target.value })} error={passErr} />
        <p className="forgot"><Link to="/forgot-password">Forgot password?</Link></p>

        <button className="btn primary wide" disabled={busy}>{busy ? 'Logging in…' : 'Log in'}</button>
        <p className="muted center">New here? <Link to="/register">Create an account</Link></p>
      </form>
    </div>
  );
}
