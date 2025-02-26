import React, { useEffect, useState } from 'react';

interface TurnBannerProps {
  message: string;
  isVisible: boolean;
  type: 'enemy' | 'player';
}

const TurnBanner: React.FC<TurnBannerProps> = ({ message, isVisible, type }) => {
  const [shouldRender, setShouldRender] = useState(false);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isVisible) {
      setShouldRender(true);
      // Small delay to ensure the element is rendered before starting the animation
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      // Wait for the animation to complete before removing from DOM
      const timer = setTimeout(() => setShouldRender(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible]);

  if (!shouldRender) return null;

  return (
    <>
      <style>
        {`
          .turn-banner {
            position: fixed;
            top: 15%;
            left: 50%;
            transform: translateX(-50%) translateY(-30px);
            padding: 15px 30px;
            border-radius: 12px;
            font-size: 20px;
            font-weight: 500;
            color: #e0e0e0;
            text-align: center;
            z-index: 1000;
            background: rgba(31, 28, 44, 0.95);
            border: 1px solid rgba(255, 255, 255, 0.1);
            backdrop-filter: blur(5px);
            box-shadow: 
              0 4px 12px rgba(0, 0, 0, 0.2),
              0 0 20px rgba(89, 86, 108, 0.15);
            opacity: 0;
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
          }

          .turn-banner.visible {
            transform: translateX(-50%) translateY(0);
            opacity: 1;
          }

          .turn-banner.enemy {
            border-left: 2px solid rgba(255, 100, 100, 0.5);
          }

          .turn-banner.player {
            border-left: 2px solid rgba(100, 200, 255, 0.5);
          }

          .turn-banner-content {
            display: flex;
            align-items: center;
            gap: 10px;
            opacity: 0.9;
          }

          .turn-banner-icon {
            font-size: 20px;
            opacity: 0.8;
          }
        `}
      </style>
      <div className={`turn-banner ${type} ${isAnimating ? 'visible' : ''}`}>
        <div className="turn-banner-content">
          {type === 'enemy' ? '⚔️' : '🎯'} {message}
        </div>
      </div>
    </>
  );
};

export default TurnBanner; 