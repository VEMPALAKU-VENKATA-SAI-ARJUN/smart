const express = require('express');
const router = express.Router();
const User = require('../../models/User');
const Notification = require('../../models/Notification');
const { protect } = require('../../middleware/auth');

// Follow/Unfollow user
router.post('/:id/follow', protect, async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = req.user._id;

    if (targetUserId === currentUserId.toString())
      return res.status(400).json({ success: false, message: 'You cannot follow yourself' });

    const targetUser = await User.findById(targetUserId);
    const currentUser = await User.findById(currentUserId);
    if (!targetUser) return res.status(404).json({ success: false, message: 'User not found' });

    const isFollowing = currentUser.following.includes(targetUserId);

    if (isFollowing) {
      currentUser.following = currentUser.following.filter(id => id.toString() !== targetUserId);
      targetUser.followers = targetUser.followers.filter(id => id.toString() !== currentUserId.toString());
    } else {
      currentUser.following.push(targetUserId);
      targetUser.followers.push(currentUserId);

      await Notification.create({
        recipient: targetUserId,
        type: 'new-follower',
        content: { title: 'New Follower', message: `${currentUser.username} started following you`, link: `/artist/${currentUserId}` },
        relatedUser: currentUserId
      });
    }

    await currentUser.save();
    await targetUser.save();

    res.json({ success: true, message: isFollowing ? 'Unfollowed successfully' : 'Followed successfully', isFollowing: !isFollowing });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's followers
router.get('/:id/followers', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.id)
      .populate({ path: 'followers', select: 'username profile.avatar profile.bio', options: { skip, limit: Number(limit) } });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user.followers, pagination: { page: Number(page), limit: Number(limit), total: user.followers.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's following
router.get('/:id/following', async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;

    const user = await User.findById(req.params.id)
      .populate({ 
        path: 'following', 
        select: 'username profile.avatar profile.bio role followers', 
        options: { skip, limit: Number(limit) } 
      });

    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: user.following, pagination: { page: Number(page), limit: Number(limit), total: user.following.length } });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});



module.exports = router;
