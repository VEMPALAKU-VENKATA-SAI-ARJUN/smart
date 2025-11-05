import { useState, useEffect } from 'react';
import { Heart, Star } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import http from '../lib/http';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const WishlistButton = ({ 
  artworkId, 
  type = 'heart', // 'heart' for likes, 'star' for wishlist
  size = 20,
  className = '',
  showCount = false,
  initialCount = 0,
  initialState = false
}) => {
  const { user } = useAuth();
  const [isActive, setIsActive] = useState(initialState);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);

  const Icon = type === 'heart' ? Heart : Star;
  const endpoint = type === 'heart' ? 'like' : 'wishlist';

  useEffect(() => {
    const controller = new AbortController();
    if (user && artworkId) {
      checkStatus(controller.signal);
    }
    return () => controller.abort();
  }, [user, artworkId]);

  const checkStatus = async (signal) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;
      const headers = { Authorization: `Bearer ${token}` };
      const resp = await http.get(`/api/artworks/${artworkId}/${endpoint}/status`, { signal, headers, dedupeKey: `artwork-${artworkId}-${endpoint}-status` });
      const data = resp?.data ?? null;
      if (data?.success) {
        setIsActive(data.isActive);
        if (showCount) setCount(data.count || 0);
      }
    } catch (error) {
      console.error(`Error checking ${endpoint} status:`, error);
    }
  };

  const handleToggle = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (!user) {
      // Redirect to login or show login modal
      window.location.href = '/auth';
      return;
    }

    if (loading) return;

    setLoading(true);
    const previousState = isActive;
    const previousCount = count;

    // Optimistic update
    setIsActive(!isActive);
    if (showCount) {
      setCount(prev => isActive ? prev - 1 : prev + 1);
    }

    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };
      const resp = await http.post(`/api/artworks/${artworkId}/${endpoint}`, {}, { headers });
      const data = resp?.data ?? null;
      if (data?.success) {
        setIsActive(data.isActive);
        if (showCount && data.count !== undefined) setCount(data.count);
      } else {
        setIsActive(previousState);
        setCount(previousCount);
      }
    } catch (error) {
      console.error(`Error toggling ${endpoint}:`, error);
      // Revert on error
      setIsActive(previousState);
      setCount(previousCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      className={`wishlist-btn ${type}-btn ${isActive ? 'active' : ''} ${loading ? 'loading' : ''} ${className}`}
      onClick={handleToggle}
      disabled={loading}
      title={
        type === 'heart' 
          ? (isActive ? 'Unlike' : 'Like')
          : (isActive ? 'Remove from wishlist' : 'Add to wishlist')
      }
    >
      <Icon 
        size={size} 
        fill={isActive ? 'currentColor' : 'none'}
        className={loading ? 'animate-pulse' : ''}
      />
      {showCount && (
        <span className="count">{count}</span>
      )}
    </button>
  );
};

export default WishlistButton;