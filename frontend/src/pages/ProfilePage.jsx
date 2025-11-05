import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import '../styles/ProfilePage.css';

import http from '../lib/http';
import { useAuth } from '../contexts/AuthContext';
import ProfileHeader from '../components/ProfileHeader';

// Helper: get analytics from artworks (placeholder)
function getAnalytics(artworks = []) {
  // Example: group by month, sum views/likes
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  const now = new Date();
  const views = Array(6).fill(0).map((_, i) => ({ month: months[(now.getMonth()-5+i+12)%12], value: 0 }));
  const followers = Array(6).fill(0).map((_, i) => ({ month: months[(now.getMonth()-5+i+12)%12], value: 0 }));
  // You can enhance this with real backend analytics if available
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
  const [activeTab, setActiveTab] = useState('artworks');

  // DEBUG: Log authUser and effect triggers
  console.log('ProfilePage render, authUser:', authUser);

  useEffect(() => {
    console.log('ProfilePage useEffect triggered, authUser:', authUser);
    if (!authUser?.id) {
      console.warn('authUser is missing or has no id, skipping fetch');
      return;
    }
    setLoading(true);
    setError('');
    const controller = new AbortController();
    Promise.all([
      http.get(`/api/users/${authUser.id}`, { signal: controller.signal }),
      http.get(`/api/users/${authUser.id}/artworks`, { signal: controller.signal }),
      http.get(`/api/users/${authUser.id}/artworks?status=draft`, { signal: controller.signal }),
      authUser.role === 'buyer' ? http.get(`/api/users/${authUser.id}/purchases`, { signal: controller.signal }).catch(() => ({ data: [] })) : Promise.resolve({ data: [] })
    ])
      .then(([userRes, artworksRes, draftsRes, purchasesRes]) => {
        setUser(userRes?.data || userRes);
        setArtworks(artworksRes?.data?.data || artworksRes?.data || []);
        setDrafts(draftsRes?.data?.data || draftsRes?.data || []);
        setPurchases(purchasesRes?.data?.purchases || purchasesRes?.data || []);
        console.log('ProfilePage fetch success:', { user: userRes, artworks: artworksRes, drafts: draftsRes, purchases: purchasesRes });
      })
      .catch((e) => {
        if (e.name === 'AbortError') {
          // Suppress AbortError in development (React StrictMode double-invoke)
          if (import.meta.env.DEV) {
            console.info('ProfilePage fetch aborted (expected in dev/StrictMode)');
            return;
          }
        }
        setError('Failed to load profile');
        console.error('ProfilePage fetch error:', e);
      })
      .finally(() => setLoading(false));
    return () => {
      console.log('ProfilePage cleanup: aborting fetches');
      controller.abort();
    };
  }, [authUser]);

  const handleEditProfile = () => {
    alert('Edit Profile clicked');
  };

  const handleUploadArtwork = () => {
    alert('Upload Artwork clicked');
  };

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

  // Analytics (placeholder, you can enhance)
  const analytics = getAnalytics(artworks);

  return (
    <div className="profile-page">
      <div className="profile-container">
        <ProfileHeader 
          user={user} 
          onEditProfile={handleEditProfile}
          onUploadArtwork={handleUploadArtwork}
        />
        <StatsBar stats={user.stats || {}} role={user.role} />
        {user.role === 'artist' ? (
          <div className="dashboard-content">
            <div className="tabs">
              <button className={`tab ${activeTab === 'artworks' ? 'active' : ''}`} onClick={() => setActiveTab('artworks')}>Artworks</button>
              <button className={`tab ${activeTab === 'drafts' ? 'active' : ''}`} onClick={() => setActiveTab('drafts')}>Drafts</button>
              <button className={`tab ${activeTab === 'analytics' ? 'active' : ''}`} onClick={() => setActiveTab('analytics')}>Analytics</button>
            </div>
            <div className="tab-content">
              {activeTab === 'artworks' && (
                <div className="artworks-grid fade-in">
                  {artworks.map(artwork => (
                    <ArtworkCard key={artwork._id || artwork.id} artwork={artwork} />
                  ))}
                </div>
              )}
              {activeTab === 'drafts' && (
                <div className="drafts-grid fade-in">
                  {drafts.map(draft => (
                    <DraftCard key={draft._id || draft.id} draft={draft} />
                  ))}
                </div>
              )}
              {activeTab === 'analytics' && (
                <div className="fade-in">
                  <AnalyticsDashboard analytics={analytics} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="buyer-content fade-in">
            <h2 className="section-title">My Purchases</h2>
            <div className="purchases-grid">
              {purchases.map(purchase => (
                <PurchaseCard key={purchase._id || purchase.id} purchase={purchase} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfilePage;
