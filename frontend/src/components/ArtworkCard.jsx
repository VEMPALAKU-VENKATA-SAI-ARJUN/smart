import React, { useState } from 'react';
import axios from 'axios';
import { Heart, Eye, Share2, ShoppingCart, User, Star, Edit3 } from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/ArtworkCard.css';

const ArtworkCard = ({
  artwork,
  onLike,
  onAddToWishlist,
  isLiked = false,
  isInWishlist = false,
  currentUser,
  onClick, // ✅ added for modal
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const isArtistOwner = currentUser?._id === (artwork.artist?._id || artwork.artist);

  const formatPrice = (price) => {
  if (!price) return 'Free';
  return `₹${Number(price).toLocaleString('en-IN')}`;
};


  const getBadgeColor = (badge) => {
    const colors = {
      trending: 'badge-trending',
      featured: 'badge-featured',
      new: 'badge-new',
      bestseller: 'badge-bestseller',
      'contest-winner': 'badge-contest',
    };
    return colors[badge] || 'badge-default';
  };
  const handleBuy = async (artworkId) => {
  try {
    const user = JSON.parse(localStorage.getItem("user"));
    if (!user) {
      alert("Please log in to buy this artwork.");
      navigate("/auth");
      return;
    }

    const response = await axios.post(
      `${import.meta.env.VITE_API_URL}/api/payments/create-checkout-session`,
      {
        artworkId,
        buyerId: user.id || user._id, // ✅ handles both 'id' and '_id'
      }
    );

    if (response.data.url) {
      console.log("✅ Redirecting to Stripe Checkout:", response.data.url);
      window.location.href = response.data.url;
    } else {
      alert("Failed to create Stripe checkout session.");
    }
  } catch (error) {
    console.error("❌ Payment Error:", error);
    alert(error.response?.data?.error || "Payment failed. Please try again.");
  }
};



  return (
    <div
      className="artwork-card"
      onClick={(e) => {
        // ✅ Trigger modal only if onClick is provided and user didn't click a button or link
        if (
          onClick &&
          !e.target.closest('button') &&
          !e.target.closest('a')
        ) {
          e.preventDefault();
          onClick(artwork);
        }
      }}
    >
      <div className="artwork-image-container">
        {/* Keep the link but allow modal on image click */}
        <Link
          to={`/artwork/${artwork._id}`}
          onClick={(e) => {
            if (onClick) {
              e.preventDefault();
              onClick(artwork);
            }
          }}
        >
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
              onLoad={() => setImageLoaded(true)}
              onError={() => {
                setImageError(true);
                setImageLoaded(true);
              }}
              loading="lazy"
            />
          )}
        </Link>

        {/* Badges */}
        {artwork.badges?.length > 0 && (
          <div className="artwork-badges">
            {artwork.badges.slice(0, 2).map((badge, index) => (
              <span key={index} className={`artwork-badge ${getBadgeColor(badge)}`}>
                {badge === 'contest-winner' ? 'Winner' : badge}
              </span>
            ))}
          </div>
        )}

        {/* Buttons (stop modal trigger) */}
        <div className="artwork-actions">
          <button
            className={`action-btn favorite-btn ${isLiked ? 'active' : ''}`}
            onClick={(e) => {
              e.stopPropagation();
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
              e.stopPropagation();
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
              e.stopPropagation();
              e.preventDefault();
              navigator.share?.({
                title: artwork.title,
                url: `${window.location.origin}/artwork/${artwork._id}`,
              });
            }}
            title="Share"
          >
            <Share2 size={18} />
          </button>
        </div>

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

      <div className="artwork-content">
        <div className="artwork-header">
          <span className="artwork-title">{artwork.title}</span>
          <div className="artwork-price">{formatPrice(artwork.price)}</div>
        </div>

        <div className="artwork-artist">
          <Link
            to={`/profile/${artwork.artist?._id || artwork.artist || 'unknown'}`}
            className="artist-link"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="artist-avatar">
              {artwork.artist?.profile?.avatar ? (
                <img src={artwork.artist.profile.avatar} alt={artwork.artist.username} />
              ) : (
                <User size={16} />
              )}
            </div>
            <span className="artist-name">{artwork.artist?.username || 'Unknown Artist'}</span>
          </Link>
        </div>

        {artwork.tags?.length > 0 && (
          <div className="artwork-tags">
            {artwork.tags.slice(0, 3).map((tag, i) => (
              <span key={i} className="artwork-tag">
                #{tag}
              </span>
            ))}
            {artwork.tags.length > 3 && (
              <span className="artwork-tag-more">+{artwork.tags.length - 3}</span>
            )}
          </div>
        )}

        <div className="artwork-action-bar">
          <div className="artwork-category">{artwork.category}</div>

          {artwork.isSold ? (
            // 🏷️ SOLD badge replaces any buttons when artwork is sold
            <div className="sold-badge">SOLD</div>
          ) : isArtistOwner ? (
            // 🧑‍🎨 Artist sees Edit option
            <button
              className="edit-btn"
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <Edit3 size={14} /> Edit Artwork
            </button>
          ) : (
            // 🛒 Buyer sees Buy button only if artwork is still for sale
            Number(artwork.price) > 0 &&
            artwork.isForSale && (
              <button
                className="buy-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  e.preventDefault();
                  handleBuy(artwork._id);
                }}
              >
                <ShoppingCart size={14} /> Buy Now
              </button>
            )
          )}
        </div>

      </div>
    </div>
  );
};

export default ArtworkCard;
