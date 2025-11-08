# Review Queue Page for Reviewers

## Overview
Created a dedicated page for reviewers to browse artworks and navigate to detailed review pages.

## What Was Created

### 1. Review Queue Page (`frontend/src/pages/ReviewQueue.jsx`)
A dedicated page for reviewers with:

**Features:**
- Grid layout of all approved artworks
- Click any artwork to navigate to its details page for reviewing
- Filter options:
  - All Artworks
  - Unreviewed (no reviews yet)
  - Reviewed (has reviews)
- Sort options:
  - Newest First
  - Oldest First
  - Highest Rated
- Statistics dashboard:
  - Total artworks count
  - Unreviewed artworks count
- Each artwork card shows:
  - Artwork image with hover overlay
  - Title and artist info
  - Current rating (stars + number)
  - Review count
  - View count
  - Category badge
  - Editor's Pick badge (if applicable)

**User Flow:**
1. Reviewer logs in
2. Clicks "Review Queue" in navbar
3. Sees grid of all artworks
4. Can filter/sort artworks
5. Clicks any artwork card
6. Navigates to Artwork Details page
7. Sees ReviewPanel to write review

### 2. Styling (`frontend/src/styles/ReviewQueue.css`)
- Modern card-based layout
- Purple theme matching reviewer branding
- Hover effects and animations
- Responsive design (mobile, tablet, desktop)
- Loading states and empty states

### 3. Routing (`frontend/src/App.jsx`)
Added route:
```javascript
<Route
  path="/review-queue"
  element={
    <PrivateRoute roles={['reviewer', 'moderator', 'admin']}>
      <ReviewQueue />
    </PrivateRoute>
  }
/>
```

### 4. Navigation (`frontend/src/components/Navbar.jsx`)
Added "Review Queue" link to navbar for:
- Reviewers
- Moderators
- Admins

## Access Control

**Who can access Review Queue:**
- ✅ Reviewers
- ✅ Moderators
- ✅ Admins
- ❌ Artists
- ❌ Buyers

## Page Structure

```
Review Queue Page
├── Header
│   ├── Title & Description
│   └── Statistics Cards
│       ├── Total Artworks
│       └── Unreviewed Count
├── Filters Bar
│   ├── Filter Dropdown (All/Unreviewed/Reviewed)
│   └── Sort Dropdown (Newest/Oldest/Rating)
└── Artworks Grid
    └── Artwork Cards
        ├── Image with Overlay
        ├── Title
        ├── Artist Info
        ├── Rating Display
        ├── Review Count
        └── Stats (Views, Category)
```

## Navigation Flow

```
Reviewer Login
    ↓
Navbar → "Review Queue"
    ↓
Review Queue Page (Grid of Artworks)
    ↓
Click Artwork Card
    ↓
Artwork Details Page
    ↓
ReviewPanel (Write/Edit Review)
    ↓
Submit Review
    ↓
Review appears in ReviewsList
```

## Key Differences from Gallery

| Feature | Gallery | Review Queue |
|---------|---------|--------------|
| Opens | Modal | New Page (Details) |
| Purpose | Browse & Purchase | Review & Rate |
| Access | Everyone | Reviewers Only |
| Actions | View, Like, Buy | Review, Rate, Recommend |
| Layout | Modal overlay | Full page navigation |

## API Endpoints Used

- `GET /api/artworks?status=approved&limit=50` - Fetch all approved artworks
- `GET /api/artworks/:id` - Fetch single artwork details (on click)
- `POST /api/artworks/:artworkId/reviews` - Submit review (on details page)

## Testing Steps

1. **Login as Reviewer:**
   - Go to `/auth`
   - Register/login with reviewer role

2. **Access Review Queue:**
   - Click "Review Queue" in navbar
   - Or navigate to `/review-queue`

3. **Browse Artworks:**
   - See grid of artworks
   - Try filters (All/Unreviewed/Reviewed)
   - Try sorting (Newest/Oldest/Rating)

4. **Review an Artwork:**
   - Click any artwork card
   - Navigate to details page
   - See ReviewPanel below artwork
   - Submit a review

5. **Verify:**
   - Review appears in list
   - Rating updates
   - Can edit/delete own review

## Responsive Design

**Desktop (>1024px):**
- 3-4 columns grid
- Full header with stats side-by-side
- Horizontal filters bar

**Tablet (768px-1024px):**
- 2-3 columns grid
- Stacked header
- Horizontal filters

**Mobile (<768px):**
- Single column grid
- Stacked header
- Vertical filters
- Compact cards

## Future Enhancements

1. **Advanced Filters:**
   - Filter by category
   - Filter by date range
   - Filter by rating range

2. **Search:**
   - Search by artwork title
   - Search by artist name

3. **Bulk Actions:**
   - Select multiple artworks
   - Batch review workflow

4. **Review History:**
   - See your review history
   - Track review stats

5. **Recommendations:**
   - AI-suggested artworks to review
   - Priority queue based on criteria

## Notes

- Review Queue is separate from Gallery to avoid confusion
- Gallery keeps modal behavior for general browsing
- Review Queue provides focused workflow for reviewers
- Both pages can coexist without conflicts
- Reviewers can still use Gallery for casual browsing
