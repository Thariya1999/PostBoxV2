const mongoose = require('mongoose');

// One message can go to many users. Each recipient has their own "readAt",
// so the sender can see exactly who has opened it (like WhatsApp blue ticks).
const recipientSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    readAt: { type: Date, default: null },
  },
  { _id: false }
);

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    subject: { type: String, trim: true, default: '(no subject)' },
    body: { type: String, required: true },
    recipients: { type: [recipientSchema], validate: (v) => v.length > 0 },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
