const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Subscribe to push notifications
router.post('/subscribe', protect, async (req, res) => {
  try {
    const { subscription } = req.body;
    
    if (!subscription || !subscription.endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Invalid subscription data'
      });
    }

    const user = await User.findById(req.user._id);
    
    // Check if subscription already exists
    const existingSubscription = user.pushSubscriptions.find(
      sub => sub.endpoint === subscription.endpoint
    );

    if (!existingSubscription) {
      user.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth
        }
      });
      
      await user.save();
    }

    res.json({
      success: true,
      message: 'Push subscription added successfully'
    });
  } catch (error) {
    console.error('Push subscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Unsubscribe from push notifications
router.post('/unsubscribe', protect, async (req, res) => {
  try {
    const { endpoint } = req.body;
    
    if (!endpoint) {
      return res.status(400).json({
        success: false,
        message: 'Endpoint is required'
      });
    }

    await User.findByIdAndUpdate(req.user._id, {
      $pull: {
        pushSubscriptions: { endpoint }
      }
    });

    res.json({
      success: true,
      message: 'Push subscription removed successfully'
    });
  } catch (error) {
    console.error('Push unsubscription error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get VAPID public key
router.get('/vapid-public-key', (req, res) => {
  res.json({
    success: true,
    publicKey: process.env.VAPID_PUBLIC_KEY || 'BEl62iUYgUivxIkv69yViEuiBIa40HI2BN4XjqBJP8ChLmc6A1JUHSqVBXr5BdmJwAF88PL3r4krrlOWJdHaDks'
  });
});

// Update notification preferences
router.patch('/preferences', protect, async (req, res) => {
  try {
    const { preferences } = req.body;
    
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { $set: { preferences } },
      { new: true, runValidators: true }
    );

    res.json({
      success: true,
      data: user.preferences
    });
  } catch (error) {
    console.error('Preferences update error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get notification preferences
router.get('/preferences', protect, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('preferences');
    
    res.json({
      success: true,
      data: user.preferences || {
        emailNotifications: true,
        emailMessages: true,
        pushNotifications: true,
        notificationTypes: {
          follow: true,
          like: true,
          comment: true,
          artwork_approved: true,
          artwork_rejected: true,
          commission_request: true,
          message: true
        }
      }
    });
  } catch (error) {
    console.error('Get preferences error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;