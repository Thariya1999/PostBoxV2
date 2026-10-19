const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const auth = require('../middleware/auth');
const V = require('../utils/validators');
const T = require('../utils/emailTemplates');
const { sendMail } = require('../utils/mailer');
const { createToken, hashToken, TOKEN_RE } = require('../utils/tokens');
const { clientUrl } = require('../utils/config');

const router = express.Router();

const MAX_ATTEMPTS = 5;
const LOCK_MS = 15 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const DUMMY_HASH = bcrypt.hashSync('not-a-real-password', 12); // keeps login timing equal for unknown emails

const limiter = (limit, windowMs, message, extra = {}) =>
  rateLimit({ windowMs, limit, standardHeaders: true, legacyHeaders: false, message: { message }, ...extra });
const authLimiter = limiter(30, 15 * 60 * 1000, 'Too many attempts. Wait a few minutes and try again.');
const loginLimiter = limiter(20, 15 * 60 * 1000, 'Too many login attempts. Wait a few minutes and try again.', {
  skipSuccessfulRequests: true,
});
const mailLimiter = limiter(6, 60 * 60 * 1000, 'Too many email requests. Try again in an hour.');

const sign = (u) =>
  jwt.sign({ id: u._id, v: u.tokenVersion || 0 }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publicUser = (u) => ({ _id: u._id, name: u.name, email: u.email, notifyByEmail: u.notifyByEmail !== false });
const listUser = (u) => ({ _id: u._id, name: u.name, email: u.email });
const str = (v) => (typeof v === 'string' ? v : '');

async function sendVerification(user) {
  const { raw, hash } = createToken();
  await User.updateOne(
    { _id: user._id },
    { $set: { verifyTokenHash: hash, verifyTokenExpires: new Date(Date.now() + 24 * 3600 * 1000), verifySentAt: new Date() } }
  );
  await sendMail({ to: user.email, ...T.verifyEmail({ name: user.name, url: `${clientUrl()}/verify-email?token=${raw}` }) });
}

async function sendReset(user) {
  const { raw, hash } = createToken();
  await User.updateOne(
    { _id: user._id },
    { $set: { resetTokenHash: hash, resetTokenExpires: new Date(Date.now() + 3600 * 1000), resetSentAt: new Date() } }
  );
  await sendMail({ to: user.email, ...T.resetPassword({ name: user.name, url: `${clientUrl()}/reset-password?token=${raw}` }) });
}

const notifyPasswordChanged = (user) =>
  sendMail({ to: user.email, ...T.passwordChanged({ name: user.name }) }).catch((e) =>
    console.error('Password-changed email failed:', e.message)
  );

// ---------- Register ----------
router.post('/register', authLimiter, async (req, res) => {
  const name = V.cleanName(req.body.name);
  const email = V.cleanEmail(req.body.email);
  const password = req.body.password;

  const errors = {};
  const nameErr = V.nameProblem(name);
  const emailErr = V.emailProblem(email);
  const passErr = V.passwordProblem(password, email);
  if (nameErr) errors.name = nameErr;
  if (emailErr) errors.email = emailErr;
  if (passErr) errors.password = passErr;
  if (Object.keys(errors).length)
    return res.status(400).json({ message: 'Fix the highlighted fields and try again.', errors });

  try {
    const taken = { message: 'This email is already registered.', errors: { email: 'This email is already registered. Try logging in.' } };
    if (await User.exists({ email })) return res.status(409).json(taken);

    let user;
    try {
      user = await User.create({ name, email, password: await bcrypt.hash(password, 12) });
    } catch (err) {
      if (err.code === 11000) return res.status(409).json(taken);
      throw err;
    }

    let emailSent = true;
    try {
      await sendVerification(user);
    } catch (err) {
      emailSent = false;
      console.error('Verification email failed:', err.message);
    }
    res.status(201).json({ email, emailSent });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not create your account. Try again.' });
  }
});

// ---------- Verify email ----------
router.post('/verify-email', authLimiter, async (req, res) => {
  const token = str(req.body.token);
  const invalid = { message: 'This verification link is invalid or has expired. Log in to get a new one.' };
  if (!TOKEN_RE.test(token)) return res.status(400).json(invalid);

  const user = await User.findOneAndUpdate(
    { verifyTokenHash: hashToken(token), verifyTokenExpires: { $gt: new Date() } },
    { $set: { emailVerified: true }, $unset: { verifyTokenHash: 1, verifyTokenExpires: 1 } },
    { new: true }
  );
  if (!user) return res.status(400).json(invalid);

  // Now that the email is confirmed, everyone online sees them in the send list
  req.app.get('io').emit('user:new', listUser(user));
  res.json({ message: 'Email verified. You can log in now.' });
});

router.post('/resend-verification', mailLimiter, async (req, res) => {
  const email = V.cleanEmail(req.body.email);
  if (V.emailProblem(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

  const user = await User.findOne({ email });
  const recent = user?.verifySentAt && Date.now() - user.verifySentAt < COOLDOWN_MS;
  if (user && !user.emailVerified && !recent) {
    try { await sendVerification(user); } catch (e) { console.error('Verification email failed:', e.message); }
  }
  // Same answer whether or not the account exists
  res.json({ message: 'If that account needs verification, a new link is on its way.' });
});

// ---------- Login ----------
router.post('/login', loginLimiter, async (req, res) => {
  const email = V.cleanEmail(req.body.email);
  const password = str(req.body.password);
  if (!email || !password) return res.status(400).json({ message: 'Enter your email and password.' });

  try {
    const user = await User.findOne({ email });

    if (user?.lockUntil && user.lockUntil > Date.now()) {
      const mins = Math.ceil((user.lockUntil - Date.now()) / 60000);
      return res.status(423).json({ message: `Too many failed attempts. Try again in ${mins} minute${mins === 1 ? '' : 's'}, or reset your password.` });
    }
    if (user?.lockUntil) { user.failedLoginAttempts = 0; user.lockUntil = null; }

    const ok = await bcrypt.compare(password, user ? user.password : DUMMY_HASH);
    if (!user || !ok) {
      if (user) {
        user.failedLoginAttempts += 1;
        if (user.failedLoginAttempts >= MAX_ATTEMPTS) {
          user.lockUntil = new Date(Date.now() + LOCK_MS);
          user.failedLoginAttempts = 0;
        }
        await user.save();
      }
      return res.status(401).json({ message: 'Email or password is incorrect.' });
    }

    if (!user.emailVerified)
      return res.status(403).json({
        code: 'EMAIL_NOT_VERIFIED',
        email: user.email,
        message: 'Verify your email before logging in. Check your inbox for the link.',
      });

    if (user.failedLoginAttempts || user.lockUntil) {
      user.failedLoginAttempts = 0;
      user.lockUntil = null;
      await user.save();
    }
    res.json({ token: sign(user), user: publicUser(user) });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not log in. Try again.' });
  }
});

// ---------- Forgot / reset password ----------
router.post('/forgot-password', mailLimiter, async (req, res) => {
  const email = V.cleanEmail(req.body.email);
  if (V.emailProblem(email)) return res.status(400).json({ message: 'Enter a valid email address.' });

  const user = await User.findOne({ email });
  const recent = user?.resetSentAt && Date.now() - user.resetSentAt < COOLDOWN_MS;
  if (user && !recent) {
    try { await sendReset(user); } catch (e) { console.error('Reset email failed:', e.message); }
  }
  res.json({ message: 'If that email has an account, a reset link is on its way.' });
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const token = str(req.body.token);
  const invalid = { message: 'This reset link is invalid or has expired. Request a new one.' };
  if (!TOKEN_RE.test(token)) return res.status(400).json(invalid);

  const user = await User.findOne({ resetTokenHash: hashToken(token), resetTokenExpires: { $gt: new Date() } });
  if (!user) return res.status(400).json(invalid);

  const problem = V.passwordProblem(req.body.password, user.email);
  if (problem) return res.status(400).json({ message: problem, errors: { password: problem } });

  await User.updateOne(
    { _id: user._id },
    {
      $set: { password: await bcrypt.hash(req.body.password, 12), emailVerified: true, failedLoginAttempts: 0, lockUntil: null },
      $inc: { tokenVersion: 1 },
      $unset: { resetTokenHash: 1, resetTokenExpires: 1 },
    }
  );
  req.app.get('io').in(`user:${user._id}`).disconnectSockets(true);
  notifyPasswordChanged(user);
  res.json({ message: 'Password updated. Log in with your new password.' });
});

// ---------- Signed-in account actions ----------
router.get('/me', auth, (req, res) => res.json({ user: publicUser(req.user) }));

router.patch('/settings', auth, async (req, res) => {
  if (typeof req.body.notifyByEmail !== 'boolean') return res.status(400).json({ message: 'Invalid setting.' });
  req.user.notifyByEmail = req.body.notifyByEmail;
  await req.user.save();
  res.json({ user: publicUser(req.user) });
});

router.post('/change-password', auth, authLimiter, async (req, res) => {
  const user = await User.findById(req.user._id);
  const { currentPassword, newPassword } = req.body;

  if (!str(currentPassword) || !(await bcrypt.compare(currentPassword, user.password))) {
    const m = 'Your current password is incorrect.';
    return res.status(400).json({ message: m, errors: { currentPassword: m } });
  }
  const problem = V.passwordProblem(newPassword, user.email);
  if (problem) return res.status(400).json({ message: problem, errors: { newPassword: problem } });
  if (newPassword === currentPassword) {
    const m = 'The new password must be different from the current one.';
    return res.status(400).json({ message: m, errors: { newPassword: m } });
  }

  user.password = await bcrypt.hash(newPassword, 12);
  user.tokenVersion = (user.tokenVersion || 0) + 1; // logs out every other device
  await user.save();
  notifyPasswordChanged(user);
  res.json({ token: sign(user), user: publicUser(user) });
});

module.exports = router;
