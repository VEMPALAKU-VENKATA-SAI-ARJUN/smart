const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const { protect } = require('../middleware/auth');

const Transaction = require('../models/Transaction');
/* ============================
   ☁️ CLOUDINARY CONFIG
   ============================ */
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'artnexus/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
  },
});
const upload = multer({ storage });

/* ============================
   ✅ USER ROUTES
   ============================ */

/**
 * @route   GET /api/users
 * @desc    Get all users (Admin only)
 */
router.get('/', (req, res) => {
  res.json({ message: 'Get all users - placeholder' });
});

/* ============================
   🎨 ARTWORK ROUTES BY USER
   ============================ */
router.get('/:id/artworks', async (req, res) => {
  try {
    const userId = req.params.id;
    const showAll = req.query.all === 'true';

    const query = {
      $or: [
        { artist: userId },
        { artist: new mongoose.Types.ObjectId(userId) },
      ],
    };

    if (!showAll) {
      query.status = 'approved';
      query.visibility = 'public';
    }

    const artworks = await Artwork.find(query)
      .populate('artist', 'username profile.avatar')
      .sort({ createdAt: -1 })
      .lean();

    res.status(200).json({ success: true, data: artworks });
  } catch (error) {
    console.error('❌ Error fetching user artworks:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   👤 GET USER PROFILE
   ============================ */
router.get('/:id', async (req, res) => {
  try {
    console.log('📦 Fetching user by ID:', req.params.id);

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username profile.avatar')
      .populate('following', 'username profile.avatar')
      .lean();

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   ⚙️ UPDATE PROFILE
   ============================ */
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, profile, artistInfo, preferences } = req.body;

    if (req.user._id.toString() !== userId)
      return res.status(403).json({ success: false, message: 'Unauthorized' });

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (profile) updateData.profile = profile;
    if (artistInfo) updateData.artistInfo = artistInfo;
    if (preferences) updateData.preferences = preferences;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser)
      return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating profile:', error);
    if (error.code === 11000)
      return res.status(400).json({ success: false, message: 'Duplicate username or email' });
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   🖼️ UPLOAD AVATAR (Cloudinary)
   ============================ */
router.post('/:id/avatar', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id)
      return res.status(403).json({ success: false, message: 'Unauthorized' });

    const imageUrl = req.file.path;

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { 'profile.avatar': imageUrl },
      { new: true }
    ).select('-password');

    res.status(200).json({ success: true, url: imageUrl, user });
  } catch (error) {
    console.error('❌ Avatar upload failed:', error);
    res.status(500).json({ success: false, message: 'Avatar upload failed' });
  }
});

/* ============================
   👥 FOLLOW / UNFOLLOW USER
   ============================ */
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const targetId = req.params.id;

    if (currentUserId.toString() === targetId)
      return res.status(400).json({ success: false, message: "You can't follow yourself" });

    const user = await User.findById(currentUserId);
    const target = await User.findById(targetId);

    if (!target)
      return res.status(404).json({ success: false, message: 'User not found' });

    const isFollowing = user.following.includes(targetId);

    if (isFollowing) {
      user.following.pull(targetId);
      target.followers.pull(currentUserId);
    } else {
      user.following.push(targetId);
      target.followers.push(currentUserId);
    }

    await user.save();
    await target.save();

    res.status(200).json({
      success: true,
      message: isFollowing ? 'Unfollowed' : 'Followed',
      following: !isFollowing,
    });
  } catch (error) {
    console.error('❌ Follow/unfollow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   🛒 GET USER PURCHASES (Buyer)
   ============================ */
/* ============================
   🛒 GET USER PURCHASES (Buyer)
   ============================ */
router.get('/:id/purchases', async (req, res) => {
  try {
    const buyerId = req.params.id;

    // Find all completed transactions for this buyer
    const transactions = await Transaction.find({
      buyer: buyerId,
      status: 'completed',
    })
      .populate({
        path: 'artwork',
        populate: { path: 'artist', select: 'username profile.avatar' },
      })
      .sort({ createdAt: -1 })
      .lean();

    // Return an empty array instead of a 404 for cleaner UI
    if (!transactions.length) {
      return res.status(200).json({ success: true, purchases: [] });
    }

    // Format data for frontend
    const purchases = transactions.map((t) => ({
      _id: t.artwork?._id,
      title: t.artwork?.title || 'Untitled Artwork',
      price: t.amount,
      thumbnail: t.artwork?.thumbnail || t.artwork?.images?.[0]?.url || 'https://placehold.co/600x400',
      artist: t.artwork?.artist || {},
      purchasedAt: t.createdAt,
      status: t.status,
    }));

    res.status(200).json({ success: true, purchases });
  } catch (error) {
    console.error('❌ Error fetching purchases:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch purchases' });
  }
});


module.exports = router;
