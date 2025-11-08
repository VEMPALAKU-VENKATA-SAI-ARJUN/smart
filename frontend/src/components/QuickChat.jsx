/* QuickChat.jsx*/
import { useState, useEffect } from 'react';
import { MessageCircle, X, Send, Maximize2 } from 'lucide-react';
import { useChat } from '../contexts/ChatContext';
import { Link } from 'react-router-dom';
import '../styles/QuickChat.css';

function QuickChat() {
  const [isOpen, setIsOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [loading, setLoading] = useState(false);
  
  // Check user role - only show for artists and buyers
  const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  if (!currentUser.id || (currentUser.role !== 'artist' && currentUser.role !== 'buyer')) {
    return null;
  }
  
  // Use chat context safely
  let unreadCount = 0;
  let isConnected = false;
  try {
    const chatContext = useChat();
    unreadCount = chatContext.unreadCount;
    isConnected = chatContext.isConnected;
  } catch (error) {
    // ChatProvider not available
    unreadCount = 0;
    isConnected = false;
  }

  useEffect(() => {
    if (isOpen) {
      fetchRecentConversations();
    }
  }, [isOpen]);

  const fetchRecentConversations = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setConversations(data.data.slice(0, 5)); // Show only 5 recent conversations
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 1) {
      return 'now';
    } else if (diffInHours < 24) {
      return `${Math.floor(diffInHours)}h`;
    } else {
      return `${Math.floor(diffInHours / 24)}d`;
    }
  };

  return (
    <div className="quick-chat-container">
      {/* Chat Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="quick-chat-toggle"
          aria-label="Open chat"
        >
          <MessageCircle size={24} />

          {unreadCount > 0 && (
            <div className="quick-chat-badge">
              {unreadCount > 9 ? '9+' : unreadCount}
            </div>
          )}

          {/* Tooltip / Hover Notation */}
          <span className="quick-chat-tooltip">Quick Chat</span>
        </button>

      )}

      {/* Chat Widget */}
      {isOpen && (
        <div className="quick-chat-widget">
          {/* Header */}
          <div className="quick-chat-header">
            <div className="quick-chat-header-info">
              <MessageCircle size={20} />
              <h3 className="quick-chat-title">Messages</h3>
              <div className={`quick-chat-connection-indicator ${isConnected ? 'connected' : ''}`}></div>
            </div>
            <div className="quick-chat-header-actions">
              <Link
                to="/messages"
                className="quick-chat-header-button"
                onClick={() => setIsOpen(false)}
                aria-label="Open full messages"
              >
                <Maximize2 size={16} />
              </Link>
              <button
                onClick={() => setIsOpen(false)}
                className="quick-chat-header-button"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="quick-chat-content">
            {loading ? (
              <div className="quick-chat-loading">
                <div className="quick-chat-spinner"></div>
              </div>
            ) : conversations.length === 0 ? (
              <div className="quick-chat-empty">
                <MessageCircle size={32} className="quick-chat-empty-icon" />
                <div className="quick-chat-empty-title">No conversations yet</div>
                <p className="quick-chat-empty-text">Start a conversation by visiting someone's profile or explore the gallery</p>
                <Link
                  to="/messages"
                  className="quick-chat-empty-button"
                  onClick={() => setIsOpen(false)}
                >
                  Start chatting
                </Link>
              </div>
            ) : (
              <div className="quick-chat-conversations">
                {conversations.map((conversation) => (
                  <Link
                    key={conversation.otherUser._id}
                    to={`/messages?user=${conversation.otherUser._id}`}
                    onClick={() => setIsOpen(false)}
                    className="quick-chat-conversation"
                  >
                    <div className="quick-chat-avatar-container">
                      <div className="quick-chat-avatar">
                        {conversation.otherUser.profile?.avatar ? (
                          <img
                            src={conversation.otherUser.profile.avatar}
                            alt={conversation.otherUser.username}
                          />
                        ) : (
                          conversation.otherUser.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      {conversation.unreadCount > 0 && (
                        <div className="quick-chat-conversation-badge">
                          {conversation.unreadCount > 9 ? '9+' : conversation.unreadCount}
                        </div>
                      )}
                    </div>
                    
                    <div className="quick-chat-conversation-info">
                      <div className="quick-chat-conversation-header">
                        <p className="quick-chat-conversation-name">
                          {conversation.otherUser.profile?.displayName || conversation.otherUser.username}
                        </p>
                        <p className="quick-chat-conversation-time">
                          {formatTime(conversation.lastMessage.createdAt)}
                        </p>
                      </div>
                      <p className="quick-chat-conversation-preview">
                        {conversation.lastMessage.content || 'No messages yet'}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="quick-chat-footer">
            <Link
              to="/messages"
              onClick={() => setIsOpen(false)}
              className="quick-chat-footer-button"
            >
              View all messages
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

export default QuickChat;