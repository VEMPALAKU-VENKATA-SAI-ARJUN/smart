import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import pushNotificationService from '../services/pushNotificationService';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSupported, setIsSupported] = useState(false);

  useEffect(() => {
    const initializePushNotifications = async () => {
      if (!user) return;

      try {
        const initialized = await pushNotificationService.initialize();
        setIsSupported(pushNotificationService.isSupported);
        setIsInitialized(initialized);

        // Auto-subscribe if user has push notifications enabled and not already subscribed
        if (initialized && !pushNotificationService.isSubscribed()) {
          const permission = pushNotificationService.getPermissionStatus();
          
          // Only auto-request permission if it hasn't been denied
          if (permission === 'default') {
            // Don't auto-request, let user decide in settings
            console.log('Push notifications available - user can enable in settings');
          } else if (permission === 'granted') {
            // User previously granted permission, try to subscribe
            try {
              await pushNotificationService.subscribe();
              console.log('Auto-subscribed to push notifications');
            } catch (error) {
              console.log('Auto-subscription failed:', error.message);
            }
          }
        }
      } catch (error) {
        console.error('Push notification initialization error:', error);
      }
    };

    initializePushNotifications();
  }, [user]);

  return {
    isInitialized,
    isSupported,
    service: pushNotificationService
  };
};