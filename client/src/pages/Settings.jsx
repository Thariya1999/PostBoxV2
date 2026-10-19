import { useState } from 'react';
import api, { errorText } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import PasswordInput from '../components/PasswordInput.jsx';
import PasswordStrength from '../components/PasswordStrength.jsx';
import { passwordProblem } from '../validation.js';

export default function Settings() {
  const { user, updateUser, saveSession } = useApp();
  const [notifyMsg, setNotifyMsg] = useState('');
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [submitted, setSubmitted] = useState(false);
  const [serverErrors, setServerErrors] = useState({});
  const [status, setStatus] = useState({ type: '', text: '' });
  const [busy, setBusy] = useState(false);

  const toggleNotify = async (e) => {
    const value = e.target.checked;
    setNotifyMsg('');
    updateUser({ notifyByEmail: value });
    try {
      await api.patch('/auth/settings', { notifyByEmail: value });
      setNotifyMsg(value ? 'Email notifications are on.' : 'Email notifications are off.');
    } catch (err) {
      updateUser({ notifyByEmail: !value });
      setNotifyMsg(errorText(err));
    }
  };

  const problems = {
    current: form.current ? '' : 'Enter your current password.',
    next: passwordProblem(form.next, user.email),
    confirm: form.confirm !== form.next ? 'Passwords do not match.' : '',
  };
  const err = (k, sk) => serverErrors[sk || k] || (submitted ? problems[k] : '');
  const set = (k, sk) => (e) => {
    setForm({ ...form, [k]: e.target.value });
    setServerErrors((s) => ({ ...s, [sk || k]: '' }));
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    setStatus({ type: '', text: '' });
    if (Object.values(problems).some(Boolean)) return;
    setBusy(true);
    try {
      const { data } = await api.post('/auth/change-password', {
        currentPassword: form.current, newPassword: form.next,
      });
      saveSession(data); // new token; every other device is logged out
      setForm({ current: '', next: '', confirm: '' });
      setSubmitted(false);
      setStatus({ type: 'ok', text: 'Password changed. You were logged out on other devices.' });
    } catch (e2) {
      setServerErrors(e2.response?.data?.errors || {});
      setStatus({ type: 'error', text: errorText(e2) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="page-title">Settings</h2>

      <section className="card">
        <h3>Email notifications</h3>
        <p className="muted small">We email <strong>{user.email}</strong> when someone sends you a message.</p>
        <label className="switch">
          <input type="checkbox" checked={user.notifyByEmail !== false} onChange={toggleNotify} />
          <span>Email me when I get a new message</span>
        </label>
        {notifyMsg && <p className="muted small" role="status">{notifyMsg}</p>}
      </section>

      <form className="card" onSubmit={changePassword} noValidate>
        <h3>Change password</h3>
        {status.text && <div className={status.type === 'ok' ? 'notice' : 'alert'} role="status">{status.text}</div>}
        <PasswordInput id="current" label="Current password" autoComplete="current-password"
          value={form.current} onChange={set('current', 'currentPassword')} error={err('current', 'currentPassword')} />
        <PasswordInput id="next" label="New password" autoComplete="new-password"
          value={form.next} onChange={set('next', 'newPassword')} error={err('next', 'newPassword')}>
          <PasswordStrength password={form.next} />
        </PasswordInput>
        <PasswordInput id="confirm" label="Confirm new password" autoComplete="new-password"
          value={form.confirm} onChange={set('confirm')} error={err('confirm')} />
        <button className="btn primary" disabled={busy}>{busy ? 'Saving…' : 'Change password'}</button>
      </form>
    </>
  );
}
