const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const { protect } = require('../../middleware/auth');
const { upload } = require('../../config/cloudinary');

// Get user profile by ID
router.get('/:id', async (req, res) => {
  try {
    console.log('GET /api/users/:id called with', req.params.id);
    const user = await User.findById(req.params.id).select('-password').lean();
    console.log('User found:', user);

    if (!user) {
      console.log('User not found for id:', req.params.id);
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    let isFollowing = false;
    if (req.user) {
      isFollowing = req.user.following?.includes(req.params.id);
    }

    res.json({ success: true, data: { ...user, isFollowing } });
  } catch (error) {
    console.error('Error in GET /api/users/:id:', error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// Update user profile
router.put('/:id', protect, upload.single('avatar'), async (req, res) => {
  try {
    if (req.user._id.toString() !== req.params.id)
      return res.status(403).json({ success: false, message: 'Unauthorized' });

    const updates = {
      username: req.body.username,
      'profile.bio': req.body.bio,
      'profile.location': req.body.location,
      'profile.website': req.body.website,
      'profile.socialLinks.instagram': req.body.instagram,
      'profile.socialLinks.twitter': req.body.twitter,
      'profile.socialLinks.portfolio': req.body.portfolio
    };

    if (req.file) updates['profile.avatar'] = req.file.path;

    if (req.user.role === 'artist') {
      if (req.body.specialization)
        updates['artistInfo.specialization'] = req.body.specialization
          .split(',')
          .map((s) => s.trim());
      if (req.body.yearsOfExperience)
        updates['artistInfo.yearsOfExperience'] = Number(req.body.yearsOfExperience);
      if (req.body.commissionOpen !== undefined)
        updates['artistInfo.commissionOpen'] = req.body.commissionOpen === 'true';
      if (req.body.commissionRate)
        updates['artistInfo.commissionRate'] = Number(req.body.commissionRate);
    }

    Object.keys(updates).forEach((key) => updates[key] === undefined && delete updates[key]);

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true }).select('-password');

    res.json({ success: true, data: user, message: 'Profile updated successfully' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
