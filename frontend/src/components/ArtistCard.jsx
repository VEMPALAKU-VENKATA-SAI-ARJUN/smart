import { useState, useRef, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence } from 'framer-motion';
import { useArtistPreview } from '../hooks/useArtistPreview';
import { useToast } from '../hooks/use-toast';
import { debounce } from '../utils/utils';
import ArtistHoverCard from './ArtistHoverCard';
import UnfollowConfirmModal from './UnfollowConfirmModal';
import styles from '../styles/ArtistCard.module.css';

export default function ArtistCard({ artist, onUnfollow }) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isHovered, setIsHovered] = useState(false);
  const [showHoverCard, setShowHoverCard] = useState(false);
  const [hoverCardPosition, setHoverCardPosition] = useState({ x: 0, y: 0 });
  const [artistIdToFetch, setArtistIdToFetch] = useState(null);
  const [showUnfollowModal, setShowUnfollowModal] = useState(false);
  const [unfollowLoading, setUnfollowLoading] = useState(false);
  
  const cardRef = useRef(null);
  const hoverTimeoutRef = useRef(null);
  const hideTimeoutRef = useRef(null);

  const { data, isLoading, error, errorCode, refetch } = useArtistPreview(artistIdToFetch);

  // Detect touch device and screen size
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect touch capability
    const hasTouchSupport = 'ontouchstart' in window || 
                           navigator.maxTouchPoints > 0 || 
                           navigator.msMaxTouchPoints > 0;
    
    // Check screen size
    const checkMobile = () => {
      const isSmallScreen = window.innerWidth < 768;
      setIsTouchDevice(hasTouchSupport);
      setIsMobile(hasTouchSupport && isSmallScreen);
    };

    checkMobile();

    // Listen for resize events
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
      if (hideTimeoutRef.current) {
        clearTimeout(hideTimeoutRef.current);
      }
    };
  }, []);

  // Recalculate position on scroll or resize when hover card is visible
  useEffect(() => {
    if (!showHoverCard) return;

    const updatePosition = () => {
      const newPosition = calculatePosition();
      setHoverCardPosition(newPosition);
    };

    // Throttle position updates for performance
    let ticking = false;
    const handlePositionUpdate = () => {
      if (!ticking) {
        window.requestAnimationFrame(() => {
          updatePosition();
          ticking = false;
        });
        ticking = true;
      }
    };

    window.addEventListener('scroll', handlePositionUpdate, { passive: true });
    window.addEventListener('resize', handlePositionUpdate);

    return () => {
      window.removeEventListener('scroll', handlePositionUpdate);
      window.removeEventListener('resize', handlePositionUpdate);
    };
  }, [showHoverCard]);

  const calculatePosition = () => {
    if (!cardRef.current) return { x: 0, y: 0 };

    const rect = cardRef.current.getBoundingClientRect();
    
    // Hover card dimensions (adjust based on actual size)
    const hoverCardWidth = window.innerWidth >= 1024 ? 320 : 280;
    const hoverCardHeight = 450; // Approximate max height
    const padding = 12;
    const scrollY = window.scrollY || window.pageYOffset;
    const scrollX = window.scrollX || window.pageXOffset;

    // Calculate available space in all directions
    const spaceRight = window.innerWidth - rect.right;
    const spaceLeft = rect.left;
    const spaceBelow = window.innerHeight - rect.top;
    const spaceAbove = rect.top;

    let x = 0;
    let y = 0;

    // Horizontal positioning
    // Prefer right side, but switch to left if not enough space
    if (spaceRight >= hoverCardWidth + padding) {
      // Position to the right of the card
      x = rect.right + padding + scrollX;
    } else if (spaceLeft >= hoverCardWidth + padding) {
      // Position to the left of the card
      x = rect.left - hoverCardWidth - padding + scrollX;
    } else {
      // Not enough space on either side, center it or align to edge
      if (rect.left + hoverCardWidth + padding > window.innerWidth) {
        // Align to right edge with padding
        x = window.innerWidth - hoverCardWidth - padding + scrollX;
      } else {
        // Align to left edge of card
        x = rect.left + scrollX;
      }
    }

    // Vertical positioning
    // Prefer aligning with top of card, but adjust if overflowing
    if (spaceBelow >= hoverCardHeight + padding) {
      // Enough space below, align with top of card
      y = rect.top + scrollY;
    } else if (spaceAbove >= hoverCardHeight + padding) {
      // Not enough space below, position above the card
      y = rect.bottom - hoverCardHeight + scrollY;
    } else {
      // Not enough space above or below, position to fit in viewport
      const availableHeight = window.innerHeight - 2 * padding;
      if (hoverCardHeight > availableHeight) {
        // Hover card is taller than viewport, align to top with padding
        y = padding + scrollY;
      } else {
        // Center vertically in viewport
        y = (window.innerHeight - hoverCardHeight) / 2 + scrollY;
      }
    }

    // Final boundary checks
    // Ensure x is within viewport bounds
    if (x < padding + scrollX) {
      x = padding + scrollX;
    }
    if (x + hoverCardWidth > window.innerWidth + scrollX - padding) {
      x = window.innerWidth + scrollX - hoverCardWidth - padding;
    }

    // Ensure y is within viewport bounds
    if (y < padding + scrollY) {
      y = padding + scrollY;
    }
    if (y + hoverCardHeight > window.innerHeight + scrollY - padding) {
      y = Math.max(padding + scrollY, window.innerHeight + scrollY - hoverCardHeight - padding);
    }

    return { x, y };
  };

  // Debounced function to trigger hover card display
  const debouncedShowHoverCard = useMemo(
    () => debounce(() => {
      if (isMobile) return;
      
      const position = calculatePosition();
      setHoverCardPosition(position);
      setArtistIdToFetch(artist._id);
      setShowHoverCard(true);
    }, 300),
    [artist._id, isMobile]
  );

  const handleMouseEnter = () => {
    if (isMobile) return;

    setIsHovered(true);

    // Clear any pending hide timeout
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }

    // Trigger debounced hover card display
    debouncedShowHoverCard();
  };

  const handleMouseLeave = () => {
    if (isMobile) return;

    setIsHovered(false);

    // Cancel pending hover card display
    setArtistIdToFetch(null);

    // Set timeout to hide hover card after 250ms
    hideTimeoutRef.current = setTimeout(() => {
      setShowHoverCard(false);
      setArtistIdToFetch(null);
    }, 250);
  };

  const handleFocus = () => {
    if (isMobile) return;

    // Show hover card on focus (keyboard navigation)
    const position = calculatePosition();
    setHoverCardPosition(position);
    setArtistIdToFetch(artist._id);
    setShowHoverCard(true);
  };

  const handleBlur = (e) => {
    if (isMobile) return;

    // Don't hide if focus is moving to hover card or its children
    if (e.relatedTarget && e.relatedTarget.closest('[data-hover-card]')) {
      return;
    }

    // Hide hover card when focus leaves
    hideTimeoutRef.current = setTimeout(() => {
      setShowHoverCard(false);
      setArtistIdToFetch(null);
    }, 250);
  };

  const handleHoverCardMouseEnter = () => {
    // Clear hide timeout when mouse enters hover card
    if (hideTimeoutRef.current) {
      clearTimeout(hideTimeoutRef.current);
      hideTimeoutRef.current = null;
    }
  };

  const handleHoverCardMouseLeave = () => {
    // Hide hover card when mouse leaves it
    hideTimeoutRef.current = setTimeout(() => {
      setShowHoverCard(false);
      setArtistIdToFetch(null);
    }, 250);
  };

  const handleMessage = (artistId) => {
    navigate(`/messages?user=${artistId}`);
  };

  const handleUnfollowClick = () => {
    setShowHoverCard(false);
    setArtistIdToFetch(null);
    setShowUnfollowModal(true);
  };

  const handleConfirmUnfollow = async () => {
    setUnfollowLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/users/${artist._id}/follow`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to unfollow');
      }

      // Close modal
      setShowUnfollowModal(false);
      
      // Show success toast
      toast({
        title: "Unfollowed",
        description: `You unfollowed ${artist.username}`,
      });

      // Call parent callback to update the list
      if (onUnfollow) {
        onUnfollow(artist._id);
      }
    } catch (error) {
      console.error('Error unfollowing artist:', error);
      toast({
        title: "Error",
        description: "Failed to unfollow. Please try again.",
        variant: "destructive",
      });
    } finally {
      setUnfollowLoading(false);
    }
  };

  const handleCardClick = () => {
    if (isMobile) {
      navigate(`/profile/${artist._id}`);
    }
  };

  // On mobile, render as a clickable card without hover functionality
  if (isMobile) {
    return (
      <>
        <div
          ref={cardRef}
          className={`${styles.artistCard} ${styles.mobileCard}`}
          onClick={handleCardClick}
          data-artist-id={artist._id}
        >
          <div className={styles.avatarContainer}>
            <img
              src={artist.profile?.avatar || `https://ui-avatars.com/api/?name=${artist.username}&size=64`}
              alt={artist.username}
              className={styles.avatar}
            />
          </div>
          
          <div className={styles.info}>
            <h3 className={styles.username}>{artist.username}</h3>
            {artist.role === 'artist' && (
              <span className={styles.badge}>Artist</span>
            )}
          </div>

          {artist.profile?.bio && (
            <p className={styles.bio}>{artist.profile.bio}</p>
          )}

          <div className={styles.stats}>
            <span>{artist.followers?.length || 0} followers</span>
          </div>

          <div className={styles.actions}>
            <button
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/profile/${artist._id}`);
              }}
              className={styles.viewButton}
            >
              View Profile
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowUnfollowModal(true);
              }}
              className={styles.unfollowButton}
            >
              Unfollow
            </button>
          </div>
        </div>

        {/* Unfollow Confirmation Modal */}
        <UnfollowConfirmModal
          isOpen={showUnfollowModal}
          onClose={() => setShowUnfollowModal(false)}
          onConfirm={handleConfirmUnfollow}
          artistName={artist.username}
        />
      </>
    );
  }

  // Desktop/tablet: render with hover functionality
  return (
    <>
      <div
        ref={cardRef}
        className={styles.artistCard}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onFocus={handleFocus}
        onBlur={handleBlur}
        onClick={handleCardClick}
        data-artist-id={artist._id}
        tabIndex={0}
        role="button"
        aria-label={`View ${artist.username}'s profile`}
      >
        <div className={styles.avatarContainer}>
          <img
            src={artist.profile?.avatar || `https://ui-avatars.com/api/?name=${artist.username}&size=64`}
            alt={artist.username}
            className={styles.avatar}
          />
        </div>
        
        <div className={styles.info}>
          <h3 className={styles.username}>{artist.username}</h3>
          {artist.role === 'artist' && (
            <span className={styles.badge}>Artist</span>
          )}
        </div>

        {artist.profile?.bio && (
          <p className={styles.bio}>{artist.profile.bio}</p>
        )}

        <div className={styles.stats}>
          <span>{artist.followers?.length || 0} followers</span>
        </div>

        <div className={styles.actions}>
          <button
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/profile/${artist._id}`);
            }}
            className={styles.viewButton}
          >
            View Profile
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowUnfollowModal(true);
            }}
            className={styles.unfollowButton}
          >
            Unfollow
          </button>
        </div>
      </div>

      {/* Hover Card Portal */}
      {!isMobile && (
        <AnimatePresence>
          {showHoverCard && (
            <div
              onMouseEnter={handleHoverCardMouseEnter}
              onMouseLeave={handleHoverCardMouseLeave}
            >
              <ArtistHoverCard
                data={data}
                isLoading={isLoading}
                error={error}
                errorCode={errorCode}
                artistId={artist._id}
                position={hoverCardPosition}
                onClose={() => {
                  setShowHoverCard(false);
                  setArtistIdToFetch(null);
                }}
                onMessage={handleMessage}
                onUnfollow={handleUnfollowClick}
                onRetry={refetch}
              />
            </div>
          )}
        </AnimatePresence>
      )}

      {/* Unfollow Confirmation Modal */}
      <UnfollowConfirmModal
        isOpen={showUnfollowModal}
        onClose={() => setShowUnfollowModal(false)}
        onConfirm={handleConfirmUnfollow}
        artistName={artist.username}
      />
    </>
  );
}
