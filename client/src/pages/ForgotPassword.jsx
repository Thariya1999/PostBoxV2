import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorText } from '../api.js';
import Field from '../components/Field.jsx';
import { emailProblem } from '../validation.js';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const emailErr = submitted ? emailProblem(email) : '';

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (emailProblem(email)) return;
    setBusy(true);
    try {
      await api.post('/auth/forgot-password', { email });
      setSent(true);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth">
      {sent ? (
        <div className="auth-card">
          <h1>Check your email</h1>
          <p className="muted">If <strong>{email}</strong> has an account, we sent a link to reset the password. It works for 1 hour.</p>
          <Link className="btn primary wide linkbtn" to="/login">Back to log in</Link>
        </div>
      ) : (
        <form className="auth-card" onSubmit={submit} noValidate>
          <h1>Reset your password</h1>
          <p className="muted">Enter your email and we will send you a reset link.</p>
          {error && <div className="alert" role="alert">{error}</div>}
          <Field id="email" label="Email" error={emailErr}>
            <input id="email" type="email" autoComplete="email" autoFocus value={email}
              onChange={(e) => setEmail(e.target.value)} aria-invalid={!!emailErr} />
          </Field>
          <button className="btn primary wide" disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
          <p className="muted center"><Link to="/login">Back to log in</Link></p>
        </form>
      )}
    </div>
  );
}
