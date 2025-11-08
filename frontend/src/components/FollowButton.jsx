import { useState } from 'react';
import { UserPlus, UserMinus, Loader2 } from 'lucide-react';
import { useFollow } from '../hooks/useFollow';
import '../styles/FollowButton.css';

/**
 * FollowButton Component
 * Displays a button to follow/unfollow a user with optimistic UI updates
 * 
 * @param {string} userId - The ID of the user to follow/unfollow
 * @param {boolean} initialIsFollowing - Initial following state
 * @param {number} initialFollowerCount - Initial follower count
 * @param {string} variant - Button style variant ('primary', 'secondary', 'outline')
 * @param {string} size - Button size ('sm', 'md', 'lg')
 * @param {boolean} showCount - Whether to show follower count
 */
export default function FollowButton({
  userId,
  initialIsFollowing = false,
  initialFollowerCount = 0,
  variant = 'primary',
  size = 'md',
  showCount = false,
  className = ''
}) {
  const [showUnfollowMenu, setShowUnfollowMenu] = useState(false);
  
  const {
    isFollowing,
    followerCount,
    isLoading,
    handleFollow,
    handleUnfollow
  } = useFollow(userId, initialIsFollowing, initialFollowerCount);

  const handleClick = () => {
    if (isFollowing) {
      setShowUnfollowMenu(true);
    } else {
      handleFollow();
    }
  };

  const confirmUnfollow = () => {
    handleUnfollow();
    setShowUnfollowMenu(false);
  };

  const cancelUnfollow = () => {
    setShowUnfollowMenu(false);
  };

  return (
    <div className="follow-button-container">
      <button
        onClick={handleClick}
        disabled={isLoading}
        className={`follow-btn follow-btn-${variant} follow-btn-${size} ${isFollowing ? 'following' : ''} ${className}`}
        aria-label={isFollowing ? 'Unfollow user' : 'Follow user'}
      >
        {isLoading ? (
          <>
            <Loader2 className="follow-btn-icon spin" />
            <span>{isFollowing ? 'Unfollowing...' : 'Following...'}</span>
          </>
        ) : isFollowing ? (
          <>
            <UserMinus className="follow-btn-icon" />
            <span>Following</span>
          </>
        ) : (
          <>
            <UserPlus className="follow-btn-icon" />
            <span>Follow</span>
          </>
        )}
      </button>

      {showCount && (
        <span className="follower-count">
          {followerCount} {followerCount === 1 ? 'follower' : 'followers'}
        </span>
      )}

      {/* Unfollow Confirmation Menu */}
      {showUnfollowMenu && (
        <div className="unfollow-menu-overlay" onClick={cancelUnfollow}>
          <div className="unfollow-menu" onClick={(e) => e.stopPropagation()}>
            <h3>Unfollow User?</h3>
            <p>You will no longer see their posts in your feed.</p>
            <div className="unfollow-menu-actions">
              <button
                onClick={confirmUnfollow}
                className="unfollow-confirm-btn"
                disabled={isLoading}
              >
                {isLoading ? 'Unfollowing...' : 'Unfollow'}
              </button>
              <button
                onClick={cancelUnfollow}
                className="unfollow-cancel-btn"
                disabled={isLoading}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
