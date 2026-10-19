const validator = require('validator');

const COMMON = new Set([
  'password', 'password1', 'password123', 'password1!', 'passw0rd', 'p@ssw0rd', 'p@ssword1',
  '12345678', '123456789', '1234567890', 'qwerty123', 'qwertyuiop', 'iloveyou', 'admin123',
  'welcome1', 'welcome123', 'letmein123', 'abc12345', '11111111', '00000000', 'changeme',
]);

exports.cleanEmail = (v) => (typeof v === 'string' ? v.trim().toLowerCase() : '');
exports.cleanName = (v) => (typeof v === 'string' ? v.trim().replace(/\s+/g, ' ') : '');

exports.nameProblem = (name) => {
  if (!name) return 'Enter your full name.';
  if (name.length < 2) return 'Name must be at least 2 characters.';
  if (name.length > 50) return 'Name must be 50 characters or fewer.';
  if (!/^[\p{L}\p{M}' .-]+$/u.test(name))
    return 'Use letters, spaces, apostrophes, dots or hyphens only.';
  return null;
};

exports.emailProblem = (email) => {
  if (!email) return 'Enter your email address.';
  if (email.length > 254 || !validator.isEmail(email))
    return 'Enter a valid email address, like name@example.com.';
  return null;
};

exports.passwordProblem = (password, email = '') => {
  if (typeof password !== 'string' || !password) return 'Enter a password.';
  if (Buffer.byteLength(password) > 72) return 'Password must be 72 characters or fewer.';

  const missing = [];
  if (password.length < 8) missing.push('at least 8 characters');
  if (!/[A-Z]/.test(password)) missing.push('an uppercase letter');
  if (!/[a-z]/.test(password)) missing.push('a lowercase letter');
  if (!/[0-9]/.test(password)) missing.push('a number');
  if (!/[^A-Za-z0-9\s]/.test(password)) missing.push('a symbol');
  if (missing.length) return `Password needs ${missing.join(', ')}.`;

  if (COMMON.has(password.toLowerCase())) return 'That password is too common. Choose another.';
  const local = String(email).split('@')[0].toLowerCase();
  if (local.length >= 4 && password.toLowerCase().includes(local))
    return 'Password must not contain your email name.';
  return null;
};
