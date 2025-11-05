// backend/routes/users/artworkRoutes.js
const express = require('express');
const router = express.Router();
const Artwork = require('../../models/Artwork');
const { protect } = require('../../middleware/auth');

// Get user's artworks
router.get('/:id/artworks', async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const userId = req.params.id;
    const query = { artist: userId };

    if (req.user && req.user._id.toString() === userId) {
      if (status) query.status = status;
    } else {
     query.$and = [
  { $or: [{ status: 'approved' }, { status: { $exists: false } }] },
  { $or: [{ visibility: 'public' }, { visibility: { $exists: false } }] }
];

    }

    const skip = (page - 1) * limit;
    const artworks = await Artwork.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('artist', 'username profile.avatar')
      .lean();

    const total = await Artwork.countDocuments(query);

    res.json({
      success: true,
      data: artworks,
      pagination: { page: Number(page), limit: Number(limit), total, pages: Math.ceil(total / limit) }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
