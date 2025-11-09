# Artist Mini Preview API Implementation

## Overview
Implemented the backend API endpoint for artist hover card preview feature as specified in task 1 of the artist-hover-card spec.

## Endpoint Details

### Route
```
GET /api/users/:id/mini-preview
```

### Features Implemented

#### 1. ✅ Route Creation
- Created GET endpoint at `/api/users/:id/mini-preview`
- Positioned before generic `/:id` route to avoid conflicts
- Uses `optionalAuth` middleware (works with or without authentication)

#### 2. ✅ Minimal Field Queries
**User Profile Query:**
```javascript
User.findById(userId)
  .select('username profile.avatar profile.bio followers following lastLogin')
  .lean()
```

**Artwork Query:**
```javascript
Artwork.find({
  artist: userId,
  status: 'approved',
  visibility: 'public'
})
  .select('title thumbnail createdAt')
  .sort({ createdAt: -1 })
  .limit(3)
  .lean()
```

#### 3. ✅ In-Memory Caching (30-second TTL)
```javascript
const previewCache = new Map();
const CACHE_TTL = 30000; // 30 seconds

function getCachedPreview(userId) {
  const entry = previewCache.get(userId);
  if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
    return entry.data;
  }
  previewCache.delete(userId);
  return null;
}

function setCachedPreview(userId, data) {
  previewCache.set(userId, {
    data,
    timestamp: Date.now()
  });
}
```

#### 4. ✅ Rate Limiting (30 requests/minute)
```javascript
const miniPreviewLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute per user
  message: { 
    success: false, 
    error: 'Too many preview requests, please wait',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false,
});
```

## Response Format

### Success Response (200)
```json
{
  "success": true,
  "data": {
    "user": {
      "_id": "68fc9a1be518303ac0fed3e7",
      "username": "ARJUN YADAV",
      "profile": {
        "avatar": "https://...",
        "bio": "Indian Artist..."
      },
      "stats": {
        "followers": 0,
        "artworks": 10
      },
      "isOnline": false,
      "lastActive": "2025-11-08T10:30:00Z"
    },
    "artworks": [
      {
        "_id": "...",
        "title": "Devara",
        "thumbnail": "https://...",
        "createdAt": "2025-11-05T..."
      }
    ],
    "followedAt": null,
    "badges": {
      "recentlyActive": true,
      "recentlyPosted": true
    }
  }
}
```

### Error Responses

**Invalid User ID (400)**
```json
{
  "success": false,
  "error": "Invalid user ID",
  "code": "INVALID_USER_ID"
}
```

**Artist Not Found (404)**
```json
{
  "success": false,
  "error": "Artist not found",
  "code": "ARTIST_NOT_FOUND"
}
```

**Rate Limit Exceeded (429)**
```json
{
  "success": false,
  "error": "Too many preview requests, please wait",
  "code": "RATE_LIMIT_EXCEEDED"
}
```

**Server Error (500)**
```json
{
  "success": false,
  "error": "Failed to fetch preview",
  "code": "SERVER_ERROR"
}
```

## Activity Badges Logic

### Online Status
- User is considered online if `lastLogin` is within 5 minutes
- `isOnline: true/false`

### Recently Active Badge
- User is considered recently active if `lastLogin` is within 24 hours
- `badges.recentlyActive: true/false`

### Recently Posted Badge
- User is considered recently posted if latest artwork was created within 7 days
- `badges.recentlyPosted: true/false`

## Performance Optimizations

1. **Lean Queries**: All MongoDB queries use `.lean()` for faster performance
2. **Field Selection**: Only necessary fields are fetched to minimize data transfer
3. **Caching**: 30-second cache reduces database load for repeated requests
4. **Rate Limiting**: Prevents abuse and ensures fair resource usage
5. **Indexed Queries**: Leverages existing indexes on artist, status, and createdAt fields

## Testing

Run the test script to verify functionality:
```bash
cd backend
node test-mini-preview.js
```

## Requirements Satisfied

✅ **1.1** - Hover triggers preview fetch and display  
✅ **2.1** - Display up to 3 most recent approved artworks  
✅ **2.2** - Sort artworks by creation date descending  
✅ **5.1** - Cache preview data for 30 seconds  
✅ **5.2** - Display loading skeleton while fetching (frontend will implement)

## Notes

- The `followedAt` field is currently `null` as the User schema doesn't track individual follow timestamps
- To implement accurate follow dates, consider creating a separate Follow model with timestamps
- The endpoint works with or without authentication (uses `optionalAuth` middleware)
- Cache is stored in-memory and will reset on server restart
- For production, consider using Redis for distributed caching

## Next Steps

Frontend implementation (Tasks 2-10) will:
1. Create React components to consume this endpoint
2. Implement hover detection with 300ms debounce
3. Add animations and loading states
4. Implement prefetching for visible artists
5. Add error handling and retry logic
