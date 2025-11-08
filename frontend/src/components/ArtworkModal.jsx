import React, { useState, useEffect } from 'react';
import { X, Heart, MessageCircle, Share2, ShoppingCart, Bookmark, Star } from 'lucide-react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const ArtworkModal = ({ artwork, isOpen, onClose, currentUser }) => {
  const [reviews, setReviews] = useState([]);
  const [loadingReviews, setLoadingReviews] = useState(false);

  useEffect(() => {
    if (isOpen && artwork?._id) {
      fetchReviews();
    }
  }, [isOpen, artwork?._id]);

  const fetchReviews = async () => {
    try {
      setLoadingReviews(true);
      const response = await axios.get(`${API_URL}/api/artworks/${artwork._id}/reviews?limit=5`);
      if (response.data.success) {
        setReviews(response.data.items);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoadingReviews(false);
    }
  };

  const renderStars = (rating) => {
    return [1, 2, 3, 4, 5].map((star) => (
      <Star
        key={star}
        size={14}
        className={star <= rating ? 'star-filled' : 'star-empty'}
        fill={star <= rating ? 'currentColor' : 'none'}
      />
    ));
  };

  const getRecommendationBadge = (recommendation) => {
    const badges = {
      approve: { text: 'Approved', className: 'badge-approve' },
      revise: { text: 'Needs Revision', className: 'badge-revise' },
      reject: { text: 'Rejected', className: 'badge-reject' }
    };
    return badges[recommendation] || badges.approve;
  };

  if (!isOpen || !artwork) return null;

  const isOwner = currentUser?._id === artwork.artist?._id || currentUser?._id === artwork.artist;
  const canBuy = !isOwner && Number(artwork.price) > 0;

  return (
    <div className="ig-modal-backdrop" onClick={onClose}>
      <div className="ig-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ig-modal-left">
          <img src={artwork.thumbnail || artwork.images?.[0]?.url} alt={artwork.title} className="ig-modal-image" />
        </div>

        <div className="ig-modal-right">
          <div className="ig-modal-header">
            <div className="ig-modal-artist">
              <img src={artwork.artist?.profile?.avatar} alt={artwork.artist?.username} className="ig-modal-avatar" />
              <span className="ig-modal-username">{artwork.artist?.username}</span>
            </div>
            <button onClick={onClose} className="ig-modal-close"><X size={20} /></button>
          </div>

          <div className="ig-modal-content">
            <h2 className="ig-modal-title">{artwork.title}</h2>
            {artwork.description && <p className="ig-modal-desc">{artwork.description}</p>}

            <div className="ig-modal-tags">
              {artwork.category && <span className="ig-modal-chip ig-chip-primary">{artwork.category}</span>}
              {artwork.tags?.map((t, i) => <span key={i} className="ig-modal-chip">#{t}</span>)}
            </div>

            <div className="ig-modal-stats">
              <div><strong>{artwork.stats?.views || 0}</strong><span>Views</span></div>
              <div><strong>{artwork.stats?.likes || 0}</strong><span>Likes</span></div>
              <div><strong>{artwork.stats?.comments || 0}</strong><span>Comments</span></div>
            </div>

            <div className="ig-modal-price">
              {Number(artwork.price) ? `$${Number(artwork.price).toLocaleString()}` : 'Free'}
            </div>

            <div className="ig-modal-date">Posted {new Date(artwork.createdAt || Date.now()).toLocaleDateString()}</div>

            {/* Reviews Section */}
            <div className="ig-modal-reviews">
              <h3 className="reviews-title">
                <MessageCircle size={18} />
                Reviews & Ratings ({artwork.ratingCount || 0})
              </h3>

              {artwork.ratingAvg > 0 && (
                <div className="overall-rating">
                  <div className="rating-stars">{renderStars(Math.round(artwork.ratingAvg))}</div>
                  <span className="rating-value">{artwork.ratingAvg.toFixed(1)} out of 5</span>
                </div>
              )}

              {loadingReviews ? (
                <div className="reviews-loading">Loading reviews...</div>
              ) : reviews.length > 0 ? (
                <div className="reviews-list-modal">
                  {reviews.map((review) => (
                    <div key={review._id} className="review-item-modal">
                      <div className="review-header-modal">
                        <img
                          src={review.reviewer.profile?.avatar || '/default-avatar.png'}
                          alt={review.reviewer.username}
                          className="review-avatar-modal"
                        />
                        <div className="review-info-modal">
                          <div className="review-author-modal">{review.reviewer.username}</div>
                          <div className="review-meta-modal">
                            <div className="review-stars-modal">{renderStars(review.rating)}</div>
                            <span className="review-date-modal">
                              {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                        <span className={`review-badge-modal badge-${review.recommendation}`}>
                          {getRecommendationBadge(review.recommendation).text}
                        </span>
                      </div>
                      <p className="review-comment-modal">{review.comment}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="reviews-empty-modal">No reviews yet</div>
              )}
            </div>
          </div>

          <div className="ig-modal-footer">
            <div className="ig-modal-actions">
              <button className="ig-action"><Heart size={20} /><span>{artwork.stats?.likes || 0}</span></button>
              <button className="ig-action"><MessageCircle size={20} /></button>
              <button className="ig-action"><Share2 size={20} /></button>
              <button className="ig-action ig-bookmark"><Bookmark size={20} /></button>
            </div>

            {canBuy && (
              <button className="ig-buy">
                <ShoppingCart size={18} />
                Buy Now — ${Number(artwork.price).toLocaleString()}
              </button>
            )}

            {isOwner && (
              <button className="ig-edit">Edit Artwork</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtworkModal;
