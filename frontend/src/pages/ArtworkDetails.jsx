import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import axios from 'axios';
import { useAuth } from '../contexts/AuthContext';
import { useSocket } from '../contexts/SocketContext';
import ReviewPanel from '../components/ReviewPanel';
import ReviewsList from '../components/ReviewsList';
import '../styles/ArtworkDetails.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ArtworkDetails() {
  const { id } = useParams();
  const { user } = useAuth();
  const { socket } = useSocket();
  const [artwork, setArtwork] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchArtwork();
  }, [id]);

  // Real-time updates
  useEffect(() => {
    if (!socket || !id) return;

    socket.emit('join_artwork', id);

    const handleReviewAggregate = (data) => {
      setArtwork(prev => prev ? {
        ...prev,
        ratingAvg: data.ratingAvg,
        ratingCount: data.ratingCount
      } : null);
    };

    const handleArtworkBadge = (data) => {
      setArtwork(prev => prev ? { ...prev, editorPick: data.editorPick } : null);
    };

    socket.on('review:aggregate', handleReviewAggregate);
    socket.on('artwork:badge', handleArtworkBadge);

    return () => {
      socket.emit('leave_artwork', id);
      socket.off('review:aggregate', handleReviewAggregate);
      socket.off('artwork:badge', handleArtworkBadge);
    };
  }, [socket, id]);

  const fetchArtwork = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/artworks/${id}`);
      if (response.data.success) {
        setArtwork(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching artwork:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleReviewSubmit = (data) => {
    // Update local artwork stats optimistically
    setArtwork(prev => ({
      ...prev,
      ratingAvg: data.artwork.ratingAvg,
      ratingCount: data.artwork.ratingCount
    }));
  };

  if (loading) {
    return <div className="loading">Loading artwork...</div>;
  }

  if (!artwork) {
    return <div className="error">Artwork not found</div>;
  }

  const isReviewer = user && user.role === 'reviewer';
  const isOwnArtwork = user && artwork.artist._id === user._id;

  return (
    <div className="artwork-details-page">
      <div className="artwork-container">
        <div className="artwork-image-section" style={{ position: 'relative', width: '100%' }}>
          <img
            src={artwork.thumbnail || artwork.images?.[0]?.url || 'https://via.placeholder.com/600x400?text=No+Image'}
            alt={artwork.title}
            style={{
              display: 'block',
              width: '100%',
              height: 'auto',
              borderRadius: '12px',
              objectFit: 'cover',
              maxHeight: '600px'
            }}
            onError={(e) => {
              console.error('Failed to load artwork image:', e.target.src);
              e.target.src = 'https://via.placeholder.com/600x400/e5e7eb/666?text=Image+Error';
            }}
            onLoad={() => console.log('Artwork image loaded successfully')}
          />
        </div>

        <div className="artwork-info-section">
          <div className="artwork-header">
            <h1>{artwork.title}</h1>
            {artwork.editorPick && (
              <span className="editor-pick-badge">⭐ Editor's Pick</span>
            )}
          </div>

          <div className="artwork-rating">
            <div className="stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <span key={star} className={star <= Math.round(artwork.ratingAvg || 0) ? 'filled' : ''}>
                  ★
                </span>
              ))}
            </div>
            <span className="rating-text">
              {artwork.ratingAvg ? artwork.ratingAvg.toFixed(1) : '0.0'} ({artwork.ratingCount || 0} reviews)
            </span>
          </div>

          <div className="artist-info">
            <img
              src={artwork.artist.profile?.avatar || '/default-avatar.png'}
              alt={artwork.artist.username}
              className="artist-avatar"
            />
            <div>
              <div className="artist-name">{artwork.artist.username}</div>
              <div className="artist-role">Artist</div>
            </div>
          </div>

          <div className="artwork-description">
            <h3>Description</h3>
            <p>{artwork.description}</p>
          </div>

          <div className="artwork-meta">
            <div className="meta-item">
              <span className="meta-label">Category:</span>
              <span className="meta-value">{artwork.category}</span>
            </div>
            <div className="meta-item">
              <span className="meta-label">Price:</span>
              <span className="meta-value">{artwork.currency} {artwork.price}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Reviewer Panel - Only show for reviewers who don't own the artwork */}
      {isReviewer && !isOwnArtwork && (
        <ReviewPanel
          artworkId={id}
          currentUser={user}
          onReviewSubmit={handleReviewSubmit}
        />
      )}

      {/* Reviews List */}
      <ReviewsList
        artworkId={id}
        currentUser={user}
        onAggregateUpdate={fetchArtwork}
      />
    </div>
  );
}
