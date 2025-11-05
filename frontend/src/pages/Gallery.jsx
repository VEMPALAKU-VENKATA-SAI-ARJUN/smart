import { useState, useEffect, useCallback, useRef } from 'react';
import { Search, Grid, List, SlidersHorizontal, X } from 'lucide-react';
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

  // ==== De-duplication / lifecycle guards ====
  const didInitRef = useRef(false);              // run initial fetch exactly once per mount
  const lastUserIdRef = useRef(null);            // re-init only when user actually changes
  const lastFetchedPageRef = useRef(null);       // prevent fetching same page twice
  const inFlightRef = useRef(false);             // prevent parallel fetches
  const reqIdRef = useRef(0);                    // ignore stale responses

  /** ==========================
   * INITIAL LOAD
   =========================== */
  useEffect(() => {
    const controller = new AbortController();

    // Always get static metadata
    fetchCategories(controller.signal);
    fetchPopularTags(controller.signal);

    // Initialize results:
    // - First mount without user
    // - Or when user really changes (id differs)
    const userId = user?.id || user?._id || null;

    if (!didInitRef.current || lastUserIdRef.current !== userId) {
      didInitRef.current = true;
      lastUserIdRef.current = userId;

      if (user) {
        fetchUserPreferences(controller.signal);
      }
      // Fresh initial fetch
      resetAndFetch();
    }

    return () => controller.abort();
  }, [user]); // keep as [user]; guarded by refs inside

  /** ==========================
   * FETCH FUNCTIONS
   =========================== */
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
      const [likesRes, wishlistRes] = await Promise.all([
        http.get('/api/artworks/user/liked', { signal, headers }),
        http.get('/api/artworks/user/wishlist', { signal, headers }),
      ]);

      if (likesRes?.data?.success)
        setUserLikes(new Set((likesRes.data.data || []).map((a) => a._id)));

      if (wishlistRes?.data?.success)
        setUserWishlist(new Set((wishlistRes.data.data || []).map((a) => a._id)));
    } catch (error) {
      if (error.name !== 'AbortError') console.error('Error fetching user preferences:', error);
    }
  };

  /** ==========================
   * MAIN FETCH (Artworks)
   =========================== */
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
  console.log('Fetching artworks, reqId:', myReqId);

  try {
    const userId = user?.id || user?._id || null;

    const paramsObj = {
      page: pageNum,
      limit: 20,
      ...customFilters,
      tags: Array.isArray(customFilters.tags)
        ? customFilters.tags.join(',')
        : customFilters.tags,
    };
    if (userId) paramsObj.artist = userId;

    const params = new URLSearchParams(paramsObj).toString();

    const resp = await http.get(`/api/artworks?${params}`, { signal });
    console.log('Received artworks response, reqId:', myReqId, resp);

    if (myReqId !== reqIdRef.current) return;

    // ✅ resp is already the backend JSON, no extra .data nesting
    const newArtworks = resp?.data || [];

    console.log('✅ Extracted artworks array length:', newArtworks.length);

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
    lastFetchedPageRef.current = null; // allow page=1 fetch again
    fetchArtworks(1, true, customFilters);
  };

  /** ==========================
   * FILTER HANDLERS
   =========================== */
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

  /** ==========================
   * INTERACTION HANDLERS
   =========================== */
  const handleLike = async (artworkId) => {
    if (!user) return;
    const newLikes = new Set(userLikes);
    if (newLikes.has(artworkId)) newLikes.delete(artworkId);
    else newLikes.add(artworkId);
    setUserLikes(newLikes);

    setArtworks((prev) =>
      prev.map((a) =>
        a._id === artworkId
          ? {
              ...a,
              stats: {
                ...a.stats,
                likes: newLikes.has(artworkId)
                  ? (a.stats?.likes || 0) + 1
                  : Math.max(0, (a.stats?.likes || 0) - 1),
              },
            }
          : a
      )
    );
  };

  const handleWishlist = async (artworkId) => {
    if (!user) return;
    const newWishlist = new Set(userWishlist);
    if (newWishlist.has(artworkId)) newWishlist.delete(artworkId);
    else newWishlist.add(artworkId);
    setUserWishlist(newWishlist);
  };

  /** ==========================
   * INFINITE SCROLL
   =========================== */
  const handleLoadMore = useCallback(() => {
    if (!loading && hasMore) {
      // will be skipped if same page already fetched (guarded above)
      fetchArtworks(page);
    }
  }, [loading, hasMore, page]);

  /** ==========================
   * RENDER
   =========================== */
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
            {artworks.map((artwork) => (
              <ArtworkCard
                key={artwork._id}
                artwork={artwork}
                onLike={handleLike}
                onAddToWishlist={handleWishlist}
                isLiked={userLikes.has(artwork._id)}
                isInWishlist={userWishlist.has(artwork._id)}
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
    </div>
  );
};

export default Gallery;
