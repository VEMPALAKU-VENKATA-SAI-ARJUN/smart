import { useEffect } from 'react';
import { useSocket } from '../contexts/SocketContext';

/**
 * Hook to listen for real-time follow updates
 * @param {function} onFollowUpdate - Callback when follower count changes
 * @param {function} onNewFollower - Callback when someone follows you
 */
export const useFollowUpdates = (onFollowUpdate, onNewFollower) => {
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket) return;

    // Listen for follower count updates
    const handleFollowUpdate = (data) => {
      console.log('📊 Follow update received:', data);
      if (onFollowUpdate) {
        onFollowUpdate(data);
      }
    };

    // Listen for new follower notifications
    const handleNewNotification = (notification) => {
      console.log('🔔 New notification received:', notification);
      if (notification.type === 'follow' && onNewFollower) {
        onNewFollower(notification);
      }
    };

    socket.on('follow:update', handleFollowUpdate);
    socket.on('notification:new', handleNewNotification);

    return () => {
      socket.off('follow:update', handleFollowUpdate);
      socket.off('notification:new', handleNewNotification);
    };
  }, [socket, onFollowUpdate, onNewFollower]);
};
