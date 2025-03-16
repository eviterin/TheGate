import React, { useEffect, useState } from 'react';
import { soundEffectManager } from '../game/SoundEffectManager';

export interface TurnBannerProps {
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
      // Play sound effect when banner appears
      soundEffectManager.playEventSound(type === 'enemy' ? 'enemy_turn' : 'player_turn');
      // Small delay to ensure the element is rendered before starting the animation
      requestAnimationFrame(() => setIsAnimating(true));
    } else {
      setIsAnimating(false);
      // Wait for the animation to complete before removing from DOM
      const timer = setTimeout(() => setShouldRender(false), 400);
      return () => clearTimeout(timer);
    }
  }, [isVisible, type]);

  if (!shouldRender) return null;

  return (
    <>
      <style>
        {`
          @keyframes glowPulse {
            0% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 20px rgba(89, 86, 108, 0.15); }
            50% { box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3), 0 0 30px rgba(89, 86, 108, 0.25); }
            100% { box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2), 0 0 20px rgba(89, 86, 108, 0.15); }
          }

          @keyframes slideInGlow {
            0% { 
              transform: translateX(-50%) translateY(-30px);
              opacity: 0;
              filter: brightness(0.8);
            }
            50% { 
              transform: translateX(-50%) translateY(0);
              opacity: 1;
              filter: brightness(1.3);
            }
            100% { 
              transform: translateX(-50%) translateY(0);
              opacity: 1;
              filter: brightness(1);
            }
          }

          .turn-banner {
            position: fixed;
            top: 15%;
            left: 50%;
            transform: translateX(-50%) translateY(-30px);
            padding: 20px 40px;
            border-radius: 15px;
            font-size: 24px;
            font-weight: 600;
            color: #ffffff;
            text-align: center;
            z-index: 1000;
            background: rgba(31, 28, 44, 0.95);
            border: 2px solid rgba(255, 255, 255, 0.15);
            backdrop-filter: blur(8px);
            opacity: 0;
            letter-spacing: 1px;
            text-transform: uppercase;
          }

          .turn-banner.visible {
            animation: slideInGlow 0.6s cubic-bezier(0.4, 0, 0.2, 1) forwards,
                       glowPulse 2s infinite;
          }

          .turn-banner.enemy {
            background: linear-gradient(135deg, rgba(31, 28, 44, 0.95), rgba(80, 20, 20, 0.95));
            border-color: rgba(255, 100, 100, 0.3);
            text-shadow: 0 0 10px rgba(255, 100, 100, 0.5);
          }

          .turn-banner.player {
            background: linear-gradient(135deg, rgba(31, 28, 44, 0.95), rgba(20, 40, 80, 0.95));
            border-color: rgba(100, 200, 255, 0.3);
            text-shadow: 0 0 10px rgba(100, 200, 255, 0.5);
          }

          .turn-banner-content {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 15px;
          }

          .turn-banner-icon {
            font-size: 28px;
            filter: drop-shadow(0 0 5px rgba(255, 255, 255, 0.5));
          }

          @keyframes iconPulse {
            0% { transform: scale(1); }
            50% { transform: scale(1.1); }
            100% { transform: scale(1); }
          }

          .enemy .turn-banner-icon {
            animation: iconPulse 1s infinite;
            color: #ff6464;
          }

          .player .turn-banner-icon {
            animation: iconPulse 1s infinite;
            color: #64c8ff;
          }
        `}
      </style>
      <div className={`turn-banner ${type} ${isAnimating ? 'visible' : ''}`}>
        <div className="turn-banner-content">
          <span className="turn-banner-icon">
            {type === 'enemy' ? '⚔️' : '✨'}
          </span>
          {message}
          <span className="turn-banner-icon">
            {type === 'enemy' ? '⚔️' : '✨'}
          </span>
        </div>
      </div>
    </>
  );
};

export default TurnBanner;