import React, { useState } from 'react';
import '../styles/StatsBar.css';

const formatNumber = (num = 0) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

/**
 * StatsBar Component - Role-aware stats display with clickable items
 * @param {object} stats - Stats object with counts
 * @param {string} role - User role ('artist' or 'buyer')
 * @param {function} onFollowersClick - Handler for followers click
 * @param {function} onFollowingClick - Handler for following click
 * @param {function} onPostsClick - Handler for posts click
 * @param {function} onSalesClick - Handler for sales click
 * @param {function} onPurchasesClick - Handler for purchases click
 * @param {boolean} loading - Loading state
 */
const StatsBar = ({ 
  stats = {}, 
  role,
  onFollowersClick,
  onFollowingClick,
  onPostsClick,
  onSalesClick,
  onPurchasesClick,
  loading = false
}) => {
  const renderStat = (value, label, onClick, ariaLabel) => (
    <button
      className={`stats-item ${onClick ? 'clickable' : ''}`}
      onClick={onClick}
      disabled={loading || !onClick}
      aria-label={ariaLabel || `View ${label}`}
      type="button"
    >
      <div className="stats-value">
        {loading ? '...' : formatNumber(value || 0)}
      </div>
      <div className="stats-label">{label}</div>
    </button>
  );

  return (
    <div className="stats-bar" role="group" aria-label="Profile statistics">
      {/* Posts/Artworks - for artists */}
      {role === 'artist' && renderStat(
        stats.posts,
        'Posts',
        onPostsClick,
        'View posts'
      )}

      {/* Purchases - for buyers */}
      {role === 'buyer' && renderStat(
        stats.purchases,
        'Purchases',
        onPurchasesClick,
        'View purchases'
      )}

      {/* Followers - for everyone */}
      {renderStat(
        stats.followers,
        'Followers',
        onFollowersClick,
        'View followers list'
      )}

      {/* Following - for everyone */}
      {renderStat(
        stats.following,
        'Following',
        onFollowingClick,
        'View following list'
      )}

      {/* Sales - for artists */}
      {role === 'artist' && renderStat(
        stats.sales,
        'Sales',
        onSalesClick,
        'View sales'
      )}
    </div>
  );
};

export default StatsBar;
