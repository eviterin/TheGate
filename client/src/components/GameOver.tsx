import React from 'react';
import './GameOver.css';

interface GameOverProps {
  isVictory: boolean;
  onRetry: () => void;
  onAbandon: () => void;
  onBackToMenu: () => void;
  isRetrying: boolean;
}

const GameOver: React.FC<GameOverProps> = ({ 
  isVictory, 
  onRetry, 
  onAbandon, 
  onBackToMenu, 
  isRetrying 
}) => {
  if (isVictory) {
    return (
      <div className="game-over-overlay victory">
        <div className="game-over-content">
          <h2 className="game-over-title victory">Victory</h2>
          <p className="game-over-message">
            Your triumph echoes through the divine realms. Your name shall be forever etched in the sacred scrolls, a testament to your unwavering faith and courage.
          </p>
          <div className="game-over-buttons">
            <button 
              className="back-to-menu-button"
              onClick={onBackToMenu}
            >
              Return to the Mortal Realm
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="game-over-overlay">
      <div className="game-over-content">
        <h2 className="game-over-title">You Died</h2>
        <p className="game-over-message">
          Your journey has come to an end. Would you like to try again?
        </p>
        <div className="game-over-buttons">
          <button 
            className="retry-button" 
            onClick={onRetry}
            disabled={isRetrying}
          >
            {isRetrying ? 'Retrying...' : 'Try Again'}
          </button>
          <button 
            className="abandon-button" 
            onClick={onAbandon}
            disabled={isRetrying}
          >
            Abandon Run
          </button>
        </div>
      </div>
    </div>
  );
};

export default GameOver; 