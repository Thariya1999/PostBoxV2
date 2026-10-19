require('dns').setServers(['8.8.8.8', '1.1.1.1']);
require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const mongoSanitize = require('express-mongo-sanitize');
const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const { Server } = require('socket.io');
const User = require('./models/User');
const { mailerStatus } = require('./utils/mailer');

if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32) {
  console.error('JWT_SECRET is missing or too short. Use at least 32 random characters in server/.env');
  process.exit(1);
}

const app = express();
const server = http.createServer(app);
const origin = process.env.CLIENT_URL || 'http://localhost:5173';

if (process.env.TRUST_PROXY) app.set('trust proxy', Number(process.env.TRUST_PROXY));
app.use(helmet());
app.use(cors({ origin }));
app.use(express.json({ limit: '50kb' }));
app.use(mongoSanitize()); // blocks NoSQL injection like {"$gt": ""}
app.use('/api', rateLimit({ windowMs: 15 * 60 * 1000, limit: 600, standardHeaders: true, legacyHeaders: false }));

// ---- Socket.IO: each logged-in user joins a private room "user:<id>" ----
const io = new Server(server, { cors: { origin } });
io.use(async (socket, next) => {
  try {
    const payload = jwt.verify(socket.handshake.auth.token, process.env.JWT_SECRET);
    const user = await User.findById(payload.id).select('tokenVersion emailVerified');
    if (!user || !user.emailVerified || (user.tokenVersion || 0) !== (payload.v || 0)) throw new Error('stale');
    socket.userId = String(user._id);
    next();
  } catch {
    next(new Error('unauthorized'));
  }
});
io.on('connection', (socket) => socket.join(`user:${socket.userId}`));
app.set('io', io);

app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', require('./routes/users'));
app.use('/api/messages', require('./routes/messages'));
app.get('/api/health', (_req, res) => res.json({ ok: true }));
app.use('/api', (_req, res) => res.status(404).json({ message: 'Not found.' }));

// Never leak stack traces to the browser
app.use((err, _req, res, _next) => {
  console.error(err);
  const status = err.status === 413 ? 413 : err.status === 400 ? 400 : 500;
  res.status(status).json({ message: status === 500 ? 'Something went wrong.' : 'Invalid request.' });
});

const PORT = process.env.PORT || 5000;
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log('MongoDB connected');
    // Accounts created before email verification existed stay usable
    const r = await User.updateMany(
      { emailVerified: { $exists: false } },
      { $set: { emailVerified: true, notifyByEmail: true, tokenVersion: 0 } }
    );
    if (r.modifiedCount) console.log(`Marked ${r.modifiedCount} existing account(s) as verified`);
    await mailerStatus();
    server.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('MongoDB connection failed:', err.message);
    process.exit(1);
  });
