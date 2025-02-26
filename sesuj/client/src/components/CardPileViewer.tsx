import React from 'react';
import Card from './Card';
import './CardPileViewer.css';

interface CardPileViewerProps {
  isVisible: boolean;
  title: string;
  cards: number[];
  cardData: any[];
  subText?: string;
  onClose?: () => void;
}

const CardPileViewer: React.FC<CardPileViewerProps> = ({
  isVisible,
  title,
  cards,
  cardData,
  subText,
  onClose
}) => {
  if (!isVisible) return null;

  return (
    <div className="card-pile-viewer">
      <div className="card-pile-header">
        <h3>{title}</h3>
        {onClose && (
          <button className="close-button" onClick={onClose}>×</button>
        )}
      </div>
      
      {subText && (
        <p className="card-pile-subtext">{subText}</p>
      )}
      
      <div className="card-pile-grid">
        {cards.map((cardId, index) => {
          const card = cardData.find(c => c.numericId === cardId);
          return card ? (
            <Card key={`${title.toLowerCase()}-${cardId}-${index}`} {...card} />
          ) : null;
        })}
      </div>
    </div>
  );
};

export default CardPileViewer; 