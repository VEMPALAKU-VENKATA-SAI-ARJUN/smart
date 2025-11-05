import { useState } from 'react';
import { useChat } from '../contexts/ChatContext';

function ChatTest() {
  const [testMessage, setTestMessage] = useState('');
  const [testRecipient, setTestRecipient] = useState('');
  
  try {
    const { isConnected, sendMessage, unreadCount } = useChat();
    
    const handleSendTest = async () => {
      if (!testMessage.trim() || !testRecipient.trim()) return;
      
      try {
        await sendMessage(testRecipient, testMessage);
        setTestMessage('');
        alert('Message sent successfully!');
      } catch (error) {
        alert('Failed to send message: ' + error.message);
      }
    };

    return (
      <div className="p-4 border rounded-lg bg-white shadow-sm">
        <h3 className="text-lg font-semibold mb-4">Chat System Test</h3>
        
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium mb-1">Connection Status:</label>
            <span className={`px-2 py-1 rounded text-sm ${isConnected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Unread Messages:</label>
            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-sm">
              {unreadCount}
            </span>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Recipient ID:</label>
            <input
              type="text"
              value={testRecipient}
              onChange={(e) => setTestRecipient(e.target.value)}
              placeholder="Enter recipient user ID"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Test Message:</label>
            <input
              type="text"
              value={testMessage}
              onChange={(e) => setTestMessage(e.target.value)}
              placeholder="Enter test message"
              className="w-full p-2 border rounded"
            />
          </div>
          
          <button
            onClick={handleSendTest}
            disabled={!isConnected || !testMessage.trim() || !testRecipient.trim()}
            className="px-4 py-2 bg-blue-500 text-white rounded disabled:bg-gray-300"
          >
            Send Test Message
          </button>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="p-4 border rounded-lg bg-red-50">
        <h3 className="text-lg font-semibold text-red-800 mb-2">Chat System Error</h3>
        <p className="text-red-600">ChatProvider not available: {error.message}</p>
      </div>
    );
  }
}

export default ChatTest;