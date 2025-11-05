# S.M.A.R.T Platform API Documentation

## Overview
The S.M.A.R.T (Smart Moderation Art Recognition Technology) platform provides a comprehensive REST API for managing artwork, users, messaging, notifications, and AI-powered moderation.

**Base URL:** `http://localhost:5000/api` (development)

## Authentication
Most endpoints require authentication using JWT tokens. Include the token in the Authorization header:
```
Authorization: Bearer <your_jwt_token>
```

## Response Format
All API responses follow this standard format:
```json
{
  "success": boolean,
  "data": object|array,
  "message": string,
  "pagination": object (for paginated responses)
}
```

---

## 🔐 Authentication Endpoints

### POST /auth/register
Register a new user account.

**Request Body:**
```json
{
  "username": "string (required)",
  "email": "string (required)",
  "password": "string (required, min 6 chars)",
  "role": "string (optional: buyer|artist|moderator|admin, default: buyer)"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email",
    "role": "role"
  }
}
```

### POST /auth/login
Login with existing credentials.

**Request Body:**
```json
{
  "email": "string (required)",
  "password": "string (required)"
}
```

**Response:**
```json
{
  "success": true,
  "token": "jwt_token",
  "user": {
    "id": "user_id",
    "username": "username",
    "email": "email",
    "role": "role"
  }
}
```

### GET /auth/google
Initiate Google OAuth authentication.

### GET /auth/google/callback
Google OAuth callback endpoint.

---

## 🎨 Artwork Endpoints

### GET /artworks
Get all approved artworks with filtering and pagination.

**Query Parameters:**
- `category` (string): Filter by category
- `minPrice` (number): Minimum price filter
- `maxPrice` (number): Maximum price filter
- `tags` (string): Comma-separated tags
- `search` (string): Search in title, description, tags
- `sortBy` (string): Sort field (createdAt, price, stats.views)
- `order` (string): Sort order (asc, desc)
- `page` (number): Page number (default: 1)
- `limit` (number): Items per page (default: 20)

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "artwork_id",
      "title": "Artwork Title",
      "description": "Description",
      "artist": {
        "_id": "artist_id",
        "username": "artist_name",
        "profile": {
          "avatar": "avatar_url"
        }
      },
      "images": [
        {
          "url": "image_url",
          "publicId": "cloudinary_id",
          "width": 1920,
          "height": 1080
        }
      ],
      "thumbnail": "thumbnail_url",
      "category": "digital",
      "tags": ["tag1", "tag2"],
      "price": 100,
      "status": "approved",
      "stats": {
        "views": 150,
        "likes": 25,
        "downloads": 5
      },
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### GET /artworks/feed
Get artwork feed from followed artists (requires authentication).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

### POST /artworks
Upload new artwork (requires authentication).

**Content-Type:** `multipart/form-data`

**Form Data:**
- `images` (files): Image files (max 5)
- `title` (string): Artwork title
- `description` (string): Artwork description
- `category` (string): Artwork category
- `tags` (string): Comma-separated tags
- `price` (number): Price in currency units
- `status` (string): draft|pending (default: pending)

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "artwork_id",
    "title": "Artwork Title",
    "status": "pending",
    "moderationStatus": {
      "aiChecked": true,
      "nsfwScore": 0.1,
      "plagiarismScore": 0.05,
      "flaggedReasons": []
    }
  },
  "message": "Artwork uploaded successfully",
  "moderation": {
    "recommendation": "auto_approve",
    "score": 0.95,
    "flagsCount": 0,
    "confidence": "high"
  }
}
```

### GET /artworks/:id
Get single artwork details.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "artwork_id",
    "title": "Artwork Title",
    "description": "Description",
    "artist": {
      "_id": "artist_id",
      "username": "artist_name",
      "profile": {
        "avatar": "avatar_url",
        "bio": "Artist bio"
      },
      "artistInfo": {
        "specialties": ["digital", "illustration"],
        "experience": "5 years"
      }
    },
    "images": [...],
    "stats": {
      "views": 151,
      "likes": 25,
      "downloads": 5
    }
  }
}
```

---

## 👥 User Endpoints

### GET /users/:id
Get user profile by ID.

**Response:**
```json
{
  "success": true,
  "data": {
    "_id": "user_id",
    "username": "username",
    "email": "email",
    "role": "artist",
    "profile": {
      "avatar": "avatar_url",
      "bio": "User bio",
      "displayName": "Display Name"
    },
    "followers": ["user_id1", "user_id2"],
    "following": ["user_id3", "user_id4"],
    "createdAt": "2024-01-01T00:00:00.000Z"
  }
}
```

### GET /users/:id/artworks
Get artworks by user ID.

**Query Parameters:**
- `all` (boolean): Show all artworks including drafts (for own profile)

### PUT /users/:id
Update user profile (requires authentication, own profile only).

**Request Body:**
```json
{
  "username": "new_username",
  "email": "new_email",
  "profile": {
    "bio": "Updated bio",
    "displayName": "New Display Name",
    "avatar": "avatar_url"
  }
}
```

### PATCH /users/:id/role
Update user role (admin only).

**Request Body:**
```json
{
  "role": "moderator"
}
```

### GET /users/suggestions
Get suggested artists to follow.

---

## 💬 Message Endpoints

### GET /messages/conversations
Get user's conversations (requires authentication).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "otherUser": {
        "_id": "user_id",
        "username": "username",
        "profile": {
          "avatar": "avatar_url",
          "displayName": "Display Name"
        }
      },
      "lastMessage": {
        "_id": "message_id",
        "content": "Last message content",
        "createdAt": "2024-01-01T00:00:00.000Z",
        "sender": "sender_id"
      },
      "unreadCount": 3
    }
  ]
}
```

### GET /messages/conversation/:userId
Get messages with specific user (requires authentication).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page (default: 50)

### POST /messages/send
Send a message (requires authentication).

**Request Body:**
```json
{
  "recipient": "user_id",
  "content": "Message content",
  "type": "text",
  "relatedArtwork": "artwork_id (optional)"
}
```

### PATCH /messages/:messageId/read
Mark message as read (requires authentication).

### DELETE /messages/:messageId
Delete message (requires authentication, sender only).

### GET /messages/unread-count
Get unread message count (requires authentication).

---

## 🔔 Notification Endpoints

### GET /notifications
Get user's notifications (requires authentication).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `unreadOnly` (boolean): Show only unread notifications

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "_id": "notification_id",
      "type": "like",
      "content": {
        "title": "New Like",
        "message": "Someone liked your artwork",
        "link": "/artwork/artwork_id"
      },
      "relatedUser": {
        "_id": "user_id",
        "username": "username",
        "profile": {
          "avatar": "avatar_url"
        }
      },
      "relatedArtwork": {
        "_id": "artwork_id",
        "title": "Artwork Title",
        "thumbnail": "thumbnail_url"
      },
      "isRead": false,
      "createdAt": "2024-01-01T00:00:00.000Z"
    }
  ],
  "pagination": {...},
  "unreadCount": 5
}
```

### POST /notifications/create
Create a notification (requires authentication).

**Request Body:**
```json
{
  "type": "follow|like|comment|artwork_approved|artwork_rejected|commission_request|message",
  "recipient": "user_id",
  "content": {
    "title": "Notification Title",
    "message": "Notification message",
    "link": "/path/to/resource"
  },
  "relatedUser": "user_id (optional)",
  "relatedArtwork": "artwork_id (optional)"
}
```

### PATCH /notifications/:id/read
Mark notification as read (requires authentication).

### PATCH /notifications/mark-all-read
Mark all notifications as read (requires authentication).

### DELETE /notifications/:id
Delete notification (requires authentication).

### GET /notifications/unread-count
Get unread notification count (requires authentication).

---

## 🛡️ Moderation Endpoints

### GET /moderation/queue
Get pending artworks for moderation (requires moderator/admin role).

**Query Parameters:**
- `page` (number): Page number
- `limit` (number): Items per page
- `flagType` (string): Filter by flag type

### PATCH /moderation/:id/approve
Approve artwork (requires moderator/admin role).

**Request Body:**
```json
{
  "moderatorNotes": "Approval notes"
}
```

### PATCH /moderation/:id/reject
Reject artwork (requires moderator/admin role).

**Request Body:**
```json
{
  "reason": "Rejection reason",
  "moderatorNotes": "Additional notes"
}
```

### POST /moderation/:id/recheck
Re-run AI moderation on artwork (requires authentication).

### GET /moderation/ai-stats
Get AI moderation statistics (requires authentication).

**Query Parameters:**
- `days` (number): Number of days to analyze (default: 7)

### POST /moderation/batch-moderate
Run batch AI moderation (requires moderator/admin role).

**Request Body:**
```json
{
  "limit": 50,
  "autoApprove": false
}
```

### GET /moderation/:id/ai-analysis
Get detailed AI analysis for artwork (requires authentication).

### GET /moderation/health
Check AI moderation system health.

### POST /moderation/test-ai
Test AI moderation system (requires authentication).

**Request Body:**
```json
{
  "imageUrl": "image_url",
  "title": "Test Title",
  "description": "Test Description"
}
```

---

## 🔔 Push Notification Endpoints

### POST /push/subscribe
Subscribe to push notifications (requires authentication).

**Request Body:**
```json
{
  "subscription": {
    "endpoint": "push_endpoint",
    "keys": {
      "p256dh": "p256dh_key",
      "auth": "auth_key"
    }
  }
}
```

### POST /push/unsubscribe
Unsubscribe from push notifications (requires authentication).

**Request Body:**
```json
{
  "endpoint": "push_endpoint"
}
```

### GET /push/vapid-public-key
Get VAPID public key for push notifications.

### PATCH /push/preferences
Update notification preferences (requires authentication).

**Request Body:**
```json
{
  "preferences": {
    "emailNotifications": true,
    "emailMessages": true,
    "pushNotifications": true,
    "notificationTypes": {
      "follow": true,
      "like": true,
      "comment": true,
      "artwork_approved": true,
      "artwork_rejected": true,
      "commission_request": true,
      "message": true
    }
  }
}
```

### GET /push/preferences
Get notification preferences (requires authentication).

---

## 📝 Review Endpoints

### GET /reviews
Get all reviews.

### POST /reviews
Create a review.

### PUT /reviews/:id
Update a review.

### DELETE /reviews/:id
Delete a review.

---

## 🎯 Commission Endpoints

### GET /commissions
Get all commissions.

### POST /commissions
Create a commission.

### PUT /commissions/:id
Update a commission.

### DELETE /commissions/:id
Delete a commission.

---

## 🏆 Contest Endpoints

### GET /contests
Get all contests.

### POST /contests
Create a contest.

### PUT /contests/:id
Update a contest.

### DELETE /contests/:id
Delete a contest.

---

## Error Handling

### Error Response Format
```json
{
  "success": false,
  "message": "Error description"
}
```

### Common HTTP Status Codes
- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not Found
- `500` - Internal Server Error

### Common Error Messages
- `"Please provide email and password"` - Missing required fields
- `"Invalid credentials"` - Wrong email/password
- `"User already exists"` - Registration with existing email/username
- `"Token is required"` - Missing authentication token
- `"Invalid token"` - Expired or malformed token
- `"Access denied"` - Insufficient permissions

---

## Rate Limiting
- **General API**: 100 requests per 15 minutes per IP
- **Authentication**: Additional rate limiting may apply

---

## File Upload Specifications

### Artwork Images
- **Formats**: JPG, PNG, GIF
- **Max Size**: 10MB per file
- **Max Files**: 5 per artwork
- **Storage**: Cloudinary CDN

### Profile Images
- **Formats**: JPG, PNG
- **Max Size**: 5MB
- **Storage**: Cloudinary CDN

---

## AI Moderation Features

### Automatic Checks
- **NSFW Detection**: Identifies inappropriate content
- **Plagiarism Analysis**: Detects potential copyright issues
- **Quality Assessment**: Evaluates image quality
- **Text Analysis**: Analyzes titles, descriptions, and tags

### Moderation Outcomes
- `auto_approve` - Automatically approved
- `review` - Requires manual review
- `reject` - Automatically rejected

### Moderation Scores
- **NSFW Score**: 0.0 (safe) to 1.0 (explicit)
- **Plagiarism Score**: 0.0 (original) to 1.0 (likely plagiarized)
- **Overall Score**: Combined confidence score

---

## WebSocket Events (Future Implementation)
- Real-time messaging
- Live notifications
- Artwork status updates
- Moderation queue updates

---

## Environment Variables

### Required
- `MONGO_URI` - MongoDB connection string
- `JWT_SECRET` - JWT signing secret
- `CLOUDINARY_CLOUD_NAME` - Cloudinary cloud name
- `CLOUDINARY_API_KEY` - Cloudinary API key
- `CLOUDINARY_API_SECRET` - Cloudinary API secret

### Optional
- `CLIENT_URL` - Frontend URL (default: http://localhost:5173)
- `PORT` - Server port (default: 5000)
- `SESSION_SECRET` - Session secret
- `GOOGLE_CLIENT_ID` - Google OAuth client ID
- `GOOGLE_CLIENT_SECRET` - Google OAuth client secret
- `VAPID_PUBLIC_KEY` - Push notification public key
- `VAPID_PRIVATE_KEY` - Push notification private key
- `EMAIL_HOST` - SMTP host
- `EMAIL_PORT` - SMTP port
- `EMAIL_USER` - SMTP username
- `EMAIL_PASS` - SMTP password

---

## SDK Examples

### JavaScript/Node.js
```javascript
const API_BASE = 'http://localhost:5000/api';

// Login
const login = async (email, password) => {
  const response = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  return response.json();
};

// Get artworks
const getArtworks = async (filters = {}) => {
  const params = new URLSearchParams(filters);
  const response = await fetch(`${API_BASE}/artworks?${params}`);
  return response.json();
};

// Upload artwork
const uploadArtwork = async (formData, token) => {
  const response = await fetch(`${API_BASE}/artworks`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
    body: formData,
  });
  return response.json();
};
```

### Python
```python
import requests

API_BASE = 'http://localhost:5000/api'

# Login
def login(email, password):
    response = requests.post(f'{API_BASE}/auth/login', json={
        'email': email,
        'password': password
    })
    return response.json()

# Get artworks
def get_artworks(filters=None):
    response = requests.get(f'{API_BASE}/artworks', params=filters)
    return response.json()

# Upload artwork
def upload_artwork(files, data, token):
    headers = {'Authorization': f'Bearer {token}'}
    response = requests.post(f'{API_BASE}/artworks', 
                           files=files, data=data, headers=headers)
    return response.json()
```

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- User authentication and management
- Artwork upload and management
- AI-powered moderation system
- Messaging system
- Push notifications
- Email notifications
- Basic moderation queue

### Planned Features
- Real-time WebSocket connections
- Advanced search with Elasticsearch
- Commission management system
- Contest system
- Payment integration
- Advanced analytics
- Mobile app API extensions

---

## Support

For API support and questions:
- **Documentation**: This file
- **Issues**: Create GitHub issues
- **Email**: support@smart-platform.com (if available)

---

*Last updated: December 2024*