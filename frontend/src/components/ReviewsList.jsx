import { useState, useEffect } from 'react';
import axios from 'axios';
import { formatDistanceToNow } from 'date-fns';
import '../styles/ReviewsList.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ReviewsList({ artworkId, currentUser, onAggregateUpdate }) {
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [totalReviews, setTotalReviews] = useState(0);

  useEffect(() => {
    fetchReviews();
  }, [artworkId, page]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(
        `${API_URL}/api/artworks/${artworkId}/reviews?page=${page}&limit=10`
      );

      if (response.data.success) {
        if (page === 1) {
          setReviews(response.data.items);
        } else {
          setReviews(prev => [...prev, ...response.data.items]);
        }
        setTotalReviews(response.data.pageInfo.total);
        setHasMore(page < response.data.pageInfo.totalPages);
      }
    } catch (err) {
      console.error('Error fetching reviews:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (reviewId) => {
    if (!confirm('Are you sure you want to delete this review?')) return;

    try {
      const token = localStorage.getItem('auth_token');
      await axios.delete(
        `${API_URL}/api/reviews/${reviewId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setReviews(prev => prev.filter(r => r._id !== reviewId));
      setTotalReviews(prev => prev - 1);
      
      if (onAggregateUpdate) {
        // Trigger parent to refetch artwork data
        onAggregateUpdate();
      }
    } catch (err) {
      console.error('Error deleting review:', err);
      alert('Failed to delete review');
    }
  };

  const renderStars = (rating) => {
    return (
      <div className="stars-display">
        {[1, 2, 3, 4, 5].map((star) => (
          <span key={star} className={star <= rating ? 'filled' : ''}>
            ★
          </span>
        ))}
      </div>
    );
  };

  const getRecommendationBadge = (recommendation) => {
    const badges = {
      approve: { text: 'Approved', className: 'badge-approve' },
      revise: { text: 'Needs Revision', className: 'badge-revise' },
      reject: { text: 'Rejected', className: 'badge-reject' }
    };
    const badge = badges[recommendation] || badges.approve;
    return <span className={`recommendation-badge ${badge.className}`}>{badge.text}</span>;
  };

  if (loading && page === 1) {
    return (
      <div className="reviews-list">
        <div className="loading-skeleton">
          {[1, 2, 3].map(i => (
            <div key={i} className="review-skeleton">
              <div className="skeleton-avatar"></div>
              <div className="skeleton-content">
                <div className="skeleton-line"></div>
                <div className="skeleton-line short"></div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="reviews-list empty">
        <div className="empty-state">
          <span className="empty-icon">📝</span>
          <p>No reviews yet</p>
          <p className="empty-subtitle">Be the first to review this artwork!</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reviews-list">
      <h3>Reviews ({totalReviews})</h3>

      <div className="reviews-container">
        {reviews.map((review) => {
          const isMyReview = currentUser && review.reviewer._id === currentUser._id;
          const canDelete = isMyReview || (currentUser && currentUser.role === 'moderator');

          return (
            <div key={review._id} className="review-item">
              <div className="review-header">
                <img
                  src={review.reviewer.profile?.avatar || '/default-avatar.png'}
                  alt={review.reviewer.username}
                  className="reviewer-avatar"
                />
                <div className="reviewer-info">
                  <div className="reviewer-name">{review.reviewer.username}</div>
                  <div className="review-meta">
                    {renderStars(review.rating)}
                    <span className="review-date">
                      {formatDistanceToNow(new Date(review.createdAt), { addSuffix: true })}
                    </span>
                  </div>
                </div>
                <div className="review-actions">
                  {getRecommendationBadge(review.recommendation)}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(review._id)}
                      className="delete-btn"
                      aria-label="Delete review"
                    >
                      🗑️
                    </button>
                  )}
                </div>
              </div>

              <div className="review-comment">
                {review.comment}
              </div>
            </div>
          );
        })}
      </div>

      {hasMore && (
        <button
          onClick={() => setPage(prev => prev + 1)}
          disabled={loading}
          className="load-more-btn"
        >
          {loading ? 'Loading...' : 'Load More'}
        </button>
      )}
    </div>
  );
}
