// routes/chat.js - Real-time chat routes
const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');

// Get user's conversations list
router.get('/conversations', protect, async (req, res) => {
  try {
    const conversations = await Message.getUserConversations(req.user._id);
    
    res.json({
      success: true,
      data: conversations
    });
  } catch (error) {
    console.error('Get conversations error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Get conversation between two users
router.get('/conversation/:userId', protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    
    // Verify the other user exists
    const otherUser = await User.findById(userId).select('username profile.avatar role');
    if (!otherUser) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get messages
    const messages = await Message.getConversation(
      req.user._id, 
      userId, 
      parseInt(limit), 
      parseInt(page)
    );
    
    // Mark messages as read
    await Message.updateMany(
      {
        sender: userId,
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
      data: {
        messages: messages.reverse(), // Reverse to show oldest first
        otherUser,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit)
        }
      }
    });
  } catch (error) {
    console.error('Get conversation error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Send a message
router.post('/send', protect, async (req, res) => {
  try {
    const { recipientId, content, messageType = 'text', relatedArtwork } = req.body;
    
    if (!recipientId || !content) {
      return res.status(400).json({
        success: false,
        message: 'Recipient and content are required'
      });
    }
    
    // Verify recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    // Create message
    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      content,
      messageType,
      relatedArtwork
    });
    
    // Populate the message
    await message.populate([
      { path: 'sender', select: 'username profile.avatar' },
      { path: 'recipient', select: 'username profile.avatar' },
      { path: 'relatedArtwork', select: 'title images price' }
    ]);
    
    // Emit to socket (we'll handle this in the socket setup)
    req.io.to(`user_${recipientId}`).emit('new_message', message);
    req.io.to(`user_${req.user._id}`).emit('message_sent', message);
    
    res.status(201).json({
      success: true,
      data: message
    });
  } catch (error) {
    console.error('Send message error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Mark messages as read
router.patch('/read/:conversationUserId', protect, async (req, res) => {
  try {
    const { conversationUserId } = req.params;
    
    const result = await Message.updateMany(
      {
        sender: conversationUserId,
        recipient: req.user._id,
        isRead: false
      },
      {
        isRead: true,
        readAt: new Date()
      }
    );
    
    // Emit read receipt to sender
    req.io.to(`user_${conversationUserId}`).emit('messages_read', {
      readBy: req.user._id,
      count: result.modifiedCount
    });
    
    res.json({
      success: true,
      data: {
        markedAsRead: result.modifiedCount
      }
    });
  } catch (error) {
    console.error('Mark as read error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Delete a message
router.delete('/:messageId', protect, async (req, res) => {
  try {
    const { messageId } = req.params;
    
    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({
        success: false,
        message: 'Message not found'
      });
    }
    
    // Only sender can delete their message
    if (message.sender.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this message'
      });
    }
    
    // Soft delete
    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();
    
    // Emit deletion to both users
    req.io.to(`user_${message.recipient}`).emit('message_deleted', messageId);
    req.io.to(`user_${message.sender}`).emit('message_deleted', messageId);
    
    res.json({
      success: true,
      message: 'Message deleted'
    });
  } catch (error) {
    console.error('Delete message error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
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
      data: { count }
    });
  } catch (error) {
    console.error('Get unread count error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

// Search conversations
router.get('/search', protect, async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'Search query is required'
      });
    }
    
    // Search in message content and user names
    const messages = await Message.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ],
      content: { $regex: query, $options: 'i' },
      isDeleted: false
    })
    .populate('sender', 'username profile.avatar')
    .populate('recipient', 'username profile.avatar')
    .sort({ createdAt: -1 })
    .limit(20);
    
    res.json({
      success: true,
      data: messages
    });
  } catch (error) {
    console.error('Search messages error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
});

module.exports = router;