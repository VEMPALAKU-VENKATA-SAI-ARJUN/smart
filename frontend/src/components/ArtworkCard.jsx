import { useState } from 'react';
import { Heart, Eye, Share2, ShoppingCart, User, Star } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/ArtworkCard.css';

const ArtworkCard = ({ artwork, onLike, onAddToWishlist, isLiked = false, isInWishlist = false }) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatPrice = (price) => {
    if (price === 0) return 'Free';
    return `$${price.toLocaleString()}`;
  };

  const getBadgeColor = (badge) => {
    const colors = {
      trending: 'badge-trending',
      featured: 'badge-featured',
      new: 'badge-new',
      bestseller: 'badge-bestseller',
      'contest-winner': 'badge-contest'
    };
    return colors[badge] || 'badge-default';
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  return (
    <div className="artwork-card">
      {/* Image Container with Lazy Loading */}
      <div className="artwork-image-container">
        <Link to={`/artwork/${artwork._id}`}>
          {!imageLoaded && !imageError && (
            <div className="image-placeholder">
              <div className="loading-spinner"></div>
            </div>
          )}
          
          {imageError ? (
            <div className="image-error">
              <div className="error-icon">🖼️</div>
              <span>Image unavailable</span>
            </div>
          ) : (
            <img
              src={artwork.thumbnail || artwork.images?.[0]?.url}
              alt={artwork.title}
              className={`artwork-image ${imageLoaded ? 'loaded' : ''}`}
              onLoad={handleImageLoad}
              onError={handleImageError}
              loading="lazy"
            />
          )}
        </Link>

        {/* Badges */}
        {artwork.badges && artwork.badges.length > 0 && (
          <div className="artwork-badges">
            {artwork.badges.slice(0, 2).map((badge, index) => (
              <span key={index} className={`artwork-badge ${getBadgeColor(badge)}`}>
                {badge === 'contest-winner' ? 'Winner' : badge}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons Overlay */}
        <div className="artwork-actions">
          <button
            className={`action-btn favorite-btn ${isLiked ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onLike?.(artwork._id);
            }}
            title={isLiked ? 'Unlike' : 'Like'}
          >
            <Heart size={18} fill={isLiked ? 'currentColor' : 'none'} />
          </button>
          
          <button
            className={`action-btn wishlist-btn ${isInWishlist ? 'active' : ''}`}
            onClick={(e) => {
              e.preventDefault();
              onAddToWishlist?.(artwork._id);
            }}
            title={isInWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
          >
            <Star size={18} fill={isInWishlist ? 'currentColor' : 'none'} />
          </button>
          
          <button
            className="action-btn share-btn"
            onClick={(e) => {
              e.preventDefault();
              navigator.share?.({
                title: artwork.title,
                url: `${window.location.origin}/artwork/${artwork._id}`
              });
            }}
            title="Share"
          >
            <Share2 size={18} />
          </button>
        </div>

        {/* Quick Stats */}
        <div className="artwork-stats-overlay">
          <div className="stat-item">
            <Eye size={14} />
            <span>{artwork.stats?.views || 0}</span>
          </div>
          <div className="stat-item">
            <Heart size={14} />
            <span>{artwork.stats?.likes || 0}</span>
          </div>
        </div>
      </div>

      {/* Card Content */}
      <div className="artwork-content">
        <div className="artwork-header">
          <Link to={`/artwork/${artwork._id}`} className="artwork-title">
            {artwork.title}
          </Link>
          <div className="artwork-price">
            {formatPrice(artwork.price)}
          </div>
        </div>

        <div className="artwork-artist">
          <Link to={`/profile/${artwork.artist?._id || artwork.artist || 'unknown'}`} className="artist-link">
            <div className="artist-avatar">
              {artwork.artist?.profile?.avatar ? (
                <img src={artwork.artist.profile.avatar} alt={artwork.artist.username} />
              ) : (
                <User size={16} />
              )}
            </div>
            <span className="artist-name">
              {artwork.artist?.username || 'Unknown Artist'}
            </span>
          </Link>
        </div>

        {/* Tags */}
        {artwork.tags && artwork.tags.length > 0 && (
          <div className="artwork-tags">
            {artwork.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="artwork-tag">
                #{tag}
              </span>
            ))}
            {artwork.tags.length > 3 && (
              <span className="artwork-tag-more">
                +{artwork.tags.length - 3}
              </span>
            )}
          </div>
        )}

        {/* Action Bar */}
        <div className="artwork-action-bar">
          <div className="artwork-category">
            {artwork.category}
          </div>
          
          {artwork.price > 0 && (
            <button className="buy-btn">
              <ShoppingCart size={14} />
              Buy Now
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default ArtworkCard;