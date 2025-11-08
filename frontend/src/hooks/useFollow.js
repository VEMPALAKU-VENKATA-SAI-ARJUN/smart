import { useState, useCallback, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Custom hook for follow/unfollow functionality with optimistic UI
 * @param {string} userId - The ID of the user to follow/unfollow
 * @param {boolean} initialIsFollowing - Initial following state
 * @param {number} initialFollowerCount - Initial follower count
 * @returns {object} - Follow state and handlers
 */
export const useFollow = (userId, initialIsFollowing = false, initialFollowerCount = 0) => {
  const [isFollowing, setIsFollowing] = useState(initialIsFollowing);
  const [followerCount, setFollowerCount] = useState(initialFollowerCount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync state when props change (e.g., after page refresh)
  useEffect(() => {
    setIsFollowing(initialIsFollowing);
    setFollowerCount(initialFollowerCount);
  }, [initialIsFollowing, initialFollowerCount]);

  const handleFollow = useCallback(async () => {
    if (isLoading) return;

    // Optimistic UI update
    const previousIsFollowing = isFollowing;
    const previousFollowerCount = followerCount;

    setIsFollowing(true);
    setFollowerCount(prev => prev + 1);
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_URL}/api/users/${userId}/follow`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Update with server data
        setIsFollowing(response.data.data.isFollowing);
        setFollowerCount(response.data.data.followerCount);
      }
    } catch (err) {
      console.error('Follow error:', err);
      
      // Rollback on error
      setIsFollowing(previousIsFollowing);
      setFollowerCount(previousFollowerCount);
      
      const errorMessage = err.response?.data?.message || 'Failed to follow user. Please try again.';
      setError(errorMessage);
      
      // Show toast notification
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, isFollowing, followerCount, isLoading]);

  const handleUnfollow = useCallback(async () => {
    if (isLoading) return;

    // Optimistic UI update
    const previousIsFollowing = isFollowing;
    const previousFollowerCount = followerCount;

    setIsFollowing(false);
    setFollowerCount(prev => Math.max(0, prev - 1));
    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.delete(
        `${API_URL}/api/users/${userId}/follow`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        // Update with server data
        setIsFollowing(response.data.data.isFollowing);
        setFollowerCount(response.data.data.followerCount);
      }
    } catch (err) {
      console.error('Unfollow error:', err);
      
      // Rollback on error
      setIsFollowing(previousIsFollowing);
      setFollowerCount(previousFollowerCount);
      
      const errorMessage = err.response?.data?.message || 'Failed to unfollow user. Please try again.';
      setError(errorMessage);
      
      // Show toast notification
      if (window.showToast) {
        window.showToast(errorMessage, 'error');
      }
    } finally {
      setIsLoading(false);
    }
  }, [userId, isFollowing, followerCount, isLoading]);

  const toggleFollow = useCallback(() => {
    if (isFollowing) {
      handleUnfollow();
    } else {
      handleFollow();
    }
  }, [isFollowing, handleFollow, handleUnfollow]);

  return {
    isFollowing,
    followerCount,
    isLoading,
    error,
    handleFollow,
    handleUnfollow,
    toggleFollow
  };
};
