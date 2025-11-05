import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, TrendingUp, Zap, Filter, Loader2 } from 'lucide-react';
import heroBg from '../assets/hero-bg.png';
import '../styles/Home.css';

export default function Home() {
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [sortBy, setSortBy] = useState('trending');
  const [artworks, setArtworks] = useState([]);
  const [categories, setCategories] = useState(['All']);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

  // Fetch artworks from backend
  const fetchArtworks = async (reset = false) => {
    try {
      setLoading(true);
      const currentPage = reset ? 1 : page;
      
      const params = new URLSearchParams({
        page: currentPage,
        limit: 12,
        category: selectedCategory === 'all' ? '' : selectedCategory,
        sortBy: sortBy,
        status: 'approved' // Only show approved artworks on home page
      });

      console.log('Fetching artworks from:', `${API_URL}/api/artworks?${params}`);
      const response = await fetch(`${API_URL}/api/artworks?${params}`);
      
      if (!response.ok) {
        console.error('Artworks API error:', response.status, response.statusText);
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Artworks API response:', data);
      
      // Handle different response structures
      let artworksArray = [];
      if (data.success && data.artworks) {
        artworksArray = data.artworks;
      } else if (data.success && data.data) {
        artworksArray = data.data;
      } else if (Array.isArray(data)) {
        artworksArray = data;
      } else if (data.artworks) {
        artworksArray = data.artworks;
      } else {
        console.warn('Unexpected response structure:', data);
        artworksArray = [];
      }
      
      if (reset) {
        setArtworks(artworksArray);
        setPage(2);
      } else {
        setArtworks(prev => [...prev, ...artworksArray]);
        setPage(prev => prev + 1);
      }
      
      setHasMore(artworksArray.length === 12); // If we got less than 12, no more pages
      
    } catch (error) {
      console.error('Error fetching artworks:', error);
      setError(error.message);
      
      // Set empty array on error to prevent undefined issues
      if (reset) {
        setArtworks([]);
      }
    } finally {
      setLoading(false);
    }
  };

  // Fetch categories from backend
  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_URL}/api/artworks/categories`);
      
      if (response.ok) {
        const data = await response.json();
        
        // Handle different response structures for categories
        let categoriesArray = [];
        if (data.success && data.categories) {
          categoriesArray = data.categories;
        } else if (Array.isArray(data)) {
          categoriesArray = data;
        } else if (data.categories) {
          categoriesArray = data.categories;
        }
        
        if (categoriesArray.length > 0) {
          setCategories(['All', ...categoriesArray]);
        }
      } else {
        console.warn('Categories endpoint returned:', response.status);
        // Use fallback categories
        setCategories(['All', 'Digital', '3D Art', 'Abstract', 'Illustration', 'Portrait', 'Photography']);
      }
    } catch (error) {
      console.warn('Error fetching categories:', error.message);
      // Use fallback categories if API fails
      setCategories(['All', 'Digital', '3D Art', 'Abstract', 'Illustration', 'Portrait', 'Photography']);
    }
  };

  // Initial data fetch
  useEffect(() => {
    console.log('Home component mounted, fetching initial data...');
    fetchCategories();
    fetchArtworks(true);
  }, []);

  // Refetch when filters change
  useEffect(() => {
    if (artworks.length > 0) { // Only refetch if we have initial data
      fetchArtworks(true);
    }
  }, [selectedCategory, sortBy]);

  return (
    <div className="home-container">
      {/* Hero Section */}
      <section className="hero-section">
        <div
          className="hero-bg"
          style={{ backgroundImage: `url(${heroBg})` }}
        />
        <div className="hero-overlay" />
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles className="icon" />
            <span>AI-Powered Art Recognition</span>
          </div>
          <h1 className="hero-title">
            Discover Extraordinary <br />
            <span>Digital Artworks</span>
          </h1>
          <p className="hero-subtext">
            Where creativity meets technology. Explore, purchase, and showcase AI-verified artwork
            from talented artists worldwide.
          </p>
          <div className="hero-buttons">
            <Link to="/gallery" className="btn-primary">
              <Zap className="icon" /> Explore Gallery
            </Link>
            <Link to="/upload" className="btn-outline">Upload Artwork</Link>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="filters-section">
        <div className="filters-bar">
          <div className="tabs">
            <button
              className={sortBy === 'trending' ? 'tab active' : 'tab'}
              onClick={() => setSortBy('trending')}
            >
              <TrendingUp className="icon" /> Trending
            </button>
            <button
              className={sortBy === 'latest' ? 'tab active' : 'tab'}
              onClick={() => setSortBy('latest')}
            >
              <Sparkles className="icon" /> Latest
            </button>
            <button
              className={sortBy === 'featured' ? 'tab active' : 'tab'}
              onClick={() => setSortBy('featured')}
            >
              <Zap className="icon" /> Featured
            </button>
          </div>

          <div className="dropdowns">
            <div className="dropdown">
              <Filter className="icon" />
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat.toLowerCase()}>{cat}</option>
                ))}
              </select>
            </div>

            <div className="dropdown">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                <option value="trending">Trending</option>
                <option value="price-low">Price: Low</option>
                <option value="price-high">Price: High</option>
                <option value="newest">Newest</option>
              </select>
            </div>
          </div>
        </div>

        <div className="category-pills">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category.toLowerCase())}
              className={`pill ${selectedCategory === category.toLowerCase() ? 'active' : ''}`}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      {/* Error State */}
      {error && (
        <section className="error-section">
          <div className="error-content">
            <p>Failed to load artworks: {error}</p>
            <button 
              className="btn-primary" 
              onClick={() => {
                setError(null);
                fetchArtworks(true);
              }}
            >
              Try Again
            </button>
          </div>
        </section>
      )}

      {/* Loading State */}
      {loading && artworks.length === 0 && (
        <section className="loading-section">
          <div className="loading-content">
            <Loader2 className="loading-spinner" />
            <p>Loading amazing artworks...</p>
          </div>
        </section>
      )}

      {/* Artwork Grid */}
      {!error && artworks.length > 0 && (
        <section className="artwork-grid">
          {artworks.map((artwork, index) => (
            <div
              key={artwork._id || artwork.id}
              className="art-card"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="art-img">
                <img 
                  src={artwork.imageUrl || artwork.image} 
                  alt={artwork.title}
                  onError={(e) => {
                    e.target.src = 'https://via.placeholder.com/400x300?text=Image+Not+Found';
                  }}
                />
                {artwork.aiScore && (
                  <div className="ai-badge">AI {artwork.aiScore}%</div>
                )}
                <div className="category-badge">{artwork.category}</div>
              </div>
              <div className="art-info">
                <h3>{artwork.title}</h3>
                <p>{artwork.artist?.name || artwork.artist?.username || 'Unknown Artist'}</p>
                <div className="art-footer">
                  <span>${artwork.price || 'N/A'}</span>
                  <span>{artwork.likes || 0} ❤️</span>
                </div>
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Empty State */}
      {!loading && !error && artworks.length === 0 && (
        <section className="empty-section">
          <div className="empty-content">
            <Sparkles className="empty-icon" />
            <h3>No artworks found</h3>
            <p>Try adjusting your filters or check back later for new uploads.</p>
            <Link to="/upload" className="btn-primary">
              Upload First Artwork
            </Link>
          </div>
        </section>
      )}

      {/* Load More Button */}
      {!loading && !error && artworks.length > 0 && hasMore && (
        <div className="load-more">
          <button 
            className="btn-outline"
            onClick={() => fetchArtworks(false)}
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="loading-spinner" />
                Loading...
              </>
            ) : (
              'Load More Artworks'
            )}
          </button>
        </div>
      )}
    </div>
  );
}
