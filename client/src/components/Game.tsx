import React, { useState, useEffect } from 'react';
import InfoBar from './InfoBar';
import Hand from './Hand';
import GameEntity from './GameEntity';
import LoadingOverlay from './LoadingOverlay';
import { useStartRun, useAbandonRun, useGameState, useChooseRoom, useEndTurn, useChooseCardReward, usePlayCards } from '../hooks/GameState';
import { useCards } from '../hooks/CardsContext';
import './Game.css';
import { getBackgroundImage } from '../game/encounters';
import { getLevelConfig } from '../game/levelConfigs';
import { Position } from '../game/encounters';
import { CardAnimationType } from '../game/cards';
import TurnBanner from './TurnBanner';
import './Intent.css';
import { predictCardEffect, processEnemyIntent } from '../game/damageUtils';
import AbandonConfirmation from './AbandonConfirmation';
import FloatingMana from './FloatingMana';
import WhaleRoom from './WhaleRoom';
import GameOver from './GameOver';
import RewardSelection from './RewardSelection';
import CardPileViewer from './CardPileViewer';
import SoundManager from './SoundManager';
import { soundEffectManager } from '../game/SoundEffectManager';

interface AnimationState {
  sourceType: 'hero' | 'enemy';
  sourceIndex: number;
  targetPosition: Position;
  timestamp: number;
  animationType?: CardAnimationType;
}

interface GameStateUpdate {
  currentHealth: number;
  currentBlock: number;
  enemyCurrentHealth: number[];
  enemyBlock: number[];
  currentMana: number;
  hand?: number[];
  deck?: number[];
  discard?: number[];
  draw?: number[];
  enemyTypes?: number[];
  enemyIntents?: number[];
  currentFloor?: number;
  runState?: number;
}

const Game: React.FC = () => {
  const [hand, setHand] = useState<number[]>([]);
  const [deck, setDeck] = useState<number[]>([]);
  const [draw, setDraw] = useState<number[]>([]);
  const [discard, setDiscard] = useState<number[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [frozenState, setFrozenState] = useState<any>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isHandVisible, setIsHandVisible] = useState(true);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const { getGameState } = useGameState();
  const { startRun } = useStartRun();
  const { endTurn: endTurnAction } = useEndTurn();
  const { getActiveCards } = useCards();
  const [cardData, setCardData] = useState<any[]>([]);
  const [isDeckVisible, setIsDeckVisible] = useState(false);
  const [isDiscardVisible, setIsDiscardVisible] = useState(false);
  const [isDrawVisible, setIsDrawVisible] = useState(false);
  const { chooseCardReward } = useChooseCardReward();
  const { chooseRoom } = useChooseRoom();
  const { abandonRun } = useAbandonRun();
  const [selectedReward, setSelectedReward] = useState<number | null>(null);
  const [optimisticHand, setOptimisticHand] = useState<number[]>([]);
  const [optimisticMana, setOptimisticMana] = useState<number | null>(null);
  const [optimisticUpdatesEnabled, setOptimisticUpdatesEnabled] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoadingGameState, setIsLoadingGameState] = useState(true);
  const [isChoosingRoom, setIsChoosingRoom] = useState(false);
  const [isChoosingReward, setIsChoosingReward] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState | null>(null);
  const [animationsEnabled] = useState(true);
  const [turnState, setTurnState] = useState<'player' | 'enemy' | 'transitioning'>('player');
  const [showTurnBanner, setShowTurnBanner] = useState(false);
  const [turnBannerMessage, setTurnBannerMessage] = useState('');
  const [turnBannerType, setTurnBannerType] = useState<'enemy' | 'player'>('player');
  const [previousHealth, setPreviousHealth] = useState<number>(0);
  const [previousBlock, setPreviousBlock] = useState<number>(0);
  const [previousEnemyHealth, setPreviousEnemyHealth] = useState<number[]>([]);
  const [previousEnemyBlock, setPreviousEnemyBlock] = useState<number[]>([]);
  const { playCards } = usePlayCards();
  const [showAbandonConfirmation, setShowAbandonConfirmation] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [isApproaching, setIsApproaching] = useState(false);
  const [currentSound, setCurrentSound] = useState<string | undefined>();
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [soundType, setSoundType] = useState<'card' | 'intent'>('card');

  useEffect(() => {
    const fetchCards = async () => {
      try {
        const cards = await getActiveCards();
        setCardData(cards);
      } catch (error) {
        console.error('Failed to fetch cards:', error);
      }
    };
    fetchCards();
  }, [getActiveCards]);

  useEffect(() => {
    let mounted = true;
    let interval: number;
    
    const fetchGameState = async () => {
      try {
        if (!mounted) return;

        // Only fetch state at the start of player turn or when not in combat
        if (gameState?.runState === 2) {
          // During combat, only fetch at the start of player turn
          if (turnState !== 'player' || optimisticUpdatesEnabled) return;
        }

        const state = await getGameState();
        if (!mounted || !state) return;
        
        // When not frozen, update everything
        if (gameState) {
          setPreviousHealth(gameState.currentHealth);
          setPreviousBlock(gameState.currentBlock);
          setPreviousEnemyHealth(gameState.enemyCurrentHealth);
          setPreviousEnemyBlock(gameState.enemyBlock);
        }
        
        setGameState(state);
        setIsLoadingGameState(false);
        
        // Only update hand and mana at the start of turn or when not in combat
        if (!optimisticUpdatesEnabled || state.runState !== 2) {
          setOptimisticHand(state.hand || []);
          setOptimisticMana(state.currentMana || 0);
        }

        // Reset optimistic updates when floor/run state changes
        if (!gameState || !state || 
            state.currentFloor !== gameState.currentFloor || 
            state.runState !== gameState.runState) {
          setOptimisticUpdatesEnabled(true);
        }

        setDeck(state?.deck || []);
        setDiscard(state?.discard || []);
        setDraw(state?.draw || []);
        
        if (state?.runState === 3) {
          setOptimisticHand([]);
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
        setIsLoadingGameState(false);
      }
    };

    fetchGameState();
    interval = window.setInterval(fetchGameState, 500);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getGameState, gameState, optimisticUpdatesEnabled, frozenState, turnState]);

  const handleCardSelect = (cardIndex: number) => {
    
    if (cardIndex === selectedCardIndex) {
      setSelectedCardIndex(null);
    } else {
      setSelectedCardIndex(cardIndex);
    }
  };

  const handleEntityClick = async (targetIndex: number) => {
    if (selectedCardIndex === null) return;
    
    const cardId = optimisticHand[selectedCardIndex];
    const card = cardData.find(c => c.numericId === cardId);
    
    if (!card || !gameState) return;

    // Check if we have enough mana
    if (card.manaCost > (optimisticMana || 0)) return;

    // Enable optimistic updates to prevent state sync during card play
    setOptimisticUpdatesEnabled(true);

    // Create the play for the blockchain
    const play = {
      cardIndex: selectedCardIndex,
      targetIndex
    };

    // Submit transaction in background
    playCards([play]);

    // Predict and apply card effect immediately
    const levelConfig = getLevelConfig(gameState.currentFloor);
    
    // Animation setup
    const isTargetingHero = !card.targeted;
    let targetPosition: Position = isTargetingHero ? levelConfig.heroPosition : levelConfig.enemyPositions[targetIndex];

    // Sound effect
    setCurrentSound(card.name.toLowerCase());
    setSoundType('card');
    setIsSoundPlaying(true);

    // Create animation state
    const animationState: AnimationState = {
      sourceType: 'hero',
      sourceIndex: 0,
      targetPosition: targetPosition,
      timestamp: Date.now(),
      animationType: card.animationType
    };

    setCurrentAnimation(animationState);
    
    await new Promise(resolve => setTimeout(resolve, 500));
    setIsSoundPlaying(false);
    
    // Predict effect
    const cardEffect = predictCardEffect(
      cardId, 
      targetIndex,
      {
        ...gameState,
        enemyCurrentHealth: [...gameState.enemyCurrentHealth],
        enemyBlock: [...gameState.enemyBlock]
      }
    );

    // Play death sound if enemy died
    if (cardEffect.enemyDied && 
        cardEffect.enemyHealth[targetIndex] <= 0 && 
        gameState.enemyCurrentHealth[targetIndex] > 0) {
      soundEffectManager.playEventSound('enemyDeath');
    }

    // Update UI state
    setGameState((prev: GameStateUpdate | null) => {
      if (!prev) return prev;
      return {
        ...prev,
        currentHealth: cardEffect.heroHealth,
        currentBlock: cardEffect.heroBlock,
        enemyCurrentHealth: cardEffect.enemyHealth,
        enemyBlock: cardEffect.enemyBlock,
        currentMana: (prev.currentMana || 0) - card.manaCost,
        hand: prev.hand?.filter((_, i) => i !== selectedCardIndex) || []
      };
    });

    // Update optimistic state
    setOptimisticMana((prev) => (prev || 0) - card.manaCost);
    setOptimisticHand(prev => prev.filter((_, i) => i !== selectedCardIndex));
    
    await new Promise(resolve => setTimeout(resolve, 100));
    setCurrentAnimation(null);
    setSelectedCardIndex(null);
  };

  const handleEndTurn = async () => {
    setTurnState('transitioning');
    setShowTurnBanner(false);
    
    // Disable optimistic updates to allow state sync at start of next turn
    setOptimisticUpdatesEnabled(false);
    
    // Submit end turn action
    endTurnAction();
    
    // Predict enemy intents immediately
    if (gameState) {
      const enemyStates = gameState.enemyCurrentHealth.map((health: number, index: number) => ({
        health,
        block: gameState.enemyBlock[index],
        intent: gameState.enemyIntents[index]
      }));
      
      let newHealth = gameState.currentHealth;
      let newBlock = gameState.currentBlock;
      
      // Process each enemy's intent
      for (let i = 0; i < enemyStates.length; i++) {
        if (enemyStates[i].health <= 0) continue;
        
        const result = processEnemyIntent(
          gameState.enemyTypes[i],
          gameState.enemyIntents[i],
          enemyStates[i].block,
          enemyStates[i].health,
          21, // maxHealth
          newHealth,
          newBlock
        );
        
        newHealth = result.newHeroHealth;
        newBlock = result.newHeroBlock;
      }
      
      // Update game state with predicted enemy actions
      setGameState((prev: GameStateUpdate | null) => {
        if (!prev) return prev;
        return {
          ...prev,
          currentHealth: newHealth,
          currentBlock: newBlock
        };
      });
      
      // Show enemy turn banner
      setTurnBannerType('enemy');
      setTurnBannerMessage("Enemy Turn");
      setShowTurnBanner(true);
      
      // Wait for animation
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowTurnBanner(false);
      
      // Get latest state from chain
      const latestState = await getGameState();
      if (!latestState) return;
      
      // Complete turn transition
      setTurnState('player');
      setFrozenState(null);
      
      // Update optimistic values with latest state
      setOptimisticHand(latestState.hand || []);
      setOptimisticMana(latestState.currentMana || 0);
      
      // Show player turn banner
      setTurnBannerType('player');
      setTurnBannerMessage("Your Turn");
      setShowTurnBanner(true);
      
      await new Promise(resolve => setTimeout(resolve, 1000));
      setShowTurnBanner(false);
    }
  };

  const handleBackToMenu = () => {
    window.location.href = '/';
  };

  // Determine if an entity is a valid target for the selected card
  const isValidTarget = (entityType: 'hero' | 'enemy', index: number) => {
    if (selectedCardIndex === null) return false;
    
    const cardId = optimisticHand[selectedCardIndex];
    const card = cardData.find(c => c.numericId === cardId);
    
    if (!card) return false;

    // If it's an enemy, check if it's alive
    if (entityType === 'enemy') {
      if (!gameState?.enemyCurrentHealth[index] || gameState.enemyCurrentHealth[index] <= 0) {
        return false;
      }
      return card.targeted; // Only allow targeting enemies if the card is targeted
    }

    // For hero, allow targeting if the card is non-targeted
    return !card.targeted;
  };

  const getBackground = () => {
    if (!gameState) return '';
    return getBackgroundImage(gameState.currentFloor);
  };

  const toggleDeck = () => {
    setIsDeckVisible(!isDeckVisible);
    setIsDiscardVisible(false);
    setIsDrawVisible(false);
  };

  const toggleDiscard = () => {
    setIsDiscardVisible(!isDiscardVisible);
    setIsDeckVisible(false);
    setIsDrawVisible(false);
  };

  const toggleDraw = () => {
    setIsDrawVisible(!isDrawVisible);
    setIsDeckVisible(false);
    setIsDiscardVisible(false);
  };

  const handleSelectReward = (cardId: number) => {
    if (!isChoosingReward) {
      setSelectedReward(cardId);
    }
  };

  const handleConfirmReward = async () => {
    if (!selectedReward || isChoosingReward) return;
    
    try {
      setIsChoosingReward(true);
      await chooseCardReward(selectedReward);
      setSelectedReward(null);
    } catch (error) {
      console.error('Failed to choose reward:', error);
    } finally {
      setIsChoosingReward(false);
    }
  };

  const handleWhaleRoomChoice = async (optionId: number) => {
    if (isChoosingRoom) return; // Prevent multiple submissions
    setIsChoosingRoom(true);
    try {
      await chooseRoom(optionId);
    } catch (error) {
      console.error('Failed to choose whale room option:', error);
    }
  };

  const handleRetry = async () => {
    setIsRetrying(true);
    try {
      await abandonRun();
      await startRun();
      
      // Refresh game state after retrying
      const newState = await getGameState();
      if (newState) {
        setGameState(newState);
        setHand(newState.hand || []);
        setDeck(newState.deck || []);
        setDraw(newState.draw || []);
        setDiscard(newState.discard || []);
      }
    } catch (error) {
      console.error('Failed to retry:', error);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleAbandonRun = async () => {
    setIsAbandoning(true);
    try {
      await abandonRun();
      window.location.reload(); // Refresh the page to start fresh
    } catch (error) {
      console.error('Failed to abandon run:', error);
      setIsAbandoning(false);
      setShowAbandonConfirmation(false);
    }
  };

  useEffect(() => {
    // When game state changes from whale room (1) to combat (2), reset the whale room state
    if (gameState?.runState === 2) {
      setIsChoosingRoom(false);
      setIsGateOpen(false);
    }
  }, [gameState?.runState]);

  useEffect(() => {
    if (gameState?.runState === 2) { // Combat state
      setOptimisticHand(gameState.hand || []);
      setOptimisticMana(gameState.currentMana || 0);
      setIsHandVisible(true);
    }
  }, [gameState?.runState]);

  useEffect(() => {
    if (!gameState) return;
    
    // Hide hand at the gate (room 0)
    if (gameState.runState === 0 && gameState.currentFloor === 0) {
      setIsHandVisible(false);
    } 
    // Show hand in combat
    else if (gameState.runState === 2) {
      setIsHandVisible(true);
    }
    // Show hand in card reward screen
    else if (gameState.runState === 3) {
      setIsHandVisible(true);
    }
  }, [gameState?.runState, gameState?.currentFloor]);

  useEffect(() => {
    let mounted = true;

    const checkAndApproachGate = async () => {
      if (!gameState || isApproaching) return;

      // Only try to start if we're in the initial state
      if (gameState.runState === 0) {
        try {
          setIsApproaching(true);
          await startRun();
        } catch (error) {
          console.error('Failed to approach the gate:', error);
          setIsApproaching(false);
        }
      } else if (gameState.runState === 1) {
        // Clear approaching state once we're in the whale room
        setIsApproaching(false);
      }
    };

    checkAndApproachGate();

    return () => {
      mounted = false;
    };
  }, [gameState?.runState, isApproaching]);

  return (
    <>
      <SoundManager 
        soundEffect={currentSound}
        isPlaying={isSoundPlaying}
        type={soundType}
      />
      <div className="game-wrapper">
        <div className="game-container">
          <div className="side-decorations left"></div>
          <div className="side-decorations right"></div>
          <div className="game-content" style={{backgroundImage: `url(${getBackground()})`}}>
            <TurnBanner 
              message={turnBannerMessage}
              isVisible={showTurnBanner}
              type={turnBannerType}
            />
            {/* Info Bar - Only show when not in whale room */}
            {gameState && gameState.runState !== 1 && (
              <InfoBar />
            )}

            {/* Game Entities */}
            {gameState && (
              <>
                <GameEntity 
                  type="hero"
                  health={gameState.currentHealth}
                  maxHealth={gameState.maxHealth}
                  block={gameState.currentBlock}
                  position={0}
                  isValidTarget={isValidTarget('hero', 0)}
                  onEntityClick={() => handleEntityClick(0)}
                  currentFloor={gameState.currentFloor}
                  isAnimating={currentAnimation?.sourceType === 'hero' && currentAnimation.sourceIndex === 0}
                  animationType={currentAnimation?.sourceType === 'hero' ? currentAnimation.animationType : undefined}
                  animationTarget={currentAnimation?.sourceType === 'hero' ? currentAnimation.targetPosition : undefined}
                  previousHealth={previousHealth}
                  previousBlock={previousBlock}
                  scale={getLevelConfig(gameState.currentFloor).heroScale}
                  invert={getLevelConfig(gameState.currentFloor).heroInvert}
                  runState={gameState.runState}
                />
                {/* Add Floating Mana display above player */}
                {gameState.runState === 2 && (
                  <FloatingMana 
                    currentMana={optimisticMana ?? gameState.currentMana}
                    maxMana={gameState.maxMana}
                    position={getLevelConfig(gameState.currentFloor).heroPosition}
                    heroScale={getLevelConfig(gameState.currentFloor).heroScale}
                  />
                )}
                {gameState.enemyTypes.map((type: number, index: number) => (
                  <GameEntity
                    key={index}
                    type="enemy"
                    health={gameState.enemyCurrentHealth[index]}
                    maxHealth={gameState.enemyMaxHealth[index]}
                    block={gameState.enemyBlock[index]}
                    position={index}
                    isValidTarget={isValidTarget('enemy', index)}
                    onEntityClick={() => handleEntityClick(index)}
                    currentFloor={gameState.currentFloor}
                    intent={gameState.enemyCurrentHealth[index] > 0 ? gameState.enemyIntents[index] : undefined}
                    isAnimating={currentAnimation?.sourceType === 'enemy' && currentAnimation.sourceIndex === index}
                    animationType={currentAnimation?.sourceType === 'enemy' ? currentAnimation.animationType : undefined}
                    animationTarget={currentAnimation?.sourceType === 'enemy' ? currentAnimation.targetPosition : undefined}
                    previousHealth={previousEnemyHealth[index]}
                    previousBlock={previousEnemyBlock[index]}
                    buff={gameState.enemyBuffs[index]}
                    scale={getLevelConfig(gameState.currentFloor).enemyScales?.[index]}
                    invert={getLevelConfig(gameState.currentFloor).enemyInverted?.[index]}
                    runState={gameState.runState}
                  />
                ))}
              </>
            )}
            
            {/* Show reward selection UI when in reward state */}
            {gameState?.runState === 3 && (
              <RewardSelection
                availableRewards={gameState.availableCardRewards}
                cardData={cardData}
                selectedReward={selectedReward}
                onSelectReward={handleSelectReward}
                onConfirmReward={handleConfirmReward}
                isChoosingReward={isChoosingReward}
              />
            )}

            {/* Whale Room Overlay */}
            {gameState?.runState === 1 && (
              <WhaleRoom 
                onChooseOption={handleWhaleRoomChoice}
                isChoosingRoom={isChoosingRoom}
              />
            )}

            {/* Death Screen Overlay */}
            {gameState?.runState === 4 && (
              <GameOver
                isVictory={false}
                onRetry={handleRetry}
                onAbandon={() => setShowAbandonConfirmation(true)}
                onBackToMenu={handleBackToMenu}
                isRetrying={isRetrying}
              />
            )}

            {/* Victory Screen Overlay */}
            {gameState?.runState === 0 && gameState?.currentFloor === 11 && (
              <GameOver
                isVictory={true}
                onRetry={handleRetry}
                onAbandon={() => setShowAbandonConfirmation(true)}
                onBackToMenu={handleBackToMenu}
                isRetrying={isRetrying}
              />
            )}
          </div>

          <div className="bottom-area">
            <div className="bottom-left">
              {/* Only show pile buttons when not in whale room and not at the gate */}
              {(!gameState || (gameState.runState !== 1 && gameState.runState !== 0)) && (
                <div className="pile-and-mana">
                  <div className="pile-buttons">
                    <button 
                      className="menu-button"
                      onClick={toggleDeck}
                    >
                      {isDeckVisible ? 'Hide Deck' : `View Deck (${deck.length})`}
                    </button>
                    <button 
                      className="menu-button"
                      onClick={toggleDiscard}
                    >
                      {isDiscardVisible ? 'Hide Discard' : `View Discard (${discard.length})`}
                    </button>
                    <button 
                      className="menu-button"
                      onClick={toggleDraw}
                    >
                      {isDrawVisible ? 'Hide Draw' : `View Draw (${draw.length})`}
                    </button>
                  </div>
                </div>
              )}
              {/* Only show abandon button when not at the gate */}
              {(!gameState || gameState.runState !== 0) && (
                <button 
                  className="menu-button abandon-button"
                  onClick={() => setShowAbandonConfirmation(true)}
                  style={{
                    background: 'rgba(220, 53, 69, 0.8)',
                    borderColor: 'rgba(220, 53, 69, 0.3)'
                  }}
                >
                  Abandon Run
                </button>
              )}
            </div>

            <div className="bottom-center">
              <Hand 
                cards={optimisticHand}
                onCardSelect={handleCardSelect}
                selectedCardIndex={selectedCardIndex}
                cardData={cardData}
                currentMana={optimisticMana ?? (gameState?.currentMana || 0)}
                isVisible={isHandVisible && (!gameState || gameState.runState !== 0)}
              />
            </div>

            <div className="bottom-right">
              {/* Add end turn button */}
              {turnState === 'player' && gameState?.runState === 2 && (
                <button 
                  className="menu-button end-turn-button"
                  onClick={handleEndTurn}
                  disabled={turnState !== 'player'}
                >
                  End Turn
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Add loading overlays */}
        <LoadingOverlay 
          isVisible={isLoadingGameState} 
          message="Loading game state..." 
        />
        <LoadingOverlay 
          isVisible={isChoosingRoom} 
          message="Receiving divine blessing..." 
        />
        <LoadingOverlay 
          isVisible={isChoosingReward} 
          message="Faith guides you onward..." 
        />
        <LoadingOverlay 
          isVisible={isRetrying} 
          message="Divine intervention in progress..." 
        />

        {/* Use the CardPileViewer component for all pile views */}
        <CardPileViewer
          isVisible={isDeckVisible}
          title={`Deck (${deck.length} cards)`}
          cards={deck}
          cardData={cardData}
          onClose={toggleDeck}
        />
        
        <CardPileViewer
          isVisible={isDiscardVisible}
          title={`Discard Pile (${discard.length} cards)`}
          cards={discard}
          cardData={cardData}
          onClose={toggleDiscard}
        />
        
        <CardPileViewer
          isVisible={isDrawVisible}
          title={`Draw Pile (${draw.length} cards)`}
          cards={draw}
          cardData={cardData}
          subText="Note: Cards shown here may not be in their actual draw order"
          onClose={toggleDraw}
        />

        {/* Add AbandonConfirmation component */}
        <AbandonConfirmation
          isOpen={showAbandonConfirmation}
          onConfirm={handleAbandonRun}
          onCancel={() => setShowAbandonConfirmation(false)}
          isLoading={isAbandoning}
        />
      </div>
    </>
  );
};

export default Game; 