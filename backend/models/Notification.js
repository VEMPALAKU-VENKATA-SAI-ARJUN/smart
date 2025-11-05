// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['follow', 'like', 'comment', 'artwork_approved', 'artwork_rejected', 'commission_request', 'message', 'new-follower', 'artwork-sold', 'new-review', 'contest-update', 'moderation-update'],
    required: true
  },
  content: {
    title: String,
    message: String,
    link: String
  },
  relatedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  relatedArtwork: { type: mongoose.Schema.Types.ObjectId, ref: 'Artwork' },
  isRead: { type: Boolean, default: false },
  readAt: Date
}, { timestamps: true });

notificationSchema.index({ recipient: 1, isRead: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);