import { useEffect, useRef } from 'react';

/**
 * Custom hook for observing element intersection with viewport
 * @param {Function} callback - Function to call when element intersects
 * @param {Object} options - IntersectionObserver options
 * @returns {Object} - Ref to attach to observed element
 */
export function useIntersectionObserver(callback, options = {}) {
  const elementRef = useRef(null);
  const observerRef = useRef(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    const defaultOptions = {
      root: null,
      rootMargin: '100px',
      threshold: 0.1,
      ...options,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry);
        }
      });
    }, defaultOptions);

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current && element) {
        observerRef.current.unobserve(element);
        observerRef.current.disconnect();
      }
    };
  }, [callback, options.root, options.rootMargin, options.threshold]);

  return elementRef;
}

/**
 * Hook for prefetching artist preview data when cards enter viewport
 * @param {Array} artists - Array of artist objects
 * @param {Function} prefetchFn - Function to prefetch data for an artist
 */
export function useArtistPrefetch(artists, prefetchFn) {
  const observerRef = useRef(null);
  const prefetchedRef = useRef(new Set());

  useEffect(() => {
    if (!artists || artists.length === 0) return;

    const options = {
      root: null,
      rootMargin: '100px', // Start prefetching 100px before element enters viewport
      threshold: 0.1,
    };

    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const artistId = entry.target.dataset.artistId;
          
          // Only prefetch if we haven't already
          if (artistId && !prefetchedRef.current.has(artistId)) {
            prefetchedRef.current.add(artistId);
            prefetchFn(artistId);
          }
        }
      });
    }, options);

    // Observe all artist cards
    const cards = document.querySelectorAll('[data-artist-id]');
    cards.forEach((card) => {
      observerRef.current.observe(card);
    });

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [artists, prefetchFn]);

  return observerRef;
}
