const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const User = require('../../models/User');
const Artwork = require('../../models/Artwork');

router.get('/:id/stats', async (req, res) => {
  try {
    const userId = req.params.id;

    const totalArtworks = await Artwork.countDocuments({ artist: userId, status: 'approved' });

    const viewsResult = await Artwork.aggregate([
      { $match: { artist: mongoose.Types.ObjectId(userId), status: 'approved' } },
      { $group: { _id: null, totalViews: { $sum: '$stats.views' }, totalFavorites: { $sum: '$stats.favorites' } } }
    ]);

    const salesResult = await Artwork.aggregate([
      { $match: { artist: mongoose.Types.ObjectId(userId), isSold: true } },
      { $group: { _id: null, totalSales: { $sum: '$price' }, soldCount: { $sum: 1 } } }
    ]);

    const user = await User.findById(userId).select('followers');
    const followers = user?.followers?.length || 0;

    res.json({
      success: true,
      data: {
        totalArtworks,
        totalViews: viewsResult[0]?.totalViews || 0,
        totalFavorites: viewsResult[0]?.totalFavorites || 0,
        totalSales: salesResult[0]?.totalSales || 0,
        soldCount: salesResult[0]?.soldCount || 0,
        followers
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
