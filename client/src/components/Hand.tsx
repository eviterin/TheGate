import React, { useMemo } from 'react';
import Card from './Card';
import './Hand.css';

export interface HandProps {
  cards: number[]; // Array of numeric card IDs
  onCardSelect?: (cardIndex: number) => void;
  className?: string;
  selectedCardIndex?: number | null;
  cardData: any[]; // Card data from blockchain
  currentMana: number; // Add current mana prop
  isVisible?: boolean;
  isUIFrozen?: boolean; // Add UI frozen state
}

const Hand: React.FC<HandProps> = ({ 
  cards, 
  onCardSelect, 
  className = '', 
  selectedCardIndex,
  cardData,
  currentMana,
  isVisible = true,
  isUIFrozen = false
}) => {
  // Convert numeric IDs to card data
  const handCards = useMemo(() => 
    cards.map((numericId) => {
      const card = cardData.find(c => c.numericId === numericId);
      return card ? { ...card, numericId } : null;
    }).filter(Boolean), // Filter out any undefined cards
  [cards, cardData]);

  const handleCardClick = (index: number) => {
    // Don't allow card selection when UI is frozen
    if (!isUIFrozen) {
      onCardSelect?.(index);
    }
  };

  return (
    <div className={`hand-container ${className} ${!isVisible ? 'hidden' : ''}`}>
      {isVisible && (
        <div className="hand">
          {handCards.map((card, index) => {
            const canPlay = card.manaCost <= currentMana && !isUIFrozen;
            
            return (
              <div 
                key={`${card.id}-${index}`}
                className={`hand-card ${selectedCardIndex === index ? 'selected' : ''} ${!canPlay ? 'insufficient-mana' : ''} ${isUIFrozen ? 'ui-frozen' : ''}`}
                onClick={() => handleCardClick(index)}
              >
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