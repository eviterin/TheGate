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
  const { playCards: playCardsAction } = usePlayCards();
  const [pendingCardPlays, setPendingCardPlays] = useState<Array<{cardIndex: number, targetIndex: number}>>([]);
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
        const isInCombat = gameState?.runState === 2;
        if (isInCombat && turnState === 'player' && !frozenState) {
          // During combat + player turn, only fetch once to sync
          if (optimisticUpdatesEnabled) return;
          setOptimisticUpdatesEnabled(true);
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
        
        // Only update hand and mana at start of turn or when not in combat
        const newIsInCombat = state.runState === 2;
        if (!newIsInCombat || turnState === 'player') {
          setOptimisticHand(state.hand || []);
          setOptimisticMana(state.currentMana || 0);
          
          // Enable optimistic updates when combat starts
          if (newIsInCombat) {
            setOptimisticUpdatesEnabled(true);
          }
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

    // Add card to pending plays queue
    setPendingCardPlays(prev => [...prev, { 
      cardIndex: selectedCardIndex,
      targetIndex: targetIndex
    }]);

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
        currentMana: (prev.currentMana || 0) - card.manaCost
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
    setOptimisticUpdatesEnabled(false); // Disable optimistic updates when turn ends
    
    // Play all queued cards in one transaction
    if (pendingCardPlays.length > 0) {
      await playCardsAction(pendingCardPlays);
      setPendingCardPlays([]); // Clear queue after sending
    }
    
    // Start end turn in background - only call it once
    const endTurnPromise = endTurnAction();
    
    await new Promise(resolve => setTimeout(resolve, 800));
    setTurnState('enemy');

    // Get latest state for enemy intents but keep using our predicted health/block
    const currentState = gameState;
    if (!currentState) return;

    await processEnemyTurn(endTurnPromise, currentState, {
      enemyHealth: currentState.enemyCurrentHealth,
      enemyBlock: currentState.enemyBlock,
      heroHealth: currentState.currentHealth,
      heroBlock: currentState.currentBlock,
      mana: currentState.currentMana
    });
  };

  // Add a new function to handle enemy turn processing with optimistic updates
  const processEnemyTurn = async (
    playerTurnPromise: Promise<any>, 
    initialState: any,
    postPlayerTurnState: { 
      enemyHealth: number[], 
      enemyBlock: number[], 
      heroHealth: number, 
      heroBlock: number,
      mana: number 
    }
  ) => {
    try {
      // Start transition to enemy turn
      setTurnState('transitioning');
      setShowTurnBanner(false);
      await new Promise(resolve => setTimeout(resolve, 400));
      setTurnBannerMessage("Enemy Turn");
      setTurnBannerType('enemy');
      setShowTurnBanner(true);
      
      // Hide enemy turn banner after 2 seconds
      setTimeout(() => {
        setShowTurnBanner(false);
      }, 2000);
      
      // Wait a moment after banner hides before starting enemy actions
      await new Promise(resolve => setTimeout(resolve, 800));
      setTurnState('enemy');
      
      // We can start processing enemy actions immediately with our current state
      const enemyTypes = initialState.enemyTypes;
      const enemyIntents = initialState.enemyIntents;
      
      // Current state tracks our optimistic predictions throughout the turn
      let currentState = {...postPlayerTurnState};
      
      // Process enemy intents one by one
      for (let i = 0; i < enemyTypes.length; i++) {
        if (currentState.enemyHealth[i] > 0 && enemyIntents[i]) {
          const levelConfig = getLevelConfig(initialState.currentFloor);
          
          // Use processEnemyIntent first to calculate the result
          const enemyIntentResult = processEnemyIntent(
            enemyIntents[i],
            0, // intentValue (not used in most cases)
            currentState.enemyBlock[i],
            currentState.enemyHealth[i],
            initialState.enemyMaxHealth ? initialState.enemyMaxHealth[i] : 100, // fallback
            currentState.heroHealth,
            currentState.heroBlock,
            0 // enemyBuff
          );

          // Update our current state with the predicted results
          currentState.heroHealth = enemyIntentResult.newHeroHealth;
          currentState.heroBlock = enemyIntentResult.newHeroBlock;
          currentState.enemyHealth[i] = enemyIntentResult.newEnemyHealth;
          currentState.enemyBlock[i] = enemyIntentResult.newEnemyBlock;
          
          // Then play animation and sound
          const animationState: AnimationState = {
            sourceType: 'enemy',
            sourceIndex: i,
            targetPosition: levelConfig.heroPosition,
            timestamp: Date.now(),
            animationType: 'slash'
          };

          setCurrentAnimation(animationState);
          setCurrentSound(`enemy_intent_${enemyIntents[i]}`);
          setSoundType('intent');
          setIsSoundPlaying(true);
          
          // Wait for animation to be halfway through before showing damage
          await new Promise(resolve => setTimeout(resolve, 250));

          // Update UI state when animation is mid-way
          setGameState((prev: GameStateUpdate | null) => {
            if (!prev) return prev;
            const update: Partial<GameStateUpdate> = {
              currentHealth: currentState.heroHealth,
              currentBlock: currentState.heroBlock,
              enemyCurrentHealth: currentState.enemyHealth,
              enemyBlock: currentState.enemyBlock
            };
            return { ...prev, ...update };
          });
          
          // Wait for rest of animation
          await new Promise(resolve => setTimeout(resolve, 250));
          
          // Reset animation and sound
          setCurrentAnimation(null);
          setIsSoundPlaying(false);
          
          // Small delay between enemy actions
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // Wait for end turn transaction to complete
      await playerTurnPromise;
      
      // NOW we sync with the blockchain to get the final state
      // Make multiple attempts to get a stable state
      let latestState = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        latestState = await getLatestState(3, 300);
        if (latestState && latestState.currentMana > 0) {
          break;
        }
        // Wait a bit longer before trying again
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      // If we still don't have a good state, get one more time
      if (!latestState || latestState.currentMana === 0) {
        latestState = await getGameState();
      }
      
      // Show player turn transition
      setShowTurnBanner(false);
      await new Promise(resolve => setTimeout(resolve, 400));
      setTurnBannerMessage("Your Turn");
      setTurnBannerType('player');
      setShowTurnBanner(true);
      
      // Hide banner after 2 seconds
      setTimeout(() => {
        setShowTurnBanner(false);
      }, 2000);
      
      // Update with the final blockchain state
      setGameState(latestState);
      setPreviousHealth(latestState.currentHealth);
      setPreviousBlock(latestState.currentBlock);
      setPreviousEnemyHealth(latestState.enemyCurrentHealth);
      setPreviousEnemyBlock(latestState.enemyBlock);
      
      // Complete turn transition
      setTurnState('player');
      setFrozenState(null);
      
      // Update optimistic values with latest state
      setOptimisticHand(latestState.hand || []);
      setOptimisticMana(latestState.currentMana || 0);
      setOptimisticUpdatesEnabled(true);
    } catch (error) {
      console.error('Failed to process enemy turn:', error);
      
      setFrozenState(null);
      setCurrentAnimation(null);
      setShowTurnBanner(false);
      setTurnState('player');
      
      // In case of error, make sure we get a fresh state
      // and try multiple times to ensure we get one with proper mana
      let newState = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        newState = await getGameState();
        if (newState && newState.currentMana > 0) {
          break;
        }
        await new Promise(resolve => setTimeout(resolve, 500));
      }
      
      if (newState) {
        setGameState(newState);
        setOptimisticHand(newState.hand || []);
        setOptimisticMana(newState.currentMana || 0);
      }
      setOptimisticUpdatesEnabled(true);
    }
  };

  // Add getLatestState function
  const getLatestState = async (retries = 3, interval = 200): Promise<any> => {
    let lastState = null;
    
    for (let i = 0; i < retries; i++) {
      const newState = await getGameState();
      if (!newState) continue;
      
      if (lastState && 
          JSON.stringify(newState.enemyCurrentHealth) === JSON.stringify(lastState.enemyCurrentHealth) &&
          JSON.stringify(newState.currentHealth) === JSON.stringify(lastState.currentHealth)) {
        return newState;
      }
      lastState = newState;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    
    return lastState;
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

  // Add this effect near the other useEffect hooks
  useEffect(() => {
    // When game state changes from whale room (1) to combat (2), reset the whale room state
    if (gameState?.runState === 2) {
      setIsChoosingRoom(false);
      setIsGateOpen(false);
    }
  }, [gameState?.runState]);

  // Add effect to handle initial combat setup
  useEffect(() => {
    if (gameState?.runState === 2) { // Combat state
      setOptimisticHand(gameState.hand || []);
      setOptimisticMana(gameState.currentMana || 0);
      setIsHandVisible(true);
    }
  }, [gameState?.runState]);

  // Add effect to manage hand visibility based on game state
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

  // Replace the checkAndApproachGate effect with this simpler version
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