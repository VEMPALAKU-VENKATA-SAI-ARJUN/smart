import { useState, useEffect } from 'react';
import { Bell, Check, CheckCheck, Trash2, User, Heart, MessageCircle, UserPlus, Award, Filter, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

function Notifications() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, unread
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
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const markAsRead = async (notificationId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/notifications/${notificationId}/read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif =>
            notif._id === notificationId
              ? { ...notif, isRead: true, readAt: new Date() }
              : notif
          )
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const markAllAsRead = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/notifications/mark-all-read`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev =>
          prev.map(notif => ({ ...notif, isRead: true, readAt: new Date() }))
        );
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const deleteNotification = async (notificationId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/notifications/${notificationId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setNotifications(prev => prev.filter(notif => notif._id !== notificationId));
      }
    } catch (error) {
      console.error('Error deleting notification:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const iconStyle = { width: '20px', height: '20px' };
    switch (type) {
      case 'follow':
        return <UserPlus style={{ ...iconStyle, color: 'white' }} />;
      case 'like':
        return <Heart style={{ ...iconStyle, color: 'white' }} />;
      case 'comment':
        return <MessageCircle style={{ ...iconStyle, color: 'white' }} />;
      case 'artwork_approved':
        return <Award style={{ ...iconStyle, color: 'white' }} />;
      default:
        return <Bell style={{ ...iconStyle, color: 'white' }} />;
    }
  };

  const getIconBackground = (type) => {
    switch (type) {
      case 'follow':
        return 'linear-gradient(135deg, var(--primary-500), var(--primary-600))';
      case 'like':
        return 'linear-gradient(135deg, var(--error-500), var(--error-600))';
      case 'comment':
        return 'linear-gradient(135deg, var(--success-500), var(--success-600))';
      case 'artwork_approved':
        return 'linear-gradient(135deg, var(--warning-500), var(--warning-600))';
      default:
        return 'linear-gradient(135deg, var(--gray-500), var(--gray-600))';
    }
  };

  const formatTimeAgo = (date) => {
    const now = new Date();
    const notifDate = new Date(date);
    const diffInSeconds = Math.floor((now - notifDate) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
    return notifDate.toLocaleDateString();
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
    <div style={{ minHeight: '100vh', background: 'var(--gray-50)', paddingTop: 'var(--space-8)' }}>
      <div className="container">
        {/* Page Header */}
        <div className="page-header" style={{ marginBottom: 'var(--space-8)', borderRadius: 'var(--radius-2xl)' }}>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div style={{ 
                background: 'rgba(255, 255, 255, 0.2)', 
                padding: 'var(--space-4)', 
                borderRadius: 'var(--radius-xl)' 
              }}>
                <Bell style={{ width: '32px', height: '32px', color: 'white' }} />
              </div>
              <div>
                <h1 style={{ fontSize: 'var(--text-4xl)', fontWeight: 'var(--font-bold)', marginBottom: 'var(--space-2)' }}>
                  Notifications
                </h1>
                <p style={{ fontSize: 'var(--text-lg)', opacity: 0.9 }}>
                  {unreadCount > 0 ? `${unreadCount} unread notifications` : 'All caught up! 🎉'}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              <Link 
                to="/settings/notifications" 
                className="btn btn-secondary"
                style={{ background: 'rgba(255, 255, 255, 0.2)', border: '1px solid rgba(255, 255, 255, 0.3)' }}
              >
                <Settings style={{ width: '16px', height: '16px' }} />
                Settings
              </Link>
              
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="btn btn-primary"
                  style={{ background: 'white', color: 'var(--primary-600)' }}
                >
                  <CheckCheck style={{ width: '16px', height: '16px' }} />
                  Mark all read
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
          <div className="card-body" style={{ padding: 'var(--space-4) var(--space-6)' }}>
            <div className="flex items-center justify-between">
              <div className="flex space-x-6">
                <button
                  onClick={() => setFilter('all')}
                  className={`flex items-center space-x-2 pb-3 border-b-2 font-medium transition-colors ${
                    filter === 'all'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={{
                    borderBottomColor: filter === 'all' ? 'var(--primary-500)' : 'transparent',
                    color: filter === 'all' ? 'var(--primary-600)' : 'var(--gray-500)'
                  }}
                >
                  <Bell style={{ width: '16px', height: '16px' }} />
                  <span>All Notifications</span>
                  <span className="badge badge-primary" style={{ fontSize: 'var(--text-xs)' }}>
                    {notifications.length}
                  </span>
                </button>
                
                <button
                  onClick={() => setFilter('unread')}
                  className={`flex items-center space-x-2 pb-3 border-b-2 font-medium transition-colors ${
                    filter === 'unread'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                  style={{
                    borderBottomColor: filter === 'unread' ? 'var(--primary-500)' : 'transparent',
                    color: filter === 'unread' ? 'var(--primary-600)' : 'var(--gray-500)'
                  }}
                >
                  <Filter style={{ width: '16px', height: '16px' }} />
                  <span>Unread</span>
                  {unreadCount > 0 && (
                    <span className="badge badge-error" style={{ fontSize: 'var(--text-xs)' }}>
                      {unreadCount}
                    </span>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Notifications List */}
        <div className="space-y-3">
          {notifications.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon">
                <Bell style={{ width: '64px', height: '64px' }} />
              </div>
              <h3>No notifications</h3>
              <p>
                {filter === 'unread' ? "You're all caught up! 🎉" : "You don't have any notifications yet."}
              </p>
              <Link to="/gallery" className="btn btn-primary">
                Explore Gallery
              </Link>
            </div>
          ) : (
            notifications.map((notification) => (
              <div
                key={notification._id}
                className="card transition"
                style={{
                  borderLeft: !notification.isRead ? '4px solid var(--primary-500)' : 'none',
                  background: !notification.isRead ? 'var(--primary-50)' : 'white',
                  cursor: 'pointer'
                }}
                onClick={() => !notification.isRead && markAsRead(notification._id)}
              >
                <div className="card-body" style={{ padding: 'var(--space-5)' }}>
                  <div className="flex items-start space-x-4">
                    {/* Icon */}
                    <div 
                      className="flex-shrink-0"
                      style={{
                        background: getIconBackground(notification.type),
                        padding: 'var(--space-3)',
                        borderRadius: 'var(--radius-xl)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      {getNotificationIcon(notification.type)}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 style={{ 
                              fontSize: 'var(--text-base)', 
                              fontWeight: 'var(--font-semibold)', 
                              color: 'var(--gray-900)',
                              margin: 0
                            }}>
                              {notification.content.title}
                            </h4>
                            {!notification.isRead && (
                              <div 
                                style={{
                                  width: '8px',
                                  height: '8px',
                                  background: 'var(--primary-500)',
                                  borderRadius: '50%'
                                }}
                              />
                            )}
                          </div>
                          
                          <p style={{ 
                            fontSize: 'var(--text-sm)', 
                            color: 'var(--gray-600)',
                            margin: '0 0 var(--space-3) 0',
                            lineHeight: 'var(--leading-relaxed)'
                          }}>
                            {notification.content.message}
                          </p>
                          
                          {/* Related User */}
                          {notification.relatedUser && (
                            <div className="flex items-center space-x-2" style={{ marginBottom: 'var(--space-2)' }}>
                              <div className="avatar avatar-sm">
                                {notification.relatedUser.profile?.avatar ? (
                                  <img
                                    src={notification.relatedUser.profile.avatar}
                                    alt={notification.relatedUser.username}
                                    style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                                  />
                                ) : (
                                  notification.relatedUser.username.charAt(0).toUpperCase()
                                )}
                              </div>
                              <Link
                                to={`/profile/${notification.relatedUser._id}`}
                                style={{ 
                                  fontSize: 'var(--text-sm)', 
                                  color: 'var(--primary-600)',
                                  textDecoration: 'none',
                                  fontWeight: 'var(--font-medium)'
                                }}
                                className="hover:text-primary-700"
                              >
                                @{notification.relatedUser.username}
                              </Link>
                            </div>
                          )}

                          {/* Related Artwork */}
                          {notification.relatedArtwork && (
                            <div style={{ marginTop: 'var(--space-2)' }}>
                              <Link
                                to={`/artwork/${notification.relatedArtwork._id}`}
                                className="btn btn-sm btn-ghost"
                                style={{ padding: 'var(--space-2) var(--space-3)' }}
                              >
                                <Award style={{ width: '14px', height: '14px' }} />
                                View artwork: {notification.relatedArtwork.title}
                              </Link>
                            </div>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="flex items-center space-x-2" style={{ marginLeft: 'var(--space-4)' }}>
                          <span style={{ 
                            fontSize: 'var(--text-xs)', 
                            color: 'var(--gray-500)',
                            whiteSpace: 'nowrap'
                          }}>
                            {formatTimeAgo(notification.createdAt)}
                          </span>
                          
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification._id);
                              }}
                              className="btn btn-sm btn-ghost"
                              title="Mark as read"
                              style={{ 
                                padding: 'var(--space-2)',
                                color: 'var(--gray-400)'
                              }}
                            >
                              <Check style={{ width: '14px', height: '14px' }} />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteNotification(notification._id);
                            }}
                            className="btn btn-sm btn-ghost"
                            title="Delete notification"
                            style={{ 
                              padding: 'var(--space-2)',
                              color: 'var(--gray-400)'
                            }}
                          >
                            <Trash2 style={{ width: '14px', height: '14px' }} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Load More */}
        {hasMore && notifications.length > 0 && (
          <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
            <button
              onClick={() => fetchNotifications(page + 1)}
              className="btn btn-secondary"
            >
              Load More Notifications
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;