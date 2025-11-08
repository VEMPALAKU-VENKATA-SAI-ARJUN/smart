import { useState, useEffect } from 'react';
import axios from 'axios';
import '../styles/ReviewPanel.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ReviewPanel({ artworkId, currentUser, onReviewSubmit }) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [recommendation, setRecommendation] = useState('approve');
  const [loading, setLoading] = useState(false);
  const [existingReview, setExistingReview] = useState(null);
  const [error, setError] = useState('');

  // Check if user already reviewed this artwork
  useEffect(() => {
    const fetchExistingReview = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const response = await axios.get(
          `${API_URL}/api/artworks/${artworkId}/reviews`,
          { headers: { Authorization: `Bearer ${token}` } }
        );

        if (response.data.success) {
          const myReview = response.data.items.find(
            r => r.reviewer._id === currentUser._id
          );
          if (myReview) {
            setExistingReview(myReview);
            setRating(myReview.rating);
            setComment(myReview.comment);
            setRecommendation(myReview.recommendation);
          }
        }
      } catch (err) {
        console.error('Error fetching existing review:', err);
      }
    };

    if (currentUser && artworkId) {
      fetchExistingReview();
    }
  }, [artworkId, currentUser]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    if (comment.trim().length === 0) {
      setError('Please write a comment');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('auth_token');
      const response = await axios.post(
        `${API_URL}/api/artworks/${artworkId}/reviews`,
        { rating, comment, recommendation },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (response.data.success) {
        setExistingReview(response.data.review);
        if (onReviewSubmit) {
          onReviewSubmit(response.data);
        }
        
        // Show success message
        const action = response.data.isNew ? 'submitted' : 'updated';
        alert(`Review ${action} successfully!`);
      }
    } catch (err) {
      console.error('Error submitting review:', err);
      setError(err.response?.data?.message || 'Failed to submit review');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = () => {
    return [1, 2, 3, 4, 5].map((star) => (
      <button
        key={star}
        type="button"
        className={`star ${star <= (hoverRating || rating) ? 'filled' : ''}`}
        onClick={() => setRating(star)}
        onMouseEnter={() => setHoverRating(star)}
        onMouseLeave={() => setHoverRating(0)}
        aria-label={`Rate ${star} stars`}
      >
        ★
      </button>
    ));
  };

  return (
    <div className="review-panel">
      <h3>
        {existingReview ? 'Update Your Review' : 'Write a Review'}
      </h3>

      <form onSubmit={handleSubmit}>
        <div className="rating-input">
          <label>Rating</label>
          <div className="stars" role="radiogroup" aria-label="Rating">
            {renderStars()}
          </div>
          <span className="rating-text">
            {rating > 0 ? `${rating} out of 5 stars` : 'Select a rating'}
          </span>
        </div>

        <div className="form-group">
          <label htmlFor="comment">Comment</label>
          <textarea
            id="comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Share your thoughts about this artwork..."
            maxLength={1000}
            rows={4}
            required
          />
          <span className="char-count">{comment.length}/1000</span>
        </div>

        <div className="form-group">
          <label htmlFor="recommendation">Recommendation</label>
          <select
            id="recommendation"
            value={recommendation}
            onChange={(e) => setRecommendation(e.target.value)}
          >
            <option value="approve">Approve</option>
            <option value="revise">Needs Revision</option>
            <option value="reject">Reject</option>
          </select>
        </div>

        {error && <div className="error-message">{error}</div>}

        <button type="submit" disabled={loading} className="submit-btn">
          {loading ? (
            <>
              <span className="spinner"></span>
              Submitting...
            </>
          ) : (
            existingReview ? 'Update Review' : 'Submit Review'
          )}
        </button>
      </form>
    </div>
  );
}
