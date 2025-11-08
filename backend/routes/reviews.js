const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const Review = require('../models/Review');
const Artwork = require('../models/Artwork');
const Notification = require('../models/Notification');
const { protect } = require('../middleware/auth');

// Middleware to verify reviewer role
const verifyReviewer = (req, res, next) => {
  if (req.user.role !== 'reviewer') {
    return res.status(403).json({ success: false, message: 'Only reviewers can perform this action' });
  }
  next();
};

// Helper: Recompute artwork rating aggregates
async function recomputeArtworkRatings(artworkId, session = null) {
  const pipeline = [
    { $match: { artwork: new mongoose.Types.ObjectId(artworkId) } },
    {
      $group: {
        _id: null,
        avgRating: { $avg: '$rating' },
        count: { $sum: 1 }
      }
    }
  ];

  const result = await Review.aggregate(pipeline).session(session);
  
  const ratingAvg = result.length > 0 ? Math.round(result[0].avgRating * 10) / 10 : 0;
  const ratingCount = result.length > 0 ? result[0].count : 0;

  await Artwork.findByIdAndUpdate(
    artworkId,
    {
      ratingAvg,
      ratingCount,
      reviewStatsLastUpdated: new Date()
    },
    { session }
  );

  return { ratingAvg, ratingCount };
}

/* ============================
   📝 CREATE/UPDATE REVIEW (Upsert)
   ============================ */
router.post('/artworks/:artworkId/reviews', protect, verifyReviewer, async (req, res) => {
  console.log('📝 Creating review for artwork:', req.params.artworkId);
  console.log('📝 Review data:', req.body);
  console.log('📝 Reviewer:', req.user.username);

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { artworkId } = req.params;
    const { rating, comment, recommendation } = req.body;
    const reviewerId = req.user._id;

    // Validation
    if (!rating || rating < 1 || rating > 5) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
    }

    if (!comment || comment.trim().length === 0) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Comment is required' });
    }

    if (!['approve', 'revise', 'reject'].includes(recommendation)) {
      await session.abortTransaction();
      return res.status(400).json({ success: false, message: 'Invalid recommendation' });
    }

    // Check artwork exists
    const artwork = await Artwork.findById(artworkId).session(session);
    if (!artwork) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }

    // Cannot review own artwork
    if (artwork.artist.toString() === reviewerId.toString()) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Cannot review your own artwork' });
    }

    // Sanitize comment (strip HTML, limit length)
    const sanitizedComment = comment.replace(/<[^>]*>/g, '').substring(0, 1000);

    // Upsert review
    const review = await Review.findOneAndUpdate(
      { artwork: artworkId, reviewer: reviewerId },
      {
        $set: {
          rating,
          comment: sanitizedComment,
          recommendation,
          updatedAt: new Date()
        },
        $setOnInsert: {
          createdAt: new Date()
        }
      },
      {
        upsert: true,
        new: true,
        session,
        runValidators: true
      }
    ).populate('reviewer', 'username profile.avatar');

    const isNew = review.createdAt.getTime() === review.updatedAt.getTime();

    // Recompute aggregates
    const { ratingAvg, ratingCount } = await recomputeArtworkRatings(artworkId, session);

    await session.commitTransaction();
    session.endSession(); // End session immediately after commit

    console.log('✅ Review saved successfully:', review._id);
    console.log('✅ Rating aggregates:', { ratingAvg, ratingCount });

    // Create notification (only for new reviews) - outside transaction
    if (isNew) {
      try {
        const notification = await Notification.create({
          recipient: artwork.artist,
          type: 'review',
          content: {
            title: 'New Review',
            message: `${req.user.username} reviewed your artwork`,
            link: `/artwork/${artworkId}`
          },
          relatedUser: reviewerId,
          relatedArtwork: artworkId
        });

        // Emit real-time notification
        const io = req.app.get('io');
        if (io) {
          io.to(`user_${artwork.artist}`).emit('notification:new', {
            ...notification.toObject(),
            sender: {
              _id: reviewerId,
              username: req.user.username,
              profile: { avatar: req.user.profile?.avatar }
            }
          });
        }
      } catch (notifError) {
        console.error('⚠️ Failed to create notification:', notifError.message);
        // Don't fail the request if notification fails
      }
    }

    // Emit aggregate update
    const io = req.app.get('io');
    if (io) {
      io.to(`artwork_${artworkId}`).emit('review:aggregate', { ratingAvg, ratingCount });
    }

    return res.status(isNew ? 201 : 200).json({
      success: true,
      review: review.toObject(),
      artwork: { ratingAvg, ratingCount },
      isNew
    });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    session.endSession();
    console.error('❌ Error creating/updating review:', error);
    console.error('Error details:', error.message);
    console.error('Error stack:', error.stack);
    
    if (error.code === 11000) {
      return res.status(409).json({ success: false, message: 'Review already exists' });
    }
    
    return res.status(500).json({ 
      success: false, 
      message: 'Failed to submit review',
      error: error.message 
    });
  }
});

/* ============================
   📋 GET REVIEWS FOR ARTWORK
   ============================ */
router.get('/artworks/:artworkId/reviews', async (req, res) => {
  try {
    const { artworkId } = req.params;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const sort = req.query.sort || '-createdAt';

    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Review.find({ artwork: artworkId })
        .populate('reviewer', 'username profile.avatar')
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ artwork: artworkId })
    ]);

    res.status(200).json({
      success: true,
      items,
      pageInfo: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching reviews:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

/* ============================
   📋 GET MY REVIEWS
   ============================ */
router.get('/reviews/me', protect, verifyReviewer, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      Review.find({ reviewer: req.user._id })
        .populate('artwork', 'title thumbnail artist')
        .populate({
          path: 'artwork',
          populate: { path: 'artist', select: 'username profile.avatar' }
        })
        .sort('-createdAt')
        .skip(skip)
        .limit(limit)
        .lean(),
      Review.countDocuments({ reviewer: req.user._id })
    ]);

    res.status(200).json({
      success: true,
      items,
      pageInfo: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    });
  } catch (error) {
    console.error('❌ Error fetching my reviews:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch reviews' });
  }
});

/* ============================
   ✏️ UPDATE REVIEW
   ============================ */
router.patch('/reviews/:id', protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;
    const { rating, comment, recommendation } = req.body;

    const review = await Review.findById(id).session(session);
    if (!review) {
      await session.abortTransaction();
      return res.status(404).json({ success: false, message: 'Review not found' });
    }

    // Authorization: author or moderator
    const isAuthor = review.reviewer.toString() === req.user._id.toString();
    const isModerator = req.user.role === 'moderator';

    if (!isAuthor && !isModerator) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    // Update only changed fields
    if (rating !== undefined && rating >= 1 && rating <= 5) review.rating = rating;
    if (comment !== undefined) review.comment = comment.replace(/<[^>]*>/g, '').substring(0, 1000);
    if (recommendation !== undefined && ['approve', 'revise', 'reject'].includes(recommendation)) {
      review.recommendation = recommendation;
    }
    review.updatedAt = new Date();

    await review.save({ session });

    // Recompute aggregates
    const { ratingAvg, ratingCount } = await recomputeArtworkRatings(review.artwork, session);

    await session.commitTransaction();

    // Emit aggregate update
    const io = req.app.get('io');
    if (io) {
      io.to(`artwork_${review.artwork}`).emit('review:aggregate', { ratingAvg, ratingCount });
    }

    const populatedReview = await Review.findById(id).populate('reviewer', 'username profile.avatar');

    res.status(200).json({
      success: true,
      review: populatedReview,
      artwork: { ratingAvg, ratingCount }
    });
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error updating review:', error);
    res.status(500).json({ success: false, message: 'Failed to update review' });
  } finally {
    session.endSession();
  }
});

/* ============================
   🗑️ DELETE REVIEW
   ============================ */
router.delete('/reviews/:id', protect, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { id } = req.params;

    const review = await Review.findById(id).session(session);
    if (!review) {
      await session.abortTransaction();
      // Idempotent: already deleted
      return res.status(204).send();
    }

    // Authorization: author or moderator
    const isAuthor = review.reviewer.toString() === req.user._id.toString();
    const isModerator = req.user.role === 'moderator';

    if (!isAuthor && !isModerator) {
      await session.abortTransaction();
      return res.status(403).json({ success: false, message: 'Unauthorized' });
    }

    const artworkId = review.artwork;
    await Review.findByIdAndDelete(id).session(session);

    // Recompute aggregates
    const { ratingAvg, ratingCount } = await recomputeArtworkRatings(artworkId, session);

    await session.commitTransaction();

    // Emit aggregate update
    const io = req.app.get('io');
    if (io) {
      io.to(`artwork_${artworkId}`).emit('review:aggregate', { ratingAvg, ratingCount });
    }

    res.status(204).send();
  } catch (error) {
    await session.abortTransaction();
    console.error('❌ Error deleting review:', error);
    res.status(500).json({ success: false, message: 'Failed to delete review' });
  } finally {
    session.endSession();
  }
});

/* ============================
   ⭐ SET EDITOR'S PICK
   ============================ */
router.post('/artworks/:id/editor-pick', protect, async (req, res) => {
  try {
    // Only reviewers or moderators can set editor's pick
    if (req.user.role !== 'reviewer' && req.user.role !== 'moderator') {
      return res.status(403).json({ success: false, message: 'Only reviewers or moderators can set editor\'s pick' });
    }

    const { id } = req.params;
    const { editorPick } = req.body;

    if (typeof editorPick !== 'boolean') {
      return res.status(400).json({ success: false, message: 'editorPick must be a boolean' });
    }

    const artwork = await Artwork.findByIdAndUpdate(
      id,
      { editorPick },
      { new: true }
    ).select('editorPick');

    if (!artwork) {
      return res.status(404).json({ success: false, message: 'Artwork not found' });
    }

    // Emit real-time update
    const io = req.app.get('io');
    if (io) {
      io.to(`artwork_${id}`).emit('artwork:badge', { editorPick });
    }

    res.status(200).json({
      success: true,
      editorPick: artwork.editorPick
    });
  } catch (error) {
    console.error('❌ Error setting editor\'s pick:', error);
    res.status(500).json({ success: false, message: 'Failed to set editor\'s pick' });
  }
});

module.exports = router;
