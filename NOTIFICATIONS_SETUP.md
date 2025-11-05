# Email and Push Notifications Setup Guide

This guide explains how to set up and configure email notifications and push notifications for the S.M.A.R.T Platform.

## 📧 Email Notifications Setup

### 1. Gmail SMTP Configuration

To use Gmail for sending emails, you need to:

1. **Enable 2-Factor Authentication** on your Gmail account
2. **Generate an App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification → App passwords
   - Generate a password for "Mail"
   - Use this password in your `.env` file

3. **Update Backend `.env` file**:
```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your_email@gmail.com
SMTP_PASS=your_16_character_app_password
```

### 2. Other Email Providers

For other email providers, update the SMTP settings:

**Outlook/Hotmail:**
```env
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=your_email@outlook.com
SMTP_PASS=your_password
```

**Yahoo:**
```env
SMTP_HOST=smtp.mail.yahoo.com
SMTP_PORT=587
SMTP_USER=your_email@yahoo.com
SMTP_PASS=your_app_password
```

### 3. Email Templates

The system includes pre-built email templates for:
- **Welcome emails** - Sent when users register
- **Notification emails** - For follows, likes, comments, artwork approvals
- **Message emails** - For direct messages

## 🔔 Push Notifications Setup

### 1. VAPID Keys Generation

VAPID keys are required for web push notifications. The system will auto-generate them, but for production:

1. **Generate VAPID Keys** (run this in Node.js):
```javascript
const webpush = require('web-push');
const vapidKeys = webpush.generateVAPIDKeys();
console.log('Public Key:', vapidKeys.publicKey);
console.log('Private Key:', vapidKeys.privateKey);
```

2. **Update Backend `.env` file**:
```env
VAPID_EMAIL=admin@your-domain.com
VAPID_PUBLIC_KEY=your_generated_public_key
VAPID_PRIVATE_KEY=your_generated_private_key
```

### 2. Service Worker Registration

The service worker (`/public/sw.js`) is automatically registered and handles:
- Push notification display
- Notification click actions
- Background sync
- Caching for offline functionality

### 3. Browser Support

Push notifications work in:
- ✅ Chrome 42+
- ✅ Firefox 44+
- ✅ Safari 16+ (macOS 13+)
- ✅ Edge 17+
- ❌ iOS Safari (limited support)

## 🚀 Installation & Dependencies

### Backend Dependencies

Install required packages:
```bash
cd backend
npm install nodemailer web-push
```

### Frontend Setup

The frontend automatically handles push notification registration when users visit the notification settings page.

## ⚙️ Configuration Options

### User Preferences

Users can control notifications through `/settings/notifications`:

**Email Notifications:**
- General notifications (follows, likes, comments)
- Message notifications
- Individual notification types

**Push Notifications:**
- Browser notifications
- Test notifications
- Individual notification types

### Notification Types

The system supports these notification types:
- `follow` - New followers
- `like` - Artwork likes
- `comment` - Artwork comments
- `artwork_approved` - Artwork approvals
- `artwork_rejected` - Artwork rejections
- `commission_request` - Commission requests
- `message` - Direct messages

## 🔧 API Endpoints

### Push Notification Endpoints

```
POST /api/push/subscribe          # Subscribe to push notifications
POST /api/push/unsubscribe        # Unsubscribe from push notifications
GET  /api/push/vapid-public-key   # Get VAPID public key
PATCH /api/push/preferences       # Update notification preferences
GET   /api/push/preferences       # Get notification preferences
```

### Notification Endpoints

```
POST /api/notifications/create    # Create new notification (sends email + push)
GET  /api/notifications           # Get user notifications
GET  /api/notifications/unread-count # Get unread count
PATCH /api/notifications/:id/read # Mark as read
DELETE /api/notifications/:id     # Delete notification
```

## 📱 Usage Examples

### Creating Notifications

```javascript
// Backend - Create notification with email and push
const notification = {
  type: 'follow',
  recipient: userId,
  content: {
    title: 'New Follower',
    message: `${username} started following you`,
    link: `/profile/${followerId}`
  },
  relatedUser: followerId
};

// This automatically sends email + push notifications
await fetch('/api/notifications/create', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(notification)
});
```

### Frontend - Subscribe to Push Notifications

```javascript
import pushNotificationService from '../services/pushNotificationService';

// Initialize and subscribe
await pushNotificationService.initialize();
const permission = await pushNotificationService.requestPermission();

if (permission === 'granted') {
  await pushNotificationService.subscribe();
}
```

## 🛠️ Troubleshooting

### Email Issues

**Problem:** Emails not sending
**Solutions:**
- Check SMTP credentials in `.env`
- Verify app password for Gmail
- Check firewall/network restrictions
- Enable "Less secure app access" (not recommended)

### Push Notification Issues

**Problem:** Push notifications not working
**Solutions:**
- Check browser support
- Verify HTTPS (required for push notifications)
- Check VAPID keys configuration
- Ensure service worker is registered
- Check browser notification permissions

**Problem:** Service worker not registering
**Solutions:**
- Ensure `/sw.js` is in public folder
- Check for JavaScript errors
- Verify HTTPS connection
- Clear browser cache

### Common Errors

**"Invalid VAPID key"**
- Regenerate VAPID keys
- Ensure keys are properly formatted in `.env`

**"Push subscription failed"**
- Check browser permissions
- Verify HTTPS connection
- Check network connectivity

## 🔒 Security Considerations

1. **Environment Variables**: Never commit `.env` files to version control
2. **VAPID Keys**: Keep private keys secure
3. **Email Credentials**: Use app passwords, not account passwords
4. **HTTPS Required**: Push notifications require HTTPS in production
5. **Rate Limiting**: Implement rate limiting for notification endpoints

## 📊 Monitoring & Analytics

### Email Delivery

Monitor email delivery through:
- SMTP provider dashboards
- Application logs
- User feedback

### Push Notification Metrics

Track push notification performance:
- Subscription rates
- Delivery success rates
- Click-through rates
- Unsubscribe rates

## 🚀 Production Deployment

### Environment Setup

1. **Set up production SMTP** (SendGrid, Mailgun, etc.)
2. **Generate production VAPID keys**
3. **Configure HTTPS** (required for push notifications)
4. **Set up monitoring** for email delivery and push notifications

### Performance Optimization

1. **Async Processing**: Email and push notifications are sent asynchronously
2. **Rate Limiting**: Prevent spam and abuse
3. **Batch Processing**: For bulk notifications
4. **Caching**: Cache user preferences and subscriptions

## 📚 Additional Resources

- [Web Push Protocol](https://tools.ietf.org/html/rfc8030)
- [Service Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API)
- [Nodemailer Documentation](https://nodemailer.com/)
- [Web Push Library](https://github.com/web-push-libs/web-push)

## 🎯 Next Steps

1. **Test email delivery** with your SMTP provider
2. **Generate production VAPID keys**
3. **Configure notification preferences** for your users
4. **Set up monitoring** and analytics
5. **Implement advanced features** like scheduled notifications or rich media support