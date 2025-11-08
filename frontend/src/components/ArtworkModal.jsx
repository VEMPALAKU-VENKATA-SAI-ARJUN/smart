import React from 'react';
import { X, Heart, MessageCircle, Share2, ShoppingCart, Bookmark } from 'lucide-react';

const ArtworkModal = ({ artwork, isOpen, onClose, currentUser }) => {
  if (!isOpen || !artwork) return null;

  const isOwner = currentUser?._id === artwork.artist?._id || currentUser?._id === artwork.artist;
  const canBuy = !isOwner && Number(artwork.price) > 0;

  return (
    <div className="ig-modal-backdrop" onClick={onClose}>
      <div className="ig-modal" onClick={(e) => e.stopPropagation()}>
        <div className="ig-modal-left">
          <img src={artwork.thumbnail || artwork.images?.[0]?.url} alt={artwork.title} className="ig-modal-image" />
        </div>

        <div className="ig-modal-right">
          <div className="ig-modal-header">
            <div className="ig-modal-artist">
              <img src={artwork.artist?.profile?.avatar} alt={artwork.artist?.username} className="ig-modal-avatar" />
              <span className="ig-modal-username">{artwork.artist?.username}</span>
            </div>
            <button onClick={onClose} className="ig-modal-close"><X size={20} /></button>
          </div>

          <div className="ig-modal-content">
            <h2 className="ig-modal-title">{artwork.title}</h2>
            {artwork.description && <p className="ig-modal-desc">{artwork.description}</p>}

            <div className="ig-modal-tags">
              {artwork.category && <span className="ig-modal-chip ig-chip-primary">{artwork.category}</span>}
              {artwork.tags?.map((t, i) => <span key={i} className="ig-modal-chip">#{t}</span>)}
            </div>

            <div className="ig-modal-stats">
              <div><strong>{artwork.stats?.views || 0}</strong><span>Views</span></div>
              <div><strong>{artwork.stats?.likes || 0}</strong><span>Likes</span></div>
              <div><strong>{artwork.stats?.comments || 0}</strong><span>Comments</span></div>
            </div>

            <div className="ig-modal-price">
              {Number(artwork.price) ? `$${Number(artwork.price).toLocaleString()}` : 'Free'}
            </div>

            <div className="ig-modal-date">Posted {new Date(artwork.createdAt || Date.now()).toLocaleDateString()}</div>
          </div>

          <div className="ig-modal-footer">
            <div className="ig-modal-actions">
              <button className="ig-action"><Heart size={20} /><span>{artwork.stats?.likes || 0}</span></button>
              <button className="ig-action"><MessageCircle size={20} /></button>
              <button className="ig-action"><Share2 size={20} /></button>
              <button className="ig-action ig-bookmark"><Bookmark size={20} /></button>
            </div>

            {canBuy && (
              <button className="ig-buy">
                <ShoppingCart size={18} />
                Buy Now — ${Number(artwork.price).toLocaleString()}
              </button>
            )}

            {isOwner && (
              <button className="ig-edit">Edit Artwork</button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ArtworkModal;
