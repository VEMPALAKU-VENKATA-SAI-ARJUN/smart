import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import '../styles/profile.css';

export default function ArtistDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <div className="profile">
      <div className="profile-header">
        <div className="profile-banner" />
        <div className="profile-info-section">
          <div className="profile-avatar-wrapper">
            <img
              src={user.profile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=200`}
              alt={user.username}
              className="profile-avatar"
            />
          </div>

          <div className="profile-details">
            <h1 className="profile-name">{user.username}</h1>
            <div className="profile-meta">
              <span className="meta-item">Joined {new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
            </div>
            <p className="profile-bio">{user.profile?.bio || 'No bio yet'}</p>
          </div>

          <div className="profile-actions">
            <button className="btn btn-primary" onClick={() => navigate('/settings')}>Edit Profile</button>
            <button className="btn btn-secondary" onClick={() => navigate('/upload')}>Upload</button>
          </div>
        </div>
      </div>

      <div className="profile-stats">
        <div className="stat-card">
          <div className="stat-icon">🎨</div>
          <div className="stat-content">
            <h3>0</h3>
            <p>Artworks</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-content">
            <h3>0</h3>
            <p>Followers</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">➡️</div>
          <div className="stat-content">
            <h3>0</h3>
            <p>Following</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">👁️</div>
          <div className="stat-content">
            <h3>0.0K</h3>
            <p>Views</p>
          </div>
        </div>
      </div>

      <div className="profile-tabs">
        <button className="tab-btn active">Artworks</button>
        <button className="tab-btn">Drafts</button>
        <button className="tab-btn">Analytics</button>
      </div>

      <div className="tab-content">
        <p style={{ padding: '1rem' }}>Dashboard content (artworks, drafts, analytics) will appear here.</p>
      </div>
    </div>
  );
}
