const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const emailService = require('../utils/emailService');
const pushNotificationService = require('../utils/pushNotificationService');

// Get conversations for current user
router.get('/conversations', protect, async (req, res) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const skip = (page - 1) * limit;
    
    // Get unique conversations with latest message
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [
            { sender: req.user._id },
            { recipient: req.user._id }
          ],
          isDeleted: false
        }
      },
      {
        $addFields: {
          otherUser: {
            $cond: {
              if: { $eq: ['$sender', req.user._id] },
              then: '$recipient',
              else: '$sender'
            }
          }
        }
      },
      {
        $sort: { createdAt: -1 }
      },
      {
        $group: {
          _id: '$otherUser',
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: {
                if: {
                  $and: [
                    { $eq: ['$recipient', req.user._id] },
                    { $eq: ['$isRead', false] }
                  ]
                },
                then: 1,
                else: 0
              }
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'otherUser'
        }
      },
      {
        $unwind: '$otherUser'
      },
      {
        $project: {
          otherUser: {
            _id: 1,
            username: 1,
            'profile.avatar': 1,
            'profile.displayName': 1
          },
          lastMessage: 1,
          unreadCount: 1
        }
      },
      {
        $sort: { 'lastMessage.createdAt': -1 }
      },
      {
        $skip: skip
      },
      {
        $limit: Number(limit)
      }
    ]);
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get messages between current user and another user
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const skip = (page - 1) * limit;
    const otherUserId = req.params.userId;
    
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: otherUserId },
        { sender: otherUserId, recipient: req.user._id }
      ],
      isDeleted: false
    })
    .populate('sender', 'username profile.avatar profile.displayName')
    .populate('recipient', 'username profile.avatar profile.displayName')
    .populate('relatedArtwork', 'title thumbnail')
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(Number(limit));
    
    // Mark messages as read
    await Message.updateMany(
      {
        sender: otherUserId,
        recipient: req.user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    res.json({
      success: true,
      data: messages.reverse() // Reverse to show oldest first
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Send a message
router.post('/send', protect, async (req, res) => {
  try {
    const { recipient, content, type = 'text', relatedArtwork } = req.body;
    
    if (!recipient || !content) {
      return res.status(400).json({
        success: false,
        message: 'Recipient and content are required'
      });
    }

    // Get recipient user data
    const recipientUser = await User.findById(recipient);
    if (!recipientUser) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    const message = new Message({
      sender: req.user._id,
      recipient,
      content,
      type,
      relatedArtwork
    });
    
    await message.save();
    
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username profile.avatar profile.displayName')
      .populate('recipient', 'username profile.avatar profile.displayName')
      .populate('relatedArtwork', 'title thumbnail');

    // Send email notification for message (async, don't wait)
    if (recipientUser.preferences?.emailMessages !== false) {
      emailService.sendMessageEmail(recipientUser, populatedMessage, populatedMessage.sender)
        .then(result => {
          if (result.success) {
            console.log(`Message email sent to ${recipientUser.email}`);
          } else {
            console.log(`Message email failed: ${result.reason || result.error}`);
          }
        })
        .catch(error => {
          console.error('Message email error:', error);
        });
    }

    // Send push notification for message (async, don't wait)
    if (recipientUser.preferences?.pushNotifications !== false && 
        recipientUser.preferences?.notificationTypes?.message !== false) {
      pushNotificationService.sendMessageNotification(recipientUser, populatedMessage, populatedMessage.sender)
        .then(result => {
          if (result.success) {
            console.log(`Message push notification sent to user ${recipientUser._id} (${result.successCount}/${result.totalSent})`);
          } else {
            console.log(`Message push notification failed: ${result.reason}`);
          }
        })
        .catch(error => {
          console.error('Message push notification error:', error);
        });
    }
    
    res.status(201).json({
      success: true,
      data: populatedMessage
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Mark message as read
router.patch('/:messageId/read', protect, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      {
        _id: req.params.messageId,
        recipient: req.user._id
      },
      {
        isRead: true,
        readAt: new Date()
      },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    res.json({
      success: true,
      data: message
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Delete message
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const message = await Message.findOneAndUpdate(
      {
        _id: req.params.messageId,
        sender: req.user._id
      },
      {
        isDeleted: true
      },
      { new: true }
    );
    
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found or you cannot delete this message'
      });
    }
    
    res.json({
      success: true,
      message: 'Message deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

// Get unread message count
router.get('/unread-count', protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      isRead: false,
      isDeleted: false
    });
    
    res.json({
      success: true,
      count
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
});

module.exports = router;