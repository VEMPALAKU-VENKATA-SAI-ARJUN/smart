// src/pages/Dashboard.jsx
import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { 
  User, Image as ImageIcon, Eye, Heart, 
  Clock, CheckCircle, XCircle, AlertCircle, Plus,
  Calendar
} from "lucide-react";
import axios from "axios";
import http from '../lib/http';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [userArtworks, setUserArtworks] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    drafts: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    totalViews: 0,
    totalFavorites: 0
  });
  const [user, setUser] = useState(null);

  useEffect(() => {
    const controller = new AbortController();
    const userData = localStorage.getItem('auth_user');
    if (userData) {
      setUser(JSON.parse(userData));
    }
    fetchUserArtworks(controller.signal);
    return () => controller.abort();
  }, []);

  const fetchUserArtworks = async (signal) => {
    try {
      const token = localStorage.getItem('auth_token');
      const userData = localStorage.getItem('auth_user');
      
      if (!token || !userData) {
        console.log('No token or user data found, redirecting to auth');
        navigate('/auth');
        return;
      }

      const user = JSON.parse(userData);
      console.log('User data from localStorage:', user);
      
      // Handle different possible user ID fields
      const userId = user.id || user._id || user.userId;
      
      if (!userId) {
        console.log('No user ID found in user data, redirecting to auth');
        navigate('/auth');
        return;
      }

      console.log('Fetching artworks for user ID:', userId);
      const headers = { Authorization: `Bearer ${token}` };
      const resp = await http.get(`/api/users/${userId}/artworks?all=true`, { signal, headers, dedupeKey: `my-artworks:${userId}` });
      const artworks = resp?.data?.data ?? resp?.data ?? [];
      console.log('Setting artworks:', artworks.length);
      console.log('Artworks data:', artworks);
      
      setUserArtworks(artworks);

      // Calculate statistics
      const statistics = {
        total: artworks.length,
        drafts: artworks.filter(art => art.status === 'draft').length,
        pending: artworks.filter(art => art.status === 'pending').length,
        approved: artworks.filter(art => art.status === 'approved').length,
        rejected: artworks.filter(art => art.status === 'rejected').length,
        totalViews: artworks.reduce((sum, art) => sum + (art.stats?.views || 0), 0),
        totalFavorites: artworks.reduce((sum, art) => sum + (art.stats?.favorites || 0), 0)
      };
      
      console.log('Calculated statistics:', statistics);
      setStats(statistics);
    } catch (error) {
      if (error.name === 'AbortError') return;
      console.error('Error fetching artworks:', error);
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('auth_user');
        navigate('/auth');
      }
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'approved': return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending': return <Clock className="w-4 h-4 text-yellow-500" />;
      case 'rejected': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <AlertCircle className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'rejected': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Welcome back, {user?.username || 'Artist'}!
        </h1>
        <p className="text-gray-600">
          Manage your artworks, track performance, and grow your creative presence.
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Artworks</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
            <ImageIcon className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Drafts</p>
              <p className="text-2xl font-bold text-gray-600">{stats.drafts}</p>
            </div>
            <AlertCircle className="w-8 h-8 text-gray-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Review</p>
              <p className="text-2xl font-bold text-yellow-600">{stats.pending}</p>
            </div>
            <Clock className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Views</p>
              <p className="text-2xl font-bold text-green-600">{stats.totalViews}</p>
            </div>
            <Eye className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Favorites</p>
              <p className="text-2xl font-bold text-red-600">{stats.totalFavorites}</p>
            </div>
            <Heart className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white rounded-lg shadow-md p-6 mb-8">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">Quick Actions</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Link
            to="/upload"
            className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
          >
            <Plus className="w-6 h-6 text-blue-600 mr-3" />
            <div>
              <h3 className="font-medium text-blue-900">Upload New Artwork</h3>
              <p className="text-sm text-blue-600">Share your latest creation</p>
            </div>
          </Link>

          <Link
            to={`/profile/${user?.id}`}
            className="flex items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors"
          >
            <User className="w-6 h-6 text-green-600 mr-3" />
            <div>
              <h3 className="font-medium text-green-900">Edit Profile</h3>
              <p className="text-sm text-green-600">Update your information</p>
            </div>
          </Link>

          <Link
            to="/gallery"
            className="flex items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors"
          >
            <ImageIcon className="w-6 h-6 text-purple-600 mr-3" />
            <div>
              <h3 className="font-medium text-purple-900">Browse Gallery</h3>
              <p className="text-sm text-purple-600">Explore other artworks</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Recent Artworks */}
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-semibold text-gray-900">Your Artworks</h2>
          {userArtworks.length > 0 && (
            <Link
              to="/upload"
              className="text-blue-600 hover:text-blue-800 font-medium"
            >
              Upload More
            </Link>
          )}
        </div>

        {userArtworks.length === 0 ? (
          <div className="text-center py-12">
            <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No artworks yet</h3>
            <p className="text-gray-600 mb-6">
              Start sharing your creativity with the world!
            </p>
            <Link
              to="/upload"
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Plus className="w-4 h-4 mr-2" />
              Upload Your First Artwork
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {userArtworks.slice(0, 6).map((artwork) => (
              <div key={artwork._id} className="border rounded-lg overflow-hidden hover:shadow-lg transition-shadow">
                <div className="aspect-square bg-gray-200 relative">
                  {artwork.images && artwork.images[0] ? (
                    <img
                      src={artwork.images[0].url}
                      alt={artwork.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <ImageIcon className="w-12 h-12 text-gray-400" />
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(artwork.status)}`}>
                      {getStatusIcon(artwork.status)}
                      <span className="ml-1 capitalize">{artwork.status}</span>
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <h3 className="font-medium text-gray-900 truncate">{artwork.title}</h3>
                  <p className="text-sm text-gray-600 mt-1">₹{artwork.price}</p>
                  <div className="flex items-center justify-between mt-3 text-sm text-gray-500">
                    <div className="flex items-center">
                      <Eye className="w-4 h-4 mr-1" />
                      {artwork.stats?.views || 0}
                    </div>
                    <div className="flex items-center">
                      <Heart className="w-4 h-4 mr-1" />
                      {artwork.stats?.favorites || 0}
                    </div>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-1" />
                      {new Date(artwork.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {userArtworks.length > 6 && (
          <div className="text-center mt-6">
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              View All Artworks ({userArtworks.length})
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
