// src/pages/Admin.jsx - AI Moderation Admin Dashboard
import { useState, useEffect } from 'react';
import { 
  Bot, BarChart3, Settings, Users, Image as ImageIcon, 
  TrendingUp, AlertTriangle, Check, X, RefreshCw,
  Clock, Zap, Shield, Activity
} from 'lucide-react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function Admin() {
  const [stats, setStats] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [recentActivity, setRecentActivity] = useState([]);
  const [loading, setLoading] = useState(true);
  const [batchProcessing, setBatchProcessing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const headers = { Authorization: `Bearer ${token}` };

      // Fetch multiple data sources in parallel
      const [aiStatsRes, queueRes] = await Promise.all([
        axios.get(`${API_URL}/api/moderation/ai-stats?days=30`, { headers }),
        axios.get(`${API_URL}/api/moderation/queue?limit=5`, { headers })
      ]);

      setAiStats(aiStatsRes.data.data);
      setRecentActivity(queueRes.data.data);

      // Calculate overall stats
      const totalArtworks = aiStatsRes.data.data.totalProcessed;
      const autoApproved = aiStatsRes.data.data.autoApproved;
      const flagged = aiStatsRes.data.data.flaggedForReview;
      const rejected = aiStatsRes.data.data.rejected;

      setStats({
        totalArtworks,
        autoApproved,
        flagged,
        rejected,
        efficiency: totalArtworks > 0 ? ((autoApproved / totalArtworks) * 100).toFixed(1) : 0,
        flagRate: totalArtworks > 0 ? ((flagged / totalArtworks) * 100).toFixed(1) : 0
      });

    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const runBatchModeration = async () => {
    if (!confirm('Run AI moderation on all pending artworks? This may take several minutes.')) return;
    
    setBatchProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post(`${API_URL}/api/moderation/batch-moderate`, {
        limit: 100,
        autoApprove: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      alert(`Batch moderation completed! Processed ${res.data.data.processed} artworks.`);
      fetchDashboardData();
    } catch (error) {
      console.error('Batch moderation failed:', error);
      alert('Batch moderation failed. Please try again.');
    } finally {
      setBatchProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-500" />
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="w-8 h-8 text-blue-500" />
            AI Moderation Admin
          </h1>
          <p className="text-gray-600 mt-2">Monitor and manage AI-powered content moderation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
          <button
            onClick={runBatchModeration}
            disabled={batchProcessing}
            className="px-4 py-2 bg-purple-500 text-white rounded-lg hover:bg-purple-600 disabled:opacity-50 flex items-center gap-2"
          >
            {batchProcessing ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {batchProcessing ? 'Processing...' : 'Batch Process All'}
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">AI Efficiency</p>
              <p className="text-3xl font-bold text-green-600">{stats?.efficiency}%</p>
              <p className="text-xs text-gray-500">Auto-approval rate</p>
            </div>
            <TrendingUp className="w-8 h-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Processed</p>
              <p className="text-3xl font-bold text-blue-600">{stats?.totalArtworks || 0}</p>
              <p className="text-xs text-gray-500">Last 30 days</p>
            </div>
            <Bot className="w-8 h-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Flag Rate</p>
              <p className="text-3xl font-bold text-yellow-600">{stats?.flagRate}%</p>
              <p className="text-xs text-gray-500">Requires review</p>
            </div>
            <AlertTriangle className="w-8 h-8 text-yellow-500" />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Rejected</p>
              <p className="text-3xl font-bold text-red-600">{stats?.rejected || 0}</p>
              <p className="text-xs text-gray-500">Auto-rejected</p>
            </div>
            <X className="w-8 h-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* AI Performance Analytics */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            AI Performance Analytics
          </h2>

          {aiStats && (
            <div className="space-y-6">
              {/* Score Distribution */}
              <div>
                <h3 className="font-medium mb-3">Content Analysis Scores</h3>
                <div className="space-y-3">
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average NSFW Score</span>
                      <span className="font-medium">{(aiStats.averageNsfwScore * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full" 
                        style={{ width: `${aiStats.averageNsfwScore * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-1">
                      <span>Average Plagiarism Score</span>
                      <span className="font-medium">{(aiStats.averagePlagiarismScore * 100).toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-purple-500 h-2 rounded-full" 
                        style={{ width: `${aiStats.averagePlagiarismScore * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Flag Types Distribution */}
              {aiStats.flagTypes && Object.keys(aiStats.flagTypes).length > 0 && (
                <div>
                  <h3 className="font-medium mb-3">Common Flag Types</h3>
                  <div className="space-y-2">
                    {Object.entries(aiStats.flagTypes).map(([type, count]) => (
                      <div key={type} className="flex justify-between items-center">
                        <span className="text-sm capitalize">{type.replace('_', ' ')}</span>
                        <span className="bg-gray-100 px-2 py-1 rounded text-sm font-medium">{count}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Processing Stats */}
              <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                <div className="text-center">
                  <p className="text-2xl font-bold text-green-600">{aiStats.autoApproved}</p>
                  <p className="text-sm text-gray-600">Auto-Approved</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-yellow-600">{aiStats.flaggedForReview}</p>
                  <p className="text-sm text-gray-600">Flagged</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
            <Activity className="w-5 h-5 text-green-500" />
            Recent Moderation Activity
          </h2>

          {recentActivity.length > 0 ? (
            <div className="space-y-4">
              {recentActivity.map((artwork) => (
                <div key={artwork._id} className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg">
                  <img
                    src={artwork.thumbnail}
                    alt={artwork.title}
                    className="w-12 h-12 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="font-medium truncate">{artwork.title}</p>
                    <p className="text-sm text-gray-500">by {artwork.artist?.username}</p>
                    <div className="flex items-center gap-2 mt-1">
                      {artwork.moderationStatus.flaggedReasons.length > 0 ? (
                        <span className="inline-flex items-center gap-1 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          Flagged
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-green-600">
                          <Check className="w-3 h-3" />
                          Clean
                        </span>
                      )}
                      <span className="text-xs text-gray-500">
                        NSFW: {(artwork.moderationStatus.nsfwScore * 100).toFixed(0)}%
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">
                      {new Date(artwork.createdAt).toLocaleDateString()}
                    </p>
                    <span className={`inline-block px-2 py-1 rounded text-xs font-medium ${
                      artwork.status === 'approved' ? 'bg-green-100 text-green-700' :
                      artwork.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                      artwork.status === 'rejected' ? 'bg-red-100 text-red-700' :
                      'bg-gray-100 text-gray-700'
                    }`}>
                      {artwork.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <Clock className="w-12 h-12 mx-auto mb-3 text-gray-300" />
              <p>No recent activity</p>
            </div>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-8 bg-white rounded-lg shadow-md p-6">
        <h2 className="text-xl font-semibold mb-6 flex items-center gap-2">
          <Settings className="w-5 h-5 text-gray-500" />
          Quick Actions
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => window.location.href = '/moderation-queue'}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <ImageIcon className="w-6 h-6 text-blue-500 mb-2" />
            <h3 className="font-medium">Review Queue</h3>
            <p className="text-sm text-gray-600">Review flagged artworks</p>
          </button>
          
          <button
            onClick={runBatchModeration}
            disabled={batchProcessing}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left disabled:opacity-50"
          >
            <Zap className="w-6 h-6 text-purple-500 mb-2" />
            <h3 className="font-medium">Batch Process</h3>
            <p className="text-sm text-gray-600">Run AI on pending items</p>
          </button>
          
          <button
            onClick={fetchDashboardData}
            className="p-4 border border-gray-200 rounded-lg hover:bg-gray-50 text-left"
          >
            <BarChart3 className="w-6 h-6 text-green-500 mb-2" />
            <h3 className="font-medium">Analytics</h3>
            <p className="text-sm text-gray-600">View detailed reports</p>
          </button>
        </div>
      </div>
    </div>
  );
}