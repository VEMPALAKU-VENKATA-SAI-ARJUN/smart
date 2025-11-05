import { MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

function ChatButton({ userId, username, className = '' }) {
  const currentUser = JSON.parse(localStorage.getItem('auth_user') || '{}');
  
  // Don't show chat button for own profile
  if (!currentUser.id || currentUser.id === userId) {
    return null;
  }

  // Don't show chat button for moderators or admins
  if (currentUser.role === 'moderator' || currentUser.role === 'admin') {
    return null;
  }

  return (
    <Link
      to={`/messages?user=${userId}`}
      className={`btn btn-outline btn-sm flex items-center space-x-2 ${className}`}
    >
      <MessageCircle size={16} />
      <span>Message</span>
    </Link>
  );
}

export default ChatButton;