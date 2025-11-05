// src/pages/ModerationQueue.jsx - Optimized AI Moderation
import { useState, useEffect, useCallback, useMemo } from 'react';
import { Check, X, RefreshCw, AlertTriangle, BarChart3, Zap, Filter, Search, Clock } from 'lucide-react';
import axios from 'axios';
import '../styles/ModerationQueue.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ModerationQueue() {
  const [artworks, setArtworks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedArtwork, setSelectedArtwork] = useState(null);
  const [aiStats, setAiStats] = useState(null);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [filters, setFilters] = useState({
    flagType: '',
    sortBy: 'oldest',
    searchTerm: ''
  });
  const [searchInput, setSearchInput] = useState(''); // Separate state for input
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0
  });
  const [selectedIds, setSelectedIds] = useState([]);
  const [bulkMode, setBulkMode] = useState(false);
  const [refreshingStats, setRefreshingStats] = useState(false);

  useEffect(() => {
    fetchPendingArtworks();
    fetchAiStats();
  }, []);

  useEffect(() => {
    fetchPendingArtworks();
  }, [filters, pagination.page]);

  // Debounced search effect
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchInput !== filters.searchTerm) {
        setFilters(prev => ({ ...prev, searchTerm: searchInput }));
        setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
      }
    }, 500); // 500ms delay

    return () => clearTimeout(timeoutId);
  }, [searchInput, filters.searchTerm]);

  const fetchPendingArtworks = useCallback(async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('auth_token');
      const params = new URLSearchParams({
        page: pagination.page.toString(),
        limit: pagination.limit.toString(),
        ...(filters.flagType && { flagType: filters.flagType }),
        ...(filters.searchTerm && { search: filters.searchTerm })
      });

      const res = await axios.get(`${API_URL}/api/moderation/queue?${params}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setArtworks(res.data.data);
      setPagination(prev => ({
        ...prev,
        total: res.data.pagination?.total || 0,
        pages: res.data.pagination?.pages || 0
      }));
    } catch (error) {
      console.error('Failed to fetch queue:', error);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.limit]);

  const fetchAiStats = async () => {
    setRefreshingStats(true);
    try {
      const token = localStorage.getItem('auth_token');

      const res = await axios.get(`${API_URL}/api/moderation/ai-stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (res.data.success) {
        setAiStats(res.data.data);
        console.log('✅ AI stats refreshed successfully');
      } else {
        throw new Error(res.data.message || 'Failed to fetch AI stats');
      }

    } catch (error) {
      console.error('Failed to fetch AI stats:', error);
      alert('Failed to refresh AI stats: ' + (error.response?.data?.message || error.message));
    } finally {
      setRefreshingStats(false);
    }
  };

  const runBatchModeration = async () => {
    if (!confirm('Run AI moderation on all pending artworks? This may take a few minutes.')) return;

    setBatchProcessing(true);
    try {
      const token = localStorage.getItem('auth_token');
      const res = await axios.post(`${API_URL}/api/moderation/batch-moderate`, {
        limit: 50,
        autoApprove: true
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      alert(`Batch moderation completed! Processed ${res.data.data.processed} artworks.`);
      await Promise.all([
        fetchPendingArtworks(),
        fetchAiStats()
      ]);
    } catch (error) {
      console.error('Batch moderation failed:', error);
      alert('Batch moderation failed. Please try again.');
    } finally {
      setBatchProcessing(false);
    }
  };

  const handleBulkAction = async (action, selectedIds) => {
    if (selectedIds.length === 0) return;

    const confirmMessage = action === 'approve'
      ? `Approve ${selectedIds.length} artworks?`
      : `Reject ${selectedIds.length} artworks?`;

    if (!confirm(confirmMessage)) return;

    try {
      const token = localStorage.getItem('auth_token');

      // Use optimized bulk endpoints
      if (action === 'approve') {
        await axios.post(`${API_URL}/api/moderation/bulk-approve`, {
          artworkIds: selectedIds,
          moderatorNotes: 'Bulk approved via moderation queue'
        }, { headers: { Authorization: `Bearer ${token}` } });
      } else {
        await axios.post(`${API_URL}/api/moderation/bulk-reject`, {
          artworkIds: selectedIds,
          reason: 'Bulk rejection via moderation queue',
          moderatorNotes: 'Bulk rejected via moderation queue'
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      // Remove processed artworks from the list
      setArtworks(prev => prev.filter(a => !selectedIds.includes(a._id)));
      setSelectedIds([]);
      setBulkMode(false);

      alert(`${selectedIds.length} artworks ${action}d successfully!`);

      // Refresh stats
      await fetchAiStats();
    } catch (error) {
      console.error(`Bulk ${action} failed:`, error);
      alert(`Bulk ${action} failed. Please try again.`);
    }
  };

  const recheckArtwork = async (artworkId) => {
    try {
      const token = localStorage.getItem('auth_token');

      // Show loading state
      const recheckButton = document.querySelector(`[data-recheck="${artworkId}"]`);
      if (recheckButton) {
        recheckButton.disabled = true;
        recheckButton.innerHTML = '<div style="width: 16px; height: 16px; border: 2px solid #ffffff; border-top: 2px solid transparent; border-radius: 50%; animation: spin 1s linear infinite; margin-right: 8px;"></div>Rechecking...';
      }

      const response = await axios.post(`${API_URL}/api/moderation/${artworkId}/recheck`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Create updated artwork with new scores
      const updatedModerationStatus = {
        ...selectedArtwork?.moderationStatus,
        nsfwScore: response.data.data.analysis?.nsfw?.score || 0,
        plagiarismScore: response.data.data.analysis?.plagiarism?.score || 0,
        flaggedReasons: response.data.data.flags?.map(f => f.message) || [],
        aiChecked: true,
        lastChecked: new Date().toISOString()
      };

      // Update the artwork in the list with new scores
      setArtworks(prev => prev.map(artwork => {
        if (artwork._id === artworkId) {
          return {
            ...artwork,
            moderationStatus: updatedModerationStatus
          };
        }
        return artwork;
      }));

      // Update selected artwork immediately for modal display
      if (selectedArtwork?._id === artworkId) {
        setSelectedArtwork({
          ...selectedArtwork,
          moderationStatus: updatedModerationStatus
        });
      }

      // Reset button state
      if (recheckButton) {
        recheckButton.disabled = false;
        recheckButton.innerHTML = '<svg style="width: 16px; height: 16px; margin-right: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Run AI Recheck';
      }

      alert(`AI recheck completed! New scores - NSFW: ${((response.data.data.analysis?.nsfw?.score || 0) * 100).toFixed(1)}%, Plagiarism: ${((response.data.data.analysis?.plagiarism?.score || 0) * 100).toFixed(1)}%`);

      // Refresh stats
      await fetchAiStats();
    } catch (error) {
      console.error('Failed to recheck artwork:', error);
      alert('Failed to recheck artwork: ' + (error.response?.data?.message || error.message));

      // Reset button state on error
      const recheckButton = document.querySelector(`[data-recheck="${artworkId}"]`);
      if (recheckButton) {
        recheckButton.disabled = false;
        recheckButton.innerHTML = '<svg style="width: 16px; height: 16px; margin-right: 8px;" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"></path></svg>Run AI Recheck';
      }
    }
  };

  const handleApprove = async (artworkId) => {
    try {
      const token = localStorage.getItem('auth_token');
      await axios.patch(`${API_URL}/api/moderation/${artworkId}/approve`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArtworks(prev => prev.filter(a => a._id !== artworkId));
      setSelectedArtwork(null);
      alert('Artwork approved!');

      // Refresh stats
      await fetchAiStats();
    } catch (error) {
      console.error('Failed to approve artwork:', error);
      alert('Failed to approve artwork');
    }
  };

  const handleReject = async (artworkId, reason) => {
    const rejectionReason = reason || prompt('Rejection reason:');
    if (!rejectionReason) return;

    try {
      const token = localStorage.getItem('auth_token');
      await axios.patch(`${API_URL}/api/moderation/${artworkId}/reject`, {
        reason: rejectionReason
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setArtworks(prev => prev.filter(a => a._id !== artworkId));
      setSelectedArtwork(null);
      alert('Artwork rejected');

      // Refresh stats
      await fetchAiStats();
    } catch (error) {
      console.error('Failed to reject artwork:', error);
      alert('Failed to reject artwork');
    }
  };

  // Memoized filtered and sorted artworks
  const filteredArtworks = useMemo(() => {
    let filtered = [...artworks];

    // Apply search filter
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(artwork =>
        artwork.title.toLowerCase().includes(searchLower) ||
        artwork.artist?.username.toLowerCase().includes(searchLower) ||
        artwork.description?.toLowerCase().includes(searchLower)
      );
    }

    // Apply flag type filter
    if (filters.flagType) {
      filtered = filtered.filter(artwork =>
        artwork.moderationStatus.flaggedReasons.some(reason =>
          reason.toLowerCase().includes(filters.flagType.toLowerCase())
        )
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      switch (filters.sortBy) {
        case 'newest':
          return new Date(b.createdAt) - new Date(a.createdAt);
        case 'oldest':
          return new Date(a.createdAt) - new Date(b.createdAt);
        case 'highest-risk':
          return (b.moderationStatus.nsfwScore + b.moderationStatus.plagiarismScore) -
            (a.moderationStatus.nsfwScore + a.moderationStatus.plagiarismScore);
        case 'lowest-risk':
          return (a.moderationStatus.nsfwScore + a.moderationStatus.plagiarismScore) -
            (b.moderationStatus.nsfwScore + b.moderationStatus.plagiarismScore);
        default:
          return 0;
      }
    });

    return filtered;
  }, [artworks, filters]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

  const toggleBulkSelection = (artworkId) => {
    setSelectedIds(prev =>
      prev.includes(artworkId)
        ? prev.filter(id => id !== artworkId)
        : [...prev, artworkId]
    );
  };

  const selectAllVisible = () => {
    const visibleIds = filteredArtworks.map(a => a._id);
    setSelectedIds(prev =>
      prev.length === visibleIds.length ? [] : visibleIds
    );
  };

  if (loading) {
    return <div className="text-center py-12">Loading...</div>;
  }

  return (
    <div className="moderation-container">
      <div className="moderation-header">
        <h1>AI Moderation Queue</h1>
        <p>Intelligent content moderation powered by AI</p>
        <div className="moderation-header-info">
          <p>• Click on any artwork card to review it in detail</p>
          <p>• View NSFW and plagiarism scores</p>
          <p>• Check flagged content reasons</p>
          <p>• Approve or reject artworks</p>
          <p>• Use batch processing for efficiency</p>
        </div>
      </div>


      {/* AI Stats Dashboard */}
      {aiStats && (
        <div className="moderation-stats-container">
          <div className="moderation-stats-header">
            <h2>AI Moderation Dashboard</h2>
            <div className="moderation-actions">
              <button
                className="refresh-btn"
                onClick={fetchAiStats}
                disabled={refreshingStats}
              >
                {refreshingStats ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <BarChart3 className="w-4 h-4 mr-2" />
                )}
                {refreshingStats ? 'Refreshing...' : 'Refresh Stats'}
              </button>
              <button
                className="batch-btn"
                onClick={runBatchModeration}
                disabled={batchProcessing || artworks.length === 0}
              >
                {batchProcessing ? (
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Zap className="w-4 h-4 mr-2" />
                )}
                {batchProcessing ? 'Processing...' : 'Batch AI Review'}
              </button>
            </div>
          </div>

          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header"><h3>Total Processed</h3></div>
              <div className="stat-value blue">{aiStats.totalProcessed}</div>
              <div className="state-rate">{aiStats.processingRate?.toFixed(1)}% rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-header"><h3>Auto-Approved</h3></div>
              <div className="stat-value green">{aiStats.autoApproved}</div>
              <div className="stat-rate">{aiStats.autoApprovalRate?.toFixed(1)}% rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-header"><h3>Flagged</h3></div>
              <div className="stat-value orange">{aiStats.flaggedForReview}</div>
              <div className="stat-rate">{aiStats.flagRate?.toFixed(1)}% rate</div>
            </div>
            <div className="stat-card">
              <div className="stat-header"><h3>Rejected</h3></div>
              <div className="stat-value red">{aiStats.rejected}</div>
              <div className="state-rate">{aiStats.rejectionRate?.toFixed(1)}% rate</div>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="moderation-controls">
        <div className="controls-layout">
          <div className="controls-filters">
            {/* Search */}
            <div className="moderation-search-container">
              <Search className="search-icon" />
              <input
                type="text"
                placeholder="Search artworks..."
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                className="search-input"
              />
              {searchInput !== filters.searchTerm && (
                <div className="search-loading">
                  <div className="loading-spinner"></div>
                </div>
              )}
            </div>

            {/* Flag Type Filter */}
            <select
              value={filters.flagType}
              onChange={(e) => handleFilterChange('flagType', e.target.value)}
              className="filter-select"
            >
              <option value="">All Flags</option>
              <option value="nsfw">NSFW</option>
              <option value="plagiarism">Plagiarism</option>
              <option value="quality">Low Quality</option>
              <option value="spam">Spam</option>
            </select>

            {/* Sort By */}
            <select
              value={filters.sortBy}
              onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              className="filter-select"
            >
              <option value="oldest">Oldest First</option>
              <option value="newest">Newest First</option>
              <option value="highest-risk">Highest Risk</option>
              <option value="lowest-risk">Lowest Risk</option>
            </select>
          </div>

          {/* Bulk Actions */}
          <div className="controls-actions">
            <button
              onClick={() => setBulkMode(!bulkMode)}
              className={`bulk-mode-btn ${bulkMode ? 'active' : ''}`}
            >
              <Filter className="w-4 h-4 mr-2 inline" />
              Bulk Mode
            </button>

            {bulkMode && selectedIds.length > 0 && (
              <>
                <button
                  onClick={() => handleBulkAction('approve', selectedIds)}
                  className="bulk-action-btn approve-bulk"
                >
                  <Check className="w-4 h-4 mr-1 inline" />
                  Approve ({selectedIds.length})
                </button>
                <button
                  onClick={() => handleBulkAction('reject', selectedIds)}
                  className="bulk-action-btn reject-bulk"
                >
                  <X className="w-4 h-4 mr-1 inline" />
                  Reject ({selectedIds.length})
                </button>
              </>
            )}
          </div>
        </div>

        {bulkMode && (
          <div className="bulk-selection-info">
            <input
              type="checkbox"
              checked={selectedIds.length === filteredArtworks.length && filteredArtworks.length > 0}
              onChange={selectAllVisible}
              className="bulk-select-all"
            />
            <span>Select all visible ({filteredArtworks.length})</span>
            {selectedIds.length > 0 && (
              <span className="selected-count">
                {selectedIds.length} selected
              </span>
            )}
          </div>
        )}
      </div>

      <div className="moderation-grid">
        {/* Artwork List */}
        <div className="artwork-list-container">
          <div className="artwork-list-card">
            <div className="artwork-list-header">
              <h2 className="font-semibold">
                Pending Artworks ({pagination.total})
              </h2>
              <div className="pagination-info">
                Page {pagination.page} of {pagination.pages}
              </div>
            </div>

            {artworks.length === 0 ? (
              <p className="no-artworks-message">No artworks pending review</p>
            ) : (
              <>
                <div className="artwork-grid">
                  {filteredArtworks.map((artwork) => (
                    <div
                      key={artwork._id}
                      className={`artwork-card-container relative ${selectedArtwork?._id === artwork._id ? 'selected' : ''}`}
                    >
                      {bulkMode && (
                        <div className="bulk-checkbox-container">
                          <input
                            type="checkbox"
                            checked={selectedIds.includes(artwork._id)}
                            onChange={() => toggleBulkSelection(artwork._id)}
                            className="bulk-checkbox"
                            onClick={(e) => e.stopPropagation()}
                          />
                        </div>
                      )}

                      <div
                        onClick={() => setSelectedArtwork(artwork)}
                        className="artwork-card"
                      >
                        <div className="artwork-card-inner">
                          <div className="moderation-artwork-image-container">
                            <img
                              src={artwork.thumbnail || artwork.images?.[0]?.url || "https://via.placeholder.com/300x200?text=No+Image"}
                              alt={artwork.title}
                            />

                            {/* Risk Score Badge */}
                            {(artwork.moderationStatus.nsfwScore > 0.3 || artwork.moderationStatus.plagiarismScore > 0.3) && (
                              <div className="risk-badge">
                                {((artwork.moderationStatus.nsfwScore + artwork.moderationStatus.plagiarismScore) * 50).toFixed(0)}% Risk
                              </div>
                            )}
                          </div>

                          <div className="artwork-info">
                            <h4>{artwork.title}</h4>
                            <p>by {artwork.artist?.username || 'Unknown'}</p>

                            {/* Time since submission */}
                            <div className="time-badge">
                              <Clock className="w-3 h-3" />
                              <span>{new Date(artwork.createdAt).toLocaleDateString()}</span>
                            </div>

                            {artwork.moderationStatus.flaggedReasons.length > 0 && (
                              <div className="artwork-flag">
                                <AlertTriangle className="w-3 h-3" />
                                <span>{artwork.moderationStatus.flaggedReasons.length} flag{artwork.moderationStatus.flaggedReasons.length > 1 ? 's' : ''}</span>
                              </div>
                            )}
                          </div>

                          {/* Quick action buttons overlay */}
                          <div className="quick-actions-overlay">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleApprove(artwork._id);
                              }}
                              className="quick-action-btn approve"
                            >
                              <Check className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleReject(artwork._id);
                              }}
                              className="quick-action-btn reject"
                            >
                              <X className="w-4 h-4" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                recheckArtwork(artwork._id);
                              }}
                              className="quick-action-btn recheck"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {pagination.pages > 1 && (
                  <div className="pagination">
                    <button
                      onClick={() => handlePageChange(pagination.page - 1)}
                      disabled={pagination.page === 1}
                      className="pagination-btn"
                    >
                      Previous
                    </button>

                    <div className="pagination-numbers">
                      {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                        const page = i + 1;
                        return (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`pagination-btn ${pagination.page === page ? 'active' : ''}`}
                          >
                            {page}
                          </button>
                        );
                      })}
                    </div>

                    <button
                      onClick={() => handlePageChange(pagination.page + 1)}
                      disabled={pagination.page === pagination.pages}
                      className="pagination-btn"
                    >
                      Next
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal for Artwork Detail - Using inline styles to ensure visibility */}
      {selectedArtwork && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999
          }}
          onClick={() => setSelectedArtwork(null)}
        >
          <div
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '32px',
              maxWidth: '900px',
              width: '95%',
              maxHeight: '95vh',
              overflowY: 'auto',
              position: 'relative',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
            }}
            onClick={e => e.stopPropagation()}
          >
            {/* Close Button */}
            <button
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                width: '40px',
                height: '40px',
                backgroundColor: '#f3f4f6',
                border: 'none',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px',
                cursor: 'pointer',
                zIndex: 10,
                color: '#6b7280'
              }}
              onClick={() => setSelectedArtwork(null)}
            >
              ×
            </button>

            {/* Artwork Image */}
            <div style={{ marginBottom: '24px', textAlign: 'center' }}>
              <img
                src={
                  selectedArtwork.imageUrl ||
                  selectedArtwork.images?.[0]?.url ||
                  selectedArtwork.thumbnail ||
                  "https://via.placeholder.com/600x400?text=Image+Not+Found"
                }
                alt={selectedArtwork.title}
                style={{
                  width: '100%',
                  maxHeight: '400px',
                  objectFit: 'contain',
                  backgroundColor: '#f9fafb',
                  borderRadius: '12px',
                  border: '1px solid #e5e7eb'
                }}
                onError={(e) => {
                  e.target.src = "https://via.placeholder.com/600x400?text=Image+Not+Found";
                }}
              />
            </div>

            {/* Artwork Details */}
            <div style={{ marginBottom: '24px' }}>
              <h2 style={{
                fontSize: '28px',
                fontWeight: 'bold',
                color: '#111827',
                marginBottom: '8px'
              }}>
                {selectedArtwork.title}
              </h2>
              <p style={{
                color: '#6b7280',
                marginBottom: '12px',
                lineHeight: '1.6'
              }}>
                {selectedArtwork.description || 'No description provided'}
              </p>
              {selectedArtwork.price && (
                <p style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#059669',
                  marginBottom: '16px'
                }}>
                  ₹{selectedArtwork.price}
                </p>
              )}
            </div>

            {/* Artist and Category Info */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '16px',
              marginBottom: '24px'
            }}>
              <div>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>Artist</p>
                <p style={{
                  fontWeight: '600',
                  color: '#111827'
                }}>
                  {selectedArtwork.artist?.username || 'Unknown Artist'}
                </p>
              </div>
              <div>
                <p style={{
                  fontSize: '14px',
                  color: '#6b7280',
                  fontWeight: '500',
                  marginBottom: '4px'
                }}>Category</p>
                <p style={{
                  fontWeight: '600',
                  color: '#111827',
                  textTransform: 'capitalize'
                }}>
                  {selectedArtwork.category || 'Uncategorized'}
                </p>
              </div>
            </div>

            {/* AI Moderation Scores */}
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: '#111827',
                marginBottom: '12px'
              }}>AI Analysis Scores</h3>
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '16px'
              }}>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}>NSFW Score</div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: (selectedArtwork.moderationStatus?.nsfwScore || 0) > 0.7 ? '#ef4444' :
                      (selectedArtwork.moderationStatus?.nsfwScore || 0) > 0.3 ? '#f59e0b' : '#10b981'
                  }}>
                    {((selectedArtwork.moderationStatus?.nsfwScore || 0) * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{
                  backgroundColor: '#f9fafb',
                  padding: '16px',
                  borderRadius: '8px',
                  textAlign: 'center',
                  border: '1px solid #e5e7eb'
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#6b7280',
                    marginBottom: '4px'
                  }}>Plagiarism Score</div>
                  <div style={{
                    fontSize: '24px',
                    fontWeight: 'bold',
                    color: (selectedArtwork.moderationStatus?.plagiarismScore || 0) > 0.8 ? '#ef4444' :
                      (selectedArtwork.moderationStatus?.plagiarismScore || 0) > 0.4 ? '#f59e0b' : '#10b981'
                  }}>
                    {((selectedArtwork.moderationStatus?.plagiarismScore || 0) * 100).toFixed(1)}%
                  </div>
                </div>
              </div>
            </div>

            {/* Flagged Issues */}
            {selectedArtwork.moderationStatus?.flaggedReasons?.length > 0 && (
              <div style={{
                backgroundColor: '#fef2f2',
                border: '1px solid #fecaca',
                borderRadius: '8px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <p style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#b91c1c',
                  marginBottom: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}>
                  <AlertTriangle style={{ width: '16px', height: '16px' }} />
                  Flagged Issues ({selectedArtwork.moderationStatus.flaggedReasons.length})
                </p>
                <ul style={{
                  listStyle: 'disc',
                  paddingLeft: '20px',
                  fontSize: '14px',
                  color: '#dc2626'
                }}>
                  {selectedArtwork.moderationStatus.flaggedReasons.map((reason, i) => (
                    <li key={i} style={{ marginBottom: '4px' }}>{reason}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Additional Actions */}
            <div style={{ marginBottom: '24px' }}>
              <button
                data-recheck={selectedArtwork._id}
                onClick={() => recheckArtwork(selectedArtwork._id)}
                style={{
                  width: '100%',
                  marginBottom: '12px',
                  padding: '12px 16px',
                  backgroundColor: '#dbeafe',
                  color: '#1d4ed8',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'background-color 0.2s'
                }}
                onMouseOver={(e) => e.target.style.backgroundColor = '#bfdbfe'}
                onMouseOut={(e) => e.target.style.backgroundColor = '#dbeafe'}
              >
                <RefreshCw style={{ width: '16px', height: '16px' }} />
                Run AI Recheck
              </button>
            </div>

            {/* Approve/Reject Actions */}
            <div style={{
              display: 'flex',
              gap: '16px'
            }}>
              <button
                onClick={() => handleApprove(selectedArtwork._id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 24px',
                  backgroundColor: '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#15803d';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#16a34a';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <Check style={{ width: '20px', height: '20px' }} />
                Approve Artwork
              </button>

              <button
                onClick={() => handleReject(selectedArtwork._id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  padding: '16px 24px',
                  backgroundColor: '#dc2626',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.target.style.backgroundColor = '#b91c1c';
                  e.target.style.transform = 'translateY(-1px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.backgroundColor = '#dc2626';
                  e.target.style.transform = 'translateY(0)';
                }}
              >
                <X style={{ width: '20px', height: '20px' }} />
                Reject Artwork
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}