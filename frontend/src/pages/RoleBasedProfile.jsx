import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import ArtistProfile from './ArtistProfile';
import BuyerProfile from './BuyerProfile';
import ModeratorProfile from './ModeratorProfile';

export default function RoleBasedProfile() {
  const { id } = useParams();
  const { user } = useAuth();
  const [profileUser, setProfileUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    // If viewing own profile, use auth user; otherwise fetch by id
    if (user && user.id === id) {
      setProfileUser(user);
      setLoading(false);
    } else {
      // Fetch user by id (public profile)
      const controller = new AbortController();
      setLoading(true);
      fetch(`/api/users/${id}`, { signal: controller.signal })
        .then(res => res.json())
        .then(data => {
          if (controller.signal.aborted) return;
          if (data.success) setProfileUser(data.data);
          else setError(data.message || 'User not found');
        })
        .catch(e => {
          if (e.name !== 'AbortError') setError('Failed to load user');
        })
        .finally(() => {
          if (!controller.signal.aborted) setLoading(false);
        });
      return () => controller.abort();
    }
  }, [id, user]);

  if (loading) return <div className="text-center py-12">Loading profile...</div>;
  if (error || !profileUser) return <div className="text-center py-12 text-red-500">{error || 'User not found'}</div>;

  switch (profileUser.role) {
    case 'artist':
      return <ArtistProfile user={profileUser} />;
    case 'buyer':
      return <BuyerProfile user={profileUser} />;
    case 'moderator':
    case 'admin':
      return <ModeratorProfile user={profileUser} />;
    default:
      return <div className="text-center py-12">Unknown role</div>;
  }
}
