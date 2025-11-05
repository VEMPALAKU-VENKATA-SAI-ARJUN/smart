import { useEffect, useState, useRef, useCallback } from 'react';
import { AlertCircle, RefreshCw } from 'lucide-react';
import ArtworkCard from './ArtworkCard';
import axios from 'axios';
import http from '../lib/http';

export default function ArtworkGrid({ filters = {}, limit = null }) {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const observer = useRef();

  const lastArtworkRef = useCallback(node => {
    if (loading) return;
    if (observer.current) observer.current.disconnect();
    
    observer.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore && !limit) {
        setPage(prevPage => prevPage + 1);
      }
    });
    
    if (node) observer.current.observe(node);
  }, [loading, hasMore, limit]);

  useEffect(() => {
    const controller = new AbortController();
    setPage(1);
    setArtworks([]);
    setError('');
    fetchArtworks(1, controller.signal);
    return () => controller.abort();
  }, [filters]);

  useEffect(() => {
    if (page > 1) {
      const controller = new AbortController();
      fetchArtworks(page, controller.signal);
      return () => controller.abort();
    }
  }, [page]);

  const fetchArtworks = async (currentPage = 1, signal) => {
    try {
      setLoading(true);
      setError('');
      
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const paramsObj = { 
        page: currentPage, 
        limit: limit || 20, 
        ...filters,
        tags: Array.isArray(filters.tags) ? filters.tags.join(',') : filters.tags
      };
      const params = new URLSearchParams(paramsObj).toString();

      const dedupeKey = `artworks:${currentPage}:${JSON.stringify(paramsObj)}`;
      const resp = await http.get(`/api/artworks?${params}`, { signal, dedupeKey });
      const res = resp?.data ?? null;

      const newArtworks = Array.isArray(res)
        ? res
        : res?.data || res?.artworks || [];

      const pagination = res?.pagination || {};
      const totalPages = pagination.pages || 1;

      setArtworks(prev => currentPage === 1 ? newArtworks : [...prev, ...newArtworks]);
      setHasMore(currentPage < totalPages && !limit);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Failed to fetch artworks:', error);
      setError('Failed to load artworks. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRetry = () => {
    setError('');
    setPage(1);
    setArtworks([]);
    fetchArtworks(1);
  };

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <div className="card-body text-center">
            <AlertCircle size={48} className="text-error-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Something went wrong
            </h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button onClick={handleRetry} className="btn btn-primary">
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (artworks.length === 0 && !loading) {
    return (
      <div className="text-center py-12">
        <div className="card max-w-md mx-auto">
          <div className="card-body text-center">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              No artworks found
            </h3>
            <p className="text-gray-600">
              Try adjusting your search filters or check back later for new content.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {artworks.map((artwork, index) => (
          <div
            key={artwork._id}
            ref={index === artworks.length - 1 ? lastArtworkRef : null}
            className="animate-fade-in"
            style={{ animationDelay: `${index * 50}ms` }}
          >
            <ArtworkCard artwork={artwork} />
          </div>
        ))}
      </div>

      {/* Loading State */}
      {loading && (
        <div className="flex justify-center py-8">
          <div className="flex items-center gap-3 text-gray-600">
            <div className="loading"></div>
            <span className="text-sm font-medium">Loading more artworks...</span>
          </div>
        </div>
      )}

      {/* Load More Button for limited grids */}
      {limit && hasMore && !loading && (
        <div className="text-center">
          <button 
            onClick={() => setPage(prev => prev + 1)}
            className="btn btn-secondary"
          >
            Load More Artworks
          </button>
        </div>
      )}
    </div>
  );
}
