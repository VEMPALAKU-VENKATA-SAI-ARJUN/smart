import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import EditProfileModal from './EditProfileModal';
import StatsBar from './StatsBar';
import { MessageCircle } from 'lucide-react';

const ProfileHeader = ({ user, onUploadArtwork }) => {
  const navigate = useNavigate();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const isOwnProfile = currentUser?._id === user?._id || currentUser?.id === user?._id;

  const website = user?.profile?.website?.startsWith('http')
    ? user.profile.website
    : user?.profile?.website
    ? `https://${user.profile.website}`
    : '';

  const followersCount = user.followers?.length || 0;
  const followingCount = user.following?.length || 0;

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
              artworks: user.artworksCount || 0,
              followers: followersCount,
              following: followingCount,
              sales: user.stats?.sales || 0,
            }}
            role={user.role}
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
              // ✅ Message button for other profiles
              <button className="btn btn-primary" onClick={handleMessageUser}>
                <MessageCircle size={18} />
                Message
              </button>
            )}
          </div>
        </div>
      </div>

      {isEditModalOpen && isOwnProfile && (
        <EditProfileModal user={user} onClose={() => setIsEditModalOpen(false)} />
      )}
    </div>
  );
};

export default ProfileHeader;
