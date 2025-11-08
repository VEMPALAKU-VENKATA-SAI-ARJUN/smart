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
      <div className="access-denied-container">
        <div className="access-denied-card">
          <MessageCircle size={64} className="access-denied-icon" />
          <h2 className="access-denied-title">Chat Not Available</h2>
          <p className="access-denied-text">
            Chat features are only available for artists and buyers. As a {currentUser.role},
            you can focus on your moderation duties.
          </p>
          <Link to="/dashboard" className="btn btn-primary">
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // Use chat context safely
  let isConnected = false;
  let sendChatMessage = null;
  let startTyping = () => { };
  let stopTyping = () => { };
  let markAsRead = () => { };
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
    console.warn('ChatProvider not available, using fallback values');
  }

  // Fetch messages for a specific user
  const fetchMessages = async (userId) => {
    console.log("🟢 FETCHING MESSAGES for userId:", userId);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/chat/conversation/${userId}`, {
        headers: { 'Authorization': `Bearer ${token}` },
      });

      const data = await response.json();
      console.log("📩 fetchMessages response:", data);

      if (data.success) {
        setMessages(data.data.messages || []);

        // ✅ NEW FIX: if selectedConversation is missing otherUser info (like from ?user= param)
        if (!selectedConversation?.otherUser && data.data.otherUser) {
          console.log("✅ Updating selectedConversation with backend otherUser");
          setSelectedConversation({
            otherUser: data.data.otherUser,
            lastMessage: data.data.messages?.[0] || { content: "", createdAt: new Date() },
            unreadCount: 0
          });
        }

        markAsRead(userId);
      } else {
        console.warn("⚠️ fetchMessages failed:", data.message);
        setMessages([]);
      }
    } catch (error) {
      console.error("❌ Error fetching messages:", error);
      setMessages([]);
    }
  };


  // Fetch all conversations
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

  // Initial load of conversations
  useEffect(() => {
    fetchConversations();
  }, []);

  // Handle URL parameter to open specific conversation
  // ✅ FIXED: Automatically open chat when ?user= param is present

  const openedRef = useRef(false);

  useEffect(() => {
    const openConversation = async () => {
      const userId = searchParams.get('user');
      if (!userId) {
        console.log("🚫 No ?user param found in URL");
        return;
      }
      openedRef.current = true; // ✅ prevents re-triggering
      console.log("🔍 Attempting to open chat with user:", userId);

      // Wait for conversations to load before proceeding
      if (loading) {
        console.log("⏳ Conversations still loading, delaying chat open...");
        return;
      }

      // Check if conversation already exists
      const existing = conversations.find(conv => conv.otherUser._id === userId);
      if (existing) {
        console.log("💬 Existing conversation found, selecting it...");
        setSelectedConversation(existing);
        fetchMessages(userId);
        return;
      }

      // Otherwise fetch user info and start new conversation
      console.log("✨ No existing chat — fetching user details...");
      try {
        const token = localStorage.getItem('auth_token');
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const response = await fetch(`${API_URL}/api/users/${userId}`, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        const data = await response.json();
        if (!data?.success) {
          console.warn("⚠️ Could not fetch user info for chat:", data.message);
          return;
        }

        const userData = data.data || data;
        const newConversation = {
          otherUser: {
            _id: userData._id,
            username: userData.username,
            profile: userData.profile,
          },
          lastMessage: { content: '', createdAt: new Date(), sender: null },
          unreadCount: 0,
        };

        console.log("✅ Created new chat object:", newConversation);

        setConversations(prev => {
          const exists = prev.some(c => c.otherUser._id === userData._id);
          if (!exists) return [newConversation, ...prev];
          return prev;
        });

        setSelectedConversation(newConversation);
        fetchMessages(userData._id); // ✅ Immediately load messages
      } catch (err) {
        console.error("❌ Error opening chat:", err);
      }
    };

    openConversation();
  }, [searchParams, conversations, loading]);



  // Fetch messages when conversation is selected
  useEffect(() => {
    if (!selectedConversation?.otherUser?._id) return;

    const userId = selectedConversation.otherUser._id;

    // Skip fetching for smart assistant
    if (userId === 'smart-assistant') {
      setMessages([]);
      return;
    }

    console.log("📨 Fetching messages for:", userId);
    fetchMessages(userId);
  }, [selectedConversation]);

  useEffect(() => {
    setConnectionError(!isConnected);
  }, [isConnected]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Handle incoming messages via WebSocket
  useEffect(() => {
    const handleNewMessage = (event) => {
      const message = event.detail;

      if (
        selectedConversation &&
        (message.sender._id === selectedConversation.otherUser._id ||
          message.recipient._id === selectedConversation.otherUser._id)
      ) {
        setMessages((prev) => [...prev, message]);
      }

      setConversations((prev) => {
        const updated = prev.map((conv) => {
          if (
            conv.otherUser._id === message.sender._id ||
            conv.otherUser._id === message.recipient._id
          ) {
            return { ...conv, lastMessage: message };
          }
          return conv;
        });

        const exists = updated.some(
          (conv) =>
            conv.otherUser._id === message.sender._id ||
            conv.otherUser._id === message.recipient._id
        );

        if (!exists) {
          const otherUser =
            message.sender._id === currentUser.id
              ? message.recipient
              : message.sender;
          updated.unshift({
            otherUser,
            lastMessage: message,
            unreadCount: message.sender._id !== currentUser.id ? 1 : 0,
          });
        }

        return updated;
      });
    };

    const handleMessageSent = (event) => {
      const message = event.detail;
    };

    window.addEventListener('new_message', handleNewMessage);
    window.addEventListener('message_sent', handleMessageSent);

    return () => {
      window.removeEventListener('new_message', handleNewMessage);
      window.removeEventListener('message_sent', handleMessageSent);
    };
  }, [selectedConversation, currentUser.id]);

  const handleTyping = (e) => {
    setNewMessage(e.target.value);

    if (selectedConversation && e.target.value.trim()) {
      startTyping(selectedConversation.otherUser._id);

      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
      }

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
      // Handle S.M.A.R.T Assistant chat
      if (selectedConversation.otherUser._id === 'smart-assistant') {
        const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
        const token = localStorage.getItem('auth_token');

        const response = await fetch(`${API_URL}/api/ai-chat`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ message: messageContent })
        });

        const data = await response.json();

        if (data.success && data.data?.botMsg) {
          setMessages(prev => [...prev, data.data.botMsg]);
        } else if (data.reply) {
          setMessages(prev => [
            ...prev,
            {
              _id: Date.now().toString() + '_ai',
              content: data.reply,
              sender: { _id: 'smart-assistant' },
              recipient: { _id: currentUser.id },
              createdAt: new Date().toISOString(),
              status: 'sent'
            }
          ]);
        }

        setSendingMessage(false);
        return;
      }

      // Handle regular user-to-user messages
      let response;

      if (isConnected && sendChatMessage) {
        try {
          response = await sendChatMessage(
            selectedConversation.otherUser._id,
            messageContent
          );
        } catch (socketError) {
          console.warn('Socket sending failed, falling back to API:', socketError);
          response = await sendMessageViaAPI(
            selectedConversation.otherUser._id,
            messageContent
          );
        }
      } else {
        response = await sendMessageViaAPI(
          selectedConversation.otherUser._id,
          messageContent
        );
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === tempId ? { ...data.data, status: 'sent' } : msg
          )
        );

        // Update or add conversation to list
        setConversations(prev => {
          const exists = prev.some(conv =>
            conv.otherUser._id === selectedConversation.otherUser._id
          );

          if (exists) {
            return prev.map(conv =>
              conv.otherUser._id === selectedConversation.otherUser._id
                ? { ...conv, lastMessage: data.data }
                : conv
            );
          } else {
            // Add new conversation to the list
            return [{
              otherUser: selectedConversation.otherUser,
              lastMessage: data.data,
              unreadCount: 0
            }, ...prev];
          }
        });

        if (stopTyping) {
          stopTyping(selectedConversation.otherUser._id);
        }
      } else {
        throw new Error(data.message || 'Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message:', error);

      setMessages(prev =>
        prev.map(msg =>
          msg._id === tempId ? { ...msg, status: 'failed' } : msg
        )
      );

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
    setMessages(prev =>
      prev.map(msg =>
        msg._id === failedMessage._id ? { ...msg, status: 'sending' } : msg
      )
    );

    try {
      let response;

      if (isConnected && sendChatMessage) {
        try {
          response = await sendChatMessage(
            selectedConversation.otherUser._id,
            failedMessage.content
          );
        } catch (socketError) {
          console.warn('Socket retry failed, falling back to API:', socketError);
          response = await sendMessageViaAPI(selectedConversation.otherUser._id, failedMessage.content);
        }
      } else {
        response = await sendMessageViaAPI(selectedConversation.otherUser._id, failedMessage.content);
      }

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      if (data.success) {
        setMessages(prev =>
          prev.map(msg =>
            msg._id === failedMessage._id ? { ...data.data, status: 'sent' } : msg
          )
        );

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

      setMessages(prev =>
        prev.map(msg =>
          msg._id === failedMessage._id ? { ...msg, status: 'failed' } : msg
        )
      );

      alert('Failed to send message. Please check your connection and try again.');
    }
  };

  const formatMessageTime = (date) => {
    const messageDate = new Date(date);
    const now = new Date();
    const diffInHours = (now - messageDate) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) {
      return messageDate.toLocaleDateString([], { weekday: 'short' });
    } else {
      return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const username = conv?.otherUser?.username?.toLowerCase?.() || '';
    const displayName = conv?.otherUser?.profile?.displayName?.toLowerCase?.() || '';
    return (
      username.includes(searchTerm.toLowerCase()) ||
      displayName.includes(searchTerm.toLowerCase())
    );
  });

  if (loading) {
    return (
      <div className="loading-page">
        <div className="loading-content">
          <div className="loading"></div>
          <p className="loading-text">Loading messages...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="chat-container">
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
        <div className="conversations-sidebar">
          <div className="conversations-header">
            <div className="conversations-header-content">
              <div className="conversations-header-icon">
                <MessageCircle size={24} />
              </div>
              <h1 className="conversations-title">Messages</h1>
            </div>

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
                  {searchTerm
                    ? 'Try a different search term'
                    : "Start a conversation by visiting someone's profile"}
                </p>
                <Link to="/gallery" className="btn btn-primary btn-sm">
                  Explore Gallery
                </Link>
              </div>
            ) : (
              filteredConversations
                .filter((conv) => conv?.otherUser)
                .map((conversation) => (
                  <div
                    key={conversation.otherUser._id}
                    onClick={() => setSelectedConversation(conversation)}
                    className={`conversation-item ${selectedConversation?.otherUser?._id === conversation.otherUser._id
                      ? 'active'
                      : ''
                      }`}
                  >
                    <div className="conversation-avatar-container">
                      <div className="conversation-avatar">
                        {conversation?.otherUser?.profile?.avatar ? (
                          <img
                            src={conversation.otherUser.profile.avatar}
                            alt={conversation.otherUser?.username || 'User'}
                          />
                        ) : (
                          (conversation?.otherUser?.username?.charAt(0)?.toUpperCase() || 'U')
                        )}
                      </div>

                      {conversation.unreadCount > 0 && (
                        <div className="conversation-unread-badge">
                          {conversation.unreadCount > 99
                            ? '99+'
                            : conversation.unreadCount}
                        </div>
                      )}
                    </div>

                    <div className="conversation-info">
                      <div className="conversation-header">
                        <p className="conversation-name">
                          {conversation.otherUser.profile?.displayName ||
                            conversation.otherUser.username}
                        </p>
                        <p className="conversation-time">
                          {formatMessageTime(conversation.lastMessage.createdAt)}
                        </p>
                      </div>
                      <p
                        className={`conversation-preview ${conversation.unreadCount > 0 ? 'unread' : ''
                          }`}
                      >
                        {conversation.lastMessage.sender === currentUser.id ? 'You: ' : ''}
                        {conversation.lastMessage.content || 'No messages yet'}
                      </p>
                    </div>
                  </div>
                ))
            )}
          </div>

          <div className="smart-assistant-entry">
            <button
              className="smart-assistant-button"
              onClick={() => {
                setSelectedConversation({
                  otherUser: {
                    _id: "smart-assistant",
                    username: "smart_assistant",
                    profile: {
                      displayName: "S.M.A.R.T Assistant",
                      avatar: "/smartbot-avatar.png"
                    }
                  }
                });
                setMessages([]);
              }}
            >
              💬 Chat with S.M.A.R.T Assistant
            </button>
          </div>
        </div>

        <div className="chat-area">
          {selectedConversation ? (
            <>
              <div className="chat-header">
                {selectedConversation?.otherUser?._id === 'smart-assistant' && (
                  <div className="ai-chat-header">
                    🤖 <span>S.M.A.R.T Assistant</span>
                  </div>
                )}
                <div className="chat-header-content">
                  <div className="chat-header-info">
                    <div className="chat-user-avatar-container">
                      <div className="chat-user-avatar">
                        {selectedConversation?.otherUser?.profile?.avatar ? (
                          <img
                            src={selectedConversation.otherUser.profile.avatar}
                            alt={selectedConversation.otherUser?.username || "User"}
                          />
                        ) : (
                          (selectedConversation?.otherUser?.username?.charAt(0)?.toUpperCase() || "U")
                        )}
                      </div>

                      <div
                        className={`chat-user-status ${isUserOnline(selectedConversation?.otherUser?._id) ? "online" : "offline"
                          }`}
                      ></div>
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