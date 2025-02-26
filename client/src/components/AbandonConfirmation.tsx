import React from 'react';
import './AbandonConfirmation.css';

interface AbandonConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const AbandonConfirmation: React.FC<AbandonConfirmationProps> = ({ 
  isOpen, 
  onConfirm, 
  onCancel, 
  isLoading 
}) => {
  if (!isOpen) return null;

  return (
    <div className="abandon-confirmation-overlay">
      <div className="abandon-confirmation-content">
        <h2>Abandon Run?</h2>
        <p>Are you sure you want to abandon your current run? This action cannot be undone.</p>
        <div className="abandon-confirmation-buttons">
          <button 
            className="confirm-button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Abandoning...' : 'Yes, Abandon Run'}
          </button>
          <button 
            className="cancel-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default AbandonConfirmation; 