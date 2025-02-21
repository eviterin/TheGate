import React, { useState } from 'react';
import './Card.css';
import { CardData } from '../data/cards';
import cardFrame from '../assets/misc/cardframe.png';
import defaultCardArt from '../assets/cardart/default.png';

interface CardProps extends Omit<CardData, 'numericId'> {
  isSelected?: boolean;
  onSelect?: (id: string) => void;
  numericId?: number;
}

const Card: React.FC<CardProps> = ({
  id,
  name,
  description,
  manaCost,
  imageUrl,
  isSelected = false,
  onSelect,
  numericId
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [imageError, setImageError] = useState(false);

  const handleClick = () => {
    onSelect?.(id);
  };

  return (
    <div 
      className={`card ${isSelected ? 'selected' : ''} ${isHovered ? 'hovered' : ''}`}
      onClick={handleClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="card-frame" style={{ backgroundImage: `url(${cardFrame})` }}>
        <div className="card-mana-cost">
          {[...Array(manaCost)].map((_, i) => (
            <div key={i} className="mana-orb" />
          ))}
        </div>
        <div className="card-image">
          <img 
            src={imageError ? defaultCardArt : (imageUrl || defaultCardArt)} 
            alt={name} 
            className="card-artwork"
            onError={() => setImageError(true)}
          />
        </div>
        <div className="card-content">
          <h3 className="card-name">{name}</h3>
          <p className="card-description">{description}</p>
        </div>
      </div>
    </div>
  );
};

export default Card; 