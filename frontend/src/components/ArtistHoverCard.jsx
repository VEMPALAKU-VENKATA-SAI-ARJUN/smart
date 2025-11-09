import { motion } from 'framer-motion';
import { MessageCircle, UserMinus, AlertCircle, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useSocket } from '../contexts/SocketContext';
import { useAuth } from '../contexts/AuthContext';
import { useFocusTrap } from '../hooks/useFocusTrap';
import { getOptimizedImageUrl, generateSrcSet } from '../utils/imageOptimization';
import styles from '../styles/ArtistHoverCard.module.css';

// Check if user prefers reduced motion
const prefersReducedMotion = () => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
};

const getVariants = () => {
  const shouldReduceMotion = prefersReducedMotion();
  
  if (shouldReduceMotion) {
    // No animations when reduced motion is preferred
    return {
      hidden: { opacity: 0 },
      visible: { opacity: 1, transition: { duration: 0 } },
      exit: { opacity: 0, transition: { duration: 0 } }
    };
  }
  
  // Full animations when motion is allowed
  return {
    hidden: { opacity: 0, y: 10, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.2, ease: 'easeOut' }
    },
    exit: { 
      opacity: 0, 
      y: 5, 
      scale: 0.98,
      transition: { duration: 0.15 }
    }
  };
};

export default function ArtistHoverCard({ 
  data, 
  isLoading, 
  error,
  errorCode,
  artistId,
  position, 
  onClose, 
  onMessage, 
  onUnfollow,
  onRetry 
}) {
  const { user: currentUser } = useAuth();
  const focusTrapRef = useFocusTrap(true);
  const [variants, setVariants] = useState(getVariants());
  
  // Try to get socket, but don't fail if not available
  let socket = null;
  try {
    const socketContext = useSocket();
    socket = socketContext?.socket;
  } catch (e) {
    // Socket context not available, continue without real-time updates
  }
  
  const [isOnline, setIsOnline] = useState(data?.user?.isOnline || false);

  // Handle Escape key to close hover card
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onClose]);

  // Listen for changes to prefers-reduced-motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    
    const handleChange = () => {
      setVariants(getVariants());
    };

    // Modern browsers
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    } 
    // Older browsers
    else if (mediaQuery.addListener) {
      mediaQuery.addListener(handleChange);
      return () => mediaQuery.removeListener(handleChange);
    }
  }, []);

  // Listen for real-time online status updates
  useEffect(() => {
    if (!socket || !data?.user?._id) return;

    const user = data.user;

    const handleStatusUpdate = (statusData) => {
      if (statusData.userId === user._id) {
        setIsOnline(statusData.isOnline);
      }
    };

    socket.on('user:status', handleStatusUpdate);

    return () => {
      socket.off('user:status', handleStatusUpdate);
    };
  }, [socket, data?.user?._id]);
  
  // Update isOnline when data changes
  useEffect(() => {
    if (data?.user?.isOnline !== undefined) {
      setIsOnline(data.user.isOnline);
    }
  }, [data?.user?.isOnline]);

  if (isLoading) {
    return (
      <motion.div
        ref={focusTrapRef}
        className={styles.hoverCard}
        style={{ 
          top: position.y, 
          left: position.x,
          position: 'fixed'
        }}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        data-hover-card
        role="dialog"
        aria-label="Loading artist preview"
        aria-busy="true"
      >
        <div className={styles.skeleton}>
          <div className={styles.skeletonHeader}>
            <div className={styles.skeletonAvatar}></div>
            <div className={styles.skeletonText}>
              <div className={styles.skeletonLine}></div>
              <div className={styles.skeletonLine}></div>
            </div>
          </div>
          <div className={styles.skeletonGallery}>
            <div className={styles.skeletonImage}></div>
            <div className={styles.skeletonImage}></div>
            <div className={styles.skeletonImage}></div>
          </div>
        </div>
      </motion.div>
    );
  }

  if (error) {
    // Determine error message and whether to show retry button based on error code
    let errorMessage = 'Unable to load preview';
    let showRetry = true;
    let showRemoveOption = false;

    if (errorCode === 'ARTIST_NOT_FOUND') {
      errorMessage = 'Artist unavailable';
      showRetry = false;
      showRemoveOption = true;
    } else if (errorCode === 'INVALID_USER_ID') {
      errorMessage = 'Invalid artist ID';
      showRetry = false;
    } else if (errorCode === 'RATE_LIMIT_EXCEEDED') {
      errorMessage = 'Too many requests, please wait';
      showRetry = false;
    } else if (errorCode === 'NETWORK_ERROR' || !navigator.onLine) {
      errorMessage = 'Unable to load preview';
      showRetry = true;
    } else if (errorCode === 'SERVER_ERROR') {
      errorMessage = 'Server error, please try again';
      showRetry = true;
    }

    return (
      <motion.div
        ref={focusTrapRef}
        className={styles.hoverCard}
        style={{ 
          top: position.y, 
          left: position.x,
          position: 'fixed'
        }}
        variants={variants}
        initial="hidden"
        animate="visible"
        exit="exit"
        data-hover-card
        role="dialog"
        aria-label="Error loading artist preview"
      >
        <div className={styles.errorState} role="alert" aria-live="assertive">
          <AlertCircle className={styles.errorIcon} aria-hidden="true" />
          <p className={styles.errorMessage} id="error-message">{errorMessage}</p>
          <div className={styles.errorActions}>
            {showRetry && (
              <button 
                className={styles.retryButton}
                onClick={onRetry}
                aria-label="Retry loading artist preview"
                aria-describedby="error-message"
              >
                <RefreshCw size={14} aria-hidden="true" />
                Retry
              </button>
            )}
            {showRemoveOption && onUnfollow && artistId && (
              <button 
                className={styles.removeButton}
                onClick={() => {
                  onUnfollow(artistId);
                }}
                aria-label="Remove from following list"
              >
                <UserMinus size={14} aria-hidden="true" />
                Remove
              </button>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  if (!data) return null;

  const { user, artworks, followedAt, badges } = data;

  // Calculate days since following
  const getDaysSinceFollowing = (followDate) => {
    if (!followDate) return null;
    const now = new Date();
    const followed = new Date(followDate);
    const diffTime = Math.abs(now - followed);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Followed today';
    if (diffDays === 1) return 'Followed 1 day ago';
    if (diffDays < 30) return `Followed ${diffDays} days ago`;
    if (diffDays < 365) {
      const months = Math.floor(diffDays / 30);
      return `Followed ${months} ${months === 1 ? 'month' : 'months'} ago`;
    }
    const years = Math.floor(diffDays / 365);
    return `Followed ${years} ${years === 1 ? 'year' : 'years'} ago`;
  };

  const followDateText = getDaysSinceFollowing(followedAt);

  return (
    <motion.div
      ref={focusTrapRef}
      className={styles.hoverCard}
      style={{ 
        top: position.y, 
        left: position.x,
        position: 'fixed'
      }}
      variants={variants}
      initial="hidden"
      animate="visible"
      exit="exit"
      data-hover-card
      role="dialog"
      aria-label={`Preview for ${user.username}`}
      aria-modal="true"
    >
      {/* Header Section */}
      <div className={styles.header}>
        <img
          src={getOptimizedImageUrl(user.profile?.avatar, 64, 90) || `https://ui-avatars.com/api/?name=${user.username}&size=64`}
          srcSet={user.profile?.avatar ? generateSrcSet(user.profile.avatar, [64, 128]) : undefined}
          sizes="64px"
          alt={`${user.username}'s avatar`}
          className={styles.avatar}
          loading="lazy"
          decoding="async"
          onError={(e) => {
            e.target.src = `https://ui-avatars.com/api/?name=${user.username}&size=64`;
          }}
        />
        <div className={styles.userInfo}>
          <div className={styles.usernameRow}>
            <h3 className={styles.username} id="artist-name">{user.username}</h3>
            {isOnline && (
              <span 
                className={styles.onlineIndicator}
                title="Online now"
                role="status"
                aria-label="User is online"
                aria-live="polite"
              />
            )}
          </div>
          <p className={styles.bio} id="artist-bio" aria-label={user.profile?.bio ? `Bio: ${user.profile.bio}` : 'No bio available'}>
            {user.profile?.bio || 'No bio available'}
          </p>
          {followDateText && (
            <p className={styles.followDate} aria-label={followDateText}>{followDateText}</p>
          )}
        </div>
      </div>

      {/* Status Indicators Section */}
      {(badges?.recentlyActive || badges?.recentlyPosted) && (
        <div className={styles.statusBadges} role="status" aria-live="polite" aria-label="Artist activity status">
          {badges.recentlyActive && (
            <span className={styles.badge} role="status" aria-label="Artist was recently active">
              Recently Active
            </span>
          )}
          {badges.recentlyPosted && (
            <span className={styles.badge} role="status" aria-label="Artist recently posted artwork">
              Recently Posted
            </span>
          )}
        </div>
      )}

      {/* Mini Gallery Section */}
      <div className={styles.gallery} role="region" aria-label="Recent artworks">
        {artworks && artworks.length > 0 ? (
          artworks.slice(0, 3).map((artwork, index) => (
            <div 
              key={artwork._id} 
              className={styles.artworkThumb}
              title={artwork.title}
              role="img"
              aria-label={`Artwork ${index + 1}: ${artwork.title}`}
            >
              <img
                src={getOptimizedImageUrl(artwork.thumbnail, 200, 85)}
                srcSet={generateSrcSet(artwork.thumbnail, [100, 200, 300])}
                sizes="(max-width: 768px) 100px, 200px"
                alt={artwork.title}
                loading="lazy"
                decoding="async"
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.parentElement.classList.add(styles.imageFailed);
                }}
              />
            </div>
          ))
        ) : (
          <p className={styles.noArtworks} role="status" aria-label="This artist has no artworks yet">No artworks yet</p>
        )}
      </div>

      {/* Actions Section */}
      <div className={styles.actions} role="group" aria-label="Artist actions">
        <button
          className={styles.messageButton}
          onClick={() => onMessage(user._id)}
          title="Start a conversation with this artist"
          disabled={currentUser?.id === user._id}
          aria-label={`Send a message to ${user.username}`}
          aria-disabled={currentUser?.id === user._id}
        >
          <MessageCircle size={16} aria-hidden="true" />
          Message
        </button>
        <button
          className={styles.unfollowButton}
          onClick={() => onUnfollow(user._id)}
          aria-label={`Unfollow ${user.username}`}
        >
          <UserMinus size={16} aria-hidden="true" />
          Unfollow
        </button>
      </div>
    </motion.div>
  );
}
