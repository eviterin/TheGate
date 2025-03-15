import React, { useState, useEffect, useRef } from 'react';
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
import Intent, { CardIntent } from './Intent';
import './Intent.css';
import { predictCardEffect } from '../game/damageUtils';
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

const calculateTotalManaCost = (intents: CardIntent[], cardData: Array<{ numericId: number; manaCost: number }>): number => {
  return intents.reduce((total, intent) => {
    const card = cardData.find(c => c.numericId === intent.cardId);
    return total + (card?.manaCost || 0);
  }, 0);
};

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
  const [selectedReward, setSelectedReward] = useState<number | null>(null);
  const [optimisticHand, setOptimisticHand] = useState<number[]>([]);
  const [optimisticMana, setOptimisticMana] = useState<number | null>(null);
  const [optimisticUpdatesEnabled, setOptimisticUpdatesEnabled] = useState(true);
  const [autoEndTurnEnabled] = useState(true);
  const [hasAutoEndedTurn, setHasAutoEndedTurn] = useState(false);
  const { abandonRun } = useAbandonRun();
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
  const [cardIntents, setCardIntents] = useState<CardIntent[]>([]);
  const [isCommittingIntents, setIsCommittingIntents] = useState(false);
  const { playCards } = usePlayCards();
  const [showAbandonConfirmation, setShowAbandonConfirmation] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [isApproaching, setIsApproaching] = useState(false);
  const [currentSound, setCurrentSound] = useState<string | undefined>();
  const [currentIntent, setCurrentIntent] = useState<number | undefined>();
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

  const canEndTurn = () => {
    return !isCommittingIntents;
  };

  useEffect(() => {
    let mounted = true;
    let interval: number;
    
    const fetchGameState = async () => {
      try {
        if (!mounted) return;

        // Don't fetch state during enemy turn or when frozen
        if (turnState === 'enemy' || frozenState) return;

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
        
        if (!gameState || !state || 
            state.currentFloor !== gameState.currentFloor || 
            state.runState !== gameState.runState) {
          setHasAutoEndedTurn(false);
        }
        
        const hasPlayableCards = cardData.length > 0 && state?.hand?.some(cardId => {
          const card = cardData.find(c => c.numericId === cardId);
          return card && card.manaCost <= (state.currentMana || 0);
        });

        const isInCombat = state?.runState === 2;
        if (autoEndTurnEnabled && 
            isInCombat && 
            cardData.length > 0 && 
            !hasAutoEndedTurn && 
            canEndTurn() && 
            (!hasPlayableCards || state?.currentMana === 0 || !state?.hand?.length) &&
            !state.enemyCurrentHealth.every((health: number) => health <= 0)) {
          setHasAutoEndedTurn(true);
          handleEndTurn();
        }

        if (isInCombat && state?.currentMana && state.currentMana > 0) {
          const canPlaySomething = state.hand?.some(cardId => {
            const card = cardData.find(c => c.numericId === cardId);
            return card && card.manaCost <= state.currentMana;
          });
          if (canPlaySomething) {
            setHasAutoEndedTurn(false);
          }
        }

        setDeck(state?.deck || []);
        setDiscard(state?.discard || []);
        setDraw(state?.draw || []);
        
        if (state?.runState === 3) {
          setCardIntents([]);
        }
        
        if (!optimisticUpdatesEnabled) {
          setOptimisticHand(state?.hand || []);
          setOptimisticMana(state?.currentMana || 0);
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
        setIsLoadingGameState(false);
        
        if (gameState) {
          setOptimisticHand(gameState.hand || []);
          setOptimisticMana(gameState.currentMana);
        }
      }
    };

    fetchGameState();
    interval = setInterval(fetchGameState, 500);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getGameState, gameState, optimisticUpdatesEnabled, frozenState, cardData.length, autoEndTurnEnabled, hasAutoEndedTurn, turnState]);

  const handleCardSelect = (cardIndex: number) => {
    setHasAutoEndedTurn(false);
    
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

    // Check if this card is already used in an intent
    const isCardUsed = cardIntents.some(intent => intent.cardIndex === selectedCardIndex);
    if (isCardUsed) return;

    // Calculate total mana needed including the new card
    const totalManaNeeded = calculateTotalManaCost([...cardIntents, {
      id: Date.now().toString(),
      cardIndex: selectedCardIndex,
      targetIndex,
      cardId,
      cardName: card.name
    }], cardData);

    const currentMana = gameState.currentMana;
    if (totalManaNeeded > currentMana) {

      return;
    }

    // Add to intents and update optimistic mana
    const newIntent: CardIntent = {
      id: Date.now().toString(),
      cardIndex: selectedCardIndex,
      targetIndex,
      cardId,
      cardName: card.name
    };

    setCardIntents(prev => [...prev, newIntent]);
    setOptimisticMana(currentMana - totalManaNeeded);
    setSelectedCardIndex(null);
  };

  // Add handlers for intent management
  const handleReorderIntents = (fromIndex: number, toIndex: number) => {
    setCardIntents(prev => {
      const newIntents = [...prev];
      const [movedIntent] = newIntents.splice(fromIndex, 1);
      newIntents.splice(toIndex, 0, movedIntent);
      return newIntents;
    });
  };

  // Update handleRemoveIntent to use cardData parameter
  // Update handleRemoveIntent to restore mana
  const handleRemoveIntent = (intentId: string) => {
    const removedIntent = cardIntents.find(intent => intent.id === intentId);
    if (!removedIntent) return;

    const removedCard = cardData.find(c => c.numericId === removedIntent.cardId);
    if (!removedCard) return;

    setCardIntents(prev => {
      const newIntents = prev.filter(intent => intent.id !== intentId);
      // Recalculate mana after removing the intent
      const totalManaCost = calculateTotalManaCost(newIntents, cardData);
      setOptimisticMana(gameState?.currentMana - totalManaCost);
      return newIntents;
    });
  };

  // Update handleClearIntents to restore all mana
  const handleClearIntents = () => {
    setCardIntents([]);
    setSelectedCardIndex(null);
    setOptimisticMana(gameState?.currentMana || 0);
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

  // Update handleCommitIntents
  const handleCommitIntents = async () => {
    if (cardIntents.length === 0 || isCommittingIntents) return;

    try {
      setIsCommittingIntents(true);
      setOptimisticUpdatesEnabled(false);  
      const stateBeforeAnimations = { ...gameState };
      setFrozenState(stateBeforeAnimations);

      // Prevent card indexes from being offset by previous cards
      const plays = cardIntents.map((intent) => {
        const cardsPlayedBefore = cardIntents
          .slice(0, cardIntents.indexOf(intent))
          .filter(prev => prev.cardIndex < intent.cardIndex)
          .length;
        
        return {
          cardIndex: intent.cardIndex - cardsPlayedBefore,
          targetIndex: intent.targetIndex
        };
      });

      // Submit transaction FIRST
      const transactionPromise = playCards(plays);

      // Track cumulative state for animations
      let currentState = {
        enemyHealth: [...stateBeforeAnimations.enemyCurrentHealth],
        enemyBlock: [...stateBeforeAnimations.enemyBlock],
        heroHealth: stateBeforeAnimations.currentHealth,
        heroBlock: stateBeforeAnimations.currentBlock,
        mana: stateBeforeAnimations.currentMana
      };

      // Process and animate each card one by one
      for (let i = 0; i < cardIntents.length; i++) {
        const intent = cardIntents[i];
        const card = cardData.find(c => c.numericId === intent.cardId);
        if (!card) continue;

        // If not the first card, add small delay between cards
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Animate this card's effect
        const levelConfig = getLevelConfig(stateBeforeAnimations.currentFloor);
        
        const isTargetingHero = !card.targeted;
        let targetPosition: Position;
        
        if (isTargetingHero) {
          targetPosition = levelConfig.heroPosition;
        } else {
          targetPosition = levelConfig.enemyPositions[intent.targetIndex];
        }

        // Trigger sound effect
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
        
        // Update the UI state based on prediction
        const cardEffect = predictCardEffect(
          intent.cardId, 
          intent.targetIndex, 
          {
            ...stateBeforeAnimations,
            enemyCurrentHealth: [...currentState.enemyHealth],
            enemyBlock: [...currentState.enemyBlock],
            currentHealth: currentState.heroHealth,
            currentBlock: currentState.heroBlock,
            currentMana: currentState.mana
          }
        );

        // Update cumulative state
        currentState.enemyHealth = cardEffect.enemyHealth;
        currentState.enemyBlock = cardEffect.enemyBlock;
        currentState.heroHealth = cardEffect.heroHealth;
        currentState.heroBlock = cardEffect.heroBlock;
        currentState.mana -= cardEffect.manaSpent;

        // Update UI
        setGameState((prev: GameState) => ({
          ...prev,
          currentHealth: currentState.heroHealth,
          currentBlock: currentState.heroBlock,
          enemyCurrentHealth: currentState.enemyHealth,
          enemyBlock: currentState.enemyBlock,
          currentMana: currentState.mana
        }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
        setCurrentAnimation(null);

        if (cardEffect.enemyDied) {
          soundEffectManager.playEventSound('enemyDeath');
        }
      }

      // Wait for transaction AND ensure latest state
      await transactionPromise;
      const latestState = await getLatestState();

      // Update with confirmed chain state
      setGameState(latestState);
      setOptimisticHand(latestState.hand || []);
      setOptimisticMana(latestState.currentMana || 0);
      setFrozenState(null);
      setCardIntents([]);
      setHasAutoEndedTurn(true);
      setOptimisticUpdatesEnabled(true);

      // Automatically end turn after committing cards
      handleEndTurn();

    } catch (error) {
      console.error('Failed to commit card intents:', error);
      setFrozenState(null);
      setCurrentAnimation(null);
      
      if (gameState) {
        setOptimisticHand(gameState.hand || []);
        setOptimisticMana(gameState.currentMana || 0);
      }
      setOptimisticUpdatesEnabled(true);
    } finally {
      setIsCommittingIntents(false);
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

  // Update handleEndTurn to handle state updates more carefully
  const handleEndTurn = async () => {
    if (!gameState) return;
    
    if (gameState.runState !== 2) {
      console.log('Not in combat state, not ending turn');
      return;
    }
    
    const allEnemiesDefeated = gameState.enemyCurrentHealth.every((health: number) => health <= 0);
    if (allEnemiesDefeated) {
      console.log('All enemies defeated, not ending turn');
      return;
    }

    try {
      // Start transition to enemy turn
      setTurnState('transitioning');
      setShowTurnBanner(true);
      setTurnBannerMessage("Enemy Turn");
      setTurnBannerType('enemy');
      
      // Start transaction and get final state
      const endTurnPromise = endTurnAction();
      
      // Show enemy turn banner
      await new Promise(resolve => setTimeout(resolve, 800));
      setTurnState('enemy');
      setFrozenState(gameState); // Freeze state during enemy turn

      // Wait for transaction to complete and get final state
      await endTurnPromise;
      const latestState = await getLatestState();
      if (!latestState) return;

      // Store initial state for animations
      const initialState = { ...gameState };

      // Process enemy intents one by one
      for (let i = 0; i < latestState.enemyTypes.length; i++) {
        if (latestState.enemyCurrentHealth[i] > 0 && latestState.enemyIntents[i]) {
          const levelConfig = getLevelConfig(latestState.currentFloor);
          
          // Play animation and sound first
          const animationState: AnimationState = {
            sourceType: 'enemy',
            sourceIndex: i,
            targetPosition: levelConfig.heroPosition,
            timestamp: Date.now(),
            animationType: 'slash'
          };

          setCurrentAnimation(animationState);
          setCurrentIntent(latestState.enemyIntents[i]);
          setSoundType('intent');
          setIsSoundPlaying(true);
          
          // Wait for animation
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // After animation, update state
          const damageToHero = latestState.enemyIntents[i];
          const newHealth = Math.max(0, initialState.currentHealth - damageToHero);
          
          setGameState((prev: GameState) => ({
            ...prev,
            currentHealth: newHealth
          }));
          
          // Reset animation and sound
          setCurrentAnimation(null);
          setIsSoundPlaying(false);
          
          // Small delay between enemy actions
          await new Promise(resolve => setTimeout(resolve, 200));
        }
      }
      
      // All animations complete, update with final state
      setGameState(latestState);
      setPreviousHealth(latestState.currentHealth);
      setPreviousBlock(latestState.currentBlock);
      setPreviousEnemyHealth(latestState.enemyCurrentHealth);
      setPreviousEnemyBlock(latestState.enemyBlock);
      
      // Show player turn transition
      setShowTurnBanner(false);
      await new Promise(resolve => setTimeout(resolve, 400));
      setTurnBannerMessage("Your Turn");
      setTurnBannerType('player');
      setShowTurnBanner(true);
      
      setTimeout(() => {
        setShowTurnBanner(false);
        setTurnState('player');
        setFrozenState(null); // Unfreeze state after enemy turn
        setOptimisticHand(latestState.hand || []);
        setOptimisticMana(latestState.currentMana || 0);
      }, 1000);
      
    } catch (error) {
      console.error('Failed to end turn:', error);
      
      setFrozenState(null);
      setCurrentAnimation(null);
      setShowTurnBanner(false);
      setTurnState('player');
      
      const newState = await getGameState();
      if (newState) {
        setGameState(newState);
        setOptimisticHand(newState.hand || []);
        setOptimisticMana(newState.currentMana || 0);
      }
    }
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
        intent={currentIntent}
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
                cardIntents={cardIntents}
              />
            </div>

            <div className="bottom-right">
            </div>
          </div>
        </div>

        {/* Move Intent component here, outside the game content */}
        {gameState && gameState.runState === 2 && (
          <Intent
            intents={cardIntents}
            onReorder={handleReorderIntents}
            onRemove={handleRemoveIntent}
            onClear={handleClearIntents}
            onCommit={handleCommitIntents}
            isCommitting={isCommittingIntents}
          />
        )}
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
    </>
  );
};

export default Game; 