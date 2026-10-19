import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import api, { errorText } from '../api.js';

export default function VerifyEmail() {
  const [params] = useSearchParams();
  const [state, setState] = useState({ status: 'loading', message: '' });
  const ran = useRef(false); // the link can only be used once, so call the API once

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;
    api
      .post('/auth/verify-email', { token: params.get('token') || '' })
      .then((res) => setState({ status: 'ok', message: res.data.message }))
      .catch((err) => setState({ status: 'error', message: errorText(err) }));
  }, [params]);

  return (
    <div className="auth">
      <div className="auth-card">
        {state.status === 'loading' && <h1>Verifying your email…</h1>}
        {state.status === 'ok' && (
          <>
            <h1>Email verified</h1>
            <p className="muted">{state.message}</p>
            <Link className="btn primary wide linkbtn" to="/login">Log in</Link>
          </>
        )}
        {state.status === 'error' && (
          <>
            <h1>Link not valid</h1>
            <div className="alert">{state.message}</div>
            <Link className="btn primary wide linkbtn" to="/login">Go to log in</Link>
          </>
        )}
      </div>
    </div>
  );
}
