class PushNotificationService {
  constructor() {
    this.isSupported = 'serviceWorker' in navigator && 'PushManager' in window;
    this.registration = null;
    this.subscription = null;
    this.vapidPublicKey = null;
  }

  async initialize() {
    if (!this.isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register('/sw.js');
      console.log('Service Worker registered successfully');

      // Get VAPID public key from server
      await this.getVapidPublicKey();

      // Check if already subscribed
      this.subscription = await this.registration.pushManager.getSubscription();
      
      return true;
    } catch (error) {
      console.error('Push notification initialization failed:', error);
      return false;
    }
  }

  async getVapidPublicKey() {
    try {
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      const response = await fetch(`${API_URL}/api/push/vapid-public-key`);
      
      if (response.status === 429) {
        console.warn('Rate limited - skipping VAPID key fetch');
        return;
      }
      
      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          this.vapidPublicKey = data.publicKey;
        }
      }
    } catch (error) {
      console.warn('Failed to get VAPID public key:', error.message);
    }
  }

  async requestPermission() {
    if (!this.isSupported) {
      return 'not-supported';
    }

    const permission = await Notification.requestPermission();
    console.log('Notification permission:', permission);
    return permission;
  }

  async subscribe() {
    if (!this.registration || !this.vapidPublicKey) {
      throw new Error('Service worker not registered or VAPID key not available');
    }

    try {
      const subscription = await this.registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: this.urlBase64ToUint8Array(this.vapidPublicKey)
      });

      // Send subscription to server
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      const response = await fetch(`${API_URL}/api/push/subscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ subscription })
      });

      const result = await response.json();
      
      if (result.success) {
        this.subscription = subscription;
        console.log('Push notification subscription successful');
        return true;
      } else {
        throw new Error(result.message);
      }
    } catch (error) {
      console.error('Push notification subscription failed:', error);
      throw error;
    }
  }

  async unsubscribe() {
    if (!this.subscription) {
      return true;
    }

    try {
      // Unsubscribe from browser
      await this.subscription.unsubscribe();

      // Remove subscription from server
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      await fetch(`${API_URL}/api/push/unsubscribe`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ endpoint: this.subscription.endpoint })
      });

      this.subscription = null;
      console.log('Push notification unsubscription successful');
      return true;
    } catch (error) {
      console.error('Push notification unsubscription failed:', error);
      throw error;
    }
  }

  isSubscribed() {
    return !!this.subscription;
  }

  getPermissionStatus() {
    if (!this.isSupported) {
      return 'not-supported';
    }
    return Notification.permission;
  }

  // Utility function to convert VAPID key
  urlBase64ToUint8Array(base64String) {
    const padding = '='.repeat((4 - base64String.length % 4) % 4);
    const base64 = (base64String + padding)
      .replace(/-/g, '+')
      .replace(/_/g, '/');

    const rawData = window.atob(base64);
    const outputArray = new Uint8Array(rawData.length);

    for (let i = 0; i < rawData.length; ++i) {
      outputArray[i] = rawData.charCodeAt(i);
    }
    return outputArray;
  }

  // Test notification
  async sendTestNotification() {
    if (!this.isSupported || Notification.permission !== 'granted') {
      return false;
    }

    new Notification('S.M.A.R.T Platform', {
      body: 'Push notifications are working!',
      icon: '/icons/icon-192x192.png',
      badge: '/icons/badge-72x72.png'
    });

    return true;
  }
}

export default new PushNotificationService();