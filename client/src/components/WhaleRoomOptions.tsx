import React from 'react';
import './WhaleRoomOptions.css';

// Whale Room options
export const WHALE_ROOM_OPTIONS = [
  { 
    id: 1, 
    title: '🎴 Card Master', 
    description: 'Begin each turn with an additional card in your hand.',
    effect: '3 → 4 cards per turn'
  },
  { 
    id: 2, 
    title: '✨ Divine Power', 
    description: 'Channel additional Faith into your actions.',
    effect: '3 → 4 ✨ per turn'
  },
  { 
    id: 3, 
    title: '🛡️ Divine Protection', 
    description: 'Begin each combat with a protective barrier.',
    effect: 'Start each combat with 5 🛡️'
  },
  { 
    id: 4, 
    title: '💪 Sacred Might', 
    description: 'Your body is strengthened by divine power.',
    effect: '21 → 36 ❤️'
  }
];

interface WhaleRoomOptionsProps {
  onChooseOption: (optionId: number) => void;
  isChoosing: boolean;
}

const WhaleRoomOptions: React.FC<WhaleRoomOptionsProps> = ({ onChooseOption, isChoosing }) => {
  return (
    <div className="whale-room-content">
      <h2 className="whale-room-title">Choose a Divine Blessing</h2>
      <div className="whale-room-options">
        {WHALE_ROOM_OPTIONS.map(option => (
          <div
            key={option.id}
            className={`whale-room-option ${isChoosing ? 'disabled' : ''}`}
            onClick={() => !isChoosing && onChooseOption(option.id)}
          >
            <h3>{option.title}</h3>
            <p className="description">{option.description}</p>
            <span className="effect">{option.effect}</span>
            {isChoosing && (
              <div className="whale-room-option-overlay">
                <span>Receiving blessing...</span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default WhaleRoomOptions; 