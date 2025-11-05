const webpush = require('web-push');

class PushNotificationService {
  constructor() {
    // Set VAPID keys for web push
    webpush.setVapidDetails(
      'mailto:' + (process.env.VAPID_EMAIL || 'admin@smart-platform.com'),
      process.env.VAPID_PUBLIC_KEY || this.generateVapidKeys().publicKey,
      process.env.VAPID_PRIVATE_KEY || this.generateVapidKeys().privateKey
    );
  }

  generateVapidKeys() {
    // In production, generate these once and store in environment variables
    const vapidKeys = webpush.generateVAPIDKeys();
    console.log('Generated VAPID Keys:');
    console.log('Public Key:', vapidKeys.publicKey);
    console.log('Private Key:', vapidKeys.privateKey);
    return vapidKeys;
  }

  async sendPushNotification(subscription, payload, options = {}) {
    try {
      const defaultOptions = {
        TTL: 60 * 60 * 24, // 24 hours
        urgency: 'normal',
        ...options
      };

      const result = await webpush.sendNotification(
        subscription,
        JSON.stringify(payload),
        defaultOptions
      );

      console.log('Push notification sent successfully');
      return { success: true, result };
    } catch (error) {
      console.error('Push notification failed:', error);
      
      // Handle expired subscriptions
      if (error.statusCode === 410) {
        return { success: false, expired: true, error: error.message };
      }
      
      return { success: false, error: error.message };
    }
  }

  async sendNotificationToUser(user, notification) {
    if (!user.pushSubscriptions || user.pushSubscriptions.length === 0) {
      return { success: false, reason: 'No push subscriptions found' };
    }

    const payload = {
      title: notification.content.title,
      body: notification.content.message,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png',
      data: {
        notificationId: notification._id,
        type: notification.type,
        url: notification.content.link || '/notifications',
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'view',
          title: 'View',
          icon: '/icons/view-icon.png'
        },
        {
          action: 'dismiss',
          title: 'Dismiss',
          icon: '/icons/dismiss-icon.png'
        }
      ],
      requireInteraction: notification.type === 'message' || notification.type === 'commission_request',
      vibrate: [200, 100, 200]
    };

    const results = [];
    const expiredSubscriptions = [];

    for (const subscription of user.pushSubscriptions) {
      const result = await this.sendPushNotification(subscription, payload);
      
      if (result.expired) {
        expiredSubscriptions.push(subscription);
      }
      
      results.push(result);
    }

    // Remove expired subscriptions
    if (expiredSubscriptions.length > 0) {
      await this.removeExpiredSubscriptions(user._id, expiredSubscriptions);
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      totalSent: results.length,
      successCount,
      expiredCount: expiredSubscriptions.length
    };
  }

  async sendMessageNotification(recipient, message, sender) {
    if (!recipient.pushSubscriptions || recipient.pushSubscriptions.length === 0) {
      return { success: false, reason: 'No push subscriptions found' };
    }

    const payload = {
      title: `New message from ${sender.username}`,
      body: message.content.length > 100 ? 
        message.content.substring(0, 100) + '...' : 
        message.content,
      icon: sender.profile?.avatar || '/icons/default-avatar.png',
      badge: '/icons/message-badge.png',
      data: {
        messageId: message._id,
        senderId: sender._id,
        type: 'message',
        url: `/messages?user=${sender._id}`,
        timestamp: Date.now()
      },
      actions: [
        {
          action: 'reply',
          title: 'Reply',
          icon: '/icons/reply-icon.png'
        },
        {
          action: 'view',
          title: 'View Conversation',
          icon: '/icons/view-icon.png'
        }
      ],
      requireInteraction: true,
      vibrate: [200, 100, 200, 100, 200]
    };

    const results = [];
    for (const subscription of recipient.pushSubscriptions) {
      const result = await this.sendPushNotification(subscription, payload);
      results.push(result);
    }

    const successCount = results.filter(r => r.success).length;
    return {
      success: successCount > 0,
      totalSent: results.length,
      successCount
    };
  }

  async removeExpiredSubscriptions(userId, expiredSubscriptions) {
    try {
      const User = require('../models/User');
      await User.findByIdAndUpdate(userId, {
        $pullAll: { pushSubscriptions: expiredSubscriptions }
      });
      console.log(`Removed ${expiredSubscriptions.length} expired push subscriptions for user ${userId}`);
    } catch (error) {
      console.error('Error removing expired subscriptions:', error);
    }
  }

  // Bulk notification for announcements
  async sendBulkNotification(users, notification) {
    const results = [];
    
    for (const user of users) {
      if (user.preferences?.pushNotifications !== false) {
        const result = await this.sendNotificationToUser(user, notification);
        results.push({ userId: user._id, ...result });
      }
    }

    return {
      totalUsers: users.length,
      results,
      successCount: results.filter(r => r.success).length
    };
  }
}

module.exports = new PushNotificationService();