const express = require('express');
const router = express.Router();
const User = require('../../models/User');

// Search users
router.get('/', async (req, res) => {
  try {
    const { q, role, page = 1, limit = 20 } = req.query;
    if (!q) return res.status(400).json({ success: false, message: 'Search query is required' });

    const query = {
      $or: [{ username: { $regex: q, $options: 'i' } }, { 'profile.bio': { $regex: q, $options: 'i' } }]
    };
    if (role) query.role = role;

    const skip = (page - 1) * limit;
    const users = await User.find(query)
      .select('username profile.avatar profile.bio role isVerified')
      .skip(skip)
      .limit(Number(limit))
      .lean();

    const total = await User.countDocuments(query);
    res.json({ success: true, data: users, pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
