import { useMemo, useState } from 'react';

export default function RecipientPicker({ users, selected, onChange }) {
  const [q, setQ] = useState('');
  const shown = useMemo(
    () => users.filter((u) => `${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase())),
    [users, q]
  );
  const toggle = (id) =>
    onChange(selected.includes(id) ? selected.filter((x) => x !== id) : [...selected, id]);
  const allShownSelected = shown.length > 0 && shown.every((u) => selected.includes(u._id));
  const toggleAll = () =>
    onChange(
      allShownSelected
        ? selected.filter((id) => !shown.some((u) => u._id === id))
        : [...new Set([...selected, ...shown.map((u) => u._id)])]
    );

  return (
    <div className="picker">
      <div className="picker-head">
        <input
          type="search"
          placeholder="Search people"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <button type="button" className="link" onClick={toggleAll} disabled={!shown.length}>
          {allShownSelected ? 'Clear' : 'Select all'}
        </button>
      </div>
      <ul>
        {shown.map((u) => (
          <li key={u._id}>
            <label>
              <input type="checkbox" checked={selected.includes(u._id)} onChange={() => toggle(u._id)} />
              <span className="avatar sm">{u.name[0].toUpperCase()}</span>
              <span className="who">
                <strong>{u.name}</strong>
                <small>{u.email}</small>
              </span>
            </label>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="empty-note">
            {users.length === 0 ? 'No one else has registered yet.' : 'No one matches that search.'}
          </li>
        )}
      </ul>
    </div>
  );
}
