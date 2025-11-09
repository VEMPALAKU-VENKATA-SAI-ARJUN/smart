import { useQuery, useQueryClient } from '@tanstack/react-query';
import http from '../lib/http';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Custom hook for fetching and caching artist preview data
 * @param {string | null} artistId - The ID of the artist to fetch preview for
 * @returns {Object} Query result with data, isLoading, error, errorCode, and refetch
 */
export function useArtistPreview(artistId) {
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: ['artistPreview', artistId],
    queryFn: async ({ signal }) => {
      if (!artistId) return null;
      
      const headers = { 
        Authorization: `Bearer ${localStorage.getItem('auth_token')}` 
      };
      
      try {
        const response = await http.get(
          `/api/users/${artistId}/mini-preview`,
          { 
            headers,
            dedupeKey: `artist-preview:${artistId}`,
            signal // Pass abort signal for request cancellation
          }
        );
        
        return response?.data?.data || response?.data;
      } catch (error) {
        // Detect network failures
        const isNetworkError = !navigator.onLine || 
                              error.message === 'Network Error' ||
                              error.message === 'Failed to fetch' ||
                              error.code === 'ERR_NETWORK' ||
                              !error.response;
        
        // Log error to console for debugging
        console.error('❌ Failed to fetch artist preview:', {
          artistId,
          error: error.message,
          code: error.response?.data?.code,
          status: error.response?.status,
          isNetworkError,
          timestamp: new Date().toISOString()
        });
        
        // Enhance error with code from backend response or network detection
        const enhancedError = new Error(
          error.response?.data?.error || error.message || 'Failed to fetch preview'
        );
        
        if (isNetworkError) {
          enhancedError.code = 'NETWORK_ERROR';
        } else {
          enhancedError.code = error.response?.data?.code || 'SERVER_ERROR';
        }
        
        enhancedError.status = error.response?.status;
        enhancedError.originalError = error;
        
        throw enhancedError;
      }
    },
    enabled: !!artistId,
    staleTime: 30000, // 30 seconds cache
    cacheTime: 60000, // Keep in cache for 1 minute
    retry: (failureCount, error) => {
      // Don't retry on 404 (artist not found) or 400 (invalid ID)
      if (error?.status === 404 || error?.status === 400) {
        return false;
      }
      
      // For network errors, check if we're online before retrying
      if (error?.code === 'NETWORK_ERROR' && !navigator.onLine) {
        console.log('⚠️ Device is offline, skipping retry');
        return false;
      }
      
      // Retry up to 3 times for other errors
      return failureCount < 3;
    },
    retryDelay: (attemptIndex) => {
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.min(1000 * 2 ** attemptIndex, 4000);
      console.log(`⏳ Retrying artist preview fetch (attempt ${attemptIndex + 1}) in ${delay}ms...`);
      return delay;
    },
    // Use cached data while revalidating on error
    placeholderData: (previousData) => previousData,
  });

  /**
   * Prefetch artist preview data
   * @param {string} artistId - The ID of the artist to prefetch
   */
  const prefetch = (artistId) => {
    if (!artistId) return;
    
    queryClient.prefetchQuery({
      queryKey: ['artistPreview', artistId],
      queryFn: async () => {
        const headers = { 
          Authorization: `Bearer ${localStorage.getItem('auth_token')}` 
        };
        
        const response = await http.get(
          `/api/users/${artistId}/mini-preview`,
          { 
            headers,
            dedupeKey: `artist-preview:${artistId}`
          }
        );
        
        return response?.data?.data || response?.data;
      },
      staleTime: 30000,
    });
  };

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error,
    errorCode: query.error?.code,
    refetch: query.refetch,
    prefetch,
  };
}
