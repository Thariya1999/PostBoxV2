import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { errorText } from '../api.js';
import Field from '../components/Field.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import ResendVerification from '../components/ResendVerification.jsx';
import { emailProblem, nameProblem, passwordProblem } from '../validation.js';

export default function Register() {
  const [form, setForm] = useState({ name: '', email: '', password: '', confirm: '' });
  const [touched, setTouched] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(null); // { email, emailSent }

  const problems = {
    name: nameProblem(form.name),
    email: emailProblem(form.email),
    password: passwordProblem(form.password, form.email),
    confirm: !form.confirm ? 'Re-enter your password.' : form.confirm !== form.password ? 'Passwords do not match.' : '',
  };
  const err = (k) => serverErrors[k] || (touched[k] || submitted ? problems[k] : '');
  const set = (k) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setServerErrors((s) => ({ ...s, [k]: '' }));
  };
  const blur = (k) => () => setTouched((t) => ({ ...t, [k]: true }));

  const submit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setError('');
    if (Object.values(problems).some(Boolean)) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name, email: form.email, password: form.password,
      });
      setDone(data);
    } catch (e2) {
      setServerErrors(e2.response?.data?.errors || {});
      setError(errorText(e2));
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <div className="auth">
        <div className="auth-card">
          <h1>Check your email</h1>
          <p className="muted">
            We sent a verification link to <strong>{done.email}</strong>. Open it to activate your account, then log in.
          </p>
          {!done.emailSent && (
            <div className="alert">We created your account but could not send the email. Use the button below to try again.</div>
          )}
          <ResendVerification email={done.email} startCooldown={done.emailSent} />
          <p className="muted center">Wrong address? <Link to="/register" onClick={() => setDone(null)}>Start again</Link> · <Link to="/login">Log in</Link></p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth">
      <form className="auth-card" onSubmit={submit} noValidate>
        <h1>Create your account</h1>
        <p className="muted">Your email is your login. Everyone on Postbox will see your name in their send list.</p>
        {error && <div className="alert" role="alert">{error}</div>}

        <Field id="name" label="Full name" error={err('name')}>
          <input id="name" autoComplete="name" autoFocus value={form.name} onChange={set('name')} onBlur={blur('name')}
            aria-invalid={!!err('name')} aria-describedby={err('name') ? 'name-error' : undefined} />
        </Field>
        <Field id="email" label="Email" error={err('email')}>
          <input id="email" type="email" autoComplete="email" value={form.email} onChange={set('email')} onBlur={blur('email')}
            aria-invalid={!!err('email')} aria-describedby={err('email') ? 'email-error' : undefined} />
        </Field>
        <PasswordInput id="password" label="Password" autoComplete="new-password" value={form.password}
          onChange={set('password')} onBlur={blur('password')} error={err('password')}>
          <PasswordStrength password={form.password} />
        </PasswordInput>
        <PasswordInput id="confirm" label="Confirm password" autoComplete="new-password" value={form.confirm}
          onChange={set('confirm')} onBlur={blur('confirm')} error={err('confirm')} />

        <button className="btn primary wide" disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
        <p className="muted center">Already registered? <Link to="/login">Log in</Link></p>
      </form>
    </div>
  );
}
