import React, { useState, useEffect } from 'react';
import { Position } from '../game/encounters';
import './FloatingMana.css';

interface FloatingManaProps {
  currentMana: number;
  maxMana: number;
  position: Position;
  heroScale?: number;
}

const FloatingMana: React.FC<FloatingManaProps> = ({ 
  currentMana, 
  maxMana, 
  position, 
  heroScale = 1 
}) => {
  // Track previous mana to detect changes
  const [prevMana, setPrevMana] = useState(currentMana);
  const [animatingOrbs, setAnimatingOrbs] = useState<number[]>([]);
  const [showTooltip, setShowTooltip] = useState(false);
  
  // Detect mana changes and trigger animations
  useEffect(() => {
    if (currentMana !== prevMana) {
      // Determine which orbs are changing
      const changedOrbs: number[] = [];
      if (currentMana > prevMana) {
        // Mana gained - animate the new orbs
        for (let i = prevMana; i < currentMana; i++) {
          changedOrbs.push(i);
        }
      } else {
        // Mana spent - animate the lost orbs
        for (let i = currentMana; i < prevMana; i++) {
          changedOrbs.push(i);
        }
      }
      
      // Set animating orbs
      setAnimatingOrbs(changedOrbs);
      
      // Clear animation after a delay
      const timer = setTimeout(() => {
        setAnimatingOrbs([]);
      }, 1000);
      
      setPrevMana(currentMana);
      return () => clearTimeout(timer);
    }
  }, [currentMana, prevMana]);

  // Calculate vertical offset based on heroScale
  const verticalOffset = 15 + (heroScale - 1) * 15;
  
  // Calculate arc properties
  const arcRadius = 55; // Increased radius for more spacing
  const orbSize = 24; // Larger orbs
  const totalAngle = Math.min(140, maxMana * 30); // Increased angle spread
  const arcWidth = Math.sin(totalAngle * Math.PI / 180) * arcRadius * 2 + orbSize;
  const arcHeight = (1 - Math.cos(totalAngle * Math.PI / 180)) * arcRadius + orbSize;

  return (
    <div 
      className="floating-mana-container" 
      style={{
        left: `${position.x}%`,
        top: `${position.y - verticalOffset}%`, // Adjust position based on heroScale
        width: `${Math.max(130, arcWidth)}px`, // Width based on arc span
        height: `${arcHeight}px`, // Height based on arc curvature
      }}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {/* Tooltip */}
      {showTooltip && (
        <div className="floating-mana-tooltip">
          <div className="floating-mana-tooltip-content">
            <span className="mana-icon">✨</span>
            <span>{currentMana}/{maxMana} Faith</span>
          </div>
        </div>
      )}
      
      {/* Mana Orbs */}
      {[...Array(maxMana)].map((_, i) => {
        const isAnimating = animatingOrbs.includes(i);
        const isActive = i < currentMana;
        
        // Calculate arc position for each orb
        // For 3-4 orbs, create a gentle arc above the player
        const startAngle = 180 + (180 - totalAngle) / 2; // Center the arc
        const angle = startAngle + (i / (maxMana - 1 || 1)) * totalAngle;
        const radian = angle * Math.PI / 180;
        
        // Position each orb along the arc relative to container center
        const orbX = 50 + arcRadius * Math.cos(radian);
        const orbY = 100 + arcRadius * Math.sin(radian);
        
        return (
          <React.Fragment key={i}>
            {/* Individual orb background */}
            <div
              className="floating-mana-orb-background"
              style={{
                left: `${orbX}%`,
                top: `${orbY}%`,
              }}
            />
            
            {/* Mana orb */}
            <div 
              className={`floating-mana-orb ${isActive ? 'active' : 'depleted'} ${isAnimating ? 'animating' : ''}`}
              style={{
                left: `${orbX}%`,
                top: `${orbY}%`,
              }}
            >
              <span className={`mana-symbol ${isAnimating ? 'sparkle' : ''}`}>✨</span>
            </div>
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default FloatingMana; 