import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useSocket } from '../contexts/SocketContext';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Custom hook for fetching and managing user stats with real-time updates
 * @param {string} userId - The ID of the user
 * @param {boolean} isOwnProfile - Whether this is the current user's profile
 * @returns {object} - Stats data and handlers
 */
export const useUserStats = (userId, isOwnProfile = false) => {
  const [stats, setStats] = useState({
    posts: 0,
    followers: 0,
    following: 0,
    sales: 0,
    purchases: 0,
    role: null
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const { socket } = useSocket();

  // Fetch stats from API
  const fetchStats = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('auth_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      const response = await axios.get(
        `${API_URL}/api/users/${userId}/stats`,
        { headers }
      );

      if (response.data.success) {
        setStats(response.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError(err.response?.data?.message || 'Failed to load stats');
    } finally {
      setLoading(false);
    }
  }, [userId]);

  // Initial fetch
  useEffect(() => {
    if (userId) {
      fetchStats();
    }
  }, [userId, fetchStats]);

  // Real-time updates via Socket.IO
  useEffect(() => {
    if (!socket || !userId) return;

    // Listen for follower count updates
    const handleFollowUpdate = (data) => {
      console.log('📊 Follow update received:', data);
      setStats(prev => ({
        ...prev,
        followers: data.followerCount
      }));
    };

    // Listen for sales updates (for artists)
    const handleSaleUpdate = (data) => {
      console.log('💰 Sale update received:', data);
      if (data.userId === userId) {
        setStats(prev => ({
          ...prev,
          sales: data.sales
        }));
      }
    };

    // Listen for purchase updates (for buyers)
    const handlePurchaseUpdate = (data) => {
      console.log('🛒 Purchase update received:', data);
      if (data.userId === userId) {
        setStats(prev => ({
          ...prev,
          purchases: data.purchases
        }));
      }
    };

    // Listen for post updates (when artwork is approved)
    const handlePostUpdate = (data) => {
      console.log('📝 Post update received:', data);
      if (data.userId === userId) {
        setStats(prev => ({
          ...prev,
          posts: data.posts
        }));
      }
    };

    socket.on('follow:update', handleFollowUpdate);
    socket.on('sale:update', handleSaleUpdate);
    socket.on('purchase:update', handlePurchaseUpdate);
    socket.on('post:update', handlePostUpdate);

    return () => {
      socket.off('follow:update', handleFollowUpdate);
      socket.off('sale:update', handleSaleUpdate);
      socket.off('purchase:update', handlePurchaseUpdate);
      socket.off('post:update', handlePostUpdate);
    };
  }, [socket, userId]);

  // Manual refresh function
  const refreshStats = useCallback(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    refreshStats
  };
};
