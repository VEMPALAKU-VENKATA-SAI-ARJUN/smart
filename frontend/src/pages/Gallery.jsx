import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Grid, List, SlidersHorizontal, X, ChevronLeft, ChevronRight, Heart, Share2, ShoppingCart, Star, Send } from 'lucide-react';
import http from '../lib/http';
import ArtworkCard from '../components/ArtworkCard';
import InfiniteScroll from '../components/InfiniteScroll';
import { useAuth } from '../contexts/AuthContext';
import '../styles/Gallery.css';

const Gallery = () => {
  const { user } = useAuth();

  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState('grid');
  const [showFilters, setShowFilters] = useState(false);

  // Modal states
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [reviews, setReviews] = useState([]);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [loadingReviews, setLoadingReviews] = useState(false);
  const [submittingReview, setSubmittingReview] = useState(false);

  // Filters
  const [filters, setFilters] = useState({
    search: '',
    category: '',
    minPrice: '',
    maxPrice: '',
    tags: [],
    sortBy: 'createdAt',
    order: 'desc',
  });

  const [categories, setCategories] = useState([]);
  const [popularTags, setPopularTags] = useState([]);
  const [userLikes, setUserLikes] = useState(new Set());
  const [userWishlist, setUserWishlist] = useState(new Set());

  // Debounced search
  const [searchTerm, setSearchTerm] = useState('');
  const [searchTimeout, setSearchTimeout] = useState(null);

  // De-duplication / lifecycle guards
  const didInitRef = useRef(false);
  const lastUserIdRef = useRef(null);
  const lastFetchedPageRef = useRef(null);
  const inFlightRef = useRef(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    const controller = new AbortController();

    fetchCategories(controller.signal);
    fetchPopularTags(controller.signal);

    const userId = user?.id || user?._id || null;

    if (!didInitRef.current || lastUserIdRef.current !== userId) {
      didInitRef.current = true;
      lastUserIdRef.current = userId;

      if (user) {
        fetchUserPreferences(controller.signal);
      }
      resetAndFetch();
    }

    return () => controller.abort();
  }, [user]);

  // Keyboard navigation for modal
  useEffect(() => {
    if (!selectedArtwork) return;

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        closeModal();
      } else if (e.key === 'ArrowLeft') {
        navigatePrevious();
      } else if (e.key === 'ArrowRight') {
        navigateNext();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedArtwork, selectedIndex]);

  const fetchCategories = async (signal) => {
    try {
      const resp = await http.get('/api/artworks/categories', { signal });
      if (resp?.data?.success) setCategories(resp.data.data || []);
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error fetching categories:', error);
    }
  };

  const fetchPopularTags = async (signal) => {
    try {
      const resp = await http.get('/api/artworks/popular-tags', { signal });
      if (resp?.data?.success) setPopularTags(resp.data.data || []);
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error fetching popular tags:', error);
    }
  };

  const fetchUserPreferences = async (signal) => {
    try {
      const token = localStorage.getItem('auth_token');
      if (!token) return;

      const headers = { Authorization: `Bearer ${token}` };
      const wishlistRes = await http.get('/api/artworks/user/wishlist', { signal, headers });

      if (wishlistRes?.data?.success)
        setUserWishlist(new Set((wishlistRes.data.data || []).map((a) => a._id)));
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error fetching user preferences:', error);
    }
  };

  // Fixed fetchArtworks function - remove the artist filter that's limiting results

const fetchArtworks = async (
  pageNum = page,
  reset = false,
  customFilters = filters,
  signal
) => {
  if (inFlightRef.current || loading) return;
  inFlightRef.current = true;
  setLoading(true);
  lastFetchedPageRef.current = pageNum;

  const myReqId = ++reqIdRef.current;

  try {
    const paramsObj = {
      page: pageNum,
      limit: 20,
      ...customFilters,
      tags: Array.isArray(customFilters.tags)
        ? customFilters.tags.join(',')
        : customFilters.tags,
    };
    
    const params = new URLSearchParams(paramsObj).toString();

    const resp = await http.get(`/api/artworks?${params}`, { signal });

    if (myReqId !== reqIdRef.current) return;

    const newArtworks = resp?.data?.data || resp?.data || [];
    
    console.log('🎨 Fetched artworks:', newArtworks.length);
    console.log('🎨 First artwork isLikedByCurrentUser:', newArtworks[0]?.isLikedByCurrentUser);
    console.log('🎨 User:', user ? user.username : 'Not logged in');

    // ✅ Initialize userLikes from isLikedByCurrentUser field
    if (reset && user) {
      const likedIds = new Set();
      newArtworks.forEach(artwork => {
        if (artwork.isLikedByCurrentUser) {
          likedIds.add(artwork._id);
        }
      });
      console.log('🎨 Setting liked IDs (reset):', Array.from(likedIds));
      setUserLikes(likedIds);
    } else if (user) {
      setUserLikes(prev => {
        const updated = new Set(prev);
        newArtworks.forEach(artwork => {
          if (artwork.isLikedByCurrentUser) {
            updated.add(artwork._id);
          }
        });
        console.log('🎨 Updating liked IDs:', Array.from(updated));
        return updated;
      });
    }

    setArtworks(prev => (reset ? newArtworks : [...prev, ...newArtworks]));
    setHasMore(newArtworks.length === 20);

    if (!reset) setPage(pageNum + 1);
  } catch (error) {
    if (error.name !== 'AbortError') console.error('Error fetching artworks:', error);
  } finally {
    if (myReqId === reqIdRef.current) {
      setLoading(false);
      inFlightRef.current = false;
    }
  }
  
};



  const resetAndFetch = (customFilters = filters) => {
    setArtworks([]);
    setPage(1);
    setHasMore(true);
    lastFetchedPageRef.current = null;
    fetchArtworks(1, true, customFilters);
  };

  const handleSearchChange = (value) => {
    setSearchTerm(value);
    if (searchTimeout) clearTimeout(searchTimeout);

    const timeout = setTimeout(() => {
      const updatedFilters = { ...filters, search: value };
      setFilters(updatedFilters);
      resetAndFetch(updatedFilters);
    }, 500);

    setSearchTimeout(timeout);
  };

  const handleFilterChange = (key, value) => {
    const updatedFilters = { ...filters, [key]: value };
    setFilters(updatedFilters);
    resetAndFetch(updatedFilters);
  };

  const handleTagToggle = (tag) => {
    const updatedFilters = {
      ...filters,
      tags: filters.tags.includes(tag)
        ? filters.tags.filter((t) => t !== tag)
        : [...filters.tags, tag],
    };
    setFilters(updatedFilters);
    resetAndFetch(updatedFilters);
  };

  const clearFilters = () => {
    const cleared = {
      search: '',
      category: '',
      minPrice: '',
      maxPrice: '',
      tags: [],
      sortBy: 'createdAt',
      order: 'desc',
    };
    setFilters(cleared);
    setSearchTerm('');
    resetAndFetch(cleared);
  };

  const handleLike = async (artworkId) => {
    if (!user) return;
    
    const wasLiked = userLikes.has(artworkId);
    
    // ✅ Optimistic UI update
    const newLikes = new Set(userLikes);
    if (wasLiked) {
      newLikes.delete(artworkId);
    } else {
      newLikes.add(artworkId);
    }
    setUserLikes(newLikes);

    // Update artwork in list
    setArtworks((prev) =>
      prev.map((a) =>
        a._id === artworkId
          ? {
              ...a,
              isLikedByCurrentUser: !wasLiked,
              stats: {
                ...a.stats,
                likes: wasLiked
                  ? Math.max(0, (a.stats?.likes || 0) - 1)
                  : (a.stats?.likes || 0) + 1,
              },
            }
          : a
      )
    );

    // Update selected artwork if open
    if (selectedArtwork?._id === artworkId) {
      setSelectedArtwork(prev => ({
        ...prev,
        isLikedByCurrentUser: !wasLiked,
        stats: {
          ...prev.stats,
          likes: wasLiked
            ? Math.max(0, (prev.stats?.likes || 0) - 1)
            : (prev.stats?.likes || 0) + 1,
        },
      }));
    }

    try {
      const token = localStorage.getItem('auth_token');
      const response = await http.post(`/api/artworks/${artworkId}/like`, null, {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });

      // ✅ Sync with server response
      if (response?.data?.success) {
        const { liked, likesCount } = response.data;
        
        // Update state with server truth
        const serverLikes = new Set(userLikes);
        if (liked) {
          serverLikes.add(artworkId);
        } else {
          serverLikes.delete(artworkId);
        }
        setUserLikes(serverLikes);

        // Update artwork counts with server data
        setArtworks((prev) =>
          prev.map((a) =>
            a._id === artworkId
              ? {
                  ...a,
                  isLikedByCurrentUser: liked,
                  stats: { ...a.stats, likes: likesCount },
                }
              : a
          )
        );

        if (selectedArtwork?._id === artworkId) {
          setSelectedArtwork(prev => ({
            ...prev,
            isLikedByCurrentUser: liked,
            stats: { ...prev.stats, likes: likesCount },
          }));
        }
      }
    } catch (error) {
      console.error('Failed to update like:', error);
      // ✅ Revert on error
      setUserLikes(wasLiked ? new Set([...userLikes, artworkId]) : new Set([...userLikes].filter(id => id !== artworkId)));
    }
  };

  const handleWishlist = async (artworkId) => {
    if (!user) return;
    const newWishlist = new Set(userWishlist);
    if (newWishlist.has(artworkId)) newWishlist.delete(artworkId);
    else newWishlist.add(artworkId);
    setUserWishlist(newWishlist);
  };

  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      fetchArtworks(page);
    }
  }, [loading, hasMore, page]);

  // Modal functions
  const openModal = (artwork, index) => {
    setSelectedArtwork(artwork);
    setSelectedIndex(index);
    fetchReviews(artwork._id);
    document.body.style.overflow = 'hidden';
  };

  const closeModal = () => {
    setSelectedArtwork(null);
    setSelectedIndex(-1);
    setReviews([]);
    setNewReview({ rating: 5, comment: '' });
    document.body.style.overflow = 'unset';
  };

  const navigateNext = () => {
    if (selectedIndex < artworks.length - 1) {
      const nextIndex = selectedIndex + 1;
      const nextArtwork = artworks[nextIndex];
      setSelectedArtwork(nextArtwork);
      setSelectedIndex(nextIndex);
      fetchReviews(nextArtwork._id);
    }
  };

  const navigatePrevious = () => {
    if (selectedIndex > 0) {
      const prevIndex = selectedIndex - 1;
      const prevArtwork = artworks[prevIndex];
      setSelectedArtwork(prevArtwork);
      setSelectedIndex(prevIndex);
      fetchReviews(prevArtwork._id);
    }
  };

  const fetchReviews = async (artworkId) => {
    setLoadingReviews(true);
    try {
      const data = await http.get(`/api/artworks/${artworkId}/reviews`);
      console.log('📋 Reviews data:', data);
      console.log('📋 Reviews items:', data?.items);
      console.log('📋 Reviews count:', data?.items?.length);
      if (data?.success) {
        const reviewsData = data.items || [];
        console.log('📋 Setting reviews:', reviewsData);
        setReviews(reviewsData);
      } else {
        console.log('⚠️ Response not successful');
        setReviews([]);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
      setReviews([]);
    } finally {
      setLoadingReviews(false);
    }
  };

  const handleSubmitReview = async (e) => {
    e.preventDefault();
    if (!user || !selectedArtwork || !newReview.comment.trim()) return;

    setSubmittingReview(true);
    try {
      const token = localStorage.getItem('auth_token');
      const resp = await http.post(
        `/api/artworks/${selectedArtwork._id}/reviews`,
        {
          rating: newReview.rating,
          comment: newReview.comment.trim(),
        },
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }
      );

      if (resp?.data?.success) {
        setReviews(prev => [resp.data.data, ...prev]);
        setNewReview({ rating: 5, comment: '' });
      }
    } catch (error) {
      console.error('Error submitting review:', error);
      alert('Failed to submit review. Please try again.');
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleShare = async (artwork) => {
    const url = `${window.location.origin}/artwork/${artwork._id}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: artwork.title,
          text: `Check out "${artwork.title}" by ${artwork.artist?.username}`,
          url: url,
        });
      } catch (error) {
        if (error.name !== 'AbortError') {
          copyToClipboard(url);
        }
      }
    } else {
      copyToClipboard(url);
    }
  };

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text).then(() => {
      alert('Link copied to clipboard!');
    });
  };

  return (
    <div className="gallery-page">
      {/* Header */}
      <div className="gallery-header">
        <div className="header-content">
          <h1>Art Gallery</h1>
          <p>Discover amazing artworks from talented artists around the world</p>
        </div>
      </div>

      {/* Search + Filters */}
      <div className="gallery-controls">
        <div className="controls-container">
          <div className="search-section">
            <div className="search-bar">
              <Search className="search-icon" size={20} />
              <input
                type="text"
                placeholder="Search artworks, artists, or tags..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button className="clear-search" onClick={() => handleSearchChange('')}>
                  <X size={16} />
                </button>
              )}
            </div>
          </div>

          <div className="gallery-actions">
            <button
              className={`filter-toggle ${showFilters ? 'active' : ''}`}
              onClick={() => setShowFilters(!showFilters)}
            >
              <SlidersHorizontal size={18} />
              Filters
            </button>

            <div className="view-controls">
              <button
                className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
                onClick={() => setViewMode('grid')}
              >
                <Grid size={18} />
              </button>
              <button
                className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </button>
            </div>
          </div>
        </div>

        {/* Filter Panel */}
        {showFilters && (
          <div className="filters-panel">
            <div className="filters-content">
              <div className="filter-section">
                <h4>Category</h4>
                <select
                  value={filters.category}
                  onChange={(e) => handleFilterChange('category', e.target.value)}
                  className="filter-select"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.name} ({cat.count})
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-section">
                <h4>Price Range</h4>
                <div className="price-inputs">
                  <input
                    type="number"
                    placeholder="Min"
                    value={filters.minPrice}
                    onChange={(e) => handleFilterChange('minPrice', e.target.value)}
                    className="price-input"
                  />
                  <span>to</span>
                  <input
                    type="number"
                    placeholder="Max"
                    value={filters.maxPrice}
                    onChange={(e) => handleFilterChange('maxPrice', e.target.value)}
                    className="price-input"
                  />
                </div>
              </div>

              <div className="filter-section">
                <h4>Sort By</h4>
                <div className="sort-controls">
                  <select
                    value={filters.sortBy}
                    onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                    className="filter-select"
                  >
                    <option value="createdAt">Date Created</option>
                    <option value="price">Price</option>
                    <option value="stats.views">Views</option>
                    <option value="stats.likes">Likes</option>
                    <option value="title">Title</option>
                  </select>
                  <select
                    value={filters.order}
                    onChange={(e) => handleFilterChange('order', e.target.value)}
                    className="filter-select"
                  >
                    <option value="desc">Descending</option>
                    <option value="asc">Ascending</option>
                  </select>
                </div>
              </div>

              <div className="filter-section">
                <h4>Popular Tags</h4>
                <div className="tags-grid">
                  {popularTags.slice(0, 12).map((tag) => (
                    <button
                      key={tag}
                      className={`tag-btn ${filters.tags.includes(tag) ? 'active' : ''}`}
                      onClick={() => handleTagToggle(tag)}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>
              </div>

              <div className="filter-actions">
                <button className="clear-filters-btn" onClick={clearFilters}>
                  Clear All Filters
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Results */}
      <div className="gallery-content">
        <div className="results-header">
          <span className="results-count">{artworks.length} artworks found</span>
        </div>

        <InfiniteScroll
          hasMore={hasMore}
          loadMore={handleLoadMore}
          loading={loading}
          className={`artworks-container ${viewMode}`}
        >
          <div className={`artworks-grid ${viewMode}`}>
            {artworks.map((artwork, index) => (
            <ArtworkCard
              key={artwork._id}
              artwork={artwork}
              onLike={handleLike}
              onAddToWishlist={handleWishlist}
              isLiked={userLikes.has(artwork._id)}
              isInWishlist={userWishlist.has(artwork._id)}
              currentUser={user}
              onClick={() => openModal(artwork, index)} // ✅ add this
            />

            ))}
          </div>
        </InfiniteScroll>

        {!loading && artworks.length === 0 && (
          <div className="empty-state">
            <div className="empty-content">
              <Search size={64} className="empty-icon" />
              <h3>No artworks found</h3>
              <p>Try adjusting your search criteria or filters</p>
              <button className="clear-filters-btn" onClick={clearFilters}>
                Clear Filters
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Artwork Modal */}
      {selectedArtwork && (
        <div className="artwork-modal-overlay" onClick={closeModal}>
          <div className="artwork-modal" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={closeModal}>
              <X size={24} />
            </button>

            {/* Navigation Buttons */}
            {selectedIndex > 0 && (
              <button className="modal-nav modal-nav-prev" onClick={navigatePrevious}>
                <ChevronLeft size={32} />
              </button>
            )}
            {selectedIndex < artworks.length - 1 && (
              <button className="modal-nav modal-nav-next" onClick={navigateNext}>
                <ChevronRight size={32} />
              </button>
            )}

            <div className="modal-content-wrapper">
              {/* Image Section */}
              <div className="modal-image-section">
                <img
                  src={
                    selectedArtwork.imageUrl ||
                    selectedArtwork.thumbnail ||
                    selectedArtwork.images?.[0]?.url ||
                    '/default-artwork.png'
                  }
                  alt={selectedArtwork.title}
                  className="modal-image"
                />
              </div>

              {/* Details Section */}
              <div className="modal-details-section">
                <div className="modal-header">
                  <div className="modal-title-section">
                    <h2 className="modal-title">{selectedArtwork.title}</h2>
                    <p className="modal-artist">
                      by {selectedArtwork.artist?.username || 'Unknown Artist'}
                    </p>
                  </div>
                  <div className="modal-price">
                    ₹{selectedArtwork.price?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="modal-actions">
                  {/* ❤️ Like button */}
                  <button
                    className={`modal-action-like ${userLikes.has(selectedArtwork._id) ? 'active' : ''}`}
                    onClick={() => handleLike(selectedArtwork._id)}
                    disabled={selectedArtwork.isSold}
                  >
                    <Heart size={20} fill={userLikes.has(selectedArtwork._id) ? 'currentColor' : 'none'} />
                    <span>{selectedArtwork.stats?.likes || 0}</span>
                  </button>

                  {/* 🔗 Share button */}
                  <button
                    className="modal-action-btn"
                    onClick={() => handleShare(selectedArtwork)}
                  >
                    <Share2 size={20} />
                    <span>Share</span>
                  </button>

                  {/* 💰 Buy or Sold */}
                  {selectedArtwork.isSold ? (
                    <div className="sold-badge-modal">SOLD</div>
                  ) : (
                    <button
                      className="modal-action-btn buy-now-btn"
                      onClick={() => handleBuy(selectedArtwork._id)}
                    >
                      <ShoppingCart size={20} />
                      <span>Buy Now</span>
                    </button>
                  )}
                </div>



                {/* Description */}
                <div className="modal-description">
                  <h3>Description</h3>
                  <p>{selectedArtwork.description || 'No description available.'}</p>
                </div>

                {/* Tags */}
                {selectedArtwork.tags && selectedArtwork.tags.length > 0 && (
                  <div className="modal-tags">
                    <h3>Tags</h3>
                    <div className="modal-tags-list">
                      {selectedArtwork.tags.map((tag, idx) => (
                        <span key={idx} className="modal-tag">#{tag}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Reviews Section */}
                <div className="modal-reviews">
                  <h3>Reviews & Ratings ({reviews.length})</h3>

                  {/* Overall Rating */}
                  {selectedArtwork.ratingAvg > 0 && (
                    <div className="overall-rating-display">
                      <div className="rating-stars-display">
                        {[1, 2, 3, 4, 5].map((star) => (
                          <Star
                            key={star}
                            size={20}
                            fill={star <= Math.round(selectedArtwork.ratingAvg) ? 'currentColor' : 'none'}
                            className={star <= Math.round(selectedArtwork.ratingAvg) ? 'star-filled' : 'star-empty'}
                          />
                        ))}
                      </div>
                      <span className="rating-value-display">
                        {selectedArtwork.ratingAvg.toFixed(1)} out of 5
                      </span>
                    </div>
                  )}

                  {/* Reviews List */}
                  <div className="reviews-list">
                    {loadingReviews ? (
                      <div className="reviews-loading">Loading reviews...</div>
                    ) : reviews.length === 0 ? (
                      <div className="reviews-empty">No reviews yet</div>
                    ) : (
                      reviews.map((review) => (
                        <div key={review._id} className="review-item">
                          <div className="review-header">
                            <div className="review-user">
                              <div className="review-avatar">
                                {review.reviewer?.profile?.avatar ? (
                                  <img src={review.reviewer.profile.avatar} alt={review.reviewer.username} />
                                ) : (
                                  review.reviewer?.username?.charAt(0).toUpperCase() || 'U'
                                )}
                              </div>
                              <div className="review-user-info">
                                <span className="review-username">{review.reviewer?.username || 'Anonymous'}</span>
                                <span className="review-date">
                                  {new Date(review.createdAt).toLocaleDateString()}
                                </span>
                              </div>
                            </div>
                            <div className="review-rating-display">
                              {[1, 2, 3, 4, 5].map((star) => (
                                <Star
                                  key={star}
                                  size={16}
                                  fill={review.rating >= star ? 'currentColor' : 'none'}
                                  className={review.rating >= star ? 'star-filled' : 'star-empty'}
                                />
                              ))}
                            </div>
                          </div>
                          {review.recommendation && (
                            <div className={`review-recommendation badge-${review.recommendation}`}>
                              {review.recommendation === 'approve' && '✓ Approved'}
                              {review.recommendation === 'revise' && '⚠ Needs Revision'}
                              {review.recommendation === 'reject' && '✗ Rejected'}
                            </div>
                          )}
                          <p className="review-comment">{review.comment}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Gallery;