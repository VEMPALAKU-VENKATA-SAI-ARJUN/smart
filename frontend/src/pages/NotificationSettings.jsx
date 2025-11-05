import { useState, useEffect } from 'react';
import { Bell, Mail, Smartphone, Check, X, TestTube } from 'lucide-react';
import pushNotificationService from '../services/pushNotificationService';

function NotificationSettings() {
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    emailMessages: true,
    pushNotifications: true,
    notificationTypes: {
      follow: true,
      like: true,
      comment: true,
      artwork_approved: true,
      artwork_rejected: true,
      commission_request: true,
      message: true
    }
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pushStatus, setPushStatus] = useState({
    supported: false,
    permission: 'default',
    subscribed: false
  });
  const [testingPush, setTestingPush] = useState(false);

  useEffect(() => {
    fetchPreferences();
    initializePushNotifications();
  }, []);

  const fetchPreferences = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/push/preferences`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success) {
        setPreferences(data.data);
      }
    } catch (error) {
      console.error('Error fetching preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const initializePushNotifications = async () => {
    const initialized = await pushNotificationService.initialize();

    setPushStatus({
      supported: pushNotificationService.isSupported,
      permission: pushNotificationService.getPermissionStatus(),
      subscribed: pushNotificationService.isSubscribed()
    });
  };

  const savePreferences = async (newPreferences) => {
    setSaving(true);
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

      const response = await fetch(`${API_URL}/api/push/preferences`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ preferences: newPreferences })
      });

      const data = await response.json();
      if (data.success) {
        setPreferences(newPreferences);
      }
    } catch (error) {
      console.error('Error saving preferences:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleToggle = (key, subKey = null) => {
    const newPreferences = { ...preferences };

    if (subKey) {
      newPreferences[key] = {
        ...newPreferences[key],
        [subKey]: !newPreferences[key][subKey]
      };
    } else {
      newPreferences[key] = !newPreferences[key];
    }

    savePreferences(newPreferences);
  };

  const handlePushToggle = async () => {
    if (!pushStatus.supported) {
      alert('Push notifications are not supported in your browser');
      return;
    }

    try {
      if (pushStatus.subscribed) {
        // Unsubscribe
        await pushNotificationService.unsubscribe();
        setPushStatus(prev => ({ ...prev, subscribed: false }));

        // Update preferences
        const newPreferences = { ...preferences, pushNotifications: false };
        savePreferences(newPreferences);
      } else {
        // Request permission and subscribe
        const permission = await pushNotificationService.requestPermission();

        if (permission === 'granted') {
          await pushNotificationService.subscribe();
          setPushStatus(prev => ({
            ...prev,
            permission: 'granted',
            subscribed: true
          }));

          // Update preferences
          const newPreferences = { ...preferences, pushNotifications: true };
          savePreferences(newPreferences);
        } else {
          alert('Push notification permission was denied');
        }
      }
    } catch (error) {
      console.error('Push notification toggle error:', error);
      alert('Failed to update push notification settings');
    }
  };

  const testPushNotification = async () => {
    setTestingPush(true);
    try {
      const success = await pushNotificationService.sendTestNotification();
      if (success) {
        alert('Test notification sent! Check your notifications.');
      } else {
        alert('Failed to send test notification. Make sure notifications are enabled.');
      }
    } catch (error) {
      console.error('Test notification error:', error);
      alert('Failed to send test notification');
    } finally {
      setTestingPush(false);
    }
  };

  const notificationTypeLabels = {
    follow: 'New Followers',
    like: 'Artwork Likes',
    comment: 'Artwork Comments',
    artwork_approved: 'Artwork Approvals',
    artwork_rejected: 'Artwork Rejections',
    commission_request: 'Commission Requests',
    message: 'Direct Messages'
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3">
            <Bell className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Notification Settings</h1>
              <p className="text-gray-600">Manage how you receive notifications</p>
            </div>
          </div>
        </div>

        {/* Email Notifications */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Mail className="w-6 h-6 text-green-600" />
            <h2 className="text-xl font-semibold text-gray-900">Email Notifications</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">General Notifications</h3>
                <p className="text-sm text-gray-600">Receive email notifications for activities</p>
              </div>
              <button
                onClick={() => handleToggle('emailNotifications')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.emailNotifications ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                disabled={saving}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.emailNotifications ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-900">Message Notifications</h3>
                <p className="text-sm text-gray-600">Receive email notifications for new messages</p>
              </div>
              <button
                onClick={() => handleToggle('emailMessages')}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.emailMessages ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                disabled={saving}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.emailMessages ? 'translate-x-6' : 'translate-x-1'
                    }`}
                />
              </button>
            </div>
          </div>
        </div>

        {/* Push Notifications */}
        <div className="bg-white rounded-lg shadow-sm p-6 mb-6">
          <div className="flex items-center space-x-3 mb-4">
            <Smartphone className="w-6 h-6 text-purple-600" />
            <h2 className="text-xl font-semibold text-gray-900">Push Notifications</h2>
          </div>

          {!pushStatus.supported ? (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <p className="text-yellow-800">Push notifications are not supported in your browser.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">Browser Notifications</h3>
                  <p className="text-sm text-gray-600">
                    Status: {pushStatus.permission === 'granted' ? 'Enabled' : 'Disabled'} •
                    {pushStatus.subscribed ? ' Subscribed' : ' Not subscribed'}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={testPushNotification}
                    disabled={!pushStatus.subscribed || testingPush}
                    className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded hover:bg-gray-200 disabled:opacity-50"
                  >
                    <TestTube className="w-4 h-4 inline mr-1" />
                    {testingPush ? 'Testing...' : 'Test'}
                  </button>
                  <button
                    onClick={handlePushToggle}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${pushStatus.subscribed ? 'bg-purple-600' : 'bg-gray-200'
                      }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${pushStatus.subscribed ? 'translate-x-6' : 'translate-x-1'
                        }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Notification Types */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Notification Types</h2>
          <p className="text-gray-600 mb-6">Choose which types of notifications you want to receive</p>

          <div className="space-y-4">
            {Object.entries(notificationTypeLabels).map(([key, label]) => (
              <div key={key} className="flex items-center justify-between">
                <div>
                  <h3 className="font-medium text-gray-900">{label}</h3>
                </div>
                <button
                  onClick={() => handleToggle('notificationTypes', key)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${preferences.notificationTypes[key] ? 'bg-blue-600' : 'bg-gray-200'
                    }`}
                  disabled={saving}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${preferences.notificationTypes[key] ? 'translate-x-6' : 'translate-x-1'
                      }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>

        {/* Save Status */}
        {saving && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg">
            Saving preferences...
          </div>
        )}
      </div>
    </div>
  );
}

export default NotificationSettings;