import { useState, useEffect } from 'react';
import {
  Bell, Check, CheckCheck, Trash2, Heart, MessageCircle,
  UserPlus, Award, Filter, Settings
} from 'lucide-react';
import { Link } from 'react-router-dom';
import '../styles/Notifications.css';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    fetchNotifications();
  }, [filter]);

  const fetchNotifications = async (pageNum = 1) => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const params = new URLSearchParams({
        page: pageNum,
        limit: 20,
        ...(filter === 'unread' && { unreadOnly: 'true' })
      });

      const response = await fetch(`${API_URL}/api/notifications?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();
      if (data.success) {
        if (pageNum === 1) {
          setNotifications(data.data);
        } else {
          setNotifications(prev => [...prev, ...data.data]);
        }
        setHasMore(data.pagination.page < data.pagination.pages);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    } finally {
      setLoading(false);
    }
  };

  const markAsRead = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev =>
          prev.map(n => n._id === id ? { ...n, isRead: true, readAt: new Date() } : n)
        );
      }
    } catch (e) {
      console.error('Error marking as read:', e);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true, readAt: new Date() })));
      }
    } catch (e) {
      console.error('Error marking all read:', e);
    }
  };

  const deleteNotification = async (id) => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const res = await fetch(`${API_URL}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) setNotifications(prev => prev.filter(n => n._id !== id));
    } catch (e) {
      console.error('Error deleting notification:', e);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'follow': return <UserPlus />;
      case 'like': return <Heart />;
      case 'comment': return <MessageCircle />;
      case 'artwork_approved': return <Award />;
      default: return <Bell />;
    }
  };

  const getIconClassName = (type) => {
    switch (type) {
      case 'follow': return 'notification-icon icon-follow';
      case 'like': return 'notification-icon icon-like';
      case 'comment': return 'notification-icon icon-comment';
      case 'artwork_approved': return 'notification-icon icon-artwork-approved';
      default: return 'notification-icon icon-default';
    }
  };

  const getNotificationMessage = (n) => {
    if (!n) return 'New notification';
    const sender = n.relatedUser?.username || n.sender?.username || 'Someone';

    switch (n.type) {
      case 'like':
        return `${sender} liked your artwork "${n.relatedArtwork?.title || 'Untitled'}"`;
      case 'comment':
        return `${sender} commented on "${n.relatedArtwork?.title || 'your artwork'}"`;
      case 'follow':
        return `${sender} started following you`;
      case 'artwork_approved':
        return `Your artwork "${n.relatedArtwork?.title || 'Untitled'}" was approved by moderator`;
      default:
        return n.content?.message || n.message || 'New notification received';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const d = new Date(date);
    const diff = Math.floor((now - d) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
    return d.toLocaleDateString();
  };

  const unreadCount = notifications.filter(n => !n.isRead).length;

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p className="loading-text">Loading notifications...</p>
      </div>
    );
  }

  return (
    <div className="notifications-page">
      <div className="notifications-container">
        {/* Header */}
        <div className="notifications-header">
          <div className="header-content">
            <div className="header-left">
              <div className="header-icon-wrapper">
                <Bell size={32} />
              </div>
              <div className="header-text">
                <h1>Notifications</h1>
                <p>{unreadCount > 0 ? `${unreadCount} unread` : 'All caught up 🎉'}</p>
              </div>
            </div>
           { /*<div className="header-actions">
              <Link to="/settings/notifications" className="btn-settings">
                <Settings size={16} /> Settings
              </Link>
              {unreadCount > 0 && (
                <button onClick={markAllAsRead} className="btn-mark-all-read">
                  <CheckCheck size={16} /> Mark all read
                </button>
              )}
            </div>*/}
          </div>
        </div>

        {/* Filter */}
        <div className="filter-card">
          <div className="filter-tabs">
            <button
              onClick={() => setFilter('all')}
              className={`filter-tab ${filter === 'all' ? 'active' : ''}`}>
              <Bell size={16} /> All
              <span className="filter-badge">{notifications.length}</span>
            </button>
            <button
              onClick={() => setFilter('unread')}
              className={`filter-tab ${filter === 'unread' ? 'active' : ''}`}>
              <Filter size={16} /> Unread
              {unreadCount > 0 && <span className="filter-badge unread">{unreadCount}</span>}
            </button>
          </div>
        </div>

        {/* Notifications */}
        <div className="notifications-list">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <Bell size={64} />
              <h3>No notifications</h3>
              <p>{filter === 'unread' ? "You're all caught up 🎉" : "No notifications yet."}</p>
              <Link to="/gallery" className="btn-explore">Explore Gallery</Link>
            </div>
          ) : (
            notifications.map((n) => (
              <div
                key={n._id}
                className={`notification-card ${!n.isRead ? 'unread' : ''}`}
                onClick={() => !n.isRead && markAsRead(n._id)}
              >
                <div className="notification-content-wrapper">
                  <div className={getIconClassName(n.type)}>
                    {getNotificationIcon(n.type)}
                  </div>

                  <div className="notification-body">
                    <h4>{getNotificationMessage(n)}</h4>

                    {n.relatedArtwork && (
                      <Link to={`/artwork/${n.relatedArtwork._id}`} className="artwork-link">
                        <Award size={14} /> {n.relatedArtwork.title}
                      </Link>
                    )}

                    <div className="notification-actions">
                      <span className="notification-time">{formatTimeAgo(n.createdAt)}</span>
                      {!n.isRead && (
                        <button onClick={(e) => { e.stopPropagation(); markAsRead(n._id); }}>
                          <Check size={14} />
                        </button>
                      )}
                      <button onClick={(e) => { e.stopPropagation(); deleteNotification(n._id); }}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {hasMore && notifications.length > 0 && (
          <div className="load-more-wrapper">
            <button onClick={() => fetchNotifications(page + 1)} className="btn-load-more">
              Load More Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
