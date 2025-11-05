import { useState, useEffect } from 'react';
import { Trophy, Calendar, Users, Award, Clock, Eye, Heart, Share2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import ArtworkCard from '../components/ArtworkCard';
import '../styles/Contests.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const Contests = () => {
  const [contests, setContests] = useState([]);
  const [activeTab, setActiveTab] = useState('active');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchContests();
  }, [activeTab]);

  const fetchContests = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${API_URL}/api/contests?status=${activeTab}`);
      if (response.data.success) {
        setContests(response.data.data);
      }
    } catch (err) {
      setError('Failed to load contests');
      console.error('Error fetching contests:', err);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    const colors = {
      active: 'status-active',
      upcoming: 'status-upcoming',
      ended: 'status-ended'
    };
    return colors[status] || 'status-default';
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getDaysRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  if (loading) {
    return (
      <div className="contests-loading">
        <div className="loading-spinner"></div>
        <p>Loading contests...</p>
      </div>
    );
  }

  return (
    <div className="contests-page">
      {/* Header */}
      <div className="contests-header">
        <div className="header-content">
          <div className="header-text">
            <h1>Art Contests & Challenges</h1>
            <p>Showcase your creativity, compete with artists worldwide, and win amazing prizes!</p>
          </div>
          <div className="header-stats">
            <div className="stat-item">
              <Trophy className="stat-icon" />
              <div>
                <span className="stat-number">24</span>
                <span className="stat-label">Active Contests</span>
              </div>
            </div>
            <div className="stat-item">
              <Users className="stat-icon" />
              <div>
                <span className="stat-number">1.2K</span>
                <span className="stat-label">Participants</span>
              </div>
            </div>
            <div className="stat-item">
              <Award className="stat-icon" />
              <div>
                <span className="stat-number">$50K</span>
                <span className="stat-label">Total Prizes</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="contests-nav">
        <div className="nav-tabs">
          {[
            { key: 'active', label: 'Active Contests', count: contests.filter(c => c.status === 'active').length },
            { key: 'upcoming', label: 'Upcoming', count: contests.filter(c => c.status === 'upcoming').length },
            { key: 'ended', label: 'Past Contests', count: contests.filter(c => c.status === 'ended').length }
          ].map(tab => (
            <button
              key={tab.key}
              className={`nav-tab ${activeTab === tab.key ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
              <span className="tab-count">{tab.count}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="error-message">
          <p>{error}</p>
          <button onClick={fetchContests}>Try Again</button>
        </div>
      )}

      {/* Contests Grid */}
      <div className="contests-container">
        {contests.length === 0 ? (
          <div className="empty-state">
            <Trophy size={64} className="empty-icon" />
            <h3>No contests found</h3>
            <p>Check back later for new contests and challenges!</p>
          </div>
        ) : (
          <div className="contests-grid">
            {contests.map(contest => (
              <ContestCard key={contest._id} contest={contest} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const ContestCard = ({ contest }) => {
  const [showSubmissions, setShowSubmissions] = useState(false);

  const getStatusColor = (status) => {
    const colors = {
      active: 'status-active',
      upcoming: 'status-upcoming',
      ended: 'status-ended'
    };
    return colors[status] || 'status-default';
  };

  const getDaysRemaining = (endDate) => {
    const now = new Date();
    const end = new Date(endDate);
    const diffTime = end - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="contest-card">
      {/* Contest Image */}
      <div className="contest-image">
        <img 
          src={contest.bannerImage || '/api/placeholder/400/200'} 
          alt={contest.title}
          onError={(e) => {
            e.target.src = '/api/placeholder/400/200';
          }}
        />
        <div className="contest-overlay">
          <span className={`contest-status ${getStatusColor(contest.status)}`}>
            {contest.status}
          </span>
          {contest.status === 'active' && (
            <div className="time-remaining">
              <Clock size={16} />
              <span>{getDaysRemaining(contest.endDate)} days left</span>
            </div>
          )}
        </div>
      </div>

      {/* Contest Content */}
      <div className="contest-content">
        <div className="contest-header">
          <h3 className="contest-title">{contest.title}</h3>
          <div className="contest-prize">
            <Trophy size={16} />
            <span>${contest.prizePool?.toLocaleString() || '0'}</span>
          </div>
        </div>

        <p className="contest-description">{contest.description}</p>

        {/* Contest Stats */}
        <div className="contest-stats">
          <div className="stat">
            <Users size={16} />
            <span>{contest.participants?.length || 0} participants</span>
          </div>
          <div className="stat">
            <Calendar size={16} />
            <span>Ends {formatDate(contest.endDate)}</span>
          </div>
        </div>

        {/* Contest Tags */}
        {contest.tags && contest.tags.length > 0 && (
          <div className="contest-tags">
            {contest.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="contest-tag">
                #{tag}
              </span>
            ))}
          </div>
        )}

        {/* Action Buttons */}
        <div className="contest-actions">
          <Link 
            to={`/contests/${contest._id}`}
            className="btn btn-primary"
          >
            {contest.status === 'active' ? 'Join Contest' : 'View Details'}
          </Link>
          
          <button 
            className="btn btn-outline"
            onClick={() => setShowSubmissions(!showSubmissions)}
          >
            <Eye size={16} />
            View Submissions
          </button>
        </div>

        {/* Top Submissions Preview */}
        {showSubmissions && contest.submissions && contest.submissions.length > 0 && (
          <div className="submissions-preview">
            <h4>Top Submissions</h4>
            <div className="submissions-grid">
              {contest.submissions.slice(0, 3).map((submission, index) => (
                <div key={submission._id} className="submission-preview">
                  <img 
                    src={submission.artwork?.thumbnail} 
                    alt={submission.artwork?.title}
                  />
                  <div className="submission-rank">#{index + 1}</div>
                  <div className="submission-stats">
                    <span><Heart size={12} /> {submission.votes || 0}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Contests;