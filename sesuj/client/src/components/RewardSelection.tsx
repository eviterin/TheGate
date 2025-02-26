import React from 'react';
import Card from './Card';
import './RewardSelection.css';

interface RewardSelectionProps {
  availableRewards: number[];
  cardData: any[];
  selectedReward: number | null;
  onSelectReward: (cardId: number) => void;
  onConfirmReward: () => void;
  isChoosingReward: boolean;
}

const RewardSelection: React.FC<RewardSelectionProps> = ({
  availableRewards,
  cardData,
  selectedReward,
  onSelectReward,
  onConfirmReward,
  isChoosingReward
}) => {
  return (
    <div className="reward-overlay">
      <div className="reward-content">
        <h2>Choose Your Reward</h2>
        <div className="reward-cards">
          {cardData
            .filter(card => availableRewards.includes(card.numericId))
            .map(card => (
              <div
                key={card.numericId}
                className={`reward-card-container ${selectedReward === card.numericId ? 'selected' : ''} ${isChoosingReward ? 'disabled' : ''}`}
                onClick={() => !isChoosingReward && onSelectReward(card.numericId)}
              >
                <Card {...card} />
              </div>
            ))}
        </div>
        <div className="reward-buttons">
          <button
            className={`continue-button ${!selectedReward || isChoosingReward ? 'disabled' : ''}`}
            onClick={onConfirmReward}
            disabled={!selectedReward || isChoosingReward}
          >
            {isChoosingReward ? 'Adding...' : 'Add to Deck'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RewardSelection; 