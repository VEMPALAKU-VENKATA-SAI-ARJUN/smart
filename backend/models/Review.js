// models/Review.js
const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  artwork: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork',
    required: true
  },
  buyer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5
  },
  comment: {
    type: String,
    required: true
  },
  images: [String],
  helpful: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  response: {
    text: String,
    by: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    at: Date
  },
  isVerifiedPurchase: { type: Boolean, default: false }
}, { timestamps: true });

reviewSchema.index({ artwork: 1, createdAt: -1 });
reviewSchema.index({ buyer: 1, artwork: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);
