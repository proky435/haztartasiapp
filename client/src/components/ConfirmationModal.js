import React from 'react';
import './ConfirmationModal.css';

function ConfirmationModal({ 
  isOpen, 
  onClose, 
  onConfirm, 
  title = 'Megerősítés', 
  message, 
  confirmText = 'Igen', 
  cancelText = 'Mégse',
  type = 'warning' // 'warning', 'danger', 'info'
}) {
  if (!isOpen) return null;

  const handleOverlayClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <div className="confirmation-modal-overlay" onClick={handleOverlayClick}>
      <div className={`confirmation-modal ${type}`}>
        <div className="modal-header">
          <div className="modal-icon">
            {type === 'warning' && '⚠️'}
            {type === 'danger' && '🗑️'}
            {type === 'info' && 'ℹ️'}
          </div>
          <h3 className="modal-title">{title}</h3>
        </div>
        
        <div className="modal-body">
          <p className="modal-message">{message}</p>
        </div>
        
        <div className="modal-actions">
          <button 
            className="cancel-button" 
            onClick={onClose}
          >
            {cancelText}
          </button>
          <button 
            className={`confirm-button ${type}`}
            onClick={handleConfirm}
          >
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmationModal;
