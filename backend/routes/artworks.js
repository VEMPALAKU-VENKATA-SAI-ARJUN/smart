// routes/artworks.js

const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Artwork = require('../models/Artwork');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { upload } = require('../config/cloudinary');
const { moderateArtwork } = require('../utils/aiModeration');

// Get feed artworks from followed artists
router.get('/feed', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    const currentUser = await User.findById(req.user._id);
    const followingIds = currentUser.following || [];
    
    if (followingIds.length === 0) {
      return res.json({ success: true, data: [], pagination: { page: 1, limit, total: 0, pages: 0 } });
    }
    
    const artworks = await Artwork.find({
      artist: { $in: followingIds },
      status: 'approved',
      visibility: 'public'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit))
    .populate('artist', 'username profile.avatar')
    .lean();
    
    const total = await Artwork.countDocuments({
      artist: { $in: followingIds },
      status: 'approved',
      visibility: 'public'
    });
    
    res.json({
      success: true,
      data: artworks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get platform statistics
router.get('/stats', async (req, res) => {
  try {
    // Get total artworks count
    const totalArtworks = await Artwork.countDocuments({ 
      status: 'approved', 
      visibility: 'public' 
    });
    
    // Get total artists count
    const totalArtists = await Artwork.distinct('artist', { 
      status: 'approved', 
      visibility: 'public' 
    }).then(artists => artists.length);
    
    // Calculate AI accuracy (approved artworks / total processed)
    const totalProcessed = await Artwork.countDocuments({ 
      'moderationStatus.aiChecked': true 
    });
    const approvedByAI = await Artwork.countDocuments({ 
      status: 'approved',
      'moderationStatus.aiChecked': true 
    });
    
    const aiAccuracy = totalProcessed > 0 ? 
      Math.round((approvedByAI / totalProcessed) * 100) : 98;
    
    res.json({
      success: true,
      data: {
        totalArtworks,
        totalArtists,
        aiAccuracy,
        totalProcessed,
        approvedByAI
      }
    });
  } catch (error) {
    console.error('Stats endpoint error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get popular tags
router.get('/popular-tags', async (req, res) => {
  try {
    const tags = await Artwork.aggregate([
      { $match: { status: 'approved', visibility: 'public', tags: { $exists: true, $ne: [] } } },
      { $unwind: '$tags' },
      { $group: { _id: '$tags', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 50 },
      { $project: { _id: 0, tag: '$_id', count: 1 } }
    ]);
    
    // Fallback tags if no artworks exist
    const fallbackTags = [
      'digital-art', 'painting', 'illustration', 'photography', 'abstract',
      'portrait', 'landscape', 'fantasy', 'anime', 'concept-art',
      'watercolor', 'oil-painting', 'sketch', 'character-design', 'nature'
    ];
    
    const resultTags = tags.length > 0 ? tags.map(t => t.tag) : fallbackTags;
    
    res.json({
      success: true,
      data: resultTags
    });
  } catch (error) {
    console.error('Popular tags error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get artwork categories
router.get('/categories', async (req, res) => {
  try {
    const categories = await Artwork.distinct('category', { 
      status: 'approved', 
      visibility: 'public' 
    });
    
    // Add count for each category
    const categoriesWithCount = await Promise.all(
      categories.map(async (category) => {
        const count = await Artwork.countDocuments({
          category,
          status: 'approved',
          visibility: 'public'
        });
        return { name: category, count };
      })
    );
    
    res.json({
      success: true,
      data: categoriesWithCount.sort((a, b) => b.count - a.count)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get all artworks with filters (show all for owner, only approved/public for others)
// ✅ PUBLIC GALLERY ENDPOINT – only approved + public artworks
router.get('/', async (req, res) => {
  try {
    const {
      category,
      minPrice,
      maxPrice,
      tags,
      sortBy = 'createdAt',
      order = 'desc',
      page = 1,
      limit = 20,
      search,
    } = req.query;

    // ✅ Only fetch APPROVED + PUBLIC artworks
    const query = {
      status: 'approved',
      visibility: 'public',
    };

    if (category) query.category = category;
    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }
    if (tags) query.tags = { $in: tags.split(',') };
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $regex: search, $options: 'i' } },
      ];
    }

    const sortOrder = order === 'desc' ? -1 : 1;
    const sortOptions = {};
    sortOptions[sortBy] = sortOrder;

    const skip = (page - 1) * limit;

    console.log('🎨 Fetching only approved artworks with query:', query);

    const artworks = await Artwork.find(query)
      .sort(sortOptions)
      .skip(skip)
      .limit(Number(limit))
      .populate('artist', 'username profile.avatar')
      .lean();

    const total = await Artwork.countDocuments(query);

    res.json({
      success: true,
      data: artworks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    console.error('❌ Error fetching artworks:', error);
    res.status(500).json({
      success: false,
      message: error.message,
    });
  }
});

// Upload artwork
router.post('/', protect, upload.array('images', 5), async (req, res) => {
  try {
    const { title, description, category, tags, price, status = 'pending' } = req.body;
    
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ 
        success: false, 
        message: 'Please upload at least one image' 
      });
    }
    
    const images = req.files.map(file => ({
      url: file.path,
      publicId: file.filename,
      width: file.width || null,
      height: file.height || null,
      format: file.mimetype.split('/')[1]
    }));
    
    // Enhanced AI Moderation
    let moderationResult = null;
    let finalStatus = status;
    
    try {
      const tagsArray = tags ? tags.split(',').map(tag => tag.trim()) : [];
      
      // Run comprehensive AI moderation
      moderationResult = await moderateArtwork(
        images[0].url,
        'temp-id', // Will be replaced with actual ID after creation
        title,
        description,
        tagsArray
      );
      
      console.log('🤖 AI Moderation Result:', {
        recommendation: moderationResult.recommendation,
        score: moderationResult.overallScore,
        flags: moderationResult.flags.length
      });
      
      // Determine final status based on AI recommendation
      if (status === 'draft') {
        // Drafts bypass moderation
        finalStatus = 'draft';
      } else {
        switch (moderationResult.recommendation) {
          case 'auto_approve':
            finalStatus = 'approved';
            break;
          case 'reject':
            finalStatus = 'rejected';
            break;
          case 'review':
          case 'manual_review':
          default:
            finalStatus = 'pending';
            break;
        }
      }
      
    } catch (moderationError) {
      console.error('AI moderation error:', moderationError.message);
      // Default to pending review on moderation error
      finalStatus = status === 'draft' ? 'draft' : 'pending';
    }
    
    const artwork = await Artwork.create({
      title,
      description,
      artist: req.user._id,
      images,
      thumbnail: images[0].url,
      category,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      price: Number(price),
      status: finalStatus,
      moderationStatus: {
        aiChecked: moderationResult ? true : false,
        nsfwScore: moderationResult?.analysis?.nsfw?.score || 0,
        plagiarismScore: moderationResult?.analysis?.plagiarism?.score || 0,
        flaggedReasons: moderationResult?.flags?.map(f => f.message) || [],
        moderatorNotes: moderationResult?.recommendation === 'auto_approve' ? 'Auto-approved by AI' : null,
        reviewedAt: moderationResult?.recommendation === 'auto_approve' ? new Date() : null
      }
    });
    
    // Generate appropriate response message
    let responseMessage = 'Artwork uploaded successfully';
    if (finalStatus === 'approved') {
      responseMessage = 'Artwork uploaded and auto-approved!';
    } else if (finalStatus === 'rejected') {
      responseMessage = 'Artwork uploaded but rejected by AI moderation';
    } else if (finalStatus === 'pending') {
      responseMessage = moderationResult?.flags?.length > 0 
        ? 'Artwork uploaded and flagged for review' 
        : 'Artwork uploaded and pending review';
    } else if (finalStatus === 'draft') {
      responseMessage = 'Artwork saved as draft';
    }
    
    res.status(201).json({
      success: true,
      data: artwork,
      message: responseMessage,
      moderation: moderationResult ? {
        recommendation: moderationResult.recommendation,
        score: moderationResult.overallScore,
        flagsCount: moderationResult.flags.length,
        confidence: moderationResult.confidence
      } : null
    });
  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Like/Unlike artwork
router.post('/:id/like', protect, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) {
      return res.status(404).json({ 
        success: false, 
        message: 'Artwork not found' 
      });
    }

    const user = await User.findById(req.user._id);
    const isLiked = user.likedArtworks?.includes(req.params.id);

    if (isLiked) {
      // Unlike
      user.likedArtworks = user.likedArtworks.filter(id => id.toString() !== req.params.id);
      artwork.stats.likes = Math.max(0, (artwork.stats.likes || 0) - 1);
    } else {
      // Like
      if (!user.likedArtworks) user.likedArtworks = [];
      user.likedArtworks.push(req.params.id);
      artwork.stats.likes = (artwork.stats.likes || 0) + 1;
    }

    await Promise.all([user.save(), artwork.save()]);

    res.json({
      success: true,
      isActive: !isLiked,
      count: artwork.stats.likes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Add/Remove from wishlist
router.post('/:id/wishlist', protect, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);
    if (!artwork) {
      return res.status(404).json({ 
        success: false, 
        message: 'Artwork not found' 
      });
    }

    const user = await User.findById(req.user._id);
    const isInWishlist = user.wishlist?.includes(req.params.id);

    if (isInWishlist) {
      // Remove from wishlist
      user.wishlist = user.wishlist.filter(id => id.toString() !== req.params.id);
    } else {
      // Add to wishlist
      if (!user.wishlist) user.wishlist = [];
      user.wishlist.push(req.params.id);
    }

    await user.save();

    res.json({
      success: true,
      isActive: !isInWishlist,
      count: user.wishlist.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Check like/wishlist status
router.get('/:id/like/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const artwork = await Artwork.findById(req.params.id);
    
    const isActive = user.likedArtworks?.includes(req.params.id) || false;
    const count = artwork?.stats?.likes || 0;

    res.json({
      success: true,
      isActive,
      count
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

router.get('/:id/wishlist/status', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id);
    const isActive = user.wishlist?.includes(req.params.id) || false;

    res.json({
      success: true,
      isActive,
      count: user.wishlist?.length || 0
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get user's liked artworks
router.get('/user/liked', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id).populate({
      path: 'likedArtworks',
      populate: {
        path: 'artist',
        select: 'username profile.avatar'
      },
      options: {
        skip: skip,
        limit: Number(limit),
        sort: { createdAt: -1 }
      }
    });

    const likedArtworks = user.likedArtworks || [];
    const total = user.likedArtworks?.length || 0;

    res.json({
      success: true,
      data: likedArtworks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get user's wishlist
router.get('/user/wishlist', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.user._id).populate({
      path: 'wishlist',
      populate: {
        path: 'artist',
        select: 'username profile.avatar'
      },
      options: {
        skip: skip,
        limit: Number(limit),
        sort: { createdAt: -1 }
      }
    });

    const wishlist = user.wishlist || [];
    const total = user.wishlist?.length || 0;

    res.json({
      success: true,
      data: wishlist,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Get single artwork
router.get('/:id', async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id)
      .populate('artist', 'username profile email artistInfo')
      .populate('soldTo', 'username');
    
    if (!artwork) {
      return res.status(404).json({ 
        success: false, 
        message: 'Artwork not found' 
      });
    }
    
    // Increment view count
    artwork.stats.views += 1;
    await artwork.save();
    
    res.json({
      success: true,
      data: artwork
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;