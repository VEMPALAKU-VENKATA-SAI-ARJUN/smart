import React, { useState, useEffect } from 'react';
import '../styles/ProfilePage.css';

import http from '../lib/http';
import { useAuth } from '../contexts/AuthContext';
import ProfileHeader from '../components/ProfileHeader';
import StatsBar from '../components/StatsBar';
import ArtworkCard from '../components/ArtworkCard';
import ArtworkModal from '../components/ArtworkModal';

const TABS = {
  ARTWORKS: 'artworks',
  DRAFTS: 'drafts',
  ANALYTICS: 'analytics',
  POSTS: 'posts',
  REELS: 'reels',
  TAGGED: 'tagged',
};

function getAnalytics(artworks = []) {
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const views = Array(6).fill(0).map((_, i) => ({ month: months[(now.getMonth()-5+i+12)%12], value: 0 }));
  const followers = Array(6).fill(0).map((_, i) => ({ month: months[(now.getMonth()-5+i+12)%12], value: 0 }));
  return { views, followers };
}

const ProfilePage = () => {
  const { user: authUser } = useAuth();
  const [user, setUser] = useState(null);
  const [artworks, setArtworks] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState(TABS.ARTWORKS);

  // Layout mode: 'cards' (your current) vs 'ig' (Instagram grid)
  const [layoutMode, setLayoutMode] = useState('cards');

  // Modal state
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!authUser?.id && !authUser?._id) return;
    setLoading(true);
    setError('');
    const controller = new AbortController();
    const uid = authUser.id || authUser._id;

    Promise.all([
      http.get(`/api/users/${uid}`, { signal: controller.signal }),
      http.get(`/api/users/${uid}/artworks`, { signal: controller.signal }),
      http.get(`/api/users/${uid}/artworks?status=draft`, { signal: controller.signal }),
      authUser.role === 'buyer'
        ? http.get(`/api/users/${uid}/purchases`, { signal: controller.signal }).catch(() => ({ data: [] }))
        : Promise.resolve({ data: [] })
    ])
      .then(([userRes, artworksRes, draftsRes, purchasesRes]) => {
        setUser(userRes?.data || userRes);
        setArtworks(artworksRes?.data?.data || artworksRes?.data || []);
        setDrafts(draftsRes?.data?.data || draftsRes?.data || []);
        setPurchases(purchasesRes?.data?.purchases || purchasesRes?.data || []);
      })
      .catch((e) => {
        if (e.name !== 'AbortError') {
          setError('Failed to load profile');
          console.error('ProfilePage fetch error:', e);
        }
      })
      .finally(() => setLoading(false));

    return () => controller.abort();
  }, [authUser]);

  const handleEditProfile = () => alert('Edit Profile clicked');
  const handleUploadArtwork = () => alert('Upload Artwork clicked');

  const openArtworkModal = (aw) => { setSelectedArtwork(aw); setIsModalOpen(true); };
  const closeArtworkModal = () => { setSelectedArtwork(null); setIsModalOpen(false); };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error || !user) {
    return <div className="text-center py-12 text-red-500">{error || 'User not found'}</div>;
  }

  const analytics = getAnalytics(artworks);
  const isArtist = user.role === 'artist';

  return (
    <div className="profile-page">
      <div className="profile-container">
        <ProfileHeader user={user} onEditProfile={handleEditProfile} onUploadArtwork={handleUploadArtwork} />
        <StatsBar stats={user.stats || {}} role={user.role} />

        {/* Top-level tabs (Instagram style) always visible */}
        <div className="tabs">
          <button className={`tab ${activeTab === TABS.POSTS ? 'active' : ''}`} onClick={() => setActiveTab(TABS.POSTS)}>Posts</button>
          <button className={`tab ${activeTab === TABS.REELS ? 'active' : ''}`} onClick={() => setActiveTab(TABS.REELS)}>Reels</button>
          <button className={`tab ${activeTab === TABS.TAGGED ? 'active' : ''}`} onClick={() => setActiveTab(TABS.TAGGED)}>Tagged</button>

          {/* Artist-only dashboard tabs on the right */}
          {isArtist && (
            <div style={{ marginLeft: 'auto', display: 'flex' }}>
              <button className={`tab ${activeTab === TABS.ARTWORKS ? 'active' : ''}`} onClick={() => setActiveTab(TABS.ARTWORKS)}>Artworks</button>
              <button className={`tab ${activeTab === TABS.DRAFTS ? 'active' : ''}`} onClick={() => setActiveTab(TABS.DRAFTS)}>Drafts</button>
              <button className={`tab ${activeTab === TABS.ANALYTICS ? 'active' : ''}`} onClick={() => setActiveTab(TABS.ANALYTICS)}>Analytics</button>
            </div>
          )}
        </div>

        {/* Layout toggle for Artworks/Posts */}
        {(activeTab === TABS.ARTWORKS || activeTab === TABS.POSTS) && (
          <div className="ig-layout-toggle">
            <button
              className={`ig-toggle-btn ${layoutMode === 'cards' ? 'active' : ''}`}
              onClick={() => setLayoutMode('cards')}
            >
              Card Grid
            </button>
            <button
              className={`ig-toggle-btn ${layoutMode === 'ig' ? 'active' : ''}`}
              onClick={() => setLayoutMode('ig')}
            >
              Instagram Grid
            </button>
          </div>
        )}

        {/* Content */}
        <div className="tab-content">
          {(activeTab === TABS.ARTWORKS || activeTab === TABS.POSTS) && (
            layoutMode === 'cards' ? (
              <div className="artworks-grid fade-in">
                {artworks.map(aw => (
                  <div key={aw._id} onClick={() => openArtworkModal(aw)} style={{ cursor: 'pointer' }}>
                    <ArtworkCard artwork={aw} currentUser={authUser} />
                  </div>
                ))}
              </div>
            ) : (
              <div className="ig-grid fade-in">
                {artworks.map((aw) => (
                  <button
                    key={aw._id}
                    className="ig-grid-item"
                    onClick={() => openArtworkModal(aw)}
                    title={aw.title}
                  >
                    <img src={aw.thumbnail || aw.images?.[0]?.url} alt={aw.title} className="ig-grid-image" />
                    <div className="ig-grid-hover">
                      <div className="ig-grid-stat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 6 
                        3.99 4 6.5 4c1.74 0 3.41 1 4.13 2.44h.74C13.09 5 14.76 4 16.5 4 19.01 4 21 6 21 
                        8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>
                        <span>{aw.stats?.likes || 0}</span>
                      </div>
                      <div className="ig-grid-stat">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M21 6h-2v9H7v2c0 .55.45 1 1 1h9l4 4V7c0-.55-.45-1-1-1zM17 12V3c0-.55-.45-1-1-1H3c-.55 
                        0-1 .45-1 1v14l4-4h10c.55 0 1-.45 1-1z"/></svg>
                        <span>{aw.stats?.comments || 0}</span>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )
          )}

          {activeTab === TABS.DRAFTS && isArtist && (
            <div className="drafts-grid fade-in">
              {drafts.map(d => (
                <div key={d._id} className="draft-card">
                  <div className="draft-image-container">
                    <img className="draft-image" src={d.thumbnail || d.images?.[0]?.url} alt={d.title} />
                    <span className="draft-badge">Draft</span>
                  </div>
                  <div className="draft-info">
                    <h4 className="draft-title">{d.title}</h4>
                    <div className="draft-edited">Last edited just now</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === TABS.ANALYTICS && isArtist && (
            <div className="fade-in">
              {/* Placeholder – keep your original AnalyticsDashboard integration here */}
              <div className="analytics-card">
                <div className="analytics-title">Analytics (placeholder)</div>
                <p>Hook your charts here as before.</p>
              </div>
            </div>
          )}

          {activeTab === TABS.REELS && (
            <div className="ig-empty">
              <div className="ig-empty-icon">🎞️</div>
              <p>No reels yet</p>
            </div>
          )}

          {activeTab === TABS.TAGGED && (
            <div className="ig-empty">
              <div className="ig-empty-icon">🏷️</div>
              <p>No tagged posts yet</p>
            </div>
          )}

          {user.role !== 'artist' && activeTab === TABS.ARTWORKS && (
            <div className="buyer-content fade-in">
              <h2 className="section-title">My Purchases</h2>
              <div className="purchases-grid">
                {purchases.map(p => (
                  <div key={p._id} className="purchase-card">
                    <img className="purchase-image" src={p.thumbnail} alt={p.title} />
                    <div className="purchase-info">
                      <h4 className="purchase-title">{p.title}</h4>
                      <div className="purchase-artist">{p.artist?.username}</div>
                      <div className="purchase-meta">
                        <div className="purchase-price">${Number(p.price).toLocaleString()}</div>
                        <div className="purchase-date">Purchased</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <ArtworkModal
          artwork={selectedArtwork}
          isOpen={isModalOpen}
          onClose={closeArtworkModal}
          currentUser={authUser}
        />
      </div>
    </div>
  );
};

export default ProfilePage;
