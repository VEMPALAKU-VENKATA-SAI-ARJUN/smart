import { useState, useEffect } from 'react';
import http from '../lib/http';

/**
 * useProfile - shared hook for fetching and managing user profile data
 * @param {string} userId - The user ID to fetch
 * @param {object} [options] - { enabled: boolean, initialUser: object }
 * @returns {object} { profile, loading, error, refresh }
 */
export function useProfile(userId, options = {}) {
  const { enabled = true, initialUser = null } = options;
  const [profile, setProfile] = useState(initialUser);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!enabled || !userId) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    http.get(`/api/users/${userId}`, { signal: controller.signal, dedupeKey: `profile:${userId}` })
      .then(data => {
        if (controller.signal.aborted) return;
        setProfile(data?.data || data);
      })
      .catch(e => {
        if (e.name !== 'AbortError') setError('Failed to load profile');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [userId, enabled]);

  const refresh = () => {
    setLoading(true);
    setError('');
    http.get(`/api/users/${userId}`, { dedupeKey: `profile:${userId}` })
      .then(data => setProfile(data?.data || data))
      .catch(() => setError('Failed to load profile'))
      .finally(() => setLoading(false));
  };

  return { profile, loading, error, refresh };
}
