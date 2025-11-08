import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Star, Eye, MessageSquare, Sparkles } from 'lucide-react';
import '../styles/ReviewQueue.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ReviewQueue() {
    const navigate = useNavigate();
    const [artworks, setArtworks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all'); // all, pending, reviewed
    const [sortBy, setSortBy] = useState('newest'); // newest, oldest, rating

    useEffect(() => {
        fetchArtworks();
    }, [filter, sortBy]);

    const fetchArtworks = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('auth_token');

            // Fetch all approved artworks
            const response = await axios.get(
                `${API_URL}/api/artworks?status=approved&limit=50`,
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (response.data.success) {
                let artworksList = response.data.data;

                // Apply sorting
                if (sortBy === 'newest') {
                    artworksList.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
                } else if (sortBy === 'oldest') {
                    artworksList.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
                } else if (sortBy === 'rating') {
                    artworksList.sort((a, b) => (b.ratingAvg || 0) - (a.ratingAvg || 0));
                }

                setArtworks(artworksList);
            }
        } catch (err) {
            console.error('Error fetching artworks:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleArtworkClick = (artworkId) => {
        navigate(`/artwork/${artworkId}`);
    };

    const renderStars = (rating) => {
        const stars = [];
        const roundedRating = Math.round(rating || 0);

        for (let i = 1; i <= 5; i++) {
            stars.push(
                <Star
                    key={i}
                    size={16}
                    className={i <= roundedRating ? 'reviewer-star-filled' : 'reviewer-star-empty'}
                    fill={i <= roundedRating ? 'currentColor' : 'none'}
                />
            );
        }
        return stars;
    };

    if (loading) {
        return (
            <div className="reviewer-queue-page">
                <div className="reviewer-loading-container">
                    <div className="reviewer-spinner"></div>
                    <p>Loading artworks...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="reviewer-queue-page">
            <div className="reviewer-queue-header">
                <div className="reviewer-header-content">
                    <div className="reviewer-header-title">
                        <Sparkles className="reviewer-header-icon" size={32} />
                        <div>
                            <h1>Review Queue</h1>
                            <p>Provide expert feedback on artworks</p>
                        </div>
                    </div>

                    <div className="reviewer-header-stats">
                        <div className="reviewer-stat-card">
                            <div className="reviewer-stat-value">{artworks.length}</div>
                            <div className="reviewer-stat-label">Total Artworks</div>
                        </div>
                        <div className="reviewer-stat-card">
                            <div className="reviewer-stat-value">
                                {artworks.filter(a => (a.ratingCount || 0) === 0).length}
                            </div>
                            <div className="reviewer-stat-label">Unreviewed</div>
                        </div>
                    </div>
                </div>

                <div className="reviewer-filters-bar">
                    <div className="reviewer-filter-group">
                        <label>Filter:</label>
                        <select value={filter} onChange={(e) => setFilter(e.target.value)}>
                            <option value="all">All Artworks</option>
                            <option value="pending">Unreviewed</option>
                            <option value="reviewed">Reviewed</option>
                        </select>
                    </div>

                    <div className="reviewer-filter-group">
                        <label>Sort by:</label>
                        <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                            <option value="newest">Newest First</option>
                            <option value="oldest">Oldest First</option>
                            <option value="rating">Highest Rated</option>
                        </select>
                    </div>
                </div>
            </div>

            <div className="reviewer-artworks-grid">
                {artworks.length === 0 ? (
                    <div className="reviewer-empty-state">
                        <Sparkles size={64} className="reviewer-empty-icon" />
                        <h3>No artworks found</h3>
                        <p>Check back later for new artworks to review</p>
                    </div>
                ) : (
                    artworks.map((artwork) => (
                        <div
                            key={artwork._id}
                            className="reviewer-artwork-card"
                            onClick={() => handleArtworkClick(artwork._id)}
                        >
                            <div className="reviewer-artwork-image-container" style={{ position: 'relative', width: '100%', height: '280px', overflow: 'hidden', background: '#f3f4f6' }}>
                                <img
                                    src={artwork.thumbnail || artwork.images?.[0]?.url || 'https://via.placeholder.com/400x300?text=No+Image'}
                                    alt={artwork.title}
                                    className="reviewer-artwork-image"
                                    style={{
                                        width: '100%',
                                        height: '100%',
                                        objectFit: 'cover',
                                        display: 'block',
                                        position: 'absolute',
                                        top: 0,
                                        left: 0,
                                        zIndex: 0
                                    }}
                                    onError={(e) => {
                                        console.error('Image ERROR for', artwork.title, '- URL:', e.target.src);
                                        e.target.src = 'https://via.placeholder.com/400x300/ff0000/ffffff?text=ERROR';
                                    }}
                                    onLoad={(e) => {
                                        console.log('Image LOADED for', artwork.title, '- Dimensions:', e.target.naturalWidth, 'x', e.target.naturalHeight);
                                    }}
                                />

                                {artwork.editorPick && (
                                    <div className="reviewer-editor-pick-badge">
                                        <Star size={16} fill="currentColor" />
                                        Editor's Pick
                                    </div>
                                )}
                                <div className="reviewer-artwork-overlay">
                                    <button className="reviewer-review-btn">
                                        <MessageSquare size={20} />
                                        Review Artwork
                                    </button>
                                </div>
                            </div>

                            <div className="reviewer-artwork-info">
                                <h3 className="reviewer-artwork-title">{artwork.title}</h3>

                                <div className="reviewer-artwork-artist">
                                    <img
                                        src={artwork.artist?.profile?.avatar || '/default-avatar.png'}
                                        alt={artwork.artist?.username}
                                        className="reviewer-artist-avatar"
                                    />
                                    <span>{artwork.artist?.username}</span>
                                </div>

                                <div className="reviewer-artwork-meta">
                                    <div className="reviewer-status-badge">
                                        {artwork.ratingCount > 0 ? (
                                            <span className="reviewed-badge">
                                                ✓ {artwork.ratingCount} Review{artwork.ratingCount !== 1 ? 's' : ''}
                                            </span>
                                        ) : (
                                            <span className="pending-badge">
                                                ⏳ Awaiting Review
                                            </span>
                                        )}
                                    </div>
                                    <div className="reviewer-rating-summary">
                                        <div className="reviewer-stars">
                                            {renderStars(artwork.ratingAvg)}
                                        </div>
                                        <span className="reviewer-rating-text">
                                            {artwork.ratingAvg ? artwork.ratingAvg.toFixed(1) : 'N/A'}
                                        </span>
                                    </div>
                                </div>

                                <div className="reviewer-artwork-footer">
                                    <div className="reviewer-stat-item">
                                        <Eye size={14} />
                                        <span>{artwork.stats?.views || 0} views</span>
                                    </div>
                                    <span className="reviewer-category-badge">{artwork.category}</span>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
