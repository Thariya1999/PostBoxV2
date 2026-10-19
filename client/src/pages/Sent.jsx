import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import Ticks from '../components/Ticks.jsx';
import { fmt } from '../utils.js';

export default function Sent() {
  const { version } = useApp();
  const [items, setItems] = useState(null);

  useEffect(() => {
    api.get('/messages/sent').then((res) => setItems(res.data));
  }, [version]);

  if (!items) return <p className="muted">Loading…</p>;

  return (
    <>
      <h2 className="page-title">Sent</h2>
      {items.length === 0 ? (
        <div className="empty">
          <strong>You haven't sent anything yet</strong>
          <span>Write a message and pick who should get it.</span>
        </div>
      ) : (
        <ul className="list">
          {items.map((m) => {
            const read = m.recipients.filter((r) => r.readAt).length;
            return (
              <li key={m._id}>
                <Link to={`/message/${m._id}`}>
                  <span className="row-main">
                    <strong>To: {m.recipients.map((r) => r.user.name).join(', ')}</strong>
                    <span className="subject">{m.subject}</span>
                    <span className="preview">{m.body.slice(0, 90)}</span>
                  </span>
                  <span className="when">
                    <Ticks read={read} total={m.recipients.length} />
                    <br />
                    {fmt(m.createdAt)}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
