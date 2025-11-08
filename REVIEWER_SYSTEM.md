# Reviewer System Implementation

## Overview
Complete implementation of the reviewer role and review system for artworks with real-time updates, rating aggregates, and moderation features.

## Backend Implementation

### Models

#### Review Model (`backend/models/Review.js`)
- Fields: artwork, reviewer, rating (1-5), comment, recommendation (approve/revise/reject)
- Compound unique index on `{ artwork, reviewer }` - one review per reviewer per artwork
- Pre-save validation for rating range and required fields
- Automatic updatedAt timestamp

#### Artwork Model Updates (`backend/models/Artwork.js`)
Added fields:
- `ratingAvg` (Number, default 0)
- `ratingCount` (Number, default 0)
- `reviewStatsLastUpdated` (Date)
- `editorPick` (Boolean, default false)

### Routes (`backend/routes/reviews.js`)

#### POST `/api/artworks/:artworkId/reviews`
- **Auth**: Reviewer role required
- **Idempotent**: Upserts review using findOneAndUpdate
- **Validation**: Cannot review own artwork
- **Features**:
  - Sanitizes HTML from comments
  - Recomputes rating aggregates in transaction
  - Creates notification for artist
  - Emits real-time updates via Socket.IO
- **Response**: `{ review, artwork: { ratingAvg, ratingCount }, isNew }`

#### GET `/api/artworks/:artworkId/reviews`
- **Public**: No auth required
- **Pagination**: ?page=1&limit=10&sort=-createdAt
- **Response**: `{ items: [...], pageInfo: { page, limit, total, totalPages } }`

#### GET `/api/reviews/me`
- **Auth**: Reviewer role required
- **Returns**: All reviews by current user with pagination

#### PATCH `/api/reviews/:id`
- **Auth**: Review author or moderator
- **Idempotent**: Only updates changed fields
- **Features**: Recomputes aggregates, emits real-time updates

#### DELETE `/api/reviews/:id`
- **Auth**: Review author or moderator
- **Idempotent**: Returns 204 if already deleted
- **Features**: Recomputes aggregates, emits real-time updates

#### POST `/api/artworks/:id/editor-pick`
- **Auth**: Reviewer or moderator
- **Body**: `{ editorPick: true|false }`
- **Features**: Emits real-time badge update

### Security Features
- RBAC middleware for reviewer-only actions
- Input sanitization (HTML stripping, length limits)
- Transaction-based aggregate recomputation
- Rate limiting ready (configured in server.js)
- XSS protection via sanitization

## Frontend Implementation

### Components

#### ReviewPanel (`frontend/src/components/ReviewPanel.jsx`)
- **Purpose**: Form for reviewers to submit/update reviews
- **Features**:
  - Interactive star rating (1-5)
  - Textarea with character count (max 1000)
  - Recommendation dropdown (Approve/Revise/Reject)
  - Auto-detects existing review and switches to update mode
  - Optimistic UI updates
  - Loading states and error handling
  - Accessibility: keyboard navigation, ARIA labels

#### ReviewsList (`frontend/src/components/ReviewsList.jsx`)
- **Purpose**: Display all reviews for an artwork
- **Features**:
  - Pagination with "Load More" button
  - Star rating display
  - Recommendation badges (color-coded)
  - Delete button for own reviews or moderators
  - Time-ago formatting
  - Empty state with CTA
  - Loading skeletons
  - Real-time updates via Socket.IO

#### ArtworkDetails (`frontend/src/pages/ArtworkDetails.jsx`)
- **Integrated Features**:
  - Displays artwork rating and review count
  - Shows Editor's Pick badge
  - Conditionally renders ReviewPanel (only for reviewers, not own artwork)
  - Displays ReviewsList
  - Real-time updates for ratings and badges
  - Socket.IO room management (join/leave artwork room)

### Styling
- `ReviewPanel.css`: Modern form styling with animations
- `ReviewsList.css`: Card-based layout with badges and skeletons
- `ArtworkDetails.css`: Responsive grid layout with sticky image
- Mobile-responsive design
- Smooth transitions and hover effects

## Real-Time Features

### Socket.IO Events

#### Emitted by Server
- `notification:new` → Artist receives notification when reviewed
- `review:aggregate` → Updates rating stats for all viewers
- `artwork:badge` → Updates Editor's Pick badge in real-time

#### Emitted by Client
- `join_artwork` → Join artwork-specific room
- `leave_artwork` → Leave artwork room on unmount

## Database Integrity

### Transactions
- Review upsert + aggregate recompute wrapped in MongoDB session
- Ensures consistency between reviews and artwork stats

### Indexes
- Compound unique: `{ artwork: 1, reviewer: 1 }`
- Single: `artwork` for fast lookups
- Prevents duplicate reviews automatically

### Validation
- Server-side rating validation (1-5)
- Comment length limit (1000 chars)
- Recommendation enum validation
- HTML sanitization

## Usage Flow

### For Reviewers
1. Navigate to artwork details page
2. See ReviewPanel if not own artwork
3. Rate artwork (1-5 stars)
4. Write comment
5. Select recommendation
6. Submit → Creates/updates review
7. See review appear in list immediately
8. Can edit or delete own review

### For Artists
1. Receive real-time notification when reviewed
2. See updated rating on artwork
3. View all reviews on artwork page
4. Cannot review own artwork

### For Moderators
1. Can delete any review
2. Can set Editor's Pick badge
3. See recommendation tallies (future: dashboard)

## API Response Examples

### Create/Update Review (201/200)
```json
{
  "success": true,
  "review": {
    "_id": "...",
    "artwork": "...",
    "reviewer": { "_id": "...", "username": "...", "profile": { "avatar": "..." } },
    "rating": 4,
    "comment": "Beautiful artwork!",
    "recommendation": "approve",
    "createdAt": "2025-11-08T...",
    "updatedAt": "2025-11-08T..."
  },
  "artwork": {
    "ratingAvg": 4.3,
    "ratingCount": 12
  },
  "isNew": true
}
```

### List Reviews (200)
```json
{
  "success": true,
  "items": [
    {
      "_id": "...",
      "reviewer": { "_id": "...", "username": "...", "profile": { "avatar": "..." } },
      "rating": 5,
      "comment": "Excellent work!",
      "recommendation": "approve",
      "createdAt": "2025-11-08T..."
    }
  ],
  "pageInfo": {
    "page": 1,
    "limit": 10,
    "total": 37,
    "totalPages": 4
  }
}
```

## Testing Checklist

- [x] Review model validation
- [x] Compound unique index prevents duplicates
- [x] Cannot review own artwork
- [x] Upsert creates or updates correctly
- [x] Rating aggregates compute accurately
- [x] Transactions maintain consistency
- [x] Real-time updates emit correctly
- [x] Notifications created for new reviews
- [x] Pagination works correctly
- [x] Delete is idempotent
- [x] Authorization checks (reviewer, author, moderator)
- [x] Input sanitization (HTML stripping)
- [x] Frontend optimistic updates
- [x] Loading states and error handling
- [x] Mobile responsive design

## Future Enhancements

1. **Moderation Dashboard**: Show recommendation tallies per artwork
2. **Auto-flagging**: If N reviewers mark "reject", auto-flag for moderation
3. **Helpfulness**: Allow users to vote reviews as helpful
4. **Reviewer Leaderboard**: Track most helpful reviewers
5. **Review Images**: Allow reviewers to attach screenshots
6. **Review Templates**: Pre-defined review criteria for consistency
7. **Bulk Actions**: Moderators can bulk approve/reject reviews
8. **Analytics**: Track review trends and patterns

## Notes

- All routes are idempotent as specified
- Rate limiting configured at server level (15min/100 requests)
- Ready for Redis caching (add ETag support)
- Sanitization prevents XSS attacks
- Transaction-based updates ensure data consistency
- Real-time updates provide instant feedback
- Mobile-first responsive design
