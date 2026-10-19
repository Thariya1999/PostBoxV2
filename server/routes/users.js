const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// Everyone verified except me = my "send to" list
router.get('/', auth, async (req, res) => {
  const users = await User.find({ _id: { $ne: req.user._id }, emailVerified: true })
    .select('name email')
    .sort({ name: 1 });
  res.json(users);
});

module.exports = router;
