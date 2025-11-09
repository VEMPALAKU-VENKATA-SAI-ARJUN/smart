import { X, UserMinus } from 'lucide-react';
import styles from '../styles/UnfollowConfirmModal.module.css';

export default function UnfollowConfirmModal({ isOpen, onClose, onConfirm, artistName }) {
  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div 
      className={styles.backdrop} 
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="unfollow-modal-title"
    >
      <div className={styles.modal}>
        <button 
          className={styles.closeButton}
          onClick={onClose}
          aria-label="Close modal"
        >
          <X size={20} />
        </button>

        <div className={styles.iconContainer}>
          <UserMinus size={48} className={styles.icon} />
        </div>

        <h2 id="unfollow-modal-title" className={styles.title}>
          Unfollow {artistName}?
        </h2>
        
        <p className={styles.description}>
          Their artworks will no longer appear in your feed. You can always follow them again later.
        </p>

        <div className={styles.actions}>
          <button
            className={styles.cancelButton}
            onClick={onClose}
          >
            Cancel
          </button>
          <button
            className={styles.confirmButton}
            onClick={onConfirm}
          >
            Unfollow
          </button>
        </div>
      </div>
    </div>
  );
}
