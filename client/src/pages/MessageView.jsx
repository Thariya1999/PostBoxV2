import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errorText } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import { fmt } from '../utils.js';

export default function MessageView() {
  const { id } = useParams();
  const { user, bump, version } = useApp();
  const [msg, setMsg] = useState(null);
  const [error, setError] = useState('');

  // Opening the message as a recipient marks it read and notifies the sender.
  // Later refetches (live events) just refresh the data, they don't re-announce.
  useEffect(() => {
    let cancelled = false;
    api
      .get(`/messages/${id}`)
      .then((res) => {
        if (cancelled) return;
        setMsg(res.data);
        if (res.data.recipients.some((r) => r.user._id === user._id)) bump();
      })
      .catch((err) => setError(errorText(err)));
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    if (!msg) return;
    api.get(`/messages/${id}`).then((res) => setMsg(res.data)).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [version]);

  if (error) return <div className="alert">{error}</div>;
  if (!msg) return <p className="muted">Loading…</p>;

  const mine = msg.sender._id === user._id;

  return (
    <article className="reader">
      <Link to={mine ? '/sent' : '/'} className="link">← Back</Link>
      <h2>{msg.subject}</h2>
      <p className="meta">
        From <strong>{mine ? 'you' : msg.sender.name}</strong> · {fmt(msg.createdAt, true)}
      </p>
      <div className="body">{msg.body}</div>

      {mine && (
        <section className="receipts">
          <h3>Delivery</h3>
          <ul>
            {msg.recipients.map((r) => (
              <li key={r.user._id}>
                <span>{r.user.name}</span>
                {r.readAt ? (
                  <span className="seen">✓✓ Read {fmt(r.readAt, true)}</span>
                ) : (
                  <span className="pending">✓ Not read yet</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </article>
  );
}
