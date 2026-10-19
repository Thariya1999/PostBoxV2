const COMMON = new Set([
  'password', 'password1', 'password123', 'password1!', 'passw0rd', 'p@ssw0rd', 'p@ssword1',
  '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', 'iloveyou', 'admin123',
  'welcome1', 'welcome123', 'letmein123', 'abc12345', '11111111', '00000000', 'changeme',
]);

export function nameProblem(v) {
  const n = v.trim().replace(/\s+/g, ' ');
  if (!n) return 'Enter your full name.';
  if (n.length < 2) return 'Name must be at least 2 characters.';
  if (n.length > 50) return 'Name must be 50 characters or fewer.';
  if (!/^[\p{L}\p{M}' .-]+$/u.test(n)) return 'Use letters, spaces, apostrophes, dots or hyphens only.';
  return '';
}

export function emailProblem(v) {
  const e = v.trim();
  if (!e) return 'Enter your email address.';
  if (e.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(e))
    return 'Enter a valid email address, like name@example.com.';
  return '';
}

export const passwordRules = (pw) => [
  { id: 'len', label: 'At least 8 characters', ok: pw.length >= 8 },
  { id: 'upper', label: 'An uppercase letter (A–Z)', ok: /[A-Z]/.test(pw) },
  { id: 'lower', label: 'A lowercase letter (a–z)', ok: /[a-z]/.test(pw) },
  { id: 'num', label: 'A number (0–9)', ok: /[0-9]/.test(pw) },
  { id: 'sym', label: 'A symbol (like ! @ # $)', ok: /[^A-Za-z0-9\s]/.test(pw) },
];

export function passwordProblem(pw, email = '') {
  if (!pw) return 'Enter a password.';
  if (pw.length > 72) return 'Password must be 72 characters or fewer.';
  if (!passwordRules(pw).every((r) => r.ok)) return 'Password does not meet all the requirements below.';
  if (COMMON.has(pw.toLowerCase())) return 'That password is too common. Choose another.';
  const local = email.split('@')[0].trim().toLowerCase();
  if (local.length >= 4 && pw.toLowerCase().includes(local)) return 'Password must not contain your email name.';
  return '';
}

export function strength(pw) {
  const ok = passwordRules(pw).filter((r) => r.ok).length;
  if (ok < 5) return ok <= 2 ? { level: 1, label: 'Weak' } : { level: 2, label: 'Fair' };
  return pw.length >= 12 ? { level: 4, label: 'Strong' } : { level: 3, label: 'Good' };
}
