const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;
const rateLimit = require('express-rate-limit');
const User = require('../models/User');
const Artwork = require('../models/Artwork');
const Notification = require('../models/Notification');
const Transaction = require('../models/Transaction');
const { protect } = require('../middleware/auth');

// Optional auth middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select('-password');
    }
  } catch (error) {
    // Silently fail - user just won't be authenticated
  }
  next();
};

/* ============================
   💾 IN-MEMORY CACHE FOR MINI PREVIEW
   ============================ */
const previewCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCachedPreview(userId) {
  const entry = previewCache.get(userId);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  previewCache.delete(userId);
  return null;
}

function setCachedPreview(userId, data) {
  previewCache.set(userId, {
    data,
    timestamp: Date.now()
  });
}

/* ============================
   🚦 RATE LIMITER FOR MINI PREVIEW
   ============================ */
const miniPreviewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per user
  message: { 
    success: false, 
    error: 'Too many preview requests, please wait',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
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
   🔍 GET SUGGESTED ARTISTS
   ============================ */
router.get('/suggestions', protect, async (req, res) => {
  try {
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit) || 10;

    // Get current user's following list
    const currentUser = await User.findById(currentUserId).select('following').lean();
    const followingIds = (currentUser?.following || []).map(id => id.toString());

    // Find artists that:
    // 1. Are not the current user
    // 2. Are not already followed
    // 3. Have the 'artist' role
    // 4. Have at least one approved artwork
    const suggestedArtists = await User.find({
      _id: { $ne: currentUserId, $nin: followingIds },
      role: 'artist'
    })
      .select('username profile.avatar profile.bio role followers')
      .limit(limit * 2) // Get more to filter
      .lean();

    // Filter artists who have at least one approved artwork
    const artistsWithArtworks = await Promise.all(
      suggestedArtists.map(async (artist) => {
        const artworkCount = await Artwork.countDocuments({
          artist: artist._id,
          status: 'approved',
          visibility: 'public'
        });
        return artworkCount > 0 ? artist : null;
      })
    );

    // Remove nulls and limit results
    const filteredArtists = artistsWithArtworks
      .filter(artist => artist !== null)
      .slice(0, limit);

    res.status(200).json({ 
      success: true, 
      data: filteredArtists 
    });
  } catch (error) {
    console.error('❌ Error fetching suggestions:', error);
    console.error('Error details:', error.message, error.stack);
    res.status(500).json({ success: false, message: 'Server error', error: error.message });
  }
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

/* ============================
   🎴 GET ARTIST MINI PREVIEW
   ============================ */
router.get('/:id/mini-preview', miniPreviewLimiter, optionalAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Validate ObjectId
    if (!mongoose.Types.ObjectId.isValid(userId)) {
      return res.status(400).json({ 
        success: false, 
        error: 'Invalid user ID',
        code: 'INVALID_USER_ID'
      });
    }

    // Check cache first
    const cached = getCachedPreview(userId);
    if (cached) {
      return res.status(200).json({ success: true, data: cached });
    }

    // Fetch user profile with minimal fields
    const user = await User.findById(userId)
      .select('username profile.avatar profile.bio followers following lastLogin')
      .lean();

    if (!user) {
      return res.status(404).json({ 
        success: false, 
        error: 'Artist not found',
        code: 'ARTIST_NOT_FOUND'
      });
    }

    // Fetch top 3 approved artworks
    const artworks = await Artwork.find({
      artist: userId,
      status: 'approved',
      visibility: 'public'
    })
      .select('title thumbnail createdAt')
      .sort({ createdAt: -1 })
      .limit(3)
      .lean();

    // Calculate stats
    const stats = {
      followers: user.followers?.length || 0,
      artworks: await Artwork.countDocuments({
        artist: userId,
        status: 'approved',
        visibility: 'public'
      })
    };

    // Determine online status and activity
    const now = Date.now();
    const lastActive = user.lastLogin ? new Date(user.lastLogin).getTime() : 0;
    const isOnline = (now - lastActive) < 5 * 60 * 1000; // Online if active within 5 minutes
    const isRecentlyActive = (now - lastActive) < 24 * 60 * 60 * 1000; // Active within 24 hours

    // Check if recently posted (within 7 days)
    const recentArtwork = artworks.length > 0 ? artworks[0] : null;
    const isRecentlyPosted = recentArtwork && 
      (now - new Date(recentArtwork.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000;

    // Get follow date if current user is authenticated
    let followedAt = null;
    if (req.user) {
      const currentUser = await User.findById(req.user._id)
        .select('following')
        .lean();
      
      if (currentUser?.following?.some(id => id.toString() === userId)) {
        // Note: We don't have the exact follow date in the current schema
        // This would require a separate Follow model with timestamps
        followedAt = null; // Placeholder for future implementation
      }
    }

    // Build response
    const previewData = {
      user: {
        _id: user._id,
        username: user.username,
        profile: {
          avatar: user.profile?.avatar || null,
          bio: user.profile?.bio || null
        },
        stats,
        isOnline,
        lastActive: user.lastLogin
      },
      artworks: artworks.map(art => ({
        _id: art._id,
        title: art.title,
        thumbnail: art.thumbnail,
        createdAt: art.createdAt
      })),
      followedAt,
      badges: {
        recentlyActive: isRecentlyActive,
        recentlyPosted: isRecentlyPosted
      }
    };

    // Cache the result
    setCachedPreview(userId, previewData);

    res.status(200).json({ success: true, data: previewData });
  } catch (error) {
    console.error('❌ Error fetching mini preview:', error);
    res.status(500).json({ 
      success: false, 
      error: 'Failed to fetch preview',
      code: 'SERVER_ERROR'
    });
  }
});

/* ============================
   📊 GET USER STATS (Role-Aware)
   ============================ */
router.get('/:id/stats', optionalAuth, async (req, res) => {
  try {
    const userId = req.params.id;

    // Get user to determine role
    const user = await User.findById(userId).select('role').lean();
    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Parallel queries for optimal performance
    const statsPromises = {
      followers: User.findById(userId).select('followers').lean(),
      following: User.findById(userId).select('following').lean(),
    };

    // Role-specific stats
    if (user.role === 'artist') {
      statsPromises.posts = Artwork.countDocuments({
        artist: userId,
        status: 'approved',
        visibility: 'public'
      });
      statsPromises.sales = Transaction.countDocuments({
        seller: userId,
        status: 'completed'
      });
    } else if (user.role === 'buyer') {
      statsPromises.purchases = Transaction.countDocuments({
        buyer: userId,
        status: 'completed'
      });
    }

    // Execute all queries in parallel
    const results = await Promise.all(
      Object.entries(statsPromises).map(async ([key, promise]) => {
        const result = await promise;
        return [key, result];
      })
    );

    // Build stats object
    const stats = {};
    results.forEach(([key, value]) => {
      if (key === 'followers' || key === 'following') {
        stats[key] = value?.[key]?.length || 0;
      } else {
        stats[key] = value || 0;
      }
    });

    // Add role for frontend
    stats.role = user.role;

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('❌ Error fetching user stats:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch stats' });
  }
});

/* ============================
   👤 GET USER PROFILE
   ============================ */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    console.log('📦 Fetching user by ID:', req.params.id);

    const user = await User.findById(req.params.id)
      .select('-password')
      .populate('followers', 'username profile.avatar')
      .populate('following', 'username profile.avatar')
      .lean();

    if (!user)
      return res.status(404).json({ success: false, message: 'User not found' });

    // Add isFollowing field if user is authenticated
    if (req.user) {
      const currentUserId = req.user._id.toString();
      user.isFollowing = user.followers.some(
        follower => follower._id.toString() === currentUserId
      );
    } else {
      user.isFollowing = false;
    }

    // Add quick stats
    user.stats = {
      followers: user.followers?.length || 0,
      following: user.following?.length || 0
    };

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
   👥 GET FOLLOWING LIST
   ============================ */
router.get('/:id/following', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .select('following')
      .populate('following', 'username profile.avatar profile.bio role followers')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ 
      success: true, 
      data: user.following || [] 
    });
  } catch (error) {
    console.error('❌ Error fetching following list:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   👥 GET FOLLOWERS LIST
   ============================ */
router.get('/:id/followers', async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId)
      .select('followers')
      .populate('followers', 'username profile.avatar profile.bio role followers')
      .lean();

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    res.status(200).json({ 
      success: true, 
      data: user.followers || [] 
    });
  } catch (error) {
    console.error('❌ Error fetching followers list:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

/* ============================
   👥 FOLLOW USER (Idempotent)
   ============================ */
router.post('/:id/follow', protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentUserId = req.user._id;
    const targetId = req.params.id;

    // Validation
    if (currentUserId.toString() === targetId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "You can't follow yourself" });
    }

    // Check if target user exists
    const target = await User.findById(targetId).session(session);
    if (!target) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    // Check if already following (before update)
    const currentUser = await User.findById(currentUserId).session(session);
    const wasFollowing = currentUser.following.some(id => id.toString() === targetId);

    // Atomic operations using $addToSet (idempotent)
    const [updatedUser, updatedTarget] = await Promise.all([
      User.findByIdAndUpdate(
        currentUserId,
        { $addToSet: { following: targetId } },
        { new: true, session }
      ).select('following'),
      User.findByIdAndUpdate(
        targetId,
        { $addToSet: { followers: currentUserId } },
        { new: true, session }
      ).select('followers')
    ]);

    await session.commitTransaction();

    const isNewFollow = !wasFollowing;

    // Create notification only if this is a new follow
    if (isNewFollow) {
      const Notification = require('../models/Notification');
      const notification = await Notification.create({
        recipient: targetId,
        type: 'follow',
        content: {
          title: 'New Follower',
          message: `${req.user.username} started following you`,
          link: `/profile/${currentUserId}`
        },
        relatedUser: currentUserId
      });

      // Emit real-time notification via Socket.IO
      const io = req.app.get('io');
      if (io) {
        io.to(`user_${targetId}`).emit('notification:new', {
          ...notification.toObject(),
          sender: {
            _id: currentUserId,
            username: req.user.username,
            profile: { avatar: req.user.profile?.avatar }
          }
        });

        // Emit follower count update
        io.to(`user_${targetId}`).emit('follow:update', {
          followerCount: updatedTarget.followers.length
        });
      }
    }

    res.status(200).json({
      success: true,
      message: 'Followed successfully',
      data: {
        isFollowing: true,
        followerCount: updatedTarget.followers.length,
        followingCount: updatedUser.following.length
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Follow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    session.endSession();
  }
});

/* ============================
   👥 UNFOLLOW USER (Idempotent)
   ============================ */
router.delete('/:id/follow', protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const currentUserId = req.user._id;
    const targetId = req.params.id;

    // Validation
    if (currentUserId.toString() === targetId) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: "You can't unfollow yourself" });
    }

    // Atomic operations using $pull (idempotent)
    const [updatedUser, updatedTarget] = await Promise.all([
      User.findByIdAndUpdate(
        currentUserId,
        { $pull: { following: targetId } },
        { new: true, session }
      ).select('following'),
      User.findByIdAndUpdate(
        targetId,
        { $pull: { followers: currentUserId } },
        { new: true, session }
      ).select('followers')
    ]);

    await session.commitTransaction();

    // Emit real-time follower count update
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${targetId}`).emit('follow:update', {
        followerCount: updatedTarget.followers.length
      });
    }

    res.status(200).json({
      success: true,
      message: 'Unfollowed successfully',
      data: {
        isFollowing: false,
        followerCount: updatedTarget.followers.length,
        followingCount: updatedUser.following.length
      }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Unfollow error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  } finally {
    session.endSession();
  }
});

module.exports = router;
