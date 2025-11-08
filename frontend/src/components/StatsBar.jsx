import React from 'react';
import '../styles/StatsBar.css';

const formatNumber = (num = 0) => {
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(1)}K`;
  return num.toString();
};

const StatsBar = ({ stats = {}, role }) => (
  <div className="stats-bar">
    <div className="stats-item">
      <div className="stats-value">{formatNumber(stats.artworks || 0)}</div>
      <div className="stats-label">Posts</div>
    </div>
    <div className="stats-item">
      <div className="stats-value">{formatNumber(stats.followers || 0)}</div>
      <div className="stats-label">Followers</div>
    </div>
    <div className="stats-item">
      <div className="stats-value">{formatNumber(stats.following || 0)}</div>
      <div className="stats-label">Following</div>
    </div>
    {role === 'artist' && (
      <div className="stats-item">
        <div className="stats-value">{formatNumber(stats.sales || 0)}</div>
        <div className="stats-label">Sales</div>
      </div>
    )}
  </div>
);

export default StatsBar;
