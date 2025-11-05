import { useState } from 'react';

function ChatDebug() {
  const [testUserId, setTestUserId] = useState('');
  const [testResult, setTestResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testUserAPI = async () => {
    if (!testUserId.trim()) return;
    
    setLoading(true);
    setTestResult(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      console.log('Testing API call to:', `${API_URL}/api/users/${testUserId}`);
      console.log('Using token:', token ? 'Token exists' : 'No token');
      
      const response = await fetch(`${API_URL}/api/users/${testUserId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      console.log('Response status:', response.status);
      console.log('Response headers:', response.headers);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      setTestResult({
        success: response.ok,
        status: response.status,
        data: data
      });
    } catch (error) {
      console.error('API test error:', error);
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const testChatAPI = async () => {
    setLoading(true);
    setTestResult(null);
    
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      console.log('Testing chat conversations API');
      
      const response = await fetch(`${API_URL}/api/chat/conversations`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      console.log('Chat conversations response:', data);
      
      setTestResult({
        success: response.ok,
        status: response.status,
        data: data
      });
    } catch (error) {
      console.error('Chat API test error:', error);
      setTestResult({
        success: false,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Chat System Debug Tool</h2>
      
      <div className="space-y-4">
        <div>
          <h3 className="font-semibold mb-2">Test User API</h3>
          <div className="flex gap-2">
            <input
              type="text"
              value={testUserId}
              onChange={(e) => setTestUserId(e.target.value)}
              placeholder="Enter user ID to test"
              className="flex-1 p-2 border rounded"
            />
            <button
              onClick={testUserAPI}
              disabled={loading || !testUserId.trim()}
              className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
            >
              {loading ? 'Testing...' : 'Test User API'}
            </button>
          </div>
        </div>
        
        <div>
          <h3 className="font-semibold mb-2">Test Chat API</h3>
          <button
            onClick={testChatAPI}
            disabled={loading}
            className="px-4 py-2 bg-green-500 text-white rounded disabled:bg-gray-300"
          >
            {loading ? 'Testing...' : 'Test Chat Conversations'}
          </button>
        </div>
        
        {testResult && (
          <div className="mt-4 p-4 border rounded">
            <h4 className="font-semibold mb-2">Test Result:</h4>
            <div className={`p-2 rounded ${testResult.success ? 'bg-green-100' : 'bg-red-100'}`}>
              <p><strong>Success:</strong> {testResult.success ? 'Yes' : 'No'}</p>
              {testResult.status && <p><strong>Status:</strong> {testResult.status}</p>}
              {testResult.error && <p><strong>Error:</strong> {testResult.error}</p>}
              {testResult.data && (
                <div>
                  <strong>Data:</strong>
                  <pre className="mt-2 text-xs overflow-auto">
                    {JSON.stringify(testResult.data, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        )}
        
        <div className="mt-4 p-4 bg-gray-100 rounded">
          <h4 className="font-semibold mb-2">Current Environment:</h4>
          <p><strong>API URL:</strong> {import.meta.env.VITE_API_URL || 'http://localhost:5000'}</p>
          <p><strong>Auth Token:</strong> {localStorage.getItem('auth_token') ? 'Present' : 'Missing'}</p>
          <p><strong>Current User:</strong> {JSON.stringify(JSON.parse(localStorage.getItem('auth_user') || '{}'))}</p>
        </div>
      </div>
    </div>
  );
}

export default ChatDebug;