import React from 'react';

const ProfileHeader = ({ user, onEditProfile, onUploadArtwork }) => {
  return (
    <div className="profile-header flex items-center justify-between p-4 bg-white rounded shadow mb-4">
      <div className="flex items-center gap-4">
        <img
          src={user?.profile?.avatar || '/assets/default-avatar.png'}
          alt={user?.username || 'User'}
          className="w-20 h-20 rounded-full object-cover border"
        />
        <div>
          <h2 className="text-2xl font-bold">{user?.username}</h2>
          <p className="text-gray-500">{user?.email}</p>
          {user?.profile?.bio && <p className="text-gray-700 mt-1">{user.profile.bio}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        <button className="btn btn-primary" onClick={onEditProfile}>Edit Profile</button>
        {user?.role === 'artist' && (
          <button className="btn btn-secondary" onClick={onUploadArtwork}>Upload Artwork</button>
        )}
      </div>
    </div>
  );
};

export default ProfileHeader;
