// routes/chat.js - Real-time chat routes
const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

// ✅ Get user's conversations list
router.get("/conversations", protect, async (req, res) => {
  try {
    const conversations = await Message.getUserConversations(req.user._id);
    res.json({ success: true, data: conversations });
  } catch (error) {
    console.error("Get conversations error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Get conversation between two users (including AI assistant)
router.get("/conversation/:userId", protect, async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    let otherUser;

    // 🧠 Handle AI Assistant
    if (userId === "smart-assistant") {
      otherUser = await User.findOne({ username: "smartbot" });
      if (!otherUser) {
        otherUser = await User.create({
          username: "smartbot",
          email: "smart@assistant.com",
          password: "smart-ai",
          role: "artist",
          profile: {
            displayName: "S.M.A.R.T Assistant",
            avatar: "https://cdn-icons-png.flaticon.com/512/4712/4712109.png",
          },
        });
      }
    } else {
      // Normal user chat
      otherUser = await User.findById(userId).select(
        "username profile.avatar role"
      );
      if (!otherUser) {
        return res
          .status(404)
          .json({ success: false, message: "User not found" });
      }
    }

    // ✅ Get messages between current user and other user
    const messages = await Message.getConversation(
      req.user._id,
      otherUser._id,
      parseInt(limit),
      parseInt(page)
    );

    // ✅ Mark messages as read
    await Message.updateMany(
      { sender: otherUser._id, recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    res.json({
      success: true,
      data: {
        messages: messages.reverse(),
        otherUser,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          hasMore: messages.length === parseInt(limit),
        },
      },
    });
  } catch (error) {
    console.error("Get conversation error:", error);
    res.status(500).json({ success: false, message: error.message });
  }
});

// ✅ Send a message (supports AI assistant)
// ✅ Send a message (with better error handling)
// Send a message (with detailed debugging)
router.post('/send', protect, async (req, res) => {
  try {
    const { recipientId, content, messageType = 'text', relatedArtwork } = req.body;

    console.log('📨 Incoming message payload:', req.body);
    console.log('👤 Sender (req.user):', req.user?._id);

    if (!recipientId || !content) {
      console.log('❌ Missing required fields');
      return res.status(400).json({
        success: false,
        message: 'Recipient and content are required'
      });
    }

    let recipient;

    // 🧠 Handle AI Assistant case
    if (recipientId === 'smart-assistant') {
      console.log('🤖 AI Assistant detected');
      recipient = await User.findOne({ username: 'smartbot' });
      if (!recipient) {
        console.log('🆕 Creating new AI user...');
        recipient = await User.create({
          username: 'smartbot',
          email: 'smart@assistant.com',
          password: 'smart-ai',
          role: 'artist',
          profile: {
            displayName: 'S.M.A.R.T Assistant',
            avatar: 'https://cdn-icons-png.flaticon.com/512/4712/4712109.png',
          },
        });
      }
    } else {
      // 🧾 Validate recipientId
      if (!mongoose.Types.ObjectId.isValid(recipientId)) {
        console.log('❌ Invalid recipientId format:', recipientId);
        return res.status(400).json({ success: false, message: 'Invalid recipient ID' });
      }

      recipient = await User.findById(recipientId);
      if (!recipient) {
        console.log('❌ No user found for recipientId:', recipientId);
        return res.status(404).json({ success: false, message: 'Recipient not found' });
      }
    }

    console.log('✅ Recipient resolved:', recipient.username);

    // 💾 Create and save message
    const message = await Message.create({
      sender: req.user._id,
      recipient: recipient._id,
      content,
      messageType,
      relatedArtwork
    });

    console.log('💬 Message saved in DB:', message._id);

    // 🔁 Populate sender/recipient for response
    await message.populate([
      { path: 'sender', select: 'username profile.avatar' },
      { path: 'recipient', select: 'username profile.avatar' },
      { path: 'relatedArtwork', select: 'title images price' }
    ]);

    console.log('📦 Populated message:', message);

    // 📡 Emit via Socket.IO if available
    const io = req.app.get('io');
    if (io) {
      console.log('📡 Emitting socket events...');
      io.to(`user_${recipient._id}`).emit('new_message', message);
      io.to(`user_${req.user._id}`).emit('message_sent', message);
    }
// Emit via Socket.IO...
if (io) {
  io.to(`user_${recipient._id}`).emit("new_message", message);
  io.to(`user_${req.user._id}`).emit("message_sent", message);
}

// 🤖 Auto-trigger AI Assistant reply if recipient is smartbot
if (recipient.username === "smartbot") {
  try {
    const axios = require("axios");
    const token = req.headers.authorization?.split(" ")[1];
    await axios.post(
      `${process.env.API_URL || "http://localhost:5000"}/api/ai-chat`,
      { message: content },
      { headers: { Authorization: `Bearer ${token}` } }
    );
    console.log("🤖 AI response triggered successfully!");
  } catch (err) {
    console.error("⚠️ Failed to trigger AI response:", err.message);
  }
}

res.status(201).json({ success: true, data: message });


  } catch (error) {
    console.error('🔥 Send message error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error: ' + error.message
    });
  }
});



// ✅ Mark messages as read
router.patch("/read/:conversationUserId", protect, async (req, res) => {
  try {
    const { conversationUserId } = req.params;

    let userIdToMark = conversationUserId;

    // If the conversation is with the AI, find the real ID
    if (conversationUserId === "smart-assistant") {
      const smartBot = await User.findOne({ username: "smartbot" });
      if (smartBot) userIdToMark = smartBot._id;
    }

    if (!mongoose.Types.ObjectId.isValid(userIdToMark)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid user ID" });
    }

    const result = await Message.updateMany(
      { sender: userIdToMark, recipient: req.user._id, isRead: false },
      { isRead: true, readAt: new Date() }
    );

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${userIdToMark}`).emit("messages_read", {
        readBy: req.user._id,
        count: result.modifiedCount,
      });
    }

    res.json({ success: true, data: { markedAsRead: result.modifiedCount } });
  } catch (error) {
    console.error("Mark as read error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
});

// ✅ Delete a message (soft delete)
router.delete("/:messageId", protect, async (req, res) => {
  try {
    const { messageId } = req.params;

    const message = await Message.findById(messageId);
    if (!message) {
      return res
        .status(404)
        .json({ success: false, message: "Message not found" });
    }

    if (message.sender.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ success: false, message: "Not authorized to delete this" });
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    await message.save();

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${message.recipient}`).emit("message_deleted", messageId);
      io.to(`user_${message.sender}`).emit("message_deleted", messageId);
    }

    res.json({ success: true, message: "Message deleted" });
  } catch (error) {
    console.error("Delete message error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
});

// ✅ Get unread message count
router.get("/unread-count", protect, async (req, res) => {
  try {
    const count = await Message.countDocuments({
      recipient: req.user._id,
      isRead: false,
      isDeleted: false,
    });
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error("Get unread count error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
});

// ✅ Search messages
router.get("/search", protect, async (req, res) => {
  try {
    const { query } = req.query;

    if (!query) {
      return res
        .status(400)
        .json({ success: false, message: "Search query required" });
    }

    const messages = await Message.find({
      $or: [{ sender: req.user._id }, { recipient: req.user._id }],
      content: { $regex: query, $options: "i" },
      isDeleted: false,
    })
      .populate("sender", "username profile.avatar")
      .populate("recipient", "username profile.avatar")
      .sort({ createdAt: -1 })
      .limit(20);

    res.json({ success: true, data: messages });
  } catch (error) {
    console.error("Search messages error:", error);
    res
      .status(500)
      .json({ success: false, message: "Server error: " + error.message });
  }
});

module.exports = router;
