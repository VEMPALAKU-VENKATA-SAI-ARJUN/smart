// models/User.js

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    minlength: 3
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true
  },
  password: {
    type: String,
    required: function() { return !this.oauthProvider; }
  },
  role: {
    type: String,
    enum: ['buyer', 'artist', 'reviewer', 'moderator', 'admin'],
    default: 'buyer'
  },
  oauthProvider: {
    type: String,
    enum: ['google', 'github', null],
    default: null
  },
  oauthId: String,
  profile: {
    avatar: String,
    bio: String,
    location: String,
    website: String,
    socialLinks: {
      instagram: String,
      twitter: String,
      portfolio: String
    }
  },
  artistInfo: {
    specialization: [String],
    yearsOfExperience: Number,
    commissionOpen: { type: Boolean, default: false },
    commissionRate: Number
  },
  favorites: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
  wishlist: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
  likedArtworks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' }],
  following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  pushSubscriptions: [{
    endpoint: String,
    keys: {
      p256dh: String,
      auth: String
    }
  }],
  preferences: {
    emailNotifications: { type: Boolean, default: true },
    emailMessages: { type: Boolean, default: true },
    pushNotifications: { type: Boolean, default: true },
    notificationTypes: {
      follow: { type: Boolean, default: true },
      like: { type: Boolean, default: true },
      comment: { type: Boolean, default: true },
      artwork_approved: { type: Boolean, default: true },
      artwork_rejected: { type: Boolean, default: true },
      commission_request: { type: Boolean, default: true },
      message: { type: Boolean, default: true }
    }
  },
  isVerified: { type: Boolean, default: false },
  isActive: { type: Boolean, default: true },
  lastLogin: Date
}, { timestamps: true });

userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('User', userSchema);

