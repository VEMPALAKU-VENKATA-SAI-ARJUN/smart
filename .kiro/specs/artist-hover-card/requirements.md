# Requirements Document

## Introduction

The Artist Hover Card feature enhances the Following page by providing quick, interactive previews of followed artists. When users hover over an artist card, they see a rich preview containing the artist's profile information, recent artworks, and quick action buttons for messaging or unfollowing. This feature improves user engagement by reducing navigation friction and providing instant context about followed artists.

## Glossary

- **System**: The Artist Hover Card Feature
- **User**: An authenticated user viewing their Following page
- **Artist**: A user being followed by the current User
- **Hover Card**: A floating preview panel that appears on hover
- **Mini Preview**: A compact display showing artist info and 3 recent artworks
- **Quick Actions**: Message and Unfollow buttons within the Hover Card
- **Debounce Delay**: A 300ms wait period before triggering hover preview fetch
- **Hide Delay**: A 250ms wait period before hiding the Hover Card on mouse leave

## Requirements

### Requirement 1

**User Story:** As a User, I want to see a preview of an Artist's profile when I hover over their card, so that I can quickly view their information without navigating away from the Following page.

#### Acceptance Criteria

1. WHEN the User hovers over an Artist card for more than 300ms, THE System SHALL fetch and display a Hover Card containing the Artist's profile information
2. THE System SHALL display the Artist's avatar, username, and bio in the Hover Card header
3. WHEN the Artist has no bio, THE System SHALL display a placeholder text "No bio available"
4. THE System SHALL animate the Hover Card appearance with fade-in and scale-up effects within 200ms
5. WHEN the User moves the mouse away from the Artist card, THE System SHALL hide the Hover Card after 250ms delay

### Requirement 2

**User Story:** As a User, I want to see the Artist's recent artworks in the hover preview, so that I can quickly assess their latest creative output.

#### Acceptance Criteria

1. THE System SHALL display up to 3 most recent approved artworks in the Hover Card
2. THE System SHALL sort artworks by creation date in descending order
3. WHEN the Artist has fewer than 3 artworks, THE System SHALL display all available artworks
4. WHEN the Artist has no approved artworks, THE System SHALL display a placeholder message "No artworks yet"
5. THE System SHALL display artwork thumbnails with consistent dimensions and rounded corners

### Requirement 3

**User Story:** As a User, I want to quickly message an Artist from the hover card, so that I can start a conversation without navigating to their profile.

#### Acceptance Criteria

1. THE System SHALL display a "Message" button in the Hover Card actions section
2. WHEN the User clicks the Message button, THE System SHALL navigate to the Messages page with the Artist pre-selected
3. THE System SHALL pass the Artist's ID as a query parameter in the Messages page URL
4. THE System SHALL display a tooltip "Start a conversation with this artist" when hovering over the Message button
5. THE System SHALL disable the Message button if the User is the Artist

### Requirement 4

**User Story:** As a User, I want to unfollow an Artist directly from the hover card, so that I can manage my following list efficiently.

#### Acceptance Criteria

1. THE System SHALL display an "Unfollow" button in the Hover Card actions section
2. WHEN the User clicks the Unfollow button, THE System SHALL display a confirmation modal
3. WHEN the User confirms the unfollow action, THE System SHALL send a DELETE request to the follow endpoint
4. WHEN the unfollow is successful, THE System SHALL remove the Artist from the Following list immediately
5. THE System SHALL display a toast notification "Unfollowed [Artist username]" after successful unfollow

### Requirement 5

**User Story:** As a User, I want the hover card to load quickly, so that I have a smooth browsing experience.

#### Acceptance Criteria

1. THE System SHALL cache Artist mini preview data for 30 seconds
2. THE System SHALL display a loading skeleton while fetching preview data
3. WHEN the preview data is cached, THE System SHALL display the Hover Card within 50ms
4. THE System SHALL debounce hover requests by 300ms to prevent excessive API calls
5. THE System SHALL prefetch preview data for Artists visible in the viewport

### Requirement 6

**User Story:** As a User, I want the hover card to work smoothly on different screen sizes, so that I can use it on any device.

#### Acceptance Criteria

1. THE System SHALL position the Hover Card to avoid viewport overflow
2. WHEN the Hover Card would extend beyond the right edge, THE System SHALL position it to the left of the Artist card
3. WHEN the Hover Card would extend beyond the bottom edge, THE System SHALL position it above the Artist card
4. THE System SHALL disable hover cards on touch devices with screen width less than 768px
5. THE System SHALL maintain readable text and clickable buttons on all supported screen sizes

### Requirement 7

**User Story:** As a User, I want to see real-time status indicators in the hover card, so that I know if an Artist is currently active.

#### Acceptance Criteria

1. WHEN the Artist is currently online, THE System SHALL display a green status indicator
2. WHEN the Artist was active within the last 24 hours, THE System SHALL display a "Recently Active" badge
3. WHEN the Artist uploaded an artwork within the last 7 days, THE System SHALL display a "Recently Posted" badge
4. THE System SHALL update online status in real-time using WebSocket connections
5. THE System SHALL display the time since the User started following the Artist

### Requirement 8

**User Story:** As a User, I want error handling for failed hover card loads, so that I understand when something goes wrong.

#### Acceptance Criteria

1. WHEN the preview fetch fails, THE System SHALL display an error message in the Hover Card
2. THE System SHALL provide a "Retry" button when preview fetch fails
3. WHEN the retry is clicked, THE System SHALL attempt to fetch the preview data again
4. THE System SHALL log preview fetch errors to the console for debugging
5. WHEN the Artist account is deleted or deactivated, THE System SHALL display "Artist unavailable" message
