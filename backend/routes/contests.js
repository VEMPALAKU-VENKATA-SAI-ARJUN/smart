// routes/contests.js
const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const Artwork = require('../models/Artwork');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get all contests with filters
router.get('/', async (req, res) => {
  try {
    const { status = 'active', page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    let query = {};
    const now = new Date();
    
    switch (status) {
      case 'active':
        query = {
          startDate: { $lte: now },
          endDate: { $gte: now },
          status: 'active'
        };
        break;
      case 'upcoming':
        query = {
          startDate: { $gt: now },
          status: 'active'
        };
        break;
      case 'ended':
        query = {
          endDate: { $lt: now }
        };
        break;
    }
    
    const contests = await Contest.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit))
      .populate('organizer', 'username profile.avatar')
      .populate({
        path: 'submissions.artwork',
        populate: {
          path: 'artist',
          select: 'username profile.avatar'
        }
      })
      .lean();
    
    const total = await Contest.countDocuments(query);
    
    res.json({
      success: true,
      data: contests,
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

// Get single contest
router.get('/:id', async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('organizer', 'username profile')
      .populate({
        path: 'submissions.artwork',
        populate: {
          path: 'artist',
          select: 'username profile.avatar'
        }
      })
      .populate('participants', 'username profile.avatar');
    
    if (!contest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contest not found' 
      });
    }
    
    res.json({
      success: true,
      data: contest
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Join contest
router.post('/:id/join', protect, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    
    if (!contest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contest not found' 
      });
    }
    
    const now = new Date();
    if (now < contest.startDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contest has not started yet' 
      });
    }
    
    if (now > contest.endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contest has ended' 
      });
    }
    
    if (contest.participants.includes(req.user._id)) {
      return res.status(400).json({ 
        success: false, 
        message: 'You are already participating in this contest' 
      });
    }
    
    contest.participants.push(req.user._id);
    await contest.save();
    
    res.json({
      success: true,
      message: 'Successfully joined the contest'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Submit artwork to contest
router.post('/:id/submit', protect, async (req, res) => {
  try {
    const { artworkId } = req.body;
    
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contest not found' 
      });
    }
    
    const artwork = await Artwork.findById(artworkId);
    if (!artwork) {
      return res.status(404).json({ 
        success: false, 
        message: 'Artwork not found' 
      });
    }
    
    if (artwork.artist.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false, 
        message: 'You can only submit your own artworks' 
      });
    }
    
    const now = new Date();
    if (now > contest.endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Contest submission period has ended' 
      });
    }
    
    // Check if artwork is already submitted
    const existingSubmission = contest.submissions.find(
      sub => sub.artwork.toString() === artworkId
    );
    
    if (existingSubmission) {
      return res.status(400).json({ 
        success: false, 
        message: 'This artwork has already been submitted' 
      });
    }
    
    // Add submission
    contest.submissions.push({
      artwork: artworkId,
      submittedAt: new Date(),
      votes: 0
    });
    
    // Add user to participants if not already
    if (!contest.participants.includes(req.user._id)) {
      contest.participants.push(req.user._id);
    }
    
    await contest.save();
    
    res.json({
      success: true,
      message: 'Artwork submitted successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Vote for submission
router.post('/:id/vote', protect, async (req, res) => {
  try {
    const { submissionId } = req.body;
    
    const contest = await Contest.findById(req.params.id);
    if (!contest) {
      return res.status(404).json({ 
        success: false, 
        message: 'Contest not found' 
      });
    }
    
    const submission = contest.submissions.id(submissionId);
    if (!submission) {
      return res.status(404).json({ 
        success: false, 
        message: 'Submission not found' 
      });
    }
    
    const now = new Date();
    if (now > contest.endDate) {
      return res.status(400).json({ 
        success: false, 
        message: 'Voting period has ended' 
      });
    }
    
    // Check if user already voted for this submission
    const hasVoted = submission.voters?.includes(req.user._id);
    
    if (hasVoted) {
      // Remove vote
      submission.voters = submission.voters.filter(
        id => id.toString() !== req.user._id.toString()
      );
      submission.votes = Math.max(0, submission.votes - 1);
    } else {
      // Add vote
      if (!submission.voters) submission.voters = [];
      submission.voters.push(req.user._id);
      submission.votes += 1;
    }
    
    await contest.save();
    
    res.json({
      success: true,
      voted: !hasVoted,
      votes: submission.votes
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

// Create contest (admin only)
router.post('/', protect, async (req, res) => {
  try {
    // Check if user is admin or moderator
    if (!['admin', 'moderator'].includes(req.user.role)) {
      return res.status(403).json({ 
        success: false, 
        message: 'Only admins and moderators can create contests' 
      });
    }
    
    const {
      title,
      description,
      startDate,
      endDate,
      prizePool,
      rules,
      tags,
      bannerImage
    } = req.body;
    
    const contest = await Contest.create({
      title,
      description,
      organizer: req.user._id,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      prizePool: Number(prizePool),
      rules,
      tags: tags ? tags.split(',').map(tag => tag.trim()) : [],
      bannerImage,
      status: 'active'
    });
    
    res.status(201).json({
      success: true,
      data: contest,
      message: 'Contest created successfully'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: error.message 
    });
  }
});

module.exports = router;