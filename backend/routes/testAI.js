// routes/testAI.js
const express = require("express");
const dotenv = require("dotenv");
const Groq = require("groq-sdk");

dotenv.config();
const router = express.Router();

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY,
});

router.get("/", async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        { role: "system", content: "You are a friendly test bot." },
        { role: "user", content: "Say hello from Groq!" },
      ],
    });

    res.json({
      success: true,
      message: completion.choices[0].message.content,
    });
  } catch (error) {
    console.error("Groq test error:", error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
