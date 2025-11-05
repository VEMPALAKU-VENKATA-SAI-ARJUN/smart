const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');

const User = require('../models/User');
const Artwork = require('../models/Artwork');
const { protect } = require('../middleware/auth');

/* ============================
   ✅ USER ROUTES
   ============================ */

/**
 * @route   GET /api/users
 * @desc    Get all users (placeholder / for admin use later)
 */
router.get('/', (req, res) => {
  res.json({ message: 'Get all users - route placeholder' });
});

/* ============================
   🎨 ARTWORK ROUTES BY USER
   ============================ */

/**
 * @route   GET /api/users/:id/artworks
 * @desc    Get all artworks for a user (artist)
 * @query   ?all=true → show drafts & private for dashboard view
 */
router.get('/:id/artworks', async (req, res) => {
  try {
    const userId = req.params.id;
    const showAll = req.query.all === 'true';

    // Build query: support both string and ObjectId refs
    const query = {
      $or: [
        { artist: userId },
        { artist: new mongoose.Types.ObjectId(userId) },
      ],
    };

    // Public gallery only (approved + public)
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
   👤 USER PROFILE ROUTES
   ============================ */

/**
 * @route   GET /api/users/:id
 * @desc    Get user by ID
 */
router.get('/:id', async (req, res) => {
  try {
    console.log('📦 [UserRoute] Fetch request for ID:', req.params.id);

    const user = await User.findById(req.params.id)
      .select('-password')
      .lean();

    if (!user) {
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });
    }

    console.log(
      `[GET /api/users/:id] Found user: ${user.username} (${user.role})`
    );

    res.status(200).json({ success: true, data: user });
  } catch (error) {
    console.error('❌ Error fetching user:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   🛠️ ROLE MANAGEMENT (DEV TOOL)
   ============================ */

/**
 * @route   PATCH /api/users/:id/role
 * @desc    Update a user's role
 */
router.patch('/:id/role', async (req, res) => {
  try {
    const { role } = req.body;

    if (!['buyer', 'artist', 'moderator', 'admin'].includes(role)) {
      return res
        .status(400)
        .json({ success: false, message: 'Invalid role value' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true }
    ).select('-password');

    if (!user)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      data: user,
      message: `User role updated to ${role}`,
    });
  } catch (error) {
    console.error('❌ Error updating user role:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   🧠 USER SUGGESTIONS (FOLLOW SYSTEM)
   ============================ */

/**
 * @route   GET /api/users/suggestions
 * @desc    Suggest artists that current user isn't following
 */
router.get('/suggestions', async (req, res) => {
  try {
    let followingIds = [];
    let currentUserId = null;

    if (req.headers.authorization) {
      try {
        const token = req.headers.authorization.split(' ')[1];
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        currentUserId = decoded.id;

        const currentUser = await User.findById(currentUserId);
        followingIds = currentUser?.following || [];
      } catch (err) {
        console.warn('⚠️ Invalid token while fetching suggestions');
      }
    }

    const suggestions = await User.find({
      _id: { $nin: [...followingIds, currentUserId].filter(Boolean) },
      role: 'artist',
      isActive: true,
    })
      .select('username profile.avatar profile.bio role followers')
      .sort({ 'followers.length': -1 })
      .limit(12)
      .lean();

    res.status(200).json({ success: true, data: suggestions });
  } catch (error) {
    console.error('❌ Error fetching artist suggestions:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   ⚙️ PROFILE UPDATE
   ============================ */

/**
 * @route   PUT /api/users/:id
 * @desc    Update user profile (self only)
 */
router.put('/:id', protect, async (req, res) => {
  try {
    const userId = req.params.id;
    const { username, email, profile } = req.body;

    if (req.user._id.toString() !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile',
      });
    }

    const updateData = {};
    if (username) updateData.username = username;
    if (email) updateData.email = email;
    if (profile) updateData.profile = profile;

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      updateData,
      { new: true, runValidators: true }
    ).select('-password');

    if (!updatedUser)
      return res
        .status(404)
        .json({ success: false, message: 'User not found' });

    res.status(200).json({
      success: true,
      data: updatedUser,
      message: 'Profile updated successfully',
    });
  } catch (error) {
    console.error('❌ Error updating user profile:', error);

    if (error.code === 11000) {
      return res.status(400).json({
        success: false,
        message: 'Username or email already exists',
      });
    }

    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   🗑️ USER DELETE (placeholder)
   ============================ */
router.delete('/:id', (req, res) => {
  res.json({ message: `Delete user ${req.params.id} - placeholder route` });
});

module.exports = router;
