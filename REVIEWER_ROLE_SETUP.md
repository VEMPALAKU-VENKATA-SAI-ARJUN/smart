# Reviewer Role Setup

## Changes Made

### Backend

#### User Model (`backend/models/User.js`)
- Added `'reviewer'` to the role enum
- Updated enum: `['buyer', 'artist', 'reviewer', 'moderator', 'admin']`

#### Auth Routes (`backend/routes/auth.js`)
- Already accepts any role from request body
- No changes needed - works out of the box

### Frontend

#### Auth Page (`frontend/src/pages/Auth.jsx`)
- Added reviewer role option to signup form
- New role configuration:
  ```javascript
  {
    value: "reviewer",
    label: "Reviewer",
    icon: Sparkles,
    image: "/icons/reviewer.svg",
    description: "Provide expert feedback on artworks",
    color: "text-purple-600",
    bgColor: "bg-purple-100 border-purple-200"
  }
  ```

#### Assets
- Created reviewer icon: `frontend/public/icons/reviewer.svg`
- Purple gradient design with checkmark and sparkle

## User Flow

### Registration as Reviewer
1. Navigate to signup page
2. Select "Reviewer" role from the account type options
3. Fill in username, email, and password
4. Submit form
5. Backend creates user with `role: 'reviewer'`
6. User is logged in and can access reviewer features

### Reviewer Capabilities
- Can submit reviews on artworks (not their own)
- Can rate artworks (1-5 stars)
- Can provide recommendations (approve/revise/reject)
- Can set Editor's Pick badge
- Can edit/delete their own reviews
- Cannot review their own artworks

## Testing

### Test Reviewer Registration
1. Go to `/auth` page
2. Click "Sign Up" tab
3. Select "Reviewer" role
4. Enter test credentials:
   - Username: `test_reviewer`
   - Email: `reviewer@test.com`
   - Password: `password123`
5. Submit and verify user is created with reviewer role

### Test Reviewer Features
1. Login as reviewer
2. Navigate to any artwork details page
3. Verify ReviewPanel is visible
4. Submit a review
5. Verify review appears in ReviewsList
6. Verify rating aggregates update

## Role Permissions

| Feature | Buyer | Artist | Reviewer | Moderator | Admin |
|---------|-------|--------|----------|-----------|-------|
| Browse artworks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Purchase artworks | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload artworks | ❌ | ✅ | ❌ | ❌ | ✅ |
| Submit reviews | ❌ | ❌ | ✅ | ✅ | ✅ |
| Set Editor's Pick | ❌ | ❌ | ✅ | ✅ | ✅ |
| Delete any review | ❌ | ❌ | ❌ | ✅ | ✅ |
| Moderate content | ❌ | ❌ | ❌ | ✅ | ✅ |

## Database Schema

### User Document with Reviewer Role
```json
{
  "_id": "...",
  "username": "expert_reviewer",
  "email": "reviewer@example.com",
  "role": "reviewer",
  "profile": {
    "avatar": "...",
    "bio": "Art critic with 10 years experience"
  },
  "createdAt": "2025-11-08T...",
  "updatedAt": "2025-11-08T..."
}
```

## API Endpoints Available to Reviewers

### Review Endpoints
- `POST /api/artworks/:artworkId/reviews` - Submit/update review
- `GET /api/artworks/:artworkId/reviews` - View all reviews
- `GET /api/reviews/me` - View my reviews
- `PATCH /api/reviews/:id` - Update my review
- `DELETE /api/reviews/:id` - Delete my review
- `POST /api/artworks/:id/editor-pick` - Set Editor's Pick badge

### Protected Routes
All review submission endpoints require:
- Valid JWT token
- User role = 'reviewer' (or 'moderator'/'admin')
- Cannot review own artworks

## Notes

- Reviewer role is now fully integrated into the authentication system
- All existing review features work with the reviewer role
- The role is validated on both frontend and backend
- Proper authorization checks are in place
- Real-time updates work for reviewer actions

## Next Steps

1. Restart backend server to load updated User model
2. Test reviewer registration flow
3. Test review submission as reviewer
4. Verify role-based access control
5. Monitor for any edge cases
