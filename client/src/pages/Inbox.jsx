import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { fmt } from '../utils.js';

export default function Inbox() {
  const { version } = useApp();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/messages/inbox').then((res) => setItems(res.data));
  }, [version]);

  if (!items) return <p className="muted">Loading…</p>;

  return (
    <>
      <h2 className="page-title">Inbox</h2>
      {items.length === 0 ? (
        <div className="empty">
          <strong>Your inbox is empty</strong>
          <span>Messages sent to you will show up here.</span>
        </div>
      ) : (
        <ul className="list">
          {items.map((m) => (
            <li key={m._id}>
              <Link to={`/message/${m._id}`} className={m.readAt ? '' : 'unread'}>
                <span className="avatar sm">{m.sender.name[0].toUpperCase()}</span>
                <span className="row-main">
                  <strong>{m.sender.name}</strong>
                  <span className="subject">{m.subject}</span>
                  <span className="preview">{m.body.slice(0, 90)}</span>
                </span>
                <span className="when">{fmt(m.createdAt)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
