import { useState, useEffect, useCallback, useRef } from 'react';
import { Loader2 } from 'lucide-react';

const InfiniteScroll = ({
  children,
  hasMore = true,
  loadMore,
  loading = false,
  threshold = 100,
  className = '',
  loader = null,
  endMessage = null
}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const loadingRef = useRef(null);
  const observerRef = useRef(null);

  const handleObserver = useCallback((entries) => {
    const [target] = entries;
    setIsIntersecting(target.isIntersecting);
  }, []);

  useEffect(() => {
    const element = loadingRef.current;
    if (!element) return;

    observerRef.current = new IntersectionObserver(handleObserver, {
      threshold: 0,
      rootMargin: `${threshold}px`
    });

    observerRef.current.observe(element);

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [handleObserver, threshold]);

  useEffect(() => {
    if (isIntersecting && hasMore && !loading) {
      loadMore();
    }
  }, [isIntersecting, hasMore, loading, loadMore]);

  const defaultLoader = (
    <div className="infinite-scroll-loader">
      <Loader2 className="animate-spin" size={32} />
      <span>Loading more...</span>
    </div>
  );

  const defaultEndMessage = (
    <div className="infinite-scroll-end">
      <span>You've reached the end!</span>
    </div>
  );

  return (
    <div className={`infinite-scroll-container ${className}`}>
      {children}
      
      <div ref={loadingRef} className="infinite-scroll-trigger">
        {loading && (loader || defaultLoader)}
        {!hasMore && !loading && (endMessage || defaultEndMessage)}
      </div>
    </div>
  );
};

export default InfiniteScroll;