import React, { useMemo } from 'react';
import ProfileLayout from './ProfileLayout';

export default function BuyerProfileNeat({ user, purchases = [], wishlist = [] }) {
  // Memoize avatar for performance
  const avatar = useMemo(() => {
    if (user?.profile?.avatar) return user.profile.avatar;
    if (user?.username) return `https://ui-avatars.com/api/?name=${encodeURIComponent(user.username)}&size=200`;
    return 'https://ui-avatars.com/api/?name=Buyer&size=200';
  }, [user]);

  return (
    <ProfileLayout user={user}>
      {/* Purchase History */}
      <div className="mb-8">
        <h2 className="text-xl font-bold mb-2">Purchase History</h2>
        {purchases.length === 0 ? (
          <div className="text-gray-500">No purchases yet.</div>
        ) : (
          <ul className="divide-y divide-gray-200">
            {purchases.map((item) => (
              <li key={item._id} className="py-3 flex items-center gap-4">
                <img src={item.artwork?.thumbnail || item.artwork?.images?.[0]?.url || 'https://via.placeholder.com/60'} alt={item.artwork?.title} className="w-12 h-12 object-cover rounded" />
                <div>
                  <div className="font-medium">{item.artwork?.title || 'Artwork'}</div>
                  <div className="text-gray-500 text-sm">by {item.artwork?.artist?.username || 'Unknown'}</div>
                  <div className="text-green-600 font-semibold">₹{item.price}</div>
                  <div className="text-xs text-gray-400">{new Date(item.purchasedAt).toLocaleDateString()}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      {/* Wishlist */}
      <div>
        <h2 className="text-xl font-bold mb-2">Wishlist</h2>
        {wishlist.length === 0 ? (
          <div className="text-gray-500">No items in wishlist.</div>
        ) : (
          <ul className="grid grid-cols-2 gap-4">
            {wishlist.map((item) => (
              <li key={item._id} className="bg-white rounded-lg shadow p-3 flex flex-col items-center">
                <img src={item.thumbnail || item.images?.[0]?.url || 'https://via.placeholder.com/100'} alt={item.title} className="w-20 h-20 object-cover rounded mb-2" />
                <div className="font-medium text-center">{item.title}</div>
                <div className="text-gray-500 text-xs">by {item.artist?.username || 'Unknown'}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </ProfileLayout>
  );
}
