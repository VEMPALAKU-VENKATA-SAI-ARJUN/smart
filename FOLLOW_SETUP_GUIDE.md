# Quick Setup Guide - Follow/Unfollow System

## 🚀 Quick Start (5 minutes)

### Step 1: Wrap App with SocketProvider

**File:** `frontend/src/main.jsx` or `frontend/src/App.jsx`

```jsx
import { SocketProvider } from './contexts/SocketContext';

<SocketProvider>
  <AuthProvider>
    <App />
  </AuthProvider>
</SocketProvider>
```

### Step 2: Use FollowButton in ProfilePage

Already integrated in `ProfileHeader.jsx`! The button will automatically appear when viewing other users' profiles.

### Step 3: Test It!

1. **Start your backend:**
   ```bash
   cd backend
   npm start
   ```

2. **Start your frontend:**
   ```bash
   cd frontend
   npm run dev
   ```

3. **Test the flow:**
   - Login with two different accounts (use two browsers)
   - Visit a user's profile
   - Click "Follow" button
   - See real-time notification on the other account
   - Click "Following" → Confirm unfollow
   - See count update in real-time

---

## ✅ What's Already Done

### Backend ✅
- [x] Follow route with atomic operations
- [x] Unfollow route with atomic operations
- [x] MongoDB transactions for data integrity
- [x] Notification creation
- [x] Socket.IO event emission
- [x] Idempotent operations

### Frontend ✅
- [x] `useFollow` hook with optimistic UI
- [x] `FollowButton` component with 3 variants
- [x] `SocketContext` for real-time updates
- [x] `useFollowUpdates` hook for listening
- [x] Integration in `ProfileHeader`
- [x] Integration in `ProfilePage`
- [x] Complete CSS styling
- [x] Error handling and rollback
- [x] Loading states
- [x] Confirmation dialog for unfollow

---

## 🎨 Customization

### Change Button Style

```jsx
<FollowButton
  userId={user._id}
  initialIsFollowing={isFollowing}
  initialFollowerCount={followersCount}
  variant="outline"  // 'primary' | 'secondary' | 'outline'
  size="lg"          // 'sm' | 'md' | 'lg'
  showCount={true}   // Show follower count next to button
/>
```

### Add Custom Toast Notifications

```javascript
// In your main app file
window.showToast = (message, type) => {
  // Your toast implementation
  console.log(`[${type}] ${message}`);
};
```

---

## 🔧 Optional Enhancements

### Add Rate Limiting

```bash
npm install express-rate-limit
```

```javascript
// backend/routes/users.js
const rateLimit = require('express-rate-limit');

const followLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many follow requests'
});

router.post('/:id/follow', protect, followLimiter, async (req, res) => {
  // ... existing code
});
```

### Add Analytics Tracking

```javascript
// In useFollow hook, after successful follow
if (window.gtag) {
  window.gtag('event', 'follow', {
    event_category: 'engagement',
    event_label: userId
  });
}
```

---

## 🐛 Common Issues

### Issue: "Cannot follow yourself"
**Cause:** Trying to follow your own profile
**Fix:** Button should not appear on your own profile (already handled)

### Issue: Socket not connecting
**Cause:** Socket.IO server not configured
**Fix:** Ensure Socket.IO is initialized in your backend server.js

### Issue: Follower count not updating
**Cause:** Not listening to socket events
**Fix:** Ensure `useFollowUpdates` hook is called in ProfilePage

### Issue: Button stays disabled
**Cause:** Error in API call
**Fix:** Check browser console for errors, verify auth token

---

## 📱 Mobile Optimization

The FollowButton is already mobile-optimized with:
- Touch-friendly sizes
- Responsive breakpoints
- Accessible tap targets
- Smooth animations

---

## 🎯 Next Steps

1. **Test thoroughly** with multiple accounts
2. **Add rate limiting** to prevent spam
3. **Monitor performance** with many followers
4. **Add analytics** to track engagement
5. **Consider adding** follower/following lists
6. **Implement** block/unblock if needed

---

## 📞 Need Help?

Check the full documentation in `FOLLOW_SYSTEM_README.md` for:
- Detailed API documentation
- Socket.IO event specifications
- Advanced customization options
- Troubleshooting guide
- Future enhancement ideas

---

**You're all set! 🎉**

The follow/unfollow system is production-ready with:
- ✅ Atomic operations
- ✅ Real-time updates
- ✅ Optimistic UI
- ✅ Error handling
- ✅ Beautiful design
- ✅ Mobile responsive
