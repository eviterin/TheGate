import React, { useEffect, useState, useRef } from 'react';
import { getLevelConfig } from '../game/levelConfigs';
import { Position } from '../game/encounters';
import { CardAnimationType } from '../game/cards';
import encountersData from '../../../shared/encounters.json';

// Import all enemy models
const enemyModels: { [key: string]: string } = {};

// Import hero model
const heroModel = new URL('../assets/misc/hero.png', import.meta.url).href;

// Define encounters data structure
interface EncountersData {
  constants: {
    ENEMY_TYPE: {
      NONE: number;
      TYPE_A: number;
      TYPE_B: number;
    };
    INTENT_TYPES: {
      BLOCK_5: number;
      BLOCK_AND_ATTACK: number;
      HEAL: number;
      ATTACK_BUFF: number;
      BLOCK_AND_HEAL: number;
    };
    ANIMATIONS: {
      ATTACK: string;
      BLOCK: string;
      BLOCK_AND_ATTACK: string;
      HEAL: string;
      BUFF: string;
    };
  };
  encounters: any[]; // We don't need the full encounters type for this usage
}

// Get intent types and animations from encounters.json
const INTENT_TYPES = (encountersData as EncountersData).constants.INTENT_TYPES;
const ANIMATIONS = (encountersData as EncountersData).constants.ANIMATIONS;

// Helper to determine intent type
interface IntentInfo {
  type: 'attack' | 'block' | 'block_and_attack' | 'heal' | 'attack_buff' | 'block_and_heal';
  value: number;
  blockValue?: number;
  buffValue?: number;
  healValue?: number;
  animation: string;
}

const getIntentInfo = (intent: number): IntentInfo => {
  if (intent === INTENT_TYPES.BLOCK_5) {
    return { type: 'block', value: 5, animation: ANIMATIONS.BLOCK };
  }
  if (intent === INTENT_TYPES.BLOCK_AND_ATTACK) {
    return { 
      type: 'block_and_attack', 
      value: 6,
      blockValue: 5,
      animation: ANIMATIONS.BLOCK_AND_ATTACK 
    };
  }
  if (intent === INTENT_TYPES.HEAL) {
    return {
      type: 'heal',
      value: 5,
      animation: ANIMATIONS.HEAL
    };
  }
  if (intent === INTENT_TYPES.ATTACK_BUFF) {
    return {
      type: 'attack_buff',
      value: 2,
      animation: ANIMATIONS.BUFF
    };
  }
  if (intent === INTENT_TYPES.BLOCK_AND_HEAL) {
    return {
      type: 'block_and_heal',
      value: 5,
      blockValue: 5,
      healValue: 5,
      animation: ANIMATIONS.BLOCK
    };
  }
  // Any other number is an attack with that damage value
  return { type: 'attack', value: intent, animation: ANIMATIONS.ATTACK };
};

// Import room 1-10 enemy models dynamically
for (let floor = 1; floor <= 10; floor++) {
  for (let position = 1; position <= 2; position++) {
    const modelKey = `room_${floor}_enemy_${position}`;
    try {
      enemyModels[modelKey] = new URL(`../assets/models/${modelKey}.png`, import.meta.url).href;
    } catch (error) {
      console.error(`Failed to load enemy model: ${modelKey}`, error);
    }
  }
}

interface GameEntityProps {
  type: 'hero' | 'enemy';
  health: number;
  maxHealth: number;
  block?: number;
  position: number;
  isValidTarget?: boolean;
  onEntityClick?: () => void;
  currentFloor?: number;
  intent?: number;
  isAnimating?: boolean;
  animationType?: CardAnimationType;
  animationTarget?: Position;
  previousHealth?: number;
  previousBlock?: number;
  buff?: number;
}

const GameEntity: React.FC<GameEntityProps> = ({ 
  type, 
  health, 
  maxHealth, 
  block = 0, 
  position,
  isValidTarget = false,
  onEntityClick,
  currentFloor = 0,
  intent = 0,
  isAnimating = false,
  animationTarget,
  previousHealth = health,
  previousBlock = block,
  buff = 0
}) => {
  const isHero = type === 'hero';
  const [isShaking, setIsShaking] = useState(false);
  const entityRef = useRef<HTMLDivElement>(null);

  // Track health changes
  useEffect(() => {
    if (health < previousHealth) {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 500);
    }
  }, [health, previousHealth]);

  // Get animation styles based on type and intent
  const getAnimationStyles = () => {
    const styles: React.CSSProperties = {
      position: 'absolute',
      left: `${entityPosition.x}%`,
      top: `${entityPosition.y}%`,
      transform: 'translate(-50%, -50%)',
      width: '120px',
      height: '180px',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '10px',
      color: 'white',
      cursor: isValidTarget ? 'pointer' : 'default',
    };

    if (!isAnimating) return styles;

    // For enemies, use their intent to determine animation
    if (!isHero && intent) {
      const intentInfo = getIntentInfo(intent);
      return {
        ...styles,
        animation: `${intentInfo.animation} 0.5s ease-in-out`,
        transition: 'none'
      };
    }

    // For hero, always use jump animation when performing an action
    if (isHero && isAnimating) {
      return {
        ...styles,
        animation: `${ANIMATIONS.ATTACK} 0.5s ease-in-out`,
        transition: 'none'
      };
    }

    return styles;
  };

  // Get the correct enemy model based on floor and position
  const getEnemyModel = () => {
    if (isHero || currentFloor === 0) return '';
    
    // Enemy positions are 0-based in the game but 1-based in filenames
    const modelKey = `room_${currentFloor}_enemy_${position + 1}`;
    const modelUrl = enemyModels[modelKey];
    
    if (!modelUrl) {
      console.warn(`No model found for ${modelKey}`);
      return '';
    }
    
    return modelUrl;
  };

  // Get position from level config
  const getEntityPosition = () => {
    const levelConfig = getLevelConfig(currentFloor);
    if (isHero) {
      return levelConfig.heroPosition;
    }
    return levelConfig.enemyPositions[position] || { x: 50, y: 50 }; // Fallback to center if position not found
  };

  // Function to render intent information
  const renderIntent = () => {
    if (isHero || !intent) return null;

    const intentInfo = getIntentInfo(intent);
    
    const getIntentColor = (type: string) => {
      switch (type) {
        case 'block': return '#70ff70';
        case 'block_and_attack': return '#ffff70';
        case 'heal': return '#ff70ff';
        case 'attack_buff': return '#ff9070';
        case 'block_and_heal': return '#70ffff';
        default: return '#ff7070';
      }
    };

    const getBorderColor = (type: string) => {
      switch (type) {
        case 'block': return '#40ff40';
        case 'block_and_attack': return '#ffff40';
        case 'heal': return '#ff40ff';
        case 'attack_buff': return '#ff6040';
        case 'block_and_heal': return '#40ffff';
        default: return '#ff4040';
      }
    };

    return (
      <div style={{
        position: 'absolute',
        top: '-105px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '4px 8px',
        borderRadius: '4px',
        color: getIntentColor(intentInfo.type),
        fontSize: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        border: `1px solid ${getBorderColor(intentInfo.type)}`,
        zIndex: 3,
        whiteSpace: 'nowrap',
        cursor: 'help'
      }} className="stat-container" title={
        intentInfo.type === 'block' ? 
          `Intends to: Block ${intentInfo.value} damage` :
        intentInfo.type === 'block_and_attack' ? 
          `Intends to: Block ${intentInfo.blockValue} damage and deal ${intentInfo.value} damage` :
        intentInfo.type === 'heal' ? 
          `Intends to: Heal ${intentInfo.value} HP` :
        intentInfo.type === 'attack_buff' ? 
          `Intends to: Increase attack damage by ${intentInfo.value}` :
        intentInfo.type === 'block_and_heal' ? 
          `Intends to: Block ${intentInfo.blockValue} damage and heal ${intentInfo.healValue} HP` :
          `Intends to: Deal ${intentInfo.value} damage`
      }>
        {intentInfo.type === 'block' ? (
          <>🛡️{intentInfo.value}</>
        ) : intentInfo.type === 'block_and_attack' ? (
          <>🛡️{intentInfo.blockValue}+⚔️{intentInfo.value}</>
        ) : intentInfo.type === 'heal' ? (
          <>💚{intentInfo.value}</>
        ) : intentInfo.type === 'attack_buff' ? (
          <>💪+{intentInfo.value}</>
        ) : intentInfo.type === 'block_and_heal' ? (
          <>🛡️{intentInfo.blockValue}+💚{intentInfo.healValue}</>
        ) : (
          <>⚔️{intentInfo.value}</>
        )}
      </div>
    );
  };

  const entityPosition = getEntityPosition();
  
  return (
    <>
      <style>
        {`
          @keyframes jump {
            0%, 100% { transform: translate(-50%, -50%); }
            50% { transform: translate(-50%, -100%); }
          }

          @keyframes flip {
            0%, 100% { transform: translate(-50%, -50%) rotateY(0deg); }
            100% { transform: translate(-50%, -50%) rotateY(360deg); }
          }

          @keyframes flip-attack {
            0%, 100% { transform: translate(-50%, -50%) rotateY(0deg); }
            50% { transform: translate(-50%, -50%) rotateY(360deg) scale(1.2); }
          }

          @keyframes heal-pulse {
            0% { transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
            50% { transform: translate(-50%, -50%) scale(1.1); filter: brightness(1.5) hue-rotate(90deg); }
            100% { transform: translate(-50%, -50%) scale(1); filter: brightness(1); }
          }

          @keyframes power-up {
            0% { transform: translate(-50%, -50%); filter: brightness(1); }
            50% { transform: translate(-50%, -50%) scale(1.15); filter: brightness(1.5) saturate(1.5); }
            75% { transform: translate(-50%, -50%) scale(1.1) rotate(5deg); }
            100% { transform: translate(-50%, -50%); filter: brightness(1); }
          }

          @keyframes shake {
            10%, 90% { transform: translate3d(-1px, 0, 0); }
            20%, 80% { transform: translate3d(2px, 0, 0); }
            30%, 50%, 70% { transform: translate3d(-4px, 0, 0); }
            40%, 60% { transform: translate3d(4px, 0, 0); }
          }

          @keyframes flash {
            0%, 100% { filter: brightness(1); }
            50% { filter: brightness(2) saturate(2); }
          }

          .game-entity {
            transition: all 0.3s ease-in-out;
          }

          .game-entity.animating {
            transition: none;
          }

          .health-bar {
            transition: all 0.2s ease-out;
          }

          .health-bar.flashing {
            filter: brightness(1.5) saturate(1.5);
          }

          .stat-container {
            position: relative;
            cursor: help;
            padding: 2px 4px;
            border-radius: 4px;
            transition: background-color 0.2s ease;
          }

          .stat-container:hover {
            background-color: rgba(255, 255, 255, 0.1);
          }

          .stat-container:hover::after {
            content: attr(title);
            position: absolute;
            bottom: calc(100% + 5px);
            left: 50%;
            transform: translateX(-50%);
            padding: 8px;
            background-color: rgba(0, 0, 0, 0.9);
            color: white;
            border-radius: 4px;
            font-size: 12px;
            line-height: 1.4;
            z-index: 1000;
            pointer-events: none;
            width: max-content;
            max-width: 200px;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.1);
            text-shadow: none;
            white-space: normal;
          }

          .stat-container:hover::before {
            display: none;
          }

          /* Ensure tooltips stay within viewport */
          @media (max-height: 800px) {
            .stat-container:hover::after {
              bottom: auto;
              top: calc(100% + 5px);
            }
          }
        `}
      </style>
      <div 
        ref={entityRef}
        className={`game-entity ${type} ${isValidTarget ? 'valid-target' : ''} ${isAnimating ? 'animating' : ''}`}
        style={getAnimationStyles()}
        onClick={() => isValidTarget && onEntityClick?.()}
      >
        {renderIntent()}
        <div 
          style={{
            width: '100%',
            height: '140px',
            position: 'relative',
            backgroundColor: 'transparent',
            borderRadius: '0',
            boxShadow: 'none',
          }}
        >
          {/* Entity model (hero or enemy) */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `url(${isHero ? heroModel : getEnemyModel()})`,
            backgroundSize: 'contain',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat',
            zIndex: 2
          }} />

          {/* Glow effect for valid target */}
          {isValidTarget && (
            <div style={{
              position: 'absolute',
              top: -12,
              left: -12,
              width: 'calc(100% + 24px)',
              height: 'calc(100% + 24px)',
              backgroundColor: 'rgba(255, 255, 0, 0.8)',
              filter: 'blur(20px) brightness(1.5)',
              WebkitMaskImage: `url(${isHero ? heroModel : getEnemyModel()})`,
              maskImage: `url(${isHero ? heroModel : getEnemyModel()})`,
              WebkitMaskSize: 'contain',
              maskSize: 'contain',
              WebkitMaskPosition: 'center',
              maskPosition: 'center',
              WebkitMaskRepeat: 'no-repeat',
              maskRepeat: 'no-repeat',
              zIndex: 1
            }} />
          )}
        </div>
        
        <div style={{ 
          position: 'absolute',
          top: '-45px',
          left: '50%',
          transform: 'translateX(-50%)',
          textAlign: 'center',
          textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
          backgroundColor: 'rgba(0, 0, 0, 0.7)',
          padding: '8px 12px',
          borderRadius: '4px',
          display: 'flex',
          flexDirection: 'column',
          gap: '4px',
          zIndex: 2  // Ensure stats show above background but below intents
        }}>
          <div style={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            gap: '8px',
            animation: isShaking ? 'shake 0.5s cubic-bezier(.36,.07,.19,.97) both' : undefined
          }}>
            <div className="stat-container" title="Health Points">
              <span>{health <= 0 ? '💔' : '❤️'} {health}/{maxHealth}</span>
            </div>
            {block > 0 && (
              <div className="stat-container" title="Block">
                <span style={{ 
                  color: '#70ff70',
                  fontWeight: 'bold'
                }}>
                  🛡️ {block}
                </span>
              </div>
            )}
            {buff > 0 && (
              <div className="stat-container" title="Permanent Attack+">
                <span style={{ 
                  color: '#ff9070',
                  fontWeight: 'bold'
                }}>
                  💪 +{buff}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default GameEntity; 