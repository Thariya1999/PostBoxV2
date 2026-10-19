import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext.jsx';
import api from '../api.js';

export default function Layout() {
  const { user, logout, toasts, dismissToast, version } = useApp();
  const navigate = useNavigate();
  const [unread, setUnread] = useState(0);

  useEffect(() => {
    api.get('/messages/inbox').then((res) => setUnread(res.data.filter((m) => !m.readAt).length));
  }, [version]);

  const initials = user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase();

  return (
    <div className="shell">
      <aside className="side">
        <div className="brand">Postbox</div>
        <button className="btn primary wide" onClick={() => navigate('/compose')}>
          Write a message
        </button>
        <nav>
          <NavLink to="/" end>
            Inbox {unread > 0 && <span className="badge">{unread}</span>}
          </NavLink>
          <NavLink to="/sent">Sent</NavLink>
          <NavLink to="/settings">Settings</NavLink>
        </nav>
        <div className="me">
          <div className="avatar">{initials}</div>
          <div className="me-info">
            <strong>{user.name}</strong>
            <span>{user.email}</span>
          </div>
          <button className="link" onClick={logout}>Log out</button>
        </div>
      </aside>

      <main className="main">
        <Outlet />
      </main>

      <div className="toasts" aria-live="polite">
        {toasts.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <button
              className="toast-body"
              onClick={() => { t.onOpen?.(); dismissToast(t.id); }}
            >
              <strong>{t.title}</strong>
              <span>{t.text}</span>
            </button>
            <button className="toast-x" aria-label="Dismiss" onClick={() => dismissToast(t.id)}>×</button>
          </div>
        ))}
      </div>
    </div>
  );
}
