// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Image as ImageIcon, Eye, Heart, 
  Clock, CheckCircle, XCircle, AlertCircle, Plus,
  Calendar
} from "lucide-react";
import axios from "axios";
import http from '../lib/http';
import '../styles/Dashboard.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userArtworks, setUserArtworks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalViews: 0,
    totalFavorites: 0
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchUserArtworks(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchUserArtworks = async (signal) => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('auth_user');
      
      if (!token || !userData) {
        console.log('No token or user data found, redirecting to auth');
        navigate('/auth');
        return;
      }

      const user = JSON.parse(userData);
      console.log('User data from localStorage:', user);
      
      // Handle different possible user ID fields
      const userId = user.id || user._id || user.userId;
      
      if (!userId) {
        console.log('No user ID found in user data, redirecting to auth');
        navigate('/auth');
        return;
      }

      console.log('Fetching artworks for user ID:', userId);
      const headers = { Authorization: `Bearer ${token}` };
      const resp = await http.get(`/api/users/${userId}/artworks?all=true`, { signal, headers, dedupeKey: `my-artworks:${userId}` });
      const artworks = resp?.data?.data ?? resp?.data ?? [];
      console.log('Setting artworks:', artworks.length);
      console.log('Artworks data:', artworks);
      
      setUserArtworks(artworks);

      // Calculate statistics
      const statistics = {
        total: artworks.length,
        drafts: artworks.filter(art => art.status === 'draft').length,
        pending: artworks.filter(art => art.status === 'pending').length,
        approved: artworks.filter(art => art.status === 'approved').length,
        rejected: artworks.filter(art => art.status === 'rejected').length,
        totalViews: artworks.reduce((sum, art) => sum + (art.stats?.views || 0), 0),
        totalFavorites: artworks.reduce((sum, art) => sum + (art.stats?.favorites || 0), 0)
      };
      
      console.log('Calculated statistics:', statistics);
      setStats(statistics);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching artworks:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle />;
      case 'pending': return <Clock />;
      case 'rejected': return <XCircle />;
      default: return <AlertCircle />;
    }
  };

  const getStatusClass = (status) => {
    switch (status) {
      case 'approved': return 'approved';
      case 'pending': return 'pending';
      case 'rejected': return 'rejected';
      default: return 'draft';
    }
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-skeleton">
          <div className="skeleton-title"></div>
          <div className="skeleton-subtitle"></div>
          <div className="skeleton-grid">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="skeleton-card"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-container">
      {/* Header */}
      <div className="dashboard-header">
        <h1 className="dashboard-title">
          Welcome back, {user?.username || 'Artist'}!
        </h1>
        <p className="dashboard-subtitle">
          Manage your artworks, track performance, and grow your creative presence.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <p className="stat-label">Total Artworks</p>
              <p className="stat-value primary">{stats.total}</p>
            </div>
            <div className="stat-icon primary">
              <ImageIcon />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <p className="stat-label">Drafts</p>
              <p className="stat-value secondary">{stats.drafts}</p>
            </div>
            <div className="stat-icon secondary">
              <AlertCircle />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <p className="stat-label">Pending Review</p>
              <p className="stat-value warning">{stats.pending}</p>
            </div>
            <div className="stat-icon warning">
              <Clock />
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <p className="stat-label">Total Views</p>
              <p className="stat-value success">{stats.totalViews}</p>
            </div>
            <div className="stat-icon success">
              <Eye />
            </div>
          </div>
        </div>

        {/*<div className="stat-card">
          <div className="stat-card-content">
            <div className="stat-info">
              <p className="stat-label">Total Favorites</p>
              <p className="stat-value danger">{stats.totalFavorites}</p>
            </div>
            <div className="stat-icon danger">
              <Heart />
            </div>
          </div>
        </div>*/}
      </div>

      {/* Quick Actions */}
      <div className="quick-actions-card">
        <h2 className="section-title">Quick Actions</h2>
        <div className="actions-grid">
          <Link to="/upload" className="action-card primary">
            <div className="action-icon">
              <Plus />
            </div>
            <div className="action-content">
              <h3 className="action-title">Upload New Artwork</h3>
              <p className="action-description">Share your latest creation</p>
            </div>
          </Link>

          <Link to={`/profile/${user?.id}`} className="action-card success">
            <div className="action-icon">
              <User />
            </div>
            <div className="action-content">
              <h3 className="action-title">Edit Profile</h3>
              <p className="action-description">Update your information</p>
            </div>
          </Link>

          <Link to="/gallery" className="action-card purple">
            <div className="action-icon">
              <ImageIcon />
            </div>
            <div className="action-content">
              <h3 className="action-title">Browse Gallery</h3>
              <p className="action-description">Explore other artworks</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Artworks */}
      <div className="artworks-card">
        <div className="artworks-header">
          <h2 className="section-title">Your Artworks</h2>
          {userArtworks.length > 0 && (
            <Link to="/upload" className="upload-link">
              Upload More
            </Link>
          )}
        </div>

        {userArtworks.length === 0 ? (
          <div className="empty-state">
            <ImageIcon className="empty-icon" />
            <h3 className="empty-title">No artworks yet</h3>
            <p className="empty-description">
              Start sharing your creativity with the world!
            </p>
            <Link to="/upload" className="upload-button">
              <Plus />
              Upload Your First Artwork
            </Link>
          </div>
        ) : (
          <div className="artworks-grid">
            {userArtworks.slice(0, 6).map((artwork) => (
              <div key={artwork._id} className="artwork-card">
                <div className="artwork-image-container">
                  {artwork.images && artwork.images[0] ? (
                    <img
                      src={artwork.images[0].url}
                      alt={artwork.title}
                      className="artwork-image"
                    />
                  ) : (
                    <div className="artwork-placeholder">
                      <ImageIcon />
                    </div>
                  )}
                  <div className={`artwork-status-badge ${getStatusClass(artwork.status)}`}>
                    {getStatusIcon(artwork.status)}
                    <span>{artwork.status}</span>
                  </div>
                </div>
                <div className="artwork-info">
                  <h3 className="artwork-title">{artwork.title}</h3>
                  <p className="artwork-price">₹{artwork.price}</p>
                  <div className="artwork-stats">
                    <div className="artwork-stat">
                      <Eye />
                      <span>{artwork.stats?.views || 0}</span>
                    </div>
                    <div className="artwork-stat">
                      <Heart />
                      <span>{artwork.stats?.favorites || 0}</span>
                    </div>
                    <div className="artwork-stat">
                      <Calendar />
                      <span>{new Date(artwork.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {userArtworks.length > 6 && (
          <div className="view-all-container">
            <button className="view-all-button">
              View All Artworks ({userArtworks.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}