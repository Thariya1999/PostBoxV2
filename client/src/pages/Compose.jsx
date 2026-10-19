import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api, { errorText } from '../api.js';
import { useApp } from '../context/AppContext.jsx';
import RecipientPicker from '../components/RecipientPicker.jsx';

export default function Compose() {
  const { users, bump } = useApp();
  const navigate = useNavigate();
  const [selected, setSelected] = useState([]);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const send = async (e) => {
    e.preventDefault();
    setError('');
    if (selected.length === 0) return setError('Select at least one person to send to.');
    setBusy(true);
    try {
      await api.post('/messages', { recipients: selected, subject, body });
      bump();
      navigate('/sent');
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <h2 className="page-title">Write a message</h2>
      <form className="compose" onSubmit={send}>
        <section>
          <h3>Send to {selected.length > 0 && <span className="count">{selected.length} selected</span>}</h3>
          <RecipientPicker users={users} selected={selected} onChange={setSelected} />
        </section>
        <section>
          {error && <div className="alert">{error}</div>}
          <label>Subject
            <input value={subject} onChange={(e) => setSubject(e.target.value)} />
          </label>
          <label>Message
            <textarea rows={10} required value={body} onChange={(e) => setBody(e.target.value)} />
          </label>
          <button className="btn primary" disabled={busy}>
            {busy ? 'Sending…' : selected.length > 1 ? `Send to ${selected.length} people` : 'Send message'}
          </button>
        </section>
      </form>
    </>
  );
}
