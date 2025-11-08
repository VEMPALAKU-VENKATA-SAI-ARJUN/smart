const mongoose = require('mongoose');

const reviewSchema = new mongoose.Schema({
  artwork: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Artwork',
    required: true,
    index: true
  },
  reviewer: {
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
    required: true,
    maxlength: 1000
  },
  recommendation: {
    type: String,
    enum: ['approve', 'revise', 'reject'],
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Compound unique index: one review per reviewer per artwork
reviewSchema.index({ artwork: 1, reviewer: 1 }, { unique: true });

// Pre-save validation
reviewSchema.pre('save', function(next) {
  if (this.rating < 1 || this.rating > 5) {
    return next(new Error('Rating must be between 1 and 5'));
  }
  if (!this.artwork || !this.reviewer) {
    return next(new Error('Artwork and reviewer are required'));
  }
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Review', reviewSchema);
