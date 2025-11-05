import { useState, useEffect } from 'react';
import { X, UserPlus, UserMinus, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import http from '../lib/http';

// Use Vite env or fallback to localhost backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function FollowersModal({ isOpen, onClose, userId, type, title }) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const controller = new AbortController();
    if (isOpen && userId && type) {
      fetchUsers(controller.signal);
    }
    return () => controller.abort();
  }, [isOpen, userId, type]);

  const fetchUsers = async (signal) => {
    try {
      setLoading(true);
      setError('');

      const endpoint = type === 'followers' ? 'followers' : 'following';
      const resp = await http.get(`/api/users/${userId}/${endpoint}`, { signal, dedupeKey: `users:${userId}:${endpoint}` });
      const data = resp?.data ?? null;
      setUsers(data?.data || data || []);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching users:', error);
      setError('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (targetUserId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
      await http.post(`/api/users/${targetUserId}/follow`, {}, { headers });
      // update local users list optimistically to avoid extra requests
      setUsers(prev => prev.map(u => u._id === targetUserId ? { ...u, followers: [...(u.followers || []), (user?.id)] } : u));
    } catch (error) {
      console.error('Error following user:', error);
    }
  };

  const handleUnfollow = async (targetUserId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
      await http.post(`/api/users/${targetUserId}/follow`, {}, { headers });
      setUsers(prev => prev.map(u => u._id === targetUserId ? { ...u, followers: (u.followers || []).filter(id => id !== user?.id) } : u));
    } catch (error) {
      console.error('Error unfollowing user:', error);
    }
  };

  const isFollowing = (targetUserId) => {
    // Check if current user is following this target user
    return user?.following?.includes(targetUserId);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full max-h-[80vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            {title}
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
            <div className="p-4 text-center">
              <p className="text-red-600">{error}</p>
              <button
                onClick={fetchUsers}
                className="mt-2 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Try Again
              </button>
            </div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">
                {type === 'followers' ? 'No followers yet' : 'Not following anyone yet'}
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-3">
              {users.map((targetUser) => (
                <div key={targetUser._id} className="flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg">
                  {/* Avatar */}
                  <img
                    src={targetUser.profile?.avatar || `https://ui-avatars.com/api/?name=${targetUser.username}&size=48`}
                    alt={targetUser.username}
                    className="w-12 h-12 rounded-full object-cover cursor-pointer"
                    onClick={() => {
                      navigate(`/artist/${targetUser._id}`);
                      onClose();
                    }}
                  />
                  
                  {/* User Info */}
                  <div className="flex-1 min-w-0">
                    <h3 
                      className="font-semibold text-gray-900 cursor-pointer hover:text-blue-600 truncate"
                      onClick={() => {
                        navigate(`/artist/${targetUser._id}`);
                        onClose();
                      }}
                    >
                      {targetUser.username}
                    </h3>
                    {targetUser.profile?.bio && (
                      <p className="text-sm text-gray-600 truncate">
                        {targetUser.profile.bio}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-1">
                      {targetUser.role === 'artist' && (
                        <span className="inline-block px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded-full">
                          Artist
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        {targetUser.followers?.length || 0} followers
                      </span>
                    </div>
                  </div>

                  {/* Action Button */}
                  {user && user.id !== targetUser._id && (
                    <div className="flex-shrink-0">
                      {isFollowing(targetUser._id) ? (
                        <button
                          onClick={() => handleUnfollow(targetUser._id)}
                          className="px-3 py-1.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                        >
                          <UserMinus className="w-3 h-3" />
                          Unfollow
                        </button>
                      ) : (
                        <button
                          onClick={() => handleFollow(targetUser._id)}
                          className="px-3 py-1.5 bg-blue-500 text-white hover:bg-blue-600 rounded-lg text-sm font-medium flex items-center gap-1 transition-colors"
                        >
                          <UserPlus className="w-3 h-3" />
                          Follow
                        </button>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}