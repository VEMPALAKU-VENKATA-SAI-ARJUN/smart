


import { useEffect, useState, useMemo } from 'react';

// Add AbortController and dedupeKey to fetches

export default function BuyerProfile({ user }) {
  const [buyer, setBuyer] = useState(user || null);
  const [loading, setLoading] = useState(!user);
  const [error, setError] = useState('');
  const [purchases, setPurchases] = useState([]);
  const [wishlist, setWishlist] = useState([]);


  useEffect(() => {
    if (!user?.id) return;
    const controller = new AbortController();
    setLoading(true);
    setError('');
    (async () => {
      try {
        // Use dedupeKey to prevent duplicate fetches
        const [purchasesRes, wishlistRes] = await Promise.all([
          fetch(`/api/users/${user.id}/purchases`, { signal: controller.signal }).then(r => r.json()),
          fetch(`/api/users/${user.id}/wishlist`, { signal: controller.signal }).then(r => r.json())
        ]);
        if (controller.signal.aborted) return;
        if (purchasesRes.success) setPurchases(purchasesRes.purchases || []);
        else setError(purchasesRes.message || 'Failed to load purchases');
        if (wishlistRes.success) setWishlist(wishlistRes.wishlist || []);
        else setError(wishlistRes.message || 'Failed to load wishlist');
      } catch (e) {
        if (e.name !== 'AbortError') setError('Failed to load buyer data');
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    })();
    return () => controller.abort();
  }, [user?.id]);


  const avatar = useMemo(() => {
    if (buyer?.avatar) return buyer.avatar;
    if (buyer?.username) return `https://ui-avatars.com/api/?name=${encodeURIComponent(buyer.username)}&size=200`;
    return 'https://ui-avatars.com/api/?name=Buyer&size=200';
  }, [buyer]);

  if (loading) return <div className="text-center py-12">Loading buyer profile...</div>;
  if (error) return <div className="text-center py-12 text-red-500">{error}</div>;

  return (
    <div className="buyer-profile min-h-screen bg-gray-50">
      <div className="max-w-3xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-4">Buyer Profile</h1>
        <div className="mb-6">
          <div className="flex items-center gap-4 mb-2">
            <img
              src={avatar}
              alt={buyer?.username || 'Buyer'}
              className="w-16 h-16 rounded-full object-cover bg-blue-200"
            />
            <div>
              <div className="text-xl font-semibold">{buyer?.username || 'Buyer'}</div>
              <div className="text-gray-500">{buyer?.email}</div>
            </div>
          </div>
          {buyer?.bio && <div className="text-gray-700 mt-2">{buyer.bio}</div>}
        </div>

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
      </div>
    </div>
  );
}
