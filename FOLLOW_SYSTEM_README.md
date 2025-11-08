# Follow/Unfollow System Documentation

## 🎯 Overview

Complete implementation of a follow/unfollow system with:
- ✅ Atomic database operations (idempotent)
- ✅ Real-time updates via Socket.IO
- ✅ Optimistic UI updates
- ✅ Notifications for new followers
- ✅ Transaction safety with MongoDB sessions
- ✅ Rate limiting ready
- ✅ Error handling and rollback

---

## 🔧 Backend Implementation

### Routes (`backend/routes/users.js`)

#### **POST /api/users/:id/follow**
Follow a user (idempotent - can be called multiple times safely)

**Features:**
- Uses MongoDB transactions for atomic updates
- `$addToSet` ensures no duplicates
- Creates notification only on new follows
- Emits real-time Socket.IO events
- Returns updated follower/following counts

**Request:**
```javascript
POST /api/users/USER_ID/follow
Headers: { Authorization: 'Bearer TOKEN' }
```

**Response:**
```json
{
  "success": true,
  "message": "Followed successfully",
  "data": {
    "isFollowing": true,
    "followerCount": 42,
    "followingCount": 15
  }
}
```

**Socket Events Emitted:**
- `notification:new` → Sent to followed user
- `follow:update` → Sent to followed user with new count

---

#### **DELETE /api/users/:id/follow**
Unfollow a user (idempotent)

**Features:**
- Uses MongoDB transactions
- `$pull` removes from both arrays atomically
- No notification created (per design)
- Emits follower count update

**Request:**
```javascript
DELETE /api/users/USER_ID/follow
Headers: { Authorization: 'Bearer TOKEN' }
```

**Response:**
```json
{
  "success": true,
  "message": "Unfollowed successfully",
  "data": {
    "isFollowing": false,
    "followerCount": 41,
    "followingCount": 14
  }
}
```

---

### Database Schema

**User Model** (`backend/models/User.js`):
```javascript
{
  followers: [{ type: ObjectId, ref: 'User' }],
  following: [{ type: ObjectId, ref: 'User' }]
}
```

**Notification Model** (`backend/models/Notification.js`):
```javascript
{
  recipient: ObjectId,
  type: 'follow',
  content: {
    title: String,
    message: String,
    link: String
  },
  relatedUser: ObjectId,
  isRead: Boolean,
  createdAt: Date
}
```

---

## ⚛️ Frontend Implementation

### Custom Hook: `useFollow`

**Location:** `frontend/src/hooks/useFollow.js`

**Features:**
- Optimistic UI updates
- Automatic rollback on error
- Loading states
- Error handling
- Toast notifications

**Usage:**
```javascript
import { useFollow } from '../hooks/useFollow';

const {
  isFollowing,
  followerCount,
  isLoading,
  error,
  handleFollow,
  handleUnfollow,
  toggleFollow
} = useFollow(userId, initialIsFollowing, initialFollowerCount);
```

---

### Component: `FollowButton`

**Location:** `frontend/src/components/FollowButton.jsx`

**Props:**
```javascript
<FollowButton
  userId="USER_ID"                    // Required
  initialIsFollowing={false}          // Initial state
  initialFollowerCount={0}            // Initial count
  variant="primary"                   // 'primary' | 'secondary' | 'outline'
  size="md"                          // 'sm' | 'md' | 'lg'
  showCount={false}                  // Show follower count
  className=""                       // Additional classes
/>
```

**Features:**
- Three visual variants
- Three size options
- Confirmation dialog for unfollow
- Loading spinner during requests
- Disabled state during operations
- Smooth animations

**Example:**
```jsx
import FollowButton from '../components/FollowButton';

<FollowButton
  userId={user._id}
  initialIsFollowing={isFollowing}
  initialFollowerCount={user.followers.length}
  variant="primary"
  size="md"
/>
```

---

### Real-Time Updates

**Socket Context:** `frontend/src/contexts/SocketContext.jsx`

Wrap your app with the SocketProvider:
```jsx
import { SocketProvider } from './contexts/SocketContext';

<SocketProvider>
  <App />
</SocketProvider>
```

**Hook:** `frontend/src/hooks/useFollowUpdates.js`

Listen for real-time follow updates:
```javascript
import { useFollowUpdates } from '../hooks/useFollowUpdates';

useFollowUpdates(
  // On follower count update
  (data) => {
    console.log('New follower count:', data.followerCount);
    updateUI(data);
  },
  // On new follower notification
  (notification) => {
    showToast(`${notification.sender.username} followed you!`);
  }
);
```

---

## 🎨 Styling

**CSS File:** `frontend/src/components/FollowButton.css`

**Variants:**
- **Primary:** Blue gradient, changes to green when following
- **Secondary:** Gray background, subtle hover effects
- **Outline:** Transparent with border

**States:**
- Default (Follow)
- Following (hover shows red for unfollow)
- Loading (spinner animation)
- Disabled (reduced opacity)

**Responsive:**
- Mobile-optimized touch targets
- Stacked layout on small screens
- Accessible focus states

---

## 🔒 Security & Best Practices

### Backend Validation
```javascript
// ✅ Prevent self-follow
if (currentUserId === targetId) {
  return res.status(400).json({ message: "Can't follow yourself" });
}

// ✅ Check user exists
const target = await User.findById(targetId);
if (!target) {
  return res.status(404).json({ message: 'User not found' });
}
```

### Idempotency
```javascript
// ✅ Using $addToSet (no duplicates)
User.findByIdAndUpdate(
  userId,
  { $addToSet: { following: targetId } }
);

// ✅ Using $pull (safe removal)
User.findByIdAndUpdate(
  userId,
  { $pull: { following: targetId } }
);
```

### Transaction Safety
```javascript
const session = await mongoose.startSession();
session.startTransaction();

try {
  // ... atomic operations
  await session.commitTransaction();
} catch (error) {
  await session.abortTransaction();
  throw error;
} finally {
  session.endSession();
}
```

### Rate Limiting (Recommended)
Add to your routes:
```javascript
const rateLimit = require('express-rate-limit');

const followLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // 50 requests per window
  message: 'Too many follow requests, please try again later'
});

router.post('/:id/follow', protect, followLimiter, async (req, res) => {
  // ... follow logic
});
```

---

## 🧪 Testing

### Manual Testing Checklist

**Follow Flow:**
- [ ] Can follow a user
- [ ] Button changes to "Following"
- [ ] Follower count increments
- [ ] Notification created
- [ ] Socket event received
- [ ] Cannot follow yourself
- [ ] Idempotent (calling twice doesn't duplicate)

**Unfollow Flow:**
- [ ] Can unfollow a user
- [ ] Confirmation dialog appears
- [ ] Button changes to "Follow"
- [ ] Follower count decrements
- [ ] No notification created
- [ ] Socket event received
- [ ] Idempotent (calling twice doesn't error)

**Error Handling:**
- [ ] Network error shows toast
- [ ] UI rolls back on error
- [ ] Button re-enables after error
- [ ] Loading state shows during request

**Real-Time:**
- [ ] Follower sees notification immediately
- [ ] Follower count updates in real-time
- [ ] Works across multiple tabs/devices

---

## 📊 Socket.IO Events

### Server → Client

**Event:** `notification:new`
```javascript
{
  _id: "notification_id",
  type: "follow",
  content: {
    title: "New Follower",
    message: "username started following you",
    link: "/profile/USER_ID"
  },
  sender: {
    _id: "USER_ID",
    username: "username",
    profile: { avatar: "url" }
  },
  createdAt: "2024-01-01T00:00:00.000Z"
}
```

**Event:** `follow:update`
```javascript
{
  followerCount: 42
}
```

### Client → Server

**Join user room:**
```javascript
socket.emit('join', `user_${userId}`);
```

---

## 🚀 Deployment Checklist

- [ ] MongoDB indexes on `followers` and `following` arrays
- [ ] Socket.IO configured with proper CORS
- [ ] Rate limiting enabled
- [ ] Error logging configured
- [ ] Analytics tracking for follow events
- [ ] Database backup strategy
- [ ] Load testing for concurrent follows

---

## 🐛 Troubleshooting

### Issue: Follower count not updating
**Solution:** Check Socket.IO connection and room joining

### Issue: Duplicate followers
**Solution:** Ensure using `$addToSet` not `$push`

### Issue: Transaction errors
**Solution:** Verify MongoDB replica set is configured

### Issue: Optimistic UI not rolling back
**Solution:** Check error handling in `useFollow` hook

---

## 📝 Future Enhancements

- [ ] Follow suggestions based on mutual connections
- [ ] Follower/following lists with pagination
- [ ] Block/unblock functionality
- [ ] Private accounts (follow requests)
- [ ] Follow activity feed
- [ ] Bulk follow operations
- [ ] Follow analytics dashboard
- [ ] Email notifications for new followers

---

## 📚 Related Files

**Backend:**
- `backend/routes/users.js` - Follow/unfollow routes
- `backend/models/User.js` - User schema
- `backend/models/Notification.js` - Notification schema

**Frontend:**
- `frontend/src/hooks/useFollow.js` - Follow hook
- `frontend/src/hooks/useFollowUpdates.js` - Real-time updates
- `frontend/src/components/FollowButton.jsx` - Button component
- `frontend/src/components/FollowButton.css` - Button styles
- `frontend/src/contexts/SocketContext.jsx` - Socket provider
- `frontend/src/components/ProfileHeader.jsx` - Integration example
- `frontend/src/pages/ProfilePage.jsx` - Usage example

---

## 💡 Tips

1. **Always use the hook** - Don't call API directly, use `useFollow` hook
2. **Optimistic UI** - Update UI immediately, rollback on error
3. **Loading states** - Always disable buttons during operations
4. **Error messages** - Show user-friendly error messages
5. **Real-time** - Listen for socket events to keep UI in sync
6. **Idempotency** - Design for multiple calls (network retries)
7. **Transactions** - Use MongoDB sessions for atomic operations

---

## 📞 Support

For issues or questions:
1. Check this documentation
2. Review the code comments
3. Test with the provided examples
4. Check browser console for errors
5. Verify Socket.IO connection

---

**Last Updated:** 2024
**Version:** 1.0.0
