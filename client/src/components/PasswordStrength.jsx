import { passwordRules, strength } from '../validation.js';

export default function PasswordStrength({ password }) {
  if (!password) return null;
  const s = strength(password);
  return (
    <div className="strength">
      <div className="meter" role="img" aria-label={`Password strength: ${s.label}`}>
        <span className={`bar s${s.level}`} style={{ width: `${s.level * 25}%` }} />
      </div>
      <p className="strength-label">Strength: {s.label}</p>
      <ul className="rules">
        {passwordRules(password).map((r) => (
          <li key={r.id} className={r.ok ? 'ok' : ''}>{r.ok ? '✓' : '○'} {r.label}</li>
        ))}
      </ul>
    </div>
  );
}
