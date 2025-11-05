// src/contexts/ChatContext.jsx - Real-time chat context
import { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';

const ChatContext = createContext();

export const useChat = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error('useChat must be used within a ChatProvider');
  }
  return context;
};

export const ChatProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [onlineUsers, setOnlineUsers] = useState(new Set());
  const [typingUsers, setTypingUsers] = useState(new Map());
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
    
    // Only initialize chat for artists and buyers
    if (!token || !user.id || (user.role !== 'artist' && user.role !== 'buyer')) {
      return;
    }

    // Initialize socket connection
    const newSocket = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      auth: { token }
    });

    newSocket.on('connect', () => {
      console.log('✓ Connected to chat server');
      setIsConnected(true);
      newSocket.emit('user_online');
    });

    newSocket.on('disconnect', () => {
      console.log('✗ Disconnected from chat server');
      setIsConnected(false);
    });

    // Handle user status changes
    newSocket.on('user_status_change', (data) => {
      setOnlineUsers(prev => {
        const newSet = new Set(prev);
        if (data.status === 'online') {
          newSet.add(data.userId);
        } else {
          newSet.delete(data.userId);
        }
        return newSet;
      });
    });

    // Handle typing indicators
    newSocket.on('user_typing', (data) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.set(data.userId, data.username);
        return newMap;
      });
    });

    newSocket.on('user_stopped_typing', (data) => {
      setTypingUsers(prev => {
        const newMap = new Map(prev);
        newMap.delete(data.userId);
        return newMap;
      });
    });

    // Handle new messages
    newSocket.on('new_message', (message) => {
      // Increment unread count
      setUnreadCount(prev => prev + 1);
      
      // Dispatch custom event for components to handle
      window.dispatchEvent(new CustomEvent('new_message', { 
        detail: message 
      }));
    });

    newSocket.on('message_sent', (message) => {
      // Dispatch custom event for sent messages
      window.dispatchEvent(new CustomEvent('message_sent', { 
        detail: message 
      }));
    });

    newSocket.on('messages_read', (data) => {
      // Handle read receipts
      window.dispatchEvent(new CustomEvent('messages_read', { 
        detail: data 
      }));
    });

    setSocket(newSocket);

    return () => {
      newSocket.close();
    };
  }, []);

  // Fetch initial unread count
  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const token = localStorage.getItem('auth_token');
        const user = JSON.parse(localStorage.getItem('auth_user') || '{}');
        
        // Only fetch unread count for artists and buyers
        if (!token || !user.id || (user.role !== 'artist' && user.role !== 'buyer')) {
          return;
        }

        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/unread-count`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (response.ok) {
          const data = await response.json();
          setUnreadCount(data.data.count);
        }
      } catch (error) {
        console.error('Failed to fetch unread count:', error);
      }
    };

    fetchUnreadCount();
  }, []);

  const sendMessage = (recipientId, content, messageType = 'text', relatedArtwork = null) => {
    if (!socket || !isConnected) {
      throw new Error('Not connected to chat server');
    }

    return fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/send`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
      },
      body: JSON.stringify({
        recipientId,
        content,
        messageType,
        relatedArtwork
      })
    });
  };

  const startTyping = (recipientId) => {
    if (socket && isConnected) {
      socket.emit('typing_start', { recipientId });
    }
  };

  const stopTyping = (recipientId) => {
    if (socket && isConnected) {
      socket.emit('typing_stop', { recipientId });
    }
  };

  const markAsRead = async (conversationUserId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:5000'}/api/chat/read/${conversationUserId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('auth_token')}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setUnreadCount(prev => Math.max(0, prev - data.data.markedAsRead));
      }
    } catch (error) {
      console.error('Failed to mark messages as read:', error);
    }
  };

  const isUserOnline = (userId) => {
    return onlineUsers.has(userId);
  };

  const isUserTyping = (userId) => {
    return typingUsers.has(userId);
  };

  const getTypingUsername = (userId) => {
    return typingUsers.get(userId);
  };

  const value = {
    socket,
    isConnected,
    unreadCount,
    setUnreadCount,
    sendMessage,
    startTyping,
    stopTyping,
    markAsRead,
    isUserOnline,
    isUserTyping,
    getTypingUsername,
    onlineUsers: Array.from(onlineUsers),
    typingUsers: Array.from(typingUsers.entries())
  };

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
};

export default ChatContext;