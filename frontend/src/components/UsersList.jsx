import { useState, useEffect } from 'react';
import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

function UsersList() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';
      
      // Try to get users from artworks (since we know artworks exist)
      const response = await fetch(`${API_URL}/api/artworks?limit=20`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      const data = await response.json();
      if (data.success && data.data) {
        // Extract unique users from artworks
        const uniqueUsers = [];
        const userIds = new Set();
        
        data.data.forEach(artwork => {
          if (artwork.artist && !userIds.has(artwork.artist._id)) {
            userIds.add(artwork.artist._id);
            uniqueUsers.push(artwork.artist);
          }
        });
        
        setUsers(uniqueUsers);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-4">Loading users...</div>;
  }

  return (
    <div className="p-6 bg-white border rounded-lg shadow-sm max-w-2xl mx-auto mt-8">
      <h2 className="text-xl font-bold mb-4">Available Users for Chat Testing</h2>
      
      <div className="space-y-2">
        {users.map(user => (
          <div key={user._id} className="flex items-center justify-between p-3 border rounded hover:bg-gray-50">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-purple-400 rounded-full flex items-center justify-center text-white font-semibold">
                {user.username?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div>
                <p className="font-medium">{user.username}</p>
                <p className="text-sm text-gray-500">ID: {user._id}</p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <Link
                to={`/profile/${user._id}`}
                className="px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded"
              >
                Profile
              </Link>
              <Link
                to={`/messages?user=${user._id}`}
                className="px-3 py-1 text-sm bg-blue-500 text-white hover:bg-blue-600 rounded flex items-center space-x-1"
              >
                <MessageCircle size={14} />
                <span>Chat</span>
              </Link>
            </div>
          </div>
        ))}
      </div>
      
      {users.length === 0 && (
        <p className="text-gray-500 text-center py-8">No users found</p>
      )}
    </div>
  );
}

export default UsersList;