// routes/moderation.js - Moderation routes for moderators
const express = require('express');
const router = express.Router();
const Artwork = require('../models/Artwork');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');
const { restrictTo } = require('../middleware/auth');
const { moderateArtwork, batchModerate, getModerationStats, analyzeImageQuality, analyzeTextContent, testNSFWDetection, getSystemStatus, clearCache, updateThresholds } = require('../utils/aiModeration');

// Test route to check if moderation routes are working
router.get('/test', (req, res) => {
  console.log('Test route hit!');
  res.json({ success: true, message: 'Moderation routes working' });
});

// Health check route
router.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'AI Moderation system is running',
    timestamp: new Date().toISOString(),
    features: [
      'Enhanced NSFW Detection',
      'Plagiarism Analysis',
      'Quality Assessment',
      'Text Content Analysis'
    ]
  });
});

// Test AI moderation system
router.post('/test-ai', protect, async (req, res) => {
  try {
    const { imageUrl, title = 'Test Title', description = 'Test Description' } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required for testing'
      });
    }

    console.log('🧪 Testing AI moderation with:', imageUrl);

    const result = await moderateArtwork(imageUrl, 'test-id', title, description, ['test']);

    res.json({
      success: true,
      data: result,
      message: 'AI moderation test completed'
    });
  } catch (error) {
    console.error('AI moderation test error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Test NSFW detection specifically
router.post('/test-nsfw', async (req, res) => {
  try {
    const { imageUrl } = req.body;

    if (!imageUrl) {
      return res.status(400).json({
        success: false,
        message: 'imageUrl is required for NSFW testing'
      });
    }

    console.log('🧪 Testing NSFW detection with:', imageUrl);

    const result = await testNSFWDetection(imageUrl);

    res.json({
      success: true,
      data: result,
      message: 'NSFW detection test completed'
    });
  } catch (error) {
    console.error('NSFW test error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get pending artworks for moderation with enhanced filtering
router.get('/queue', protect, async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      flagType,
      search,
      sortBy = 'oldest',
      riskLevel
    } = req.query;

    const query = { status: 'pending' };

    // Flag type filter
    if (flagType) {
      query['moderationStatus.flaggedReasons'] = {
        $regex: flagType,
        $options: 'i'
      };
    }

    // Risk level filter
    if (riskLevel) {
      const riskThresholds = {
        low: { $lt: 0.3 },
        medium: { $gte: 0.3, $lt: 0.7 },
        high: { $gte: 0.7 }
      };

      if (riskThresholds[riskLevel]) {
        query.$expr = {
          $and: [
            { $gte: [{ $add: ['$moderationStatus.nsfwScore', '$moderationStatus.plagiarismScore'] }, riskThresholds[riskLevel].$gte || 0] },
            { $lt: [{ $add: ['$moderationStatus.nsfwScore', '$moderationStatus.plagiarismScore'] }, riskThresholds[riskLevel].$lt || 2] }
          ]
        };
      }
    }

    // Search filter
    if (search) {
      query.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
        { tags: { $in: [new RegExp(search, 'i')] } }
      ];
    }

    // Sorting options
    let sortOptions = {};
    switch (sortBy) {
      case 'newest':
        sortOptions = { createdAt: -1 };
        break;
      case 'oldest':
        sortOptions = { createdAt: 1 };
        break;
      case 'highest-risk':
        // Sort by combined risk score (calculated in aggregation)
        break;
      case 'lowest-risk':
        // Sort by combined risk score (calculated in aggregation)
        break;
      default:
        sortOptions = { createdAt: 1 };
    }

    let artworks;

    // Use aggregation for risk-based sorting
    if (sortBy === 'highest-risk' || sortBy === 'lowest-risk') {
      const pipeline = [
        { $match: query },
        {
          $addFields: {
            riskScore: {
              $add: [
                { $ifNull: ['$moderationStatus.nsfwScore', 0] },
                { $ifNull: ['$moderationStatus.plagiarismScore', 0] }
              ]
            }
          }
        },
        { $sort: { riskScore: sortBy === 'highest-risk' ? -1 : 1 } },
        { $skip: (page - 1) * Number(limit) },
        { $limit: Number(limit) },
        {
          $lookup: {
            from: 'users',
            localField: 'artist',
            foreignField: '_id',
            as: 'artist',
            pipeline: [{ $project: { username: 1, email: 1, profile: 1 } }]
          }
        },
        { $unwind: '$artist' }
      ];

      artworks = await Artwork.aggregate(pipeline);
    } else {
      artworks = await Artwork.find(query)
        .sort(sortOptions)
        .skip((page - 1) * Number(limit))
        .limit(Number(limit))
        .populate('artist', 'username email profile')
        .lean();
    }

    const total = await Artwork.countDocuments(query);

    res.json({
      success: true,
      data: artworks,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit))
      },
      filters: {
        flagType,
        search,
        sortBy,
        riskLevel
      }
    });
  } catch (error) {
    console.error('Queue fetch error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Approve artwork
router.patch('/:id/approve', protect, restrictTo('moderator', 'admin'), async (req, res) => {
  try {
    console.log('Approving artwork:', req.params.id);
    console.log('User approving:', req.user);

    const { moderatorNotes } = req.body;

    const artwork = await Artwork.findByIdAndUpdate(
      req.params.id,
      {
        status: 'approved',
        'moderationStatus.reviewedBy': req.user._id,
        'moderationStatus.reviewedAt': new Date(),
        'moderationStatus.moderatorNotes': moderatorNotes,
        'moderationStatus.aiChecked': true // Include in AI stats
      },
      { new: true }
    ).populate('artist');

    if (!artwork) {
      console.log('Artwork not found:', req.params.id);
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }

    console.log('Artwork updated successfully:', artwork.title);

    // Notify artist (skip if Notification model doesn't exist)
    try {
      await Notification.create({
        recipient: artwork.artist._id,
        type: 'moderation-update',
        content: {
          title: 'Artwork Approved',
          message: `Your artwork "${artwork.title}" has been approved!`,
          link: `/artwork/${artwork._id}`
        },
        relatedArtwork: artwork._id
      });
      console.log('Notification created successfully');
    } catch (notificationError) {
      console.log('Notification creation failed (this is optional):', notificationError.message);
    }

    res.json({
      success: true,
      data: artwork,
      message: 'Artwork approved successfully'
    });
  } catch (error) {
    console.error('Approval error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Reject artwork
router.patch('/:id/reject', protect, restrictTo('moderator', 'admin'), async (req, res) => {
  try {
    const { reason, moderatorNotes } = req.body;

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason required' });
    }

    const artwork = await Artwork.findByIdAndUpdate(
      req.params.id,
      {
        status: 'rejected',
        'moderationStatus.reviewedBy': req.user._id,
        'moderationStatus.reviewedAt': new Date(),
        'moderationStatus.moderatorNotes': moderatorNotes,
        'moderationStatus.aiChecked': true, // Include in AI stats
        $push: { 'moderationStatus.flaggedReasons': reason }
      },
      { new: true }
    ).populate('artist');

    if (!artwork) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }

    // Notify artist
    await Notification.create({
      recipient: artwork.artist._id,
      type: 'moderation-update',
      content: {
        title: 'Artwork Rejected',
        message: `Your artwork "${artwork.title}" was rejected. Reason: ${reason}`,
        link: `/artwork/${artwork._id}`
      },
      relatedArtwork: artwork._id
    });

    res.json({
      success: true,
      data: artwork,
      message: 'Artwork rejected'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Re-run AI moderation on artwork
router.post('/:id/recheck', protect, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id);

    if (!artwork) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }

    const moderationResult = await moderateArtwork(
      artwork.images[0].url,
      artwork._id,
      artwork.title,
      artwork.description,
      artwork.tags
    );

    // Update artwork with new moderation results
    const updateData = {
      'moderationStatus.aiChecked': true,
      'moderationStatus.nsfwScore': moderationResult.analysis?.nsfw?.score || 0,
      'moderationStatus.plagiarismScore': moderationResult.analysis?.plagiarism?.score || 0,
      'moderationStatus.flaggedReasons': moderationResult.flags?.map(f => f.message) || []
    };

    // Also update status based on new moderation result
    if (moderationResult.recommendation === 'reject') {
      updateData.status = 'rejected';
    } else if (moderationResult.recommendation === 'auto_approve') {
      updateData.status = 'approved';
      updateData['moderationStatus.reviewedAt'] = new Date();
      updateData['moderationStatus.moderatorNotes'] = 'Auto-approved by AI recheck';
    }

    await Artwork.findByIdAndUpdate(artwork._id, updateData);

    console.log('✅ Updated moderation scores:', {
      nsfwScore: moderationResult.analysis?.nsfw?.score,
      plagiarismScore: moderationResult.analysis?.plagiarism?.score,
      recommendation: moderationResult.recommendation
    });

    res.json({
      success: true,
      data: moderationResult,
      message: 'AI moderation check completed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get AI moderation statistics
router.get('/ai-stats', protect, async (req, res) => {
  try {
    const { days = 300 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Get artworks from the specified period
    const artworks = await Artwork.find({
      createdAt: { $gte: startDate },
      'moderationStatus.aiChecked': true
    }).lean();

    // Calculate statistics
    const stats = {
      totalProcessed: artworks.length,
      autoApproved: artworks.filter(a => a.status === 'approved' && a.moderationStatus.reviewedAt && !a.moderationStatus.reviewedBy).length,
      flaggedForReview: artworks.filter(a => a.moderationStatus.flaggedReasons.length > 0).length,
      rejected: artworks.filter(a => a.status === 'rejected').length,
      averageNsfwScore: 0,
      averagePlagiarismScore: 0,
      flagTypes: {},
      qualityDistribution: { low: 0, medium: 0, high: 0 }
    };

    // Calculate averages and flag distribution
    let nsfwSum = 0, plagiarismSum = 0;
    artworks.forEach(artwork => {
      if (artwork.moderationStatus.nsfwScore) {
        nsfwSum += artwork.moderationStatus.nsfwScore;
      }
      if (artwork.moderationStatus.plagiarismScore) {
        plagiarismSum += artwork.moderationStatus.plagiarismScore;
      }

      // Count flag types
      artwork.moderationStatus.flaggedReasons.forEach(reason => {
        const flagType = reason.toLowerCase().includes('nsfw') ? 'nsfw' :
          reason.toLowerCase().includes('plagiarism') ? 'plagiarism' :
            reason.toLowerCase().includes('quality') ? 'quality' :
              reason.toLowerCase().includes('spam') ? 'spam' : 'other';
        stats.flagTypes[flagType] = (stats.flagTypes[flagType] || 0) + 1;
      });
    });

    stats.averageNsfwScore = artworks.length > 0 ? nsfwSum / artworks.length : 0;
    stats.averagePlagiarismScore = artworks.length > 0 ? plagiarismSum / artworks.length : 0;
    stats.autoApprovalRate = artworks.length > 0 ? (stats.autoApproved / artworks.length) * 100 : 0;
    stats.flagRate = artworks.length > 0 ? (stats.flaggedForReview / artworks.length) * 100 : 0;

    res.json({
      success: true,
      data: stats,
      period: `${days} days`,
      message: 'AI moderation statistics retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Batch AI moderation for pending artworks
router.post('/batch-moderate', protect, restrictTo('moderator', 'admin'), async (req, res) => {
  try {
    const { limit = 50, autoApprove = false } = req.body;

    // Get pending artworks that haven't been AI checked
    const pendingArtworks = await Artwork.find({
      status: 'pending',
      'moderationStatus.aiChecked': { $ne: true }
    })
      .limit(limit)
      .populate('artist', 'username')
      .lean();

    if (pendingArtworks.length === 0) {
      return res.json({
        success: true,
        message: 'No pending artworks found for AI moderation',
        processed: 0
      });
    }

    console.log(`🔄 Starting batch AI moderation for ${pendingArtworks.length} artworks`);

    // Prepare artworks for batch processing
    const artworksForModeration = pendingArtworks.map(artwork => ({
      id: artwork._id,
      imageUrl: artwork.images[0]?.url,
      title: artwork.title,
      description: artwork.description,
      tags: artwork.tags
    }));

    // Run batch moderation
    const results = await batchModerate(artworksForModeration);

    // Update artworks based on results
    const updatePromises = results.map(async (result, index) => {
      const artwork = pendingArtworks[index];
      const updateData = {
        'moderationStatus.aiChecked': true,
        'moderationStatus.nsfwScore': result.analysis?.nsfw?.score || 0,
        'moderationStatus.plagiarismScore': result.analysis?.plagiarism?.score || 0,
        'moderationStatus.flaggedReasons': result.flags?.map(f => f.message) || []
      };

      // Auto-approve if enabled and AI recommends it
      if (autoApprove && result.recommendation === 'auto_approve') {
        updateData.status = 'approved';
        updateData['moderationStatus.reviewedAt'] = new Date();
        updateData['moderationStatus.moderatorNotes'] = 'Auto-approved by AI moderation';
      }

      return Artwork.findByIdAndUpdate(artwork._id, updateData);
    });

    await Promise.all(updatePromises);

    // Generate statistics
    const stats = getModerationStats(results);

    res.json({
      success: true,
      data: {
        processed: results.length,
        stats,
        results: results.map(r => ({
          artworkId: r.artworkId,
          recommendation: r.recommendation,
          score: r.overallScore,
          flagsCount: r.flags?.length || 0
        }))
      },
      message: `Batch AI moderation completed for ${results.length} artworks`
    });

  } catch (error) {
    console.error('Batch moderation error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get detailed AI analysis for specific artwork
router.get('/:id/ai-analysis', protect, async (req, res) => {
  try {
    const artwork = await Artwork.findById(req.params.id).populate('artist', 'username email');

    if (!artwork) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }

    // Run fresh AI analysis
    const analysis = await moderateArtwork(
      artwork.images[0].url,
      artwork._id,
      artwork.title,
      artwork.description,
      artwork.tags
    );

    // Also get image quality analysis
    const qualityAnalysis = await analyzeImageQuality(artwork.images[0].url);
    const textAnalysis = analyzeTextContent(artwork.title, artwork.description, artwork.tags);

    res.json({
      success: true,
      data: {
        artwork: {
          id: artwork._id,
          title: artwork.title,
          artist: artwork.artist.username,
          status: artwork.status,
          createdAt: artwork.createdAt
        },
        analysis,
        qualityAnalysis,
        textAnalysis,
        currentModerationStatus: artwork.moderationStatus
      },
      message: 'Detailed AI analysis completed'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk approve artworks
router.post('/bulk-approve', protect, restrictTo('moderator', 'admin'), async (req, res) => {
  try {
    const { artworkIds, moderatorNotes } = req.body;

    if (!artworkIds || !Array.isArray(artworkIds) || artworkIds.length === 0) {
      return res.status(400).json({ success: false, message: 'artworkIds array is required' });
    }

    const updateData = {
      status: 'approved',
      'moderationStatus.reviewedBy': req.user._id,
      'moderationStatus.reviewedAt': new Date(),
      'moderationStatus.moderatorNotes': moderatorNotes || 'Bulk approved',
      'moderationStatus.aiChecked': true // Include in AI stats
    };

    const result = await Artwork.updateMany(
      { _id: { $in: artworkIds }, status: 'pending' },
      updateData
    );

    // Get updated artworks for notifications
    const artworks = await Artwork.find({ _id: { $in: artworkIds } }).populate('artist');

    // Send notifications (in background)
    const notificationPromises = artworks.map(artwork =>
      Notification.create({
        recipient: artwork.artist._id,
        type: 'moderation-update',
        content: {
          title: 'Artwork Approved',
          message: `Your artwork "${artwork.title}" has been approved!`,
          link: `/artwork/${artwork._id}`
        },
        relatedArtwork: artwork._id
      }).catch(err => console.log('Notification error:', err.message))
    );

    Promise.all(notificationPromises);

    res.json({
      success: true,
      data: {
        modified: result.modifiedCount,
        artworks: artworks.length
      },
      message: `${result.modifiedCount} artworks approved successfully`
    });
  } catch (error) {
    console.error('Bulk approve error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Bulk reject artworks
router.post('/bulk-reject', protect, restrictTo('moderator', 'admin'), async (req, res) => {
  try {
    const { artworkIds, reason, moderatorNotes } = req.body;

    if (!artworkIds || !Array.isArray(artworkIds) || artworkIds.length === 0) {
      return res.status(400).json({ success: false, message: 'artworkIds array is required' });
    }

    if (!reason) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const updateData = {
      status: 'rejected',
      'moderationStatus.reviewedBy': req.user._id,
      'moderationStatus.reviewedAt': new Date(),
      'moderationStatus.moderatorNotes': moderatorNotes || 'Bulk rejected',
      'moderationStatus.aiChecked': true, // Include in AI stats
      $push: { 'moderationStatus.flaggedReasons': reason }
    };

    const result = await Artwork.updateMany(
      { _id: { $in: artworkIds }, status: 'pending' },
      updateData
    );

    // Get updated artworks for notifications
    const artworks = await Artwork.find({ _id: { $in: artworkIds } }).populate('artist');

    // Send notifications (in background)
    const notificationPromises = artworks.map(artwork =>
      Notification.create({
        recipient: artwork.artist._id,
        type: 'moderation-update',
        content: {
          title: 'Artwork Rejected',
          message: `Your artwork "${artwork.title}" was rejected. Reason: ${reason}`,
          link: `/artwork/${artwork._id}`
        },
        relatedArtwork: artwork._id
      }).catch(err => console.log('Notification error:', err.message))
    );

    Promise.all(notificationPromises);

    res.json({
      success: true,
      data: {
        modified: result.modifiedCount,
        artworks: artworks.length
      },
      message: `${result.modifiedCount} artworks rejected successfully`
    });
  } catch (error) {
    console.error('Bulk reject error:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get moderation queue statistics
router.get('/queue-stats', protect, async (req, res) => {
  try {
    const stats = await Artwork.aggregate([
      {
        $match: { status: 'pending' }
      },
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          flagged: {
            $sum: {
              $cond: [{ $gt: [{ $size: '$moderationStatus.flaggedReasons' }, 0] }, 1, 0]
            }
          },
          highRisk: {
            $sum: {
              $cond: [
                {
                  $gt: [
                    { $add: ['$moderationStatus.nsfwScore', '$moderationStatus.plagiarismScore'] },
                    0.7
                  ]
                },
                1,
                0
              ]
            }
          },
          mediumRisk: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $gte: [{ $add: ['$moderationStatus.nsfwScore', '$moderationStatus.plagiarismScore'] }, 0.3] },
                    { $lt: [{ $add: ['$moderationStatus.nsfwScore', '$moderationStatus.plagiarismScore'] }, 0.7] }
                  ]
                },
                1,
                0
              ]
            }
          },
          avgProcessingTime: {
            $avg: {
              $subtract: [new Date(), '$createdAt']
            }
          }
        }
      }
    ]);

    const result = stats[0] || {
      total: 0,
      flagged: 0,
      highRisk: 0,
      mediumRisk: 0,
      avgProcessingTime: 0
    };

    // Convert processing time from milliseconds to hours
    result.avgProcessingTimeHours = Math.round(result.avgProcessingTime / (1000 * 60 * 60));

    res.json({
      success: true,
      data: result,
      message: 'Queue statistics retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update AI moderation thresholds (admin only)
router.patch('/ai-settings', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { nsfwThreshold, plagiarismThreshold, qualityThreshold, autoApproveEnabled } = req.body;

    // In a real app, you'd store these in a settings collection
    // For now, we'll just return the current thresholds
    const { MODERATION_THRESHOLDS } = require('../utils/aiModeration');

    res.json({
      success: true,
      data: {
        currentThresholds: MODERATION_THRESHOLDS,
        message: 'AI moderation settings (read-only in current implementation)'
      },
      message: 'AI moderation settings retrieved'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get AI moderation system status
router.get('/system-status', protect, restrictTo('admin', 'moderator'), async (req, res) => {
  try {
    const status = getSystemStatus();

    res.json({
      success: true,
      data: status,
      message: 'AI moderation system status retrieved'
    });
  } catch (error) {
    console.error('System status error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Clear AI moderation cache
router.post('/clear-cache', protect, restrictTo('admin'), async (req, res) => {
  try {
    const result = clearCache();

    res.json({
      success: true,
      data: result,
      message: 'AI moderation cache cleared successfully'
    });
  } catch (error) {
    console.error('Clear cache error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Update AI moderation thresholds
router.patch('/thresholds', protect, restrictTo('admin'), async (req, res) => {
  try {
    const { thresholds } = req.body;

    if (!thresholds || typeof thresholds !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Valid thresholds object is required'
      });
    }

    const updatedThresholds = updateThresholds(thresholds);

    res.json({
      success: true,
      data: updatedThresholds,
      message: 'AI moderation thresholds updated successfully'
    });
  } catch (error) {
    console.error('Update thresholds error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;