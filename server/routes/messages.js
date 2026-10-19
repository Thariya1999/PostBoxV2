const express = require('express');
const mongoose = require('mongoose');
const rateLimit = require('express-rate-limit');
const Message = require('../models/Message');
const User = require('../models/User');
const auth = require('../middleware/auth');
const T = require('../utils/emailTemplates');
const { sendMail } = require('../utils/mailer');
const { clientUrl } = require('../utils/config');

const router = express.Router();
router.use(auth);

// Max 30 sends per minute per signed-in user
const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => String(req.user._id),
  message: { message: 'You are sending too fast. Wait a minute and try again.' },
});

const populate = [
  { path: 'sender', select: 'name email' },
  { path: 'recipients.user', select: 'name email' },
];

// Send a message to one or many selected users
router.post('/', sendLimiter, async (req, res) => {
  try {
    const { recipients, subject, body } = req.body;
    if (!Array.isArray(recipients) || recipients.length === 0)
      return res.status(400).json({ message: 'Select at least one person to send to.' });
    if (recipients.length > 100)
      return res.status(400).json({ message: 'You can send to up to 100 people at once.' });
    if (typeof body !== 'string' || !body.trim())
      return res.status(400).json({ message: 'Write a message before sending.' });
    if (body.length > 5000)
      return res.status(400).json({ message: 'Messages can be up to 5,000 characters.' });
    const subj = typeof subject === 'string' ? subject.replace(/[\r\n]+/g, ' ').trim() : '';
    if (subj.length > 150)
      return res.status(400).json({ message: 'Subject can be up to 150 characters.' });

    const ids = [...new Set(recipients)].filter(
      (id) => typeof id === 'string' && mongoose.isValidObjectId(id) && id !== String(req.user._id)
    );
    // Only real, verified accounts can receive messages
    const valid = await User.find({ _id: { $in: ids }, emailVerified: true }).select('name email notifyByEmail');
    if (valid.length === 0)
      return res.status(400).json({ message: 'Select at least one other person.' });

    const message = await Message.create({
      sender: req.user._id,
      subject: subj || '(no subject)',
      body: body.trim(),
      recipients: valid.map((u) => ({ user: u._id })),
    });
    await message.populate(populate);

    const io = req.app.get('io');
    valid.forEach((u) => {
      // Live pop-up if they are online
      io.to(`user:${u._id}`).emit('message:new', {
        _id: message._id,
        subject: message.subject,
        sender: message.sender,
        createdAt: message.createdAt,
      });
      // Email to their address (does not delay the response)
      if (u.notifyByEmail !== false) {
        sendMail({
          to: u.email,
          ...T.newMessage({
            name: u.name,
            senderName: req.user.name,
            subject: message.subject,
            url: `${clientUrl()}/message/${message._id}`,
          }),
        }).catch((err) => console.error('Notification email failed:', err.message));
      }
    });

    res.status(201).json(message);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Could not send the message.' });
  }
});

// Inbox: messages sent to me
router.get('/inbox', async (req, res) => {
  const messages = await Message.find({ 'recipients.user': req.user._id })
    .populate(populate)
    .sort({ createdAt: -1 });

  res.json(
    messages.map((m) => {
      const mine = m.recipients.find((r) => String(r.user._id) === String(req.user._id));
      return {
        _id: m._id,
        subject: m.subject,
        body: m.body,
        sender: m.sender,
        createdAt: m.createdAt,
        readAt: mine?.readAt || null,
      };
    })
  );
});

// Sent: messages I sent, including who has read them
router.get('/sent', async (req, res) => {
  const messages = await Message.find({ sender: req.user._id })
    .populate(populate)
    .sort({ createdAt: -1 });
  res.json(messages);
});

// Open a message. If I am a recipient, mark it as read and tell the sender.
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id))
    return res.status(404).json({ message: 'Message not found.' });

  const message = await Message.findById(req.params.id);
  if (!message) return res.status(404).json({ message: 'Message not found.' });

  const isSender = String(message.sender) === String(req.user._id);
  const entry = message.recipients.find((r) => String(r.user) === String(req.user._id));
  if (!isSender && !entry)
    return res.status(403).json({ message: 'You do not have access to this message.' });

  if (entry && !entry.readAt) {
    entry.readAt = new Date();
    await message.save();
    // "Seen" notification to the sender
    req.app.get('io').to(`user:${message.sender}`).emit('message:read', {
      messageId: message._id,
      subject: message.subject,
      reader: { _id: req.user._id, name: req.user.name },
      readAt: entry.readAt,
    });
  }

  await message.populate(populate);
  res.json(message);
});

module.exports = router;
