import React from 'react';

export default function ModeratorProfile({ user }) {
  // TODO: Fetch and display moderator-specific data and features
  return (
    <div className="moderator-profile min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-4">Moderator Profile</h1>
        <p>Welcome, {user?.username || 'Moderator'}!</p>
        {/* Add moderator-specific features here, e.g., moderation stats, reports handled, etc. */}
      </div>
    </div>
  );
}
