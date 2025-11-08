// routes/aichat.js
const express = require("express");
const axios = require("axios");
const dotenv = require("dotenv");
const Message = require("../models/Message");
const User = require("../models/User");
const { protect } = require("../middleware/auth");

dotenv.config();
const router = express.Router();

// 🧠 Groq API config
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GROQ_API_KEY = process.env.GROQ_API_KEY; // Add this in .env

router.post("/", protect, async (req, res) => {
  try {
    const { message } = req.body;
    if (!message) {
      return res.status(400).json({ success: false, message: "Message content required" });
    }

    // 🧠 Normalize message
    const userMessageText = message.toLowerCase().trim();

    // 🧩 Step 1: Predefined Replies (Instant)
    const predefinedReplies = [
      {
        keywords: ["buy", "purchase", "artwork", "payment"],
        reply: "To buy an artwork, visit the **Gallery Page**, choose your favorite art piece, click the 'Buy' button, and confirm your purchase. You'll be redirected to your purchases page after payment.",
      },
      {
        keywords: ["upload", "post", "submit", "art"],
        reply: "To upload your artwork, go to your **Profile Page** and click the 'Upload Artwork' button. You can add your image, title, and description easily!",
      },
      {
        keywords: ["moderator", "approval", "review"],
        reply: "Once you upload an artwork, a moderator reviews it to ensure it follows community guidelines. You’ll be notified once it’s approved.",
      },
      {
        keywords: ["help", "support", "problem"],
        reply: "Need help? You can reach our support team through the **Help & Support** section in your profile or contact us via the feedback form.",
      },
      {
        keywords: ["how are you", "hi", "hello"],
        reply: "Hey there 👋! I'm S.M.A.R.T — your personal art assistant. How can I help you today?",
      },
    ];

    // Check if message matches any predefined keyword
    const match = predefinedReplies.find((item) =>
      item.keywords.some((kw) => userMessageText.includes(kw))
    );

    if (match) {
      // 🧠 Find AI assistant user
      let aiUser = await User.findOne({ username: "smartbot" });
      if (!aiUser) {
        aiUser = await User.create({
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

      // Save predefined reply
      const botMessage = await Message.create({
        sender: aiUser._id,
        recipient: req.user._id,
        content: match.reply,
        messageType: "text",
      });

      // Emit instantly
      const io = req.app.get("io");
      if (io) {
        io.to(`user_${req.user._id}`).emit("new_message", botMessage);
      }

      return res.json({ success: true, data: { botMessage } });
    }

    // 🧠 Step 2: Otherwise, fallback to AI (Groq)
    const response = await axios.post(
      "https://api.groq.com/openai/v1/chat/completions",
      {
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content:
                    "You are S.M.A.R.T, the friendly AI assistant for S.M.A.R.T Platform. Reply concisely in 1 or 2 sentences unless more detail is needed. Focus on art, creativity, or platform-related help.",

          },
          { role: "user", content: message },
        ],
        temperature: 0.5,
        max_tokens: 120,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    const aiReply = response.data.choices[0].message.content.trim();

    // Save AI reply
    const aiUser = await User.findOne({ username: "smartbot" });
    const botMessage = await Message.create({
      sender: aiUser._id,
      recipient: req.user._id,
      content: aiReply,
      messageType: "text",
    });

    const io = req.app.get("io");
    if (io) {
      io.to(`user_${req.user._id}`).emit("new_message", botMessage);
    }

    res.json({ success: true, data: { botMessage } });

  } catch (error) {
    console.error("AI Chat error:", error.response?.data || error.message);
    res.status(500).json({ success: false, message: "AI Chat failed: " + error.message });
  }
});

module.exports = router;
