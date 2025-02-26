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
import Intent, { CardIntent } from './Intent';
import './Intent.css';
import { predictCardEffect } from '../game/damageUtils';
import { predictEnemyTurn } from '../game/enemyTurnUtils';
import AbandonConfirmation from './AbandonConfirmation';
import FloatingMana from './FloatingMana';
import WhaleRoom from './WhaleRoom';
import GameOver from './GameOver';
import RewardSelection from './RewardSelection';
import CardPileViewer from './CardPileViewer';


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

  // Fetch card data
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

  // Continuously update game state
  useEffect(() => {
    let mounted = true;
    
    const fetchGameState = async () => {
      try {
        if (frozenState) return;

        const state = await getGameState();
        if (!mounted) return;
        
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
            (!hasPlayableCards || state?.currentMana === 0 || !state?.hand?.length)) {
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
        
        // On error, always fall back to actual state (chain state)
        if (gameState) {
          setOptimisticHand(gameState.hand || []);
          setOptimisticMana(gameState.currentMana);
        }
      }
    };

    fetchGameState();
    const interval = setInterval(fetchGameState, 500);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getGameState, gameState, optimisticUpdatesEnabled, frozenState, cardData.length, autoEndTurnEnabled, hasAutoEndedTurn]);

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
      // Maybe show a warning to the user
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

  const handleCommitIntents = async () => {
    if (cardIntents.length === 0 || isCommittingIntents) return;

    try {
      setIsCommittingIntents(true);
      setOptimisticUpdatesEnabled(false);  // Disable optimistic updates during commit

      // Capture state before any changes for animations
      const stateBeforeAnimations = { ...gameState };
      setFrozenState(stateBeforeAnimations);

      // Calculate correct indices based on the hand state when each card will be played
      const plays = cardIntents.map((intent) => {
        // Find how many cards before this one had lower indices
        const cardsPlayedBefore = cardIntents
          .slice(0, cardIntents.indexOf(intent))
          .filter(prev => prev.cardIndex < intent.cardIndex)
          .length;
        
        return {
          cardIndex: intent.cardIndex - cardsPlayedBefore,
          targetIndex: intent.targetIndex
        };
      });
      
      // Submit transaction in parallel with animations
      const transactionPromise = playCards(plays);

      // Track cumulative state that we'll update incrementally
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
       
        // Create a temporary state that represents the game state after all previous cards
        const tempState = {
          ...stateBeforeAnimations,
          enemyCurrentHealth: [...currentState.enemyHealth],
          enemyBlock: [...currentState.enemyBlock],
          currentHealth: currentState.heroHealth,
          currentBlock: currentState.heroBlock,
          currentMana: currentState.mana
        };
        
        // Predict just this card's effect
        const cardEffect = predictCardEffect(
          intent.cardId, 
          intent.targetIndex, 
          tempState
        );

        // If not the first card, add small delay between cards
        if (i > 0) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }

        // Animate this card's effect
        const levelConfig = getLevelConfig(stateBeforeAnimations.currentFloor);
        
        // Determine target position based on whether the card targets the hero or an enemy
        const isTargetingHero = !card.targeted;
        let targetPosition: Position;
        
        if (isTargetingHero) {
          targetPosition = levelConfig.heroPosition;
        } else {
          targetPosition = levelConfig.enemyPositions[intent.targetIndex];
        }

        const animationState: AnimationState = {
          sourceType: 'hero',
          sourceIndex: 0,
          targetPosition: targetPosition,
          timestamp: Date.now(),
          animationType: card.animationType
        };

        // Show animation
        setCurrentAnimation(animationState);
        
        // Wait for animation to complete (most of the way)
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Now update the UI state based on this card's effect
        // Update the cumulative state with this card's effects
        currentState.enemyHealth = cardEffect.enemyHealth;
        currentState.enemyBlock = cardEffect.enemyBlock;
        currentState.heroHealth = cardEffect.heroHealth;
        currentState.heroBlock = cardEffect.heroBlock;
        currentState.mana -= cardEffect.manaSpent;

        // Update UI with this card's effect after animation is mostly done
        setGameState((prevState: any) => ({
          ...prevState,
          currentHealth: currentState.heroHealth,
          currentBlock: currentState.heroBlock,
          enemyCurrentHealth: currentState.enemyHealth,
          enemyBlock: currentState.enemyBlock,
          currentMana: currentState.mana
        }));
        
        // Complete animation
        await new Promise(resolve => setTimeout(resolve, 100));
        setCurrentAnimation(null);
      }

      // Wait for transaction to complete
      await transactionPromise;

      // Add a small delay to ensure chain state is updated
      await new Promise(resolve => setTimeout(resolve, 200));

      // Clear frozen state and synchronize with blockchain state
      setFrozenState(null);
      const newState = await getGameState();
      if (newState) {
        // If there's a discrepancy between predicted state and actual blockchain state,
        // always use the blockchain state as source of truth
        setGameState(newState);
        setOptimisticHand(newState.hand || []);
        setOptimisticMana(newState.currentMana || 0);
      }

      // Clear intents after everything is done
      setCardIntents([]);

      // Set hasAutoEndedTurn to true to prevent double end turn
      setHasAutoEndedTurn(true);
      
      // Re-enable optimistic updates
      setOptimisticUpdatesEnabled(true);
      
      // Automatically end turn after committing cards
      handleEndTurn();

    } catch (error) {
      console.error('Failed to commit card intents:', error);
      setFrozenState(null);
      setCurrentAnimation(null);
      
      // On error, restore the original state
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

  // Update handleEndTurn to check for intents
  const handleEndTurn = async () => {
    if (!canEndTurn()) return;

    try {
      // Freeze the state BEFORE ending turn
      const stateBeforeEnemyTurn = await getGameState();
      if (!stateBeforeEnemyTurn) return;
      
      // Freeze the state for the enemy turn
      setFrozenState(stateBeforeEnemyTurn);
      
      // Show enemy turn banner
      setTurnState('transitioning');
      setTurnBannerMessage("Enemy Turn");
      setTurnBannerType('enemy');
      setShowTurnBanner(true);
      
      // Apply client-side predictions for enemy turn
      const enemyTurnPrediction = predictEnemyTurn(stateBeforeEnemyTurn);
      
      // Start blockchain transaction immediately
      const txPromise = endTurnAction();
      
      // Wait shorter for banner animation and transition feel
      await new Promise(resolve => setTimeout(resolve, 800));
      setTurnState('enemy');

      // Add shorter delay before enemies start acting
      await new Promise(resolve => setTimeout(resolve, 400));

      // Track current state that we'll update with each enemy action
      let currentState = {
        enemyHealth: [...stateBeforeEnemyTurn.enemyCurrentHealth],
        enemyBlock: [...stateBeforeEnemyTurn.enemyBlock],
        heroHealth: stateBeforeEnemyTurn.currentHealth,
        heroBlock: stateBeforeEnemyTurn.currentBlock
      };

      // Animate enemy actions with delays and incremental updates
      if (animationsEnabled) {
        for (let i = 0; i < enemyTurnPrediction.animations.length; i++) {
          const animation = enemyTurnPrediction.animations[i];
          if (stateBeforeEnemyTurn.enemyCurrentHealth[animation.enemyIndex] <= 0) continue;
          
          const levelConfig = getLevelConfig(stateBeforeEnemyTurn.currentFloor);
          const targetPos = levelConfig.heroPosition;

          // Add shorter delay before each enemy acts
          await new Promise(resolve => setTimeout(resolve, 400));
          
          // Create animation state for this enemy
          const animationState: AnimationState = {
            sourceType: 'enemy',
            sourceIndex: animation.enemyIndex,
            targetPosition: targetPos,
            timestamp: Date.now(),
            animationType: animation.intent < 1000 ? 'slash' : 
                          animation.intent === 1000 ? 'float' : 
                          animation.intent === 1002 || animation.intent === 1005 ? 'pulse' :
                          animation.intent === 1003 ? 'pulse' : 'slash'
          };
          
          // Start animation
          setCurrentAnimation(animationState);
          
          // Wait for most of the animation to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Update state for this enemy's action
          currentState.enemyHealth[animation.enemyIndex] = enemyTurnPrediction.newEnemyHealth[animation.enemyIndex];
          currentState.enemyBlock[animation.enemyIndex] = enemyTurnPrediction.newEnemyBlock[animation.enemyIndex];
          
          // If this enemy deals damage, apply it to hero
          if (animation.damageToHero > 0) {
            currentState.heroHealth = enemyTurnPrediction.newHeroHealth;
            currentState.heroBlock = enemyTurnPrediction.newHeroBlock;
          }
          
          // Update UI with this incremental change after animation is mostly done
          setGameState((prevState: any) => ({
            ...prevState,
            currentHealth: currentState.heroHealth,
            currentBlock: currentState.heroBlock,
            enemyCurrentHealth: currentState.enemyHealth,
            enemyBlock: currentState.enemyBlock
          }));
          
          // Finish animation
          await new Promise(resolve => setTimeout(resolve, 100));
          setCurrentAnimation(null);
        }

        // Add shorter delay after enemies finish
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Hide enemy turn banner
        setShowTurnBanner(false);
        
        // Add shorter delay before player turn
        await new Promise(resolve => setTimeout(resolve, 400));
      }
      
      // Wait for transaction to complete
      await txPromise;

      // Clear frozen state and force multiple state refreshes to ensure we have latest state
      setFrozenState(null);
      let newState = await getGameState();
      
      // Add a small delay and try to get state again to ensure chain has processed everything
      await new Promise(resolve => setTimeout(resolve, 200));
      newState = await getGameState();
      
      if (newState) {
        // Synchronize with blockchain state (source of truth)
        setGameState(newState);
        setPreviousHealth(newState.currentHealth);
        setPreviousBlock(newState.currentBlock);
        setPreviousEnemyHealth(newState.enemyCurrentHealth);
        setPreviousEnemyBlock(newState.enemyBlock);
        setOptimisticHand(newState.hand || []);
        setOptimisticMana(newState.currentMana || 0);
      }

      setTurnBannerMessage("Your Turn");
      setTurnBannerType('player');
      setShowTurnBanner(true);
      
      // Keep player turn banner visible shorter
      setTimeout(() => {
        setShowTurnBanner(false);
        setTurnState('player');
      }, 1000);
      
    } catch (error) {
      console.error('Failed to end turn:', error);
      
      // On error, clear frozen state and animations
      setFrozenState(null);
      setCurrentAnimation(null);
      setShowTurnBanner(false);
      setTurnState('player');
      
      // Try to get fresh state
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
    // Don't set isChoosingRoom to false here - let the game state update handle that
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
              {/* Only show pile buttons when not in whale room */}
              {(!gameState || gameState.runState !== 1) && (
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
            </div>

            <div className="bottom-center">
              <Hand 
                cards={optimisticHand}
                onCardSelect={handleCardSelect}
                selectedCardIndex={selectedCardIndex}
                cardData={cardData}
                currentMana={optimisticMana ?? (gameState?.currentMana || 0)}
                isVisible={isHandVisible}
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