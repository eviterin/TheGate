import React, { useMemo } from 'react';
import Card from './Card';
import './Hand.css';
import { CardIntent } from './Intent';

interface HandProps {
  cards: number[]; // Array of numeric card IDs
  onCardSelect?: (cardIndex: number) => void;
  className?: string;
  selectedCardIndex?: number | null;
  cardData: any[]; // Card data from blockchain
  currentMana: number; // Add current mana prop
  isVisible?: boolean;
  cardIntents?: CardIntent[]; // Add this prop
}

const Hand: React.FC<HandProps> = ({ 
  cards, 
  onCardSelect, 
  className = '', 
  selectedCardIndex,
  cardData,
  currentMana,
  isVisible = true,
  cardIntents = []
}) => {
  // Convert numeric IDs to card data
  const handCards = useMemo(() => 
    cards.map((numericId) => {
      const card = cardData.find(c => c.numericId === numericId);
      return card ? { ...card, numericId } : null;
    }).filter(Boolean), // Filter out any undefined cards
  [cards, cardData]);

  const handleCardClick = (index: number) => {
    // Don't allow selecting cards that are already in intents
    if (cardIntents.some(intent => intent.cardIndex === index)) return;
    onCardSelect?.(index);
  };

  return (
    <div className={`hand-container ${className} ${!isVisible ? 'hidden' : ''}`}>
      {isVisible && (
        <div className="hand">
          {handCards.map((card, index) => {
            const canPlay = card.manaCost <= currentMana;
            const isUsed = cardIntents.some(intent => intent.cardIndex === index);
            const intentNumber = cardIntents.findIndex(intent => intent.cardIndex === index) + 1;
            
            return (
              <div 
                key={`${card.id}-${index}`}
                className={`hand-card ${selectedCardIndex === index ? 'selected' : ''} ${!canPlay ? 'insufficient-mana' : ''} ${isUsed ? 'used-in-intent' : ''}`}
                onClick={() => handleCardClick(index)}
              >
                {isUsed && (
                  <div className="intent-number">{intentNumber}</div>
                )}
                <Card
                  {...card}
                  isSelected={selectedCardIndex === index}
                />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Hand; 