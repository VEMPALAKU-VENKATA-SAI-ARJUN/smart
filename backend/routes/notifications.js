const express = require('express');
const router = express.Router();
const Notification = require('../models/Notification');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const pushNotificationService = require('../utils/pushNotificationService');

// Create a new notification
router.post('/create', protect, async (req, res) => {
  try {
    const { type, recipient, content, relatedUser, relatedArtwork } = req.body;
    
    // Don't create notification if user is notifying themselves
    if (recipient === req.user._id.toString()) {
      return res.json({ success: true, message: 'Self-notification skipped' });
    }
    
    // Get recipient user data
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({ success: false, message: 'Recipient not found' });
    }

    // Check if user wants this type of notification
    const notificationEnabled = recipientUser.preferences?.notificationTypes?.[type] !== false;
    if (!notificationEnabled) {
      return res.json({ success: true, message: 'Notification type disabled for user' });
    }
    
    const notification = new Notification({
      type,
      recipient,
      content,
      relatedUser: relatedUser || req.user._id,
      relatedArtwork
    });
    
    await notification.save();
    
    const populatedNotification = await Notification.findById(notification._id)
      .populate('relatedUser', 'username profile.avatar')
      .populate('relatedArtwork', 'title thumbnail');
    
    // Send email notification (async, don't wait)
    if (recipientUser.preferences?.emailNotifications !== false) {
      emailService.sendNotificationEmail(recipientUser, populatedNotification)
        .then(result => {
          if (result.success) {
            console.log(`Email notification sent to ${recipientUser.email}`);
          } else {
            console.log(`Email notification failed: ${result.reason || result.error}`);
          }
        })
        .catch(error => {
          console.error('Email notification error:', error);
        });
    }

    // Send push notification (async, don't wait)
    if (recipientUser.preferences?.pushNotifications !== false) {
      pushNotificationService.sendNotificationToUser(recipientUser, populatedNotification)
        .then(result => {
          if (result.success) {
            console.log(`Push notification sent to user ${recipientUser._id} (${result.successCount}/${result.totalSent})`);
          } else {
            console.log(`Push notification failed: ${result.reason}`);
          }
        })
        .catch(error => {
          console.error('Push notification error:', error);
        });
    }
    
    res.status(201).json({
      success: true,
      data: populatedNotification
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get user's notifications
router.get('/', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20, unreadOnly = false } = req.query;
    const skip = (page - 1) * limit;
    
    const query = { recipient: req.user._id };
    if (unreadOnly === 'true') {
      query.isRead = false;
    }
    
    const notifications = await Notification.find(query)
      .populate('relatedUser', 'username profile.avatar')
      .populate('relatedArtwork', 'title thumbnail')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(Number(limit));
    
    const total = await Notification.countDocuments(query);
    const unreadCount = await Notification.countDocuments({ 
      recipient: req.user._id, 
      isRead: false 
    });
    
    res.json({
      success: true,
      data: notifications,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      },
      unreadCount
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark notification as read
router.patch('/:id/read', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true, readAt: new Date() },
      { new: true }
    );
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, data: notification });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark all notifications as read
router.patch('/mark-all-read', protect, async (req, res) => {
  try {
    await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );
    
    res.json({ success: true, message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete notification
router.delete('/:id', protect, async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({
      _id: req.params.id,
      recipient: req.user._id
    });
    
    if (!notification) {
      return res.status(404).json({ success: false, message: 'Notification not found' });
    }
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get unread count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });
    
    res.json({ success: true, count });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;
