import { useEffect, useState } from 'react';
import api, { errorText } from '../api.js';

export default function ResendVerification({ email, startCooldown = false }) {
  const [cooldown, setCooldown] = useState(startCooldown ? 60 : 0);
  const [msg, setMsg] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  const resend = async () => {
    setBusy(true);
    setMsg('');
    try {
      await api.post('/auth/resend-verification', { email });
      setMsg('A new link is on its way. Check your inbox and spam folder.');
      setCooldown(60);
    } catch (err) {
      setMsg(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="resend">
      <button type="button" className="btn secondary wide" onClick={resend} disabled={busy || cooldown > 0}>
        {cooldown > 0 ? `Resend email in ${cooldown}s` : 'Resend verification email'}
      </button>
      {msg && <p className="muted small" role="status">{msg}</p>}
    </div>
  );
}
