const crypto = require('crypto');

// raw goes in the email link; only the hash is stored in the database
exports.createToken = () => {
  const raw = crypto.randomBytes(32).toString('hex');
  return { raw, hash: exports.hashToken(raw) };
};
exports.hashToken = (raw) => crypto.createHash('sha256').update(String(raw)).digest('hex');
exports.TOKEN_RE = /^[a-f0-9]{64}$/;
