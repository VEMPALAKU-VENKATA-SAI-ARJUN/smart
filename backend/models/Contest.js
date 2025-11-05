
// models/Contest.js
const mongoose = require('mongoose');

const contestSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true
  },
  description: String,
  theme: String,
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  prizes: [{
    position: Number,
    amount: Number,
    description: String
  }],
  rules: [String],
  entries: [{
    artwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' },
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    votes: { type: Number, default: 0 },
    submittedAt: { type: Date, default: Date.now }
  }],
  status: {
    type: String,
    enum: ['upcoming', 'active', 'judging', 'completed'],
    default: 'upcoming'
  },
  winners: [{
    position: Number,
    artist: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    artwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }
  }]
}, { timestamps: true });

module.exports = mongoose.model('Contest', contestSchema);

