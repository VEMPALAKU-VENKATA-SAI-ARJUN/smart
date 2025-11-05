const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: process.env.SMTP_PORT || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      }
    });
  }

  async sendEmail(to, subject, html, text = null) {
    try {
      const mailOptions = {
        from: `"S.M.A.R.T Platform" <${process.env.SMTP_USER}>`,
        to,
        subject,
        html,
        text: text || this.stripHtml(html)
      };

      const result = await this.transporter.sendMail(mailOptions);
      console.log('Email sent successfully:', result.messageId);
      return { success: true, messageId: result.messageId };
    } catch (error) {
      console.error('Email sending failed:', error);
      return { success: false, error: error.message };
    }
  }

  stripHtml(html) {
    return html.replace(/<[^>]*>/g, '');
  }

  // Email templates
  getNotificationEmailTemplate(notification, user) {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Notification - S.M.A.R.T Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .notification-card { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #667eea; margin: 20px 0; }
          .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .btn:hover { background: #5a67d8; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚡ S.M.A.R.T Platform</h1>
            <p>You have a new notification</p>
          </div>
          <div class="content">
            <div class="notification-card">
              <h2>${notification.content.title}</h2>
              <p>${notification.content.message}</p>
              ${notification.content.link ? `<a href="${baseUrl}${notification.content.link}" class="btn">View Details</a>` : ''}
            </div>
            <p>You can manage your notification preferences in your account settings.</p>
            <a href="${baseUrl}/notifications" class="btn">View All Notifications</a>
          </div>
          <div class="footer">
            <p>© 2024 S.M.A.R.T Platform. All rights reserved.</p>
            <p><a href="${baseUrl}/settings/notifications">Unsubscribe</a> from email notifications</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  getMessageEmailTemplate(message, sender, recipient) {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Message - S.M.A.R.T Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .message-card { background: white; padding: 20px; border-radius: 8px; border-left: 4px solid #10b981; margin: 20px 0; }
          .sender-info { display: flex; align-items: center; margin-bottom: 15px; }
          .avatar { width: 40px; height: 40px; border-radius: 50%; background: #667eea; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; margin-right: 10px; }
          .btn { display: inline-block; padding: 12px 24px; background: #10b981; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          .btn:hover { background: #059669; }
          .footer { text-align: center; color: #666; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>💬 New Message</h1>
            <p>You have received a new message on S.M.A.R.T Platform</p>
          </div>
          <div class="content">
            <div class="message-card">
              <div class="sender-info">
                <div class="avatar">${sender.username.charAt(0).toUpperCase()}</div>
                <div>
                  <strong>${sender.profile?.displayName || sender.username}</strong>
                  <br><small>@${sender.username}</small>
                </div>
              </div>
              <p><strong>Message:</strong></p>
              <p style="background: #f1f5f9; padding: 15px; border-radius: 6px; font-style: italic;">"${message.content}"</p>
            </div>
            <a href="${baseUrl}/messages?user=${sender._id}" class="btn">Reply to Message</a>
          </div>
          <div class="footer">
            <p>© 2024 S.M.A.R.T Platform. All rights reserved.</p>
            <p><a href="${baseUrl}/settings/notifications">Manage email preferences</a></p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  // Send notification email
  async sendNotificationEmail(user, notification) {
    if (!user.email || !user.preferences?.emailNotifications) {
      return { success: false, reason: 'Email notifications disabled' };
    }

    const subject = `${notification.content.title} - S.M.A.R.T Platform`;
    const html = this.getNotificationEmailTemplate(notification, user);

    return await this.sendEmail(user.email, subject, html);
  }

  // Send message email
  async sendMessageEmail(recipient, message, sender) {
    if (!recipient.email || !recipient.preferences?.emailMessages) {
      return { success: false, reason: 'Email messages disabled' };
    }

    const subject = `New message from ${sender.username} - S.M.A.R.T Platform`;
    const html = this.getMessageEmailTemplate(message, sender, recipient);

    return await this.sendEmail(recipient.email, subject, html);
  }

  // Welcome email
  async sendWelcomeEmail(user) {
    const baseUrl = process.env.CLIENT_URL || 'http://localhost:5173';
    const subject = 'Welcome to S.M.A.R.T Platform!';
    
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to S.M.A.R.T Platform</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
          .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
          .btn { display: inline-block; padding: 12px 24px; background: #667eea; color: white; text-decoration: none; border-radius: 6px; margin: 10px 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚡ Welcome to S.M.A.R.T Platform!</h1>
            <p>Your creative journey starts here</p>
          </div>
          <div class="content">
            <h2>Hi ${user.username}!</h2>
            <p>Welcome to S.M.A.R.T Platform - the premier destination for digital art and creativity. We're excited to have you join our community of talented artists and art enthusiasts.</p>
            
            <h3>Get Started:</h3>
            <ul>
              <li>Complete your profile to showcase your artistic style</li>
              <li>Upload your first artwork to share with the community</li>
              <li>Explore the gallery and discover amazing art</li>
              <li>Follow your favorite artists</li>
              <li>Engage with the community through likes and comments</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${baseUrl}/profile/${user._id}" class="btn">Complete Profile</a>
              <a href="${baseUrl}/upload" class="btn">Upload Artwork</a>
              <a href="${baseUrl}/gallery" class="btn">Explore Gallery</a>
            </div>
            
            <p>If you have any questions, feel free to reach out to our support team. Happy creating!</p>
          </div>
        </div>
      </body>
      </html>
    `;

    return await this.sendEmail(user.email, subject, html);
  }
}

module.exports = new EmailService();