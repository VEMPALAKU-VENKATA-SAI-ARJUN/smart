import React from 'react';

/**
 * ProfileLayout - shared layout for all profile pages
 * Props:
 *   - user: user object
 *   - children: role-specific content
 *   - headerContent: (optional) extra content in header
 */
export default function ProfileLayout({ user, children, headerContent }) {
  if (!user) return null;
  const avatar = user.profile?.avatar ||
    `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username || 'User')}&size=200`;
  return (
    <div className="profile-layout min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-10 px-4">
        <div className="flex items-center gap-4 mb-6">
          <img
            src={avatar}
            alt={user.username || 'User'}
            className="w-16 h-16 rounded-full object-cover bg-blue-200"
          />
          <div>
            <div className="text-xl font-semibold">{user.username}</div>
            <div className="text-gray-500">{user.email}</div>
            {user.profile?.bio && <div className="text-gray-700 mt-1">{user.profile.bio}</div>}
          </div>
          {headerContent && <div className="ml-auto">{headerContent}</div>}
        </div>
        {children}
      </div>
    </div>
  );
}
