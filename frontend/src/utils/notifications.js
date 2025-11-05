// Utility functions for creating notifications

export const createNotification = async (type, recipientId, data = {}) => {
  try {
    const token = localStorage.getItem('auth_token');
    if (!token) return;

    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    const notificationData = {
      type,
      recipient: recipientId,
      ...data
    };

    const response = await fetch(`${API_URL}/api/notifications/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(notificationData)
    });

    return response.json();
  } catch (error) {
    console.error('Error creating notification:', error);
    return null;
  }
};

// Notification types and their content generators
export const notificationTypes = {
  follow: (username) => ({
    title: 'New Follower',
    message: `${username} started following you`
  }),
  
  like: (username, artworkTitle) => ({
    title: 'New Like',
    message: `${username} liked your artwork "${artworkTitle}"`
  }),
  
  comment: (username, artworkTitle) => ({
    title: 'New Comment',
    message: `${username} commented on your artwork "${artworkTitle}"`
  }),
  
  artwork_approved: (artworkTitle) => ({
    title: 'Artwork Approved',
    message: `Your artwork "${artworkTitle}" has been approved and is now live!`
  }),
  
  artwork_rejected: (artworkTitle, reason) => ({
    title: 'Artwork Needs Review',
    message: `Your artwork "${artworkTitle}" needs some adjustments. ${reason || 'Please check the moderation feedback.'}`
  }),
  
  commission_request: (username) => ({
    title: 'New Commission Request',
    message: `${username} sent you a commission request`
  }),
  
  message: (username) => ({
    title: 'New Message',
    message: `${username} sent you a message`
  })
};

// Helper function to send notification with proper content
export const sendNotification = async (type, recipientId, context = {}) => {
  const contentGenerator = notificationTypes[type];
  if (!contentGenerator) {
    console.error(`Unknown notification type: ${type}`);
    return null;
  }

  const content = contentGenerator(
    context.username,
    context.artworkTitle,
    context.reason
  );

  return createNotification(type, recipientId, {
    content,
    relatedUser: context.userId,
    relatedArtwork: context.artworkId
  });
};