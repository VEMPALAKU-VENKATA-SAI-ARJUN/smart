# Implementation Plan

- [x] 1. Set up backend API endpoint for artist preview





  - Create GET /api/users/:id/mini-preview route
  - Implement query to fetch user profile with minimal fields
  - Implement query to fetch top 3 approved artworks
  - Add in-memory caching with 30-second TTL
  - Add rate limiting (30 requests per minute per user)
  - _Requirements: 1.1, 2.1, 2.2, 5.1, 5.2_
-

- [x] 2. Create core hover card components















- [x] 2.1 Create ArtistHoverCard component



  - Build component structure with header, gallery, and actions sections
  - Implement Framer Motion animations (fade-in, scale-up)
  - Add loading skeleton state
  - Add error state with retry button
  - Style with CSS modules using design system variables
  - _Requirements: 1.1, 1.3, 1.4, 5.2, 8.1, 8.2_

- [x] 2.2 Create useArtistPreview custom hook



  - Implement React Query integration for data fetching
  - Add 30-second cache configuration
  - Implement error handling with exponential backoff
  - Add prefetch functionality
  - _Requirements: 5.1, 5.2, 5.3, 8.1, 8.3_


- [x] 2.3 Update ArtistCard component with hover detection


  - Add hover state management
  - Implement 300ms debounce for hover trigger
  - Implement 250ms delay for hide on mouse leave
  - Add hover card positioning logic
  - Handle viewport overflow (adjust position if needed)
  - _Requirements: 1.1, 1.5, 5.4, 6.1, 6.2, 6.3_

- [x] 3. Implement hover card content sections





- [x] 3.1 Build header section


  - Display artist avatar with fallback
  - Display username and bio
  - Show "No bio available" placeholder when bio is empty
  - Display follow date ("Followed X days ago")
  - _Requirements: 1.2, 1.3, 7.5_

- [x] 3.2 Build mini gallery section


  - Display up to 3 artwork thumbnails in grid layout
  - Implement lazy loading for images
  - Show "No artworks yet" placeholder when empty
  - Add hover effect on thumbnails
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 3.3 Build status indicators section


  - Add online status indicator (green dot)
  - Add "Recently Active" badge (active within 24 hours)
  - Add "Recently Posted" badge (uploaded within 7 days)
  - Integrate Socket.IO for real-time online status updates
  - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4. Implement quick action buttons





- [x] 4.1 Implement Message button


  - Add Message button with icon
  - Implement navigation to Messages page with artist ID query param
  - Add tooltip "Start a conversation with this artist"
  - Disable button if current user is the artist
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_


- [x] 4.2 Implement Unfollow button

  - Add Unfollow button with icon
  - Create confirmation modal component
  - Implement DELETE request to /api/users/:id/follow endpoint
  - Update following list on successful unfollow
  - Show toast notification after unfollow
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 5. Add performance optimizations





- [x] 5.1 Implement Intersection Observer prefetching


  - Create useIntersectionObserver hook
  - Prefetch preview data for artists in viewport
  - Set 100px root margin for early prefetching
  - Clean up observers on unmount
  - _Requirements: 5.5_

- [x] 5.2 Implement request debouncing


  - Add debounce utility function
  - Apply 300ms debounce to hover preview fetch
  - Cancel pending requests on mouse leave
  - _Requirements: 5.4_

- [x] 5.3 Add image optimization


  - Implement lazy loading for artwork thumbnails
  - Add loading="lazy" and decoding="async" attributes
  - Use optimized image sizes from backend
  - _Requirements: 2.5_

- [x] 6. Implement responsive design




- [x] 6.1 Add responsive breakpoints


  - Implement desktop layout (>= 1024px)
  - Implement tablet layout (768px - 1023px)
  - Disable hover on mobile (< 768px)
  - _Requirements: 6.4_

- [x] 6.2 Add touch device handling


  - Detect touch devices
  - Disable hover card on touch devices with small screens
  - Convert artist cards to links on mobile
  - _Requirements: 6.4_

- [x] 6.3 Implement smart positioning


  - Calculate available space in viewport
  - Adjust hover card position to prevent overflow
  - Position left if overflowing right edge
  - Position above if overflowing bottom edge
  - _Requirements: 6.1, 6.2, 6.3_

- [x] 7. Add accessibility features





- [x] 7.1 Implement keyboard navigation


  - Make hover card appear on focus
  - Add Tab navigation for action buttons
  - Implement focus trap within hover card
  - Add Escape key to close hover card
  - _Requirements: 1.5_

- [x] 7.2 Add ARIA labels and roles


  - Add aria-label to all interactive elements
  - Add role="dialog" to hover card
  - Add aria-describedby for artist bio
  - Add aria-live for status updates
  - _Requirements: 1.2, 7.1_

- [x] 7.3 Implement reduced motion support


  - Detect prefers-reduced-motion setting
  - Disable animations when reduced motion is preferred
  - Maintain functionality without animations
  - _Requirements: 1.4_

- [x] 8. Implement error handling





- [x] 8.1 Add error states to hover card


  - Display error message when fetch fails
  - Add retry button
  - Implement retry logic with exponential backoff
  - Log errors to console for debugging
  - _Requirements: 8.1, 8.2, 8.3, 8.4_


- [x] 8.2 Handle artist unavailable state

  - Detect deleted or deactivated artist accounts
  - Display "Artist unavailable" message
  - Provide option to remove from following list
  - _Requirements: 8.5_


- [x] 8.3 Add network error handling

  - Detect network failures
  - Display "Unable to load preview" message
  - Implement automatic retry with backoff
  - Fall back to cached data if available
  - _Requirements: 8.1, 8.2, 8.3_

- [x] 9. Integrate with Following page




- [x] 9.1 Update Following page layout


  - Create responsive grid for artist cards
  - Implement 4-column layout on desktop
  - Implement 3-column layout on tablet
  - Implement 2-column layout on mobile
  - _Requirements: 1.1_

- [x] 9.2 Wire up hover card to artist cards


  - Pass artist data to ArtistCard component
  - Implement onUnfollow callback
  - Update following list on unfollow
  - Handle empty state when all artists unfollowed
  - _Requirements: 4.3, 4.4_

- [x] 9.3 Add loading and empty states


  - Show skeleton loaders while fetching following list
  - Display empty state when user follows no one
  - Add "Discover Artists" button in empty state
  - _Requirements: 5.2_

- [x] 10. Testing and polish









- [x] 10.1 Write unit tests

  - Test useArtistPreview hook (cache, errors, retries)
  - Test ArtistHoverCard component rendering
  - Test hover detection and debouncing
  - Test position calculation logic
  - _Requirements: All_


- [x] 10.2 Write integration tests

  - Test complete hover flow (hover → fetch → display → hide)
  - Test message navigation
  - Test unfollow flow with confirmation
  - Test caching behavior
  - _Requirements: All_

- [x] 10.3 Perform performance testing


  - Measure preview fetch time (target: < 500ms)
  - Measure cached preview display time (target: < 50ms)
  - Measure animation duration (target: 200ms)
  - Test memory usage with repeated hovers
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 10.4 Add final polish


  - Fine-tune animation timings
  - Adjust hover card shadows and borders
  - Optimize image loading
  - Add subtle hover effects
  - _Requirements: 1.4_
