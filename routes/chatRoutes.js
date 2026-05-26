const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const Message = require('../models/Message');
const HackathonMember = require('../models/HackathonMember');

// Отримати історію командного чату
router.get('/team/:teamId', authMiddleware, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { limit = 50, before } = req.query;

    const filter = { teamId };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

// Отримати історію загального чату хакатону
router.get('/hackathon/:hackathonId', authMiddleware, async (req, res) => {
  try {
    const { hackathonId } = req.params;
    const { limit = 50, before } = req.query;

    const filter = { hackathonId, teamId: null };
    if (before) filter.createdAt = { $lt: new Date(before) };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(Number(limit))
      .lean();

    res.status(200).json(messages.reverse());
  } catch (error) {
    res.status(500).json({ message: 'Помилка сервера' });
  }
});

module.exports = router;