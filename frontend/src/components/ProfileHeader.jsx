import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditProfileModal from './EditProfileModal';
import StatsBar from './StatsBar';
import FollowButton from './FollowButton';
import FollowersModal from './FollowersModal';
import { MessageCircle } from 'lucide-react';
import { useUserStats } from '../hooks/useUserStats';

const ProfileHeader = ({ user, onUploadArtwork }) => {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [followersModalType, setFollowersModalType] = useState('followers');

  const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const isOwnProfile = currentUser?._id === user?._id || currentUser?.id === user?._id;

  // Fetch real-time stats
  const { stats, loading: statsLoading } = useUserStats(user?._id, isOwnProfile);

  const website = user?.profile?.website?.startsWith('http')
    ? user.profile.website
    : user?.profile?.website
    ? `https://${user.profile.website}`
    : '';

  const followersCount = stats.followers || user.followers?.length || 0;
  const followingCount = stats.following || user.following?.length || 0;

  // Check if current user is following this profile
  const isFollowing = user.isFollowing !== undefined 
    ? user.isFollowing 
    : user.followers?.some(follower => {
        const followerId = typeof follower === 'object' ? follower._id : follower;
        const currentUserId = currentUser?._id || currentUser?.id;
        return followerId?.toString() === currentUserId?.toString();
      }) || false;

  // Handlers for clickable stats
  const handleFollowersClick = () => {
    setFollowersModalType('followers');
    setShowFollowersModal(true);
  };

  const handleFollowingClick = () => {
    setFollowersModalType('following');
    setShowFollowersModal(true);
  };

  const handlePostsClick = () => {
    // Scroll to artworks section or navigate to tab
    const artworksSection = document.querySelector('.artworks-grid, .ig-grid');
    if (artworksSection) {
      artworksSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSalesClick = () => {
    // Could open sales modal or navigate to sales page
    console.log('Sales clicked');
  };

  const handlePurchasesClick = () => {
    // Scroll to purchases section
    const purchasesSection = document.querySelector('.buyer-content');
    if (purchasesSection) {
      purchasesSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // Navigate to chat with this user
 const handleMessageUser = () => {
  console.log("💬 Message button clicked for:", user._id);

  if (!user?._id) {
    console.error("⚠️ Cannot open chat — user ID missing!");
    return;
  }

  const chatUrl = `/messages?user=${encodeURIComponent(user._id)}`;
  console.log("➡️ Navigating to:", chatUrl);

  navigate(chatUrl, { replace: false });
};

  return (
    <div className="profile-header">
      <div className="profile-header-content">
        <img
          src={user?.profile?.avatar || '/assets/default-avatar.png'}
          alt={user?.username || 'User'}
          className="profile-avatar"
        />

        <div className="profile-info">
          <div className="profile-name-section">
            <h2 className="profile-name">{user?.username}</h2>
          </div>

          <StatsBar
            stats={{
              posts: stats.posts || 0,
              followers: followersCount,
              following: followingCount,
              sales: stats.sales || 0,
              purchases: stats.purchases || 0
            }}
            role={user.role}
            loading={statsLoading}
            onFollowersClick={handleFollowersClick}
            onFollowingClick={handleFollowingClick}
            onPostsClick={user.role === 'artist' ? handlePostsClick : undefined}
            onSalesClick={user.role === 'artist' ? handleSalesClick : undefined}
            onPurchasesClick={user.role === 'buyer' ? handlePurchasesClick : undefined}
          />

          {user?.profile?.bio && (
            <p className="profile-bio">{user.profile.bio}</p>
          )}

          {website && (
            <p className="profile-join-date">
              <a href={website} target="_blank" rel="noreferrer" className="underline">
                {user.profile.website}
              </a>
            </p>
          )}

          {/* ✅ Conditional Action Buttons */}
          <div className="profile-actions">
            {isOwnProfile ? (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => setIsEditModalOpen(true)}
                >
                  Edit Profile
                </button>
                {user?.role === 'artist' && (
                  <button className="btn btn-secondary" onClick={onUploadArtwork}>
                    Upload Artwork
                  </button>
                )}
              </>
            ) : (
              <>
                {/* ✅ Follow Button */}
                <FollowButton
                  key={`follow-${user._id}-${isFollowing}`}
                  userId={user._id}
                  initialIsFollowing={isFollowing}
                  initialFollowerCount={followersCount}
                  variant="primary"
                  size="md"
                />
                
                {/* ✅ Message button */}
                <button className="btn btn-secondary" onClick={handleMessageUser}>
                  <MessageCircle size={18} />
                  Message
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {isEditModalOpen && isOwnProfile && (
        <EditProfileModal user={user} onClose={() => setIsEditModalOpen(false)} />
      )}

      {showFollowersModal && (
        <FollowersModal
          userId={user._id}
          type={followersModalType}
          onClose={() => setShowFollowersModal(false)}
        />
      )}
    </div>
  );
};

export default ProfileHeader;
