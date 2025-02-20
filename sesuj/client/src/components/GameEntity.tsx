import React from 'react';

// Import all enemy models
const enemyModels: { [key: string]: string } = {};

// Import hero model
const heroModel = new URL('../assets/misc/hero.png', import.meta.url).href;

// Constants for intent types (matching the contract)
const INTENT_TYPES = {
  BLOCK_5: 1000,
  // Add any other special intents here
} as const;

// Helper to determine intent type
interface IntentInfo {
  type: 'attack' | 'block';
  value: number;
}

const getIntentInfo = (intent: number): IntentInfo => {
  if (intent === INTENT_TYPES.BLOCK_5) {
    return { type: 'block', value: 5 };
  }
  // Any other number is an attack with that damage value
  return { type: 'attack', value: intent };
};

// Import room 1-10 enemy models dynamically
for (let floor = 1; floor <= 10; floor++) {
  for (let position = 1; position <= 2; position++) {
    const modelKey = `room_${floor}_enemy_${position}`;
    try {
      enemyModels[modelKey] = new URL(`../assets/models/${modelKey}.png`, import.meta.url).href;
      console.log(`Loaded enemy model: ${modelKey}`);
    } catch (error) {
      console.error(`Failed to load enemy model: ${modelKey}`, error);
    }
  }
}

// Log all loaded models
console.log('All loaded enemy models:', enemyModels);

interface GameEntityProps {
  type: 'hero' | 'enemy';
  health: number;
  maxHealth: number;
  block?: number;
  position: number; // For enemies, this is their index
  isValidTarget?: boolean;
  onEntityClick?: () => void;
  currentFloor?: number; // Add currentFloor prop
  intent?: number; // Add intent prop
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
  intent = 0
}) => {
  const isHero = type === 'hero';
  
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

  // Function to render intent information
  const renderIntent = () => {
    if (isHero || !intent) return null;

    const intentInfo = getIntentInfo(intent);
    
    return (
      <div style={{
        position: 'absolute',
        top: '-90px',
        left: '50%',
        transform: 'translateX(-50%)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '4px 8px',
        borderRadius: '4px',
        color: intentInfo.type === 'attack' ? '#ff7070' : '#70ff70',
        fontSize: '14px',
        display: 'flex',
        alignItems: 'center',
        gap: '4px',
        border: `1px solid ${intentInfo.type === 'attack' ? '#ff4040' : '#40ff40'}`
      }}>
        {intentInfo.type === 'block' ? (
          <>🛡️ Block {intentInfo.value}</>
        ) : (
          <>⚔️ Attack {intentInfo.value}</>
        )}
      </div>
    );
  };
  
  return (
    <div 
      className={`game-entity ${type} ${isValidTarget ? 'valid-target' : ''}`}
      style={{
        position: 'absolute',
        [isHero ? 'left' : 'right']: isHero ? '20%' : `${20 + (position * 25)}%`,
        top: '50%',
        transform: 'translateY(-50%)',
        width: '120px',
        height: '180px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '10px',
        color: 'white',
        cursor: isValidTarget ? 'pointer' : 'default',
        transition: 'all 0.2s ease'
      }}
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
        marginTop: '10px', 
        textAlign: 'center',
        textShadow: '1px 1px 2px rgba(0, 0, 0, 0.5)',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        padding: '8px 12px',
        borderRadius: '4px',
        display: 'flex',
        flexDirection: 'column',
        gap: '4px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
          <span>❤️ {health}/{maxHealth}</span>
          {block > 0 && (
            <span style={{ 
              color: '#70ff70',
              fontWeight: 'bold'
            }}>
              🛡️ {block}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

export default GameEntity; 