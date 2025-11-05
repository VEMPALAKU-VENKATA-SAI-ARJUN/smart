// models/Artwork.js
const mongoose = require('mongoose');

const artworkSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    minlength: 20
  },
  artist: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  images: [{
    url: String,
    public_id: String, // match Cloudinary response (public_id)
    thumbnail: String,
    width: Number,
    height: Number,
    format: String,
    hash: String // perceptual hash for plagiarism detection
  }],
  thumbnail: String,
  category: {
    type: String,
    enum: ['sketch','digital', 'painting', 'photography', 'sculpture', '3d', 'illustration', 'mixed-media', 'other'],
    required: true
  },
  tags: [String],
  price: {
    type: Number,
    required: true,
    min: 0
  },
  currency: {
    type: String,
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['draft', 'pending', 'approved', 'rejected', 'sold', 'archived'],
    default: 'pending'
  },
  moderationStatus: {
    aiChecked: { type: Boolean, default: false },
    nsfwScore: Number,
    plagiarismScore: Number,
    flaggedReasons: [String],
    moderatorNotes: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date
  },
  visibility: {
    type: String,
    enum: ['public', 'private', 'followers-only'],
    default: 'public'
  },
  scheduledPublish: Date,
  badges: [{
    type: String,
    enum: ['trending', 'featured', 'new', 'bestseller', 'contest-winner']
  }],
  stats: {
    views: { type: Number, default: 0 },
    favorites: { type: Number, default: 0 },
    shares: { type: Number, default: 0 }
  },
  isForSale: { type: Boolean, default: true },
  isSold: { type: Boolean, default: false },
  soldTo: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  soldAt: Date,
  printAvailable: { type: Boolean, default: false },
  license: {
    type: String,
    enum: ['all-rights-reserved', 'creative-commons', 'commercial-use'],
    default: 'all-rights-reserved'
  },
  isTrending: { type: Boolean, default: false },
  isFeatured: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

artworkSchema.index({ artist: 1, createdAt: -1 });
artworkSchema.index({ category: 1, status: 1 });
artworkSchema.index({ tags: 1 });
artworkSchema.index({ 'stats.views': -1 });
// add index for faster hash lookups
artworkSchema.index({ 'images.hash': 1 });

artworkSchema.pre('save', function(next) {
  // Ensure badges array is unique and up-to-date
  const badges = new Set(this.badges || []);

  // "trending" badge
  if (this.isTrending) {
    badges.add('trending');
  } else {
    badges.delete('trending');
  }

  // "featured" badge
  if (this.isFeatured) {
    badges.add('featured');
  } else {
    badges.delete('featured');
  }

  // "new" badge (created within last 7 days)
  const isNew = (Date.now() - new Date(this.createdAt)) < 7 * 24 * 60 * 60 * 1000;
  if (isNew) {
    badges.add('new');
  } else {
    badges.delete('new');
  }

  this.badges = Array.from(badges);
  next();
});

module.exports = mongoose.model('Artwork', artworkSchema);

