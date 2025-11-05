import { useState, useEffect, useRef, useCallback } from 'react';
import { MessageCircle, Send, Search, MoreVertical, Circle } from 'lucide-react';
import { Link, useSearchParams } from 'react-router-dom';
import { useChat } from '../contexts/ChatContext';
import '../styles/Messages.css';

function Messages() {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [connectionError, setConnectionError] = useState(false);
  const messagesEndRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  const [searchParams] = useSearchParams();

  // Redirect moderators and admins away from chat
  if (currentUser.role === 'moderator' || currentUser.role === 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center p-8 bg-white rounded-lg shadow-md max-w-md">
          <MessageCircle size={64} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Chat Not Available</h2>
          <p className="text-gray-600 mb-4">
            Chat features are only available for artists and buyers. As a {currentUser.role}, 
            you can focus on your moderation duties.
          </p>
          <Link 
            to="/dashboard" 
            className="btn btn-primary"
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }
  
  // Use chat context safely
  let isConnected = false;
  let sendChatMessage = null;
  let startTyping = () => {};
  let stopTyping = () => {};
  let markAsRead = () => {};
  let isUserOnline = () => false;
  let isUserTyping = () => false;
  
  try {
    const chatContext = useChat();
    isConnected = chatContext.isConnected;
    sendChatMessage = chatContext.sendMessage;
    startTyping = chatContext.startTyping;
    stopTyping = chatContext.stopTyping;
    markAsRead = chatContext.markAsRead;
    isUserOnline = chatContext.isUserOnline;
    isUserTyping = chatContext.isUserTyping;
  } catch (error) {
    // ChatProvider not available - use fallback values
    console.warn('ChatProvider not available, using fallback values');
  }

  // Update connection error state in useEffect to avoid infinite re-renders
  useEffect(() => {
    setConnectionError(!isConnected);
  }, [isConnected]);

  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle starting conversation with specific user from URL params
  useEffect(() => {
    const userId = searchParams.get('user');
    
    if (userId && !loading) {
      // Check if conversation already exists
      const existingConversation = conversations.find(conv => conv.otherUser._id === userId);
      
      if (existingConversation) {
        setSelectedConversation(existingConversation);
      } else {
        startNewConversation(userId);
      }
    }
  }, [conversations, searchParams, loading]);

  useEffect(() => {
    if (selectedConversation) {
      fetchMessages(selectedConversation.otherUser._id);
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real-time event listeners
  useEffect(() => {
    const handleNewMessage = (event) => {
      const message = event.detail;
      
      // Add message to current conversation if it matches
      if (selectedConversation && 
          (message.sender._id === selectedConversation.otherUser._id || 
           message.recipient._id === selectedConversation.otherUser._id)) {
        setMessages(prev => [...prev, message]);
      }
      
      // Update conversations list
      setConversations(prev => {
        const updated = prev.map(conv => {
          if (conv.otherUser._id === message.sender._id || 
              conv.otherUser._id === message.recipient._id) {
            return { ...conv, lastMessage: message };
          }
          return conv;
        });
        
        // If conversation doesn't exist, add it
        const exists = updated.some(conv => 
          conv.otherUser._id === message.sender._id || 
          conv.otherUser._id === message.recipient._id
        );
        
        if (!exists) {
          const otherUser = message.sender._id === currentUser.id ? message.recipient : message.sender;
          updated.unshift({
            otherUser,
            lastMessage: message,
            unreadCount: message.sender._id !== currentUser.id ? 1 : 0
          });
        }
        
        return updated;
      });
    };

    const handleMessageSent = (event) => {
      const message = event.detail;
      // Message already added by sendMessage function
    };

    window.addEventListener('new_message', handleNewMessage);
    window.addEventListener('message_sent', handleMessageSent);

    return () => {
      window.removeEventListener('new_message', handleNewMessage);
      window.removeEventListener('message_sent', handleMessageSent);
    };
  }, [selectedConversation, currentUser.id]);

  // Handle typing indicators
  const handleTyping = (e) => {
    setNewMessage(e.target.value);
    
    if (selectedConversation && e.target.value.trim()) {
      startTyping(selectedConversation.otherUser._id);
      
      // Clear existing timeout
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }
      
      // Set new timeout to stop typing
      typingTimeoutRef.current = setTimeout(() => {
        stopTyping(selectedConversation.otherUser._id);
      }, 1000);
    } else if (selectedConversation) {
      stopTyping(selectedConversation.otherUser._id);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const startNewConversation = useCallback(async (userId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      
      if (data.success) {
        const userData = data.data || data;
        
        const newConversation = {
          otherUser: {
            _id: userData._id,
            username: userData.username,
            profile: userData.profile
          },
          lastMessage: {
            content: '',
            createdAt: new Date(),
            sender: null
          },
          unreadCount: 0
        };
        
        setSelectedConversation(newConversation);
        setMessages([]);
      }
    } catch (error) {
      console.error('Error starting new conversation:', error);
    }
  }, []);

  const fetchConversations = async () => {
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
        setConversations(data.data);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (userId) => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/chat/conversation/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setMessages(data.data.messages);
        // Mark messages as read
        markAsRead(userId);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  };

  // Fallback API function for when socket is not connected
  const sendMessageViaAPI = async (recipientId, content) => {
    const token = localStorage.getItem('auth_token');
    const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
    
    return fetch(`${API_URL}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        recipientId,
        content,
        messageType: 'text'
      })
    });
  };

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation || sendingMessage) return;

    const messageContent = newMessage.trim();
    const tempId = Date.now().toString();

    // Optimistic update - add message immediately
    const optimisticMessage = {
      _id: tempId,
      content: messageContent,
      sender: { _id: currentUser.id },
      recipient: { _id: selectedConversation.otherUser._id },
      createdAt: new Date().toISOString(),
      status: 'sending'
    };

    setMessages(prev => [...prev, optimisticMessage]);
    setNewMessage('');
    setSendingMessage(true);

    try {
      let response;
      
      // Try socket-based sending first if connected and available
      if (isConnected && sendChatMessage) {
        try {
          response = await sendChatMessage(
            selectedConversation.otherUser._id,
            messageContent
          );
        } catch (socketError) {
          console.warn('Socket sending failed, falling back to API:', socketError);
          // Fall back to API if socket fails
          response = await sendMessageViaAPI(selectedConversation.otherUser._id, messageContent);
        }
      } else {
        // Use API fallback when not connected or no socket function
        response = await sendMessageViaAPI(selectedConversation.otherUser._id, messageContent);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Replace optimistic message with real message
        setMessages(prev => 
          prev.map(msg => 
            msg._id === tempId ? { ...data.data, status: 'sent' } : msg
          )
        );

        // Update conversation list
        setConversations(prev =>
          prev.map(conv =>
            conv.otherUser._id === selectedConversation.otherUser._id
              ? { ...conv, lastMessage: data.data }
              : conv
          )
        );
        
        // Stop typing indicator if available
        if (stopTyping) {
          stopTyping(selectedConversation.otherUser._id);
        }
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Mark message as failed
      setMessages(prev => 
        prev.map(msg => 
          msg._id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );
      
      // Show user-friendly error message based on error type
      let errorMessage = 'Failed to send message. Please try again.';
      if (error.message.includes('Not connected') || error.message.includes('connection')) {
        errorMessage = 'Connection lost. Click retry to send when connection is restored.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again in a moment.';
      }
      
      console.warn(errorMessage);
    } finally {
      setSendingMessage(false);
    }
  };

  const retryMessage = async (failedMessage) => {
    // Update message status to sending
    setMessages(prev => 
      prev.map(msg => 
        msg._id === failedMessage._id ? { ...msg, status: 'sending' } : msg
      )
    );

    try {
      let response;
      
      // Try socket-based sending first if connected and available
      if (isConnected && sendChatMessage) {
        try {
          response = await sendChatMessage(
            selectedConversation.otherUser._id,
            failedMessage.content
          );
        } catch (socketError) {
          console.warn('Socket retry failed, falling back to API:', socketError);
          // Fall back to API if socket fails
          response = await sendMessageViaAPI(selectedConversation.otherUser._id, failedMessage.content);
        }
      } else {
        // Use API fallback when not connected or no socket function
        response = await sendMessageViaAPI(selectedConversation.otherUser._id, failedMessage.content);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        // Replace failed message with successful message
        setMessages(prev => 
          prev.map(msg => 
            msg._id === failedMessage._id ? { ...data.data, status: 'sent' } : msg
          )
        );

        // Update conversation list
        setConversations(prev =>
          prev.map(conv =>
            conv.otherUser._id === selectedConversation.otherUser._id
              ? { ...conv, lastMessage: data.data }
              : conv
          )
        );
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error retrying message:', error);
      
      // Mark message as failed again
      setMessages(prev => 
        prev.map(msg => 
          msg._id === failedMessage._id ? { ...msg, status: 'failed' } : msg
        )
      );
      
      // Show user-friendly error message based on error type
      let errorMessage = 'Failed to send message. Please check your connection and try again.';
      if (error.message.includes('Not connected') || error.message.includes('connection')) {
        errorMessage = 'Still no connection. Please check your internet and try again.';
      } else if (error.message.includes('401') || error.message.includes('403')) {
        errorMessage = 'Authentication error. Please refresh the page and try again.';
      } else if (error.message.includes('500')) {
        errorMessage = 'Server error. Please try again in a moment.';
      }
      
      alert(errorMessage);
    }
  };

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.otherUser.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (conv.otherUser.profile?.displayName || '').toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Chat system is working correctly!

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="loading mb-4"></div>
          <p className="text-gray-600">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      {/* Connection Status Banner */}
      {connectionError && (
        <div className="connection-banner">
          <div className="connection-banner-content">
            <Circle size={12} className="connection-banner-icon" />
            <span>Connection lost. Messages will be sent when connection is restored.</span>
            <button 
              onClick={() => window.location.reload()} 
              className="connection-banner-retry"
            >
              Retry
            </button>
          </div>
        </div>
      )}
      
      <div className="chat-main">
        {/* Conversations Sidebar */}
        <div className="conversations-sidebar">

          {/* Header */}
          <div className="conversations-header">
            <div className="conversations-header-content">
              <div className="conversations-header-icon">
                <MessageCircle size={24} />
              </div>
              <h1 className="conversations-title">Messages</h1>
            </div>

            {/* Search */}
            <div className="conversations-search">
              <Search className="conversations-search-icon" size={16} />
              <input
                type="text"
                placeholder="Search conversations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="conversations-search-input"
              />
            </div>
          </div>

          {/* Conversations List */}
          <div className="conversations-list">
            {filteredConversations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">
                  <MessageCircle size={48} />
                </div>
                <h3>
                  {searchTerm ? 'No conversations found' : 'No messages yet'}
                </h3>
                <p>
                  {searchTerm ? 'Try a different search term' : 'Start a conversation by visiting someone\'s profile'}
                </p>
                <Link to="/gallery" className="btn btn-primary btn-sm">
                  Explore Gallery
                </Link>
              </div>
            ) : (
              filteredConversations.map((conversation) => (
                <div
                  key={conversation.otherUser._id}
                  onClick={() => setSelectedConversation(conversation)}
                  className={`conversation-item ${selectedConversation?.otherUser._id === conversation.otherUser._id ? 'active' : ''}`}
                >
                  <div className="conversation-avatar-container">
                    <div className="conversation-avatar">
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
                      <div className="conversation-unread-badge">
                        {conversation.unreadCount > 99 ? '99+' : conversation.unreadCount}
                      </div>
                    )}
                  </div>

                  <div className="conversation-info">
                    <div className="conversation-header">
                      <p className="conversation-name">
                        {conversation.otherUser.profile?.displayName || conversation.otherUser.username}
                      </p>
                      <p className="conversation-time">
                        {formatMessageTime(conversation.lastMessage.createdAt)}
                      </p>
                    </div>
                    <p className={`conversation-preview ${conversation.unreadCount > 0 ? 'unread' : ''}`}>
                      {conversation.lastMessage.sender === currentUser.id ? 'You: ' : ''}
                      {conversation.lastMessage.content || 'No messages yet'}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="chat-area">
          {selectedConversation ? (
            <>
              {/* Chat Header */}
              <div className="chat-header">
                <div className="chat-header-content">
                  <div className="chat-header-info">

                    <div className="chat-user-avatar-container">
                      <div className="chat-user-avatar">
                        {selectedConversation.otherUser.profile?.avatar ? (
                          <img
                            src={selectedConversation.otherUser.profile.avatar}
                            alt={selectedConversation.otherUser.username}
                          />
                        ) : (
                          selectedConversation.otherUser.username.charAt(0).toUpperCase()
                        )}
                      </div>
                      <div className={`chat-user-status ${isUserOnline(selectedConversation.otherUser._id) ? 'online' : 'offline'}`}></div>
                    </div>

                    <div className="chat-user-details">
                      <h2>
                        {selectedConversation.otherUser.profile?.displayName || selectedConversation.otherUser.username}
                      </h2>
                      <div className="chat-user-meta">
                        <Link
                          to={`/profile/${selectedConversation.otherUser._id}`}
                          className="chat-user-username"
                        >
                          @{selectedConversation.otherUser.username}
                        </Link>
                        {isUserTyping(selectedConversation.otherUser._id) && (
                          <span className="chat-typing-indicator">typing...</span>
                        )}
                      </div>
                      <div className="chat-status-indicators">
                        <div className={`chat-status-dot ${isUserOnline(selectedConversation.otherUser._id) ? 'online' : 'offline'}`}></div>
                        <span className="chat-status-text">
                          {isUserOnline(selectedConversation.otherUser._id) ? 'Online' : 'Offline'}
                        </span>
                        {!isConnected && (
                          <>
                            <span className="chat-status-text">•</span>
                            <span className="chat-connection-status">Connecting...</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <button className="chat-menu-button">
                    <MoreVertical size={20} />
                  </button>
                </div>
              </div>

              {/* Messages */}
              <div className="messages-area">
                {messages.length === 0 ? (
                  <div className="messages-empty">
                    <div className="messages-empty-content">
                      <div className="messages-empty-icon">
                        <MessageCircle size={32} />
                      </div>
                      <h3>Start the conversation</h3>
                      <p>Send a message to get things started!</p>
                    </div>
                  </div>
                ) : (
                  <div className="messages-container">
                    {messages.map((message, index) => (
                      <div
                        key={message._id}
                        className={`message-group ${message.sender._id === currentUser.id ? 'sent' : 'received'}`}
                      >
                        <div className={`message-bubble ${message.sender._id === currentUser.id ? 'sent' : 'received'} ${message.status === 'failed' ? 'message-failed' : ''}`}>
                          <p className="message-content">{message.content}</p>
                          <div className="message-footer">
                            <p className={`message-time ${message.sender._id === currentUser.id ? 'sent' : 'received'}`}>
                              {formatMessageTime(message.createdAt)}
                            </p>
                            {message.status === 'sending' && (
                              <span className="message-status sending">Sending</span>
                            )}
                            {message.status === 'failed' && (
                              <button 
                                className="message-retry"
                                onClick={() => retryMessage(message)}
                                title="Retry sending message"
                              >
                                Retry
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {/* Typing Indicator */}
                    {isUserTyping(selectedConversation.otherUser._id) && (
                      <div className="message-group received">
                        <div className="typing-indicator">
                          <div className="typing-dots">
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                            <div className="typing-dot"></div>
                          </div>
                          <span className="typing-text">{selectedConversation.otherUser.profile?.displayName || selectedConversation.otherUser.username} is typing...</span>
                        </div>
                      </div>
                    )}
                    
                    <div ref={messagesEndRef} />
                  </div>
                )}
              </div>

              {/* Message Input */}
              <div className="message-input-area">
                <form onSubmit={sendMessage} className="message-input-form">
                  <div className="message-input-container">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={handleTyping}
                      placeholder="Type a message..."
                      className="message-input"
                      disabled={sendingMessage}
                      maxLength={1000}
                    />
                    <div className="message-input-counter">
                      {newMessage.length}/1000
                    </div>
                  </div>
                  <button
                    type="submit"
                    disabled={!newMessage.trim() || sendingMessage}
                    className="message-send-button"
                  >
                    {sendingMessage ? (
                      <div className="loading-spinner"></div>
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </form>
              </div>
            </>
          ) : (
            <div className="chat-select-state">
              <div className="chat-select-content">
                <MessageCircle className="chat-select-icon" size={64} />
                <h3>Select a conversation</h3>
                <p>Choose a conversation from the sidebar to start messaging</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Messages;