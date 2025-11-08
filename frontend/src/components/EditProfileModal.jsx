import React, { useState } from 'react';
import http from '../lib/http';
import '../styles/EditProfileModal.css';

const EditProfileModal = ({ user, onClose }) => {
  const [bio, setBio] = useState(user?.profile?.bio || '');
  const [website, setWebsite] = useState(user?.profile?.website || '');
  const [avatar, setAvatar] = useState(user?.profile?.avatar || '');
  const [avatarFile, setAvatarFile] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = () => setAvatar(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSave = async () => {
  setLoading(true);
  try {
    let avatarUrl = avatar;

    // ✅ Optional: upload avatar
    if (avatarFile) {
      const formData = new FormData();
      formData.append('avatar', avatarFile);

      const res = await http.post(`/api/users/${user._id}/avatar`, formData);
      console.log('✅ Avatar upload response:', res);

      avatarUrl = res.url || res.data?.url || avatarUrl;
    }

    // ✅ Update profile info
    await http.put(`/api/users/${user._id}`, {
      profile: { bio, website, avatar: avatarUrl },
    });

    alert('Profile updated successfully!');
    window.location.reload();
  } catch (err) {
    console.error('Profile update failed:', err);
    alert('Failed to update profile.');
  } finally {
    setLoading(false);
  }
};


  return (
    <div className="edit-modal-backdrop">
      <div className="edit-modal">
        <h3>Edit Profile</h3>

        <div className="edit-avatar-section">
          <img src={avatar || '/assets/default-avatar.png'} alt="avatar" className="edit-avatar-preview" />
          <label className="edit-avatar-btn">
            Change Photo
            <input type="file" accept="image/*" onChange={handleImageChange} hidden />
          </label>
        </div>

        <label>Bio</label>
        <textarea
          value={bio}
          onChange={(e) => setBio(e.target.value)}
          rows="3"
        />

        <label>Website</label>
        <input
          type="text"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          placeholder="https://yourwebsite.com"
        />

        <div className="edit-modal-actions">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
