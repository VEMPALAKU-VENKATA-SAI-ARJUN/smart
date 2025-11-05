import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Heart, Eye, Users, UserPlus, Sparkles, TrendingUp } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import axios from 'axios';
import http from '../lib/http';

// Use Vite env or fallback to localhost backend
const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Following() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feedArtworks, setFeedArtworks] = useState([]);
  const [followingList, setFollowingList] = useState([]);
  const [suggestedArtists, setSuggestedArtists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('feed');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    const controller = new AbortController();
    fetchFollowingData(controller.signal);
    return () => controller.abort();
  }, [user]);

  const fetchFollowingData = async () => {
    try {
      setLoading(true);
      setError('');

      // Fetch following list
      const followingResp = await http.get(`/api/users/${user.id}/following`, { dedupeKey: `following-list:${user.id}` });
      const following = followingResp?.data?.data ?? followingResp?.data ?? [];
      setFollowingList(following);

      // Fetch feed artworks from followed artists
      if (following.length > 0) {
        const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
        const feedResp = await http.get('/api/artworks/feed', { headers, dedupeKey: `feed:${user.id}` });
        setFeedArtworks(feedResp?.data?.data ?? feedResp?.data ?? []);
      }

      // Fetch suggested artists
      const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
      const suggestionsResp = await http.get('/api/users/suggestions', { headers, dedupeKey: `suggestions:${user.id}` });
      setSuggestedArtists(suggestionsResp?.data?.data ?? suggestionsResp?.data ?? []);

    } catch (error) {
      console.error('Error fetching following data:', error);
      setError('Failed to load following data');
    } finally {
      setLoading(false);
    }
  };

  const handleFollow = async (artistId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
      await http.post(`/api/users/${artistId}/follow`, {}, { headers });
      // Refresh data (dedupe will help avoid duplicate heavy calls)
      fetchFollowingData();
    } catch (error) {
      console.error('Error following artist:', error);
    }
  };

  const handleUnfollow = async (artistId) => {
    try {
      const headers = { Authorization: `Bearer ${localStorage.getItem('auth_token')}` };
      await http.post(`/api/users/${artistId}/follow`, {}, { headers });
      fetchFollowingData();
    } catch (error) {
      console.error('Error unfollowing artist:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Following</h1>
        <p className="text-gray-600">Stay updated with your favorite artists</p>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-600">{error}</p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-6 mb-8 border-b">
        <button
          onClick={() => setActiveTab('feed')}
          className={`pb-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'feed'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          Feed ({feedArtworks.length})
        </button>
        <button
          onClick={() => setActiveTab('following')}
          className={`pb-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'following'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Following ({followingList.length})
        </button>
        <button
          onClick={() => setActiveTab('suggestions')}
          className={`pb-3 font-medium transition-colors flex items-center gap-2 ${
            activeTab === 'suggestions'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          <TrendingUp className="w-4 h-4" />
          Discover
        </button>
      </div>

      {/* Content */}
      {activeTab === 'feed' && (
        <div>
          {followingList.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Following Yet</h3>
              <p className="text-gray-500 mb-6">
                Follow artists to see their latest artworks in your feed
              </p>
              <button
                onClick={() => setActiveTab('suggestions')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Discover Artists
              </button>
            </div>
          ) : feedArtworks.length === 0 ? (
            <div className="text-center py-16">
              <Sparkles className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No New Artworks</h3>
              <p className="text-gray-500">
                The artists you follow haven't posted anything recently
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {feedArtworks.map((artwork) => (
                <div key={artwork._id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <div className="relative">
                    <img
                      src={artwork.thumbnail}
                      alt={artwork.title}
                      className="w-full h-48 object-cover"
                    />
                    <div className="absolute top-3 right-3">
                      <span className="bg-black bg-opacity-50 text-white px-2 py-1 rounded text-sm">
                        ₹{artwork.price}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <img
                        src={artwork.artist?.profile?.avatar || `https://ui-avatars.com/api/?name=${artwork.artist?.username}&size=32`}
                        alt={artwork.artist?.username}
                        className="w-6 h-6 rounded-full"
                      />
                      <span className="text-sm text-gray-600">
                        {artwork.artist?.username}
                      </span>
                    </div>
                    <h3 className="font-semibold text-lg mb-2">{artwork.title}</h3>
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {artwork.description}
                    </p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-500">
                        <span className="flex items-center gap-1">
                          <Eye className="w-4 h-4" />
                          {artwork.stats?.views || 0}
                        </span>
                        <span className="flex items-center gap-1">
                          <Heart className="w-4 h-4" />
                          {artwork.stats?.likes || 0}
                        </span>
                      </div>
                      <button
                        onClick={() => navigate(`/artwork/${artwork._id}`)}
                        className="text-blue-500 hover:text-blue-600 font-medium text-sm"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'following' && (
        <div>
          {followingList.length === 0 ? (
            <div className="text-center py-16">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">Not Following Anyone</h3>
              <p className="text-gray-500 mb-6">
                Start following artists to build your network
              </p>
              <button
                onClick={() => setActiveTab('suggestions')}
                className="px-6 py-3 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
              >
                Find Artists to Follow
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {followingList.map((artist) => (
                <div key={artist._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={artist.profile?.avatar || `https://ui-avatars.com/api/?name=${artist.username}&size=64`}
                      alt={artist.username}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{artist.username}</h3>
                      {artist.role === 'artist' && (
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          Artist
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {artist.profile?.bio && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {artist.profile.bio}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {artist.followers?.length || 0} followers
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/artist/${artist._id}`)}
                        className="px-3 py-1 text-blue-500 hover:text-blue-600 text-sm font-medium"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleUnfollow(artist._id)}
                        className="px-3 py-1 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded text-sm font-medium"
                      >
                        Unfollow
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'suggestions' && (
        <div>
          {suggestedArtists.length === 0 ? (
            <div className="text-center py-16">
              <TrendingUp className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">No Suggestions Available</h3>
              <p className="text-gray-500">
                Check back later for artist recommendations
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {suggestedArtists.map((artist) => (
                <div key={artist._id} className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
                  <div className="flex items-center gap-4 mb-4">
                    <img
                      src={artist.profile?.avatar || `https://ui-avatars.com/api/?name=${artist.username}&size=64`}
                      alt={artist.username}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <h3 className="font-semibold text-lg">{artist.username}</h3>
                      {artist.role === 'artist' && (
                        <span className="inline-block px-2 py-1 bg-purple-100 text-purple-700 text-xs rounded-full">
                          Artist
                        </span>
                      )}
                    </div>
                  </div>
                  
                  {artist.profile?.bio && (
                    <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                      {artist.profile.bio}
                    </p>
                  )}
                  
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-500">
                      {artist.followers?.length || 0} followers
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/artist/${artist._id}`)}
                        className="px-3 py-1 text-blue-500 hover:text-blue-600 text-sm font-medium"
                      >
                        View Profile
                      </button>
                      <button
                        onClick={() => handleFollow(artist._id)}
                        className="px-3 py-1 bg-blue-500 text-white hover:bg-blue-600 rounded text-sm font-medium flex items-center gap-1"
                      >
                        <UserPlus className="w-3 h-3" />
                        Follow
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}