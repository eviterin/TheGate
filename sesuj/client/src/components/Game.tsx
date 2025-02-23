import React, { useState, useEffect } from 'react';
import InfoBar from './InfoBar';
import Hand from './Hand';
import Card from './Card';
import GameEntity from './GameEntity';
import LoadingOverlay from './LoadingOverlay';
import { useStartRun, useAbandonRun, useGameState, useGameContract, useChooseRoom, usePlayCard, useEndTurn, useChooseCardReward, useRetryFromDeath, usePlayCards } from '../hooks/GameState';
import { useCards } from '../hooks/CardsContext';
import './Game.css';
import { getBackgroundImage } from '../game/encounters';
import { getLevelConfig } from '../game/levelConfigs';
import { Position } from '../game/encounters';
import { CardAnimationType } from '../game/cards';
import encountersData from '../../../shared/encounters.json';
import TurnBanner from './TurnBanner';
import Intent, { CardIntent } from './Intent';
import './Intent.css';

// Add InfoBar props interface
interface InfoBarProps {
  gameState: any;
}

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
    };
    ANIMATIONS: {
      ATTACK: string;
      BLOCK: string;
    };
  };
  encounters: any[]; // We don't need the full encounters type for this usage
}

// Get intent types from encounters.json with type assertion
const INTENT_TYPES = (encountersData as EncountersData).constants.INTENT_TYPES;

const TRANSACTION_TIMEOUT = 10000; // 10 seconds timeout for transactions

// Whale Room options
const WHALE_ROOM_OPTIONS = [
  { 
    id: 1, 
    title: '🎴 Card Master', 
    description: 'Begin each turn with an additional card in your hand.',
    effect: '3 → 4 cards per turn'
  },
  { 
    id: 2, 
    title: '✨ Divine Power', 
    description: 'Channel additional Faith into your actions.',
    effect: '3 → 4 ✨ per turn'
  },
  { 
    id: 3, 
    title: '🛡️ Divine Protection', 
    description: 'Begin each combat with a protective barrier.',
    effect: 'Start each turn with 5 🛡️'
  },
  { 
    id: 4, 
    title: '💪 Sacred Might', 
    description: 'Your body is strengthened by divine power.',
    effect: '21 → 36 ❤️'
  }
];

interface AnimationState {
  sourceType: 'hero' | 'enemy';
  sourceIndex: number;
  targetPosition: Position;
  timestamp: number;
  animationType?: CardAnimationType;
}

// Add helper to calculate damage after block
const calculateDamageAfterBlock = (damage: number, block: number): number => {
  const remainingDamage = Math.max(0, damage - block);
  return remainingDamage;
};

// Add this helper function near the top with other helpers
const calculateTotalManaCost = (intents: CardIntent[], cardData: Array<{ numericId: number; manaCost: number }>): number => {
  return intents.reduce((total, intent) => {
    const card = cardData.find(c => c.numericId === intent.cardId);
    return total + (card?.manaCost || 0);
  }, 0);
};

// Add AbandonConfirmation component near the top of the file
interface AbandonConfirmationProps {
  isOpen: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}

const AbandonConfirmation: React.FC<AbandonConfirmationProps> = ({ isOpen, onConfirm, onCancel, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="abandon-confirmation-overlay">
      <div className="abandon-confirmation-content">
        <h2>Abandon Run?</h2>
        <p>Are you sure you want to abandon your current run? This action cannot be undone.</p>
        <div className="abandon-confirmation-buttons">
          <button 
            className="confirm-button"
            onClick={onConfirm}
            disabled={isLoading}
          >
            {isLoading ? 'Abandoning...' : 'Yes, Abandon Run'}
          </button>
          <button 
            className="cancel-button"
            onClick={onCancel}
            disabled={isLoading}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
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
  const { playCard } = usePlayCard();
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
  const [autoEndTurnEnabled, setAutoEndTurnEnabled] = useState(true);
  const [hasAutoEndedTurn, setHasAutoEndedTurn] = useState(false);
  const { retryFromDeath } = useRetryFromDeath();
  const { abandonRun } = useAbandonRun();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoadingGameState, setIsLoadingGameState] = useState(true);
  const [isChoosingRoom, setIsChoosingRoom] = useState(false);
  const [isChoosingReward, setIsChoosingReward] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState | null>(null);
  const [animationsEnabled, setAnimationsEnabled] = useState(true);
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

  // Add helper to check if we can end turn
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
        
        // On error, always reset to actual state
        if (gameState) {
          setOptimisticHand(gameState.hand || []);
          setOptimisticMana(gameState.currentMana);
        }
      }
    };

    // Poll every 500ms
    fetchGameState();
    const interval = setInterval(fetchGameState, 500);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getGameState, gameState, optimisticUpdatesEnabled, frozenState, cardData.length, autoEndTurnEnabled, hasAutoEndedTurn]);

  // Update handleCardSelect to queue the card instead of playing it immediately
  const handleCardSelect = (cardIndex: number) => {
    setHasAutoEndedTurn(false);
    const cardId = optimisticHand[cardIndex];
    
    if (cardIndex === selectedCardIndex) {
      setSelectedCardIndex(null);
    } else {
      setSelectedCardIndex(cardIndex);
    }
  };

  // Update handleEntityClick to use cardData parameter
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

      // Freeze the current state for animations
      const stateBeforeAnimations = gameState;
      setFrozenState(stateBeforeAnimations);

      // Start animations immediately while transaction is processing
      const animationPromise = (async () => {
        for (let i = 0; i < cardIntents.length; i++) {
          const intent = cardIntents[i];
          const card = cardData.find(c => c.numericId === intent.cardId);
          if (!card) continue;

          const levelConfig = getLevelConfig(stateBeforeAnimations.currentFloor);
          const targetPos = levelConfig.enemyPositions[intent.targetIndex];

          const animationState: AnimationState = {
            sourceType: 'hero',
            sourceIndex: 0,
            targetPosition: targetPos,
            timestamp: Date.now(),
            animationType: card.animationType
          };

          // If not the first animation, add small delay
          if (i > 0) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }

          // Show and wait for this animation
          setCurrentAnimation(animationState);
          await new Promise(resolve => setTimeout(resolve, 600));
          setCurrentAnimation(null);
        }
      })();

      // Submit transaction in parallel with animations
      const transactionPromise = playCards(plays);

      // Wait for both animations and transaction to complete
      await Promise.all([animationPromise, transactionPromise]);

      // Add a small delay to ensure chain state is updated
      await new Promise(resolve => setTimeout(resolve, 200));

      // Clear frozen state and update with new state
      setFrozenState(null);
      const newState = await getGameState();
      if (newState) {
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
      setGameState(stateBeforeEnemyTurn);

      // Show enemy turn banner with initial delay
      setTurnState('transitioning');
      setTurnBannerMessage("Enemy Turn");
      setTurnBannerType('enemy');
      setShowTurnBanner(true);
      
      // Now call end turn after freezing state
      await endTurnAction();
      
      // Wait shorter for banner animation and transition feel
      await new Promise(resolve => setTimeout(resolve, 800));
      setTurnState('enemy');

      // Add shorter delay before enemies start acting
      await new Promise(resolve => setTimeout(resolve, 400));

      // Animate enemy actions with delays
      if (animationsEnabled && stateBeforeEnemyTurn) {
        for (let i = 0; i < stateBeforeEnemyTurn.enemyTypes.length; i++) {
          if (stateBeforeEnemyTurn.enemyCurrentHealth[i] > 0) {
            const intent = stateBeforeEnemyTurn.enemyIntents[i];
            const levelConfig = getLevelConfig(stateBeforeEnemyTurn.currentFloor);
            const targetPos = levelConfig.heroPosition;

            // Create animation state for this enemy
            const animationState: AnimationState = {
              sourceType: 'enemy',
              sourceIndex: i,
              targetPosition: targetPos,
              timestamp: Date.now()
            };

            // Add shorter delay before each enemy acts
            await new Promise(resolve => setTimeout(resolve, 400));
            
            setCurrentAnimation(animationState);
            
            // Keep animation duration the same
            await new Promise(resolve => setTimeout(resolve, 600));
            setCurrentAnimation(null);
          }
        }

        // Add shorter delay after enemies finish
        await new Promise(resolve => setTimeout(resolve, 400));
        
        // Hide enemy turn banner
        setShowTurnBanner(false);
        
        // Add shorter delay before player turn
        await new Promise(resolve => setTimeout(resolve, 400));

        // Clear frozen state and force multiple state refreshes to ensure we have latest state
        setFrozenState(null);
        let newState = await getGameState();
        
        // Add a small delay and try to get state again to ensure chain has processed everything
        await new Promise(resolve => setTimeout(resolve, 200));
        newState = await getGameState();
        
        if (newState) {
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
      } else {
        // If animations are disabled, just force a state refresh
        setFrozenState(null);
        let newState = await getGameState();
        
        // Add a small delay and try to get state again to ensure chain has processed everything
        await new Promise(resolve => setTimeout(resolve, 200));
        newState = await getGameState();
        
        if (newState) {
          setGameState(newState);
          setOptimisticHand(newState.hand || []);
          setOptimisticMana(newState.currentMana || 0);
        }
        setTurnState('player');
      }
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
      await retryFromDeath();
      
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

  // Add handler for gate click
  const handleGateClick = () => {
    setIsGateOpen(true);
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
      <style>
        {`
          .game-wrapper {
            width: 100vw;
            height: 100vh;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            background: linear-gradient(180deg, #2b2838 0%, #1f1c2c 100%);
          }

          .game-container {
            flex: 1;
            display: flex;
            flex-direction: column;
            min-height: 0;
          }

          .game-content {
            flex: 1;
            position: relative;
            background-size: cover;
            background-position: center;
            height: min(calc(100vh - 250px), calc((100vw / 2)));
            width: min(100vw, calc((100vh - 250px) * 2));
            margin: 0 auto;
            box-shadow: 0 0 30px rgba(89, 86, 108, 0.3);
            border-radius: 8px;
            transition: filter 0.5s ease-out;
          }

          .bottom-area {
            padding: 20px;
            background: linear-gradient(0deg, #1f1c2c 0%, #2b2838 100%);
          }

          .side-decorations {
            position: absolute;
            top: 0;
            bottom: 0;
            width: max(calc((100vw - min(100vw, calc((100vh - 250px) * 2))) / 2), 20px);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
          }

          .side-decorations.left {
            left: 0;
            background: linear-gradient(90deg, #1f1c2c 0%, rgba(43, 40, 56, 0.8) 100%);
          }

          .side-decorations.right {
            right: 0;
            background: linear-gradient(90deg, rgba(43, 40, 56, 0.8) 0%, #1f1c2c 100%);
          }

          .menu-button {
            background: rgba(89, 86, 108, 0.15);
            border: 1px solid rgba(89, 86, 108, 0.3);
            backdrop-filter: blur(5px);
          }

          .menu-button:hover {
            background: rgba(89, 86, 108, 0.25);
            border-color: rgba(89, 86, 108, 0.5);
          }

          .feature-toggles {
            display: flex;
            flex-direction: column;
            gap: 8px;
            margin-top: 8px;
          }

          .feature-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            color: white;
            font-size: 14px;
            cursor: pointer;
            padding: 4px 8px;
            border-radius: 4px;
            background: rgba(255, 255, 255, 0.1);
          }
          
          .feature-toggle input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
          }

          .feature-toggle:hover {
            background: rgba(255, 255, 255, 0.15);
          }

          .whale-room-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .whale-room-overlay.gate-open {
            background: rgba(0, 0, 0, 0.85);
          }

          .whale-room-content {
            background: linear-gradient(135deg, #2a2a2a 0%, #1a1a1a 100%);
            border-radius: 12px;
            padding: 24px;
            max-width: 800px;
            width: 90%;
            box-shadow: 0 0 20px rgba(255, 215, 0, 0.1);
            border: 1px solid rgba(255, 215, 0, 0.2);
          }

          .whale-room-title {
            color: #ffd700;
            text-align: center;
            margin-bottom: 24px;
            font-size: 28px;
            text-shadow: 0 0 10px rgba(255, 215, 0, 0.3);
            letter-spacing: 1px;
          }

          .whale-room-options {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 16px;
            max-width: 700px;
            margin: 0 auto;
          }

          .whale-room-option {
            background: linear-gradient(135deg, #3a3a3a 0%, #2a2a2a 100%);
            border: 1px solid #4a4a4a;
            border-radius: 8px;
            padding: 16px;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
          }

          .whale-room-option:hover {
            transform: translateY(-2px);
            border-color: #ffd700;
            box-shadow: 0 0 15px rgba(255, 215, 0, 0.2);
          }

          .whale-room-option:before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, rgba(255, 215, 0, 0.2), transparent);
          }

          .whale-room-option h3 {
            color: #ffd700;
            margin: 0 0 8px 0;
            font-size: 18px;
            display: flex;
            align-items: center;
            gap: 8px;
          }

          .whale-room-option .description {
            color: #cccccc;
            margin: 0 0 12px 0;
            font-size: 14px;
            line-height: 1.4;
          }

          .whale-room-option .effect {
            display: inline-block;
            background: rgba(255, 215, 0, 0.1);
            color: #ffd700;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
          }

          .death-screen-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.9);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
          }

          .death-screen-content {
            background: #2a2a2a;
            border-radius: 8px;
            padding: 32px;
            max-width: 400px;
            width: 90%;
            text-align: center;
          }

          .death-screen-title {
            color: #ff4444;
            font-size: 32px;
            margin-bottom: 16px;
          }

          .death-screen-message {
            color: #cccccc;
            font-size: 18px;
            margin-bottom: 24px;
          }

          .death-screen-buttons {
            display: flex;
            gap: 16px;
            justify-content: center;
          }

          .retry-button {
            background: #4a4;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s;
          }

          .retry-button:hover {
            background: #5b5;
            transform: translateY(-2px);
          }

          .abandon-button {
            background: #a44;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 16px;
            transition: all 0.2s;
          }

          .abandon-button:hover {
            background: #b55;
            transform: translateY(-2px);
          }

          .reward-card-container {
            cursor: pointer;
            transition: all 0.2s ease;
            position: relative;
            border: 2px solid transparent;
            border-radius: 12px;
            padding: 4px;
            transform: scale(0.9);
          }

          .reward-card-container:hover:not(.disabled) {
            transform: scale(0.95) translateY(-5px);
          }

          .reward-card-container.selected:not(.disabled) {
            border-color: #4CAF50;
            background: rgba(76, 175, 80, 0.1);
            transform: scale(0.95) translateY(-5px);
          }

          .reward-card-container.disabled {
            cursor: not-allowed;
            opacity: 0.7;
          }

          .reward-buttons {
            display: flex;
            gap: 1rem;
            justify-content: center;
          }

          .skip-reward-button {
            background: rgba(220, 53, 69, 0.8);
            border-color: rgba(220, 53, 69, 0.3);
          }

          .skip-reward-button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
          }

          .continue-button {
            background: rgba(40, 167, 69, 0.8);
            border-color: rgba(40, 167, 69, 0.3);
          }

          .continue-button.disabled {
            background: rgba(108, 117, 125, 0.8);
            border-color: rgba(108, 117, 125, 0.3);
            cursor: not-allowed;
            opacity: 0.7;
          }

          .whale-room-gate {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            padding: 1.5rem 2rem;
            width: 200px;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid #ffd700;
            border-radius: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            z-index: 10;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
          }

          .whale-room-gate:hover {
            background: rgba(0, 0, 0, 0.8);
            box-shadow: 0 0 30px rgba(255, 215, 0, 0.3);
            transform: translate(-50%, -50%) scale(1.05);
          }

          .whale-room-gate-text {
            color: #ffd700;
            font-size: 24px;
            font-weight: bold;
            text-align: center;
            text-transform: uppercase;
            letter-spacing: 2px;
            white-space: nowrap;
          }

          .resource-bars {
            position: fixed;
            top: 20px;
            left: 20px;
            display: flex;
            flex-direction: column;
            gap: 8px;
            width: 180px;
            z-index: 100;
          }

          .mana-display {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 4px;
            width: fit-content;
            padding: 8px;
            margin-bottom: 10px;
            background: rgba(89, 86, 108, 0.15);
            border: 1px solid rgba(89, 86, 108, 0.3);
            border-radius: 8px;
            backdrop-filter: blur(5px);
          }

          .mana-icon {
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: radial-gradient(circle at center,
              rgba(88, 43, 156, 0.9) 0%,
              rgba(45, 13, 99, 0.9) 60%,
              rgba(31, 9, 67, 0.9) 100%
            );
            border-radius: 50%;
            box-shadow: 0 0 10px rgba(255, 215, 0, 0.4);
            border: 1px solid rgba(88, 43, 156, 0.8);
            position: relative;
          }

          .mana-icon::after {
            content: '✨';
            position: absolute;
            font-size: 16px;
            color: #FFD700;
            filter: drop-shadow(0 0 3px rgba(255, 215, 0, 0.6));
          }

          .mana-icon.depleted {
            background: radial-gradient(circle at center,
              #666 0%,
              #444 60%,
              #333 100%
            );
            box-shadow: none;
            border-color: #555;
          }

          .mana-icon.depleted::after {
            color: #999;
            filter: none;
          }

          }

          .game-entity.animating {
            z-index: 100;
          }

          .abandon-confirmation-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 1100;
          }

          .abandon-confirmation-content {
            background: #2a2a2a;
            border-radius: 8px;
            padding: 24px;
            max-width: 400px;
            width: 90%;
            text-align: center;
          }

          .abandon-confirmation-content h2 {
            color: #ff4444;
            margin-bottom: 16px;
          }

          .abandon-confirmation-content p {
            color: #cccccc;
            margin-bottom: 24px;
            line-height: 1.5;
          }

          .abandon-confirmation-buttons {
            display: flex;
            gap: 16px;
            justify-content: center;
          }

          .confirm-button {
            background: #a44;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .confirm-button:hover:not(:disabled) {
            background: #b55;
          }

          .confirm-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }

          .cancel-button {
            background: #666;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.2s;
          }

          .cancel-button:hover:not(:disabled) {
            background: #777;
          }

          .cancel-button:disabled {
            opacity: 0.7;
            cursor: not-allowed;
          }
        `}
      </style>
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
              <div className="reward-overlay">
                <div className="reward-content">
                  <h2>Choose Your Reward</h2>
                  <div className="reward-cards">
                    {cardData
                      .filter(card => gameState.availableCardRewards.includes(card.numericId))
                      .map(card => (
                        <div
                          key={card.numericId}
                          className={`reward-card-container ${selectedReward === card.numericId ? 'selected' : ''} ${isChoosingReward ? 'disabled' : ''}`}
                          onClick={() => !isChoosingReward && handleSelectReward(card.numericId)}
                        >
                          <Card {...card} />
                        </div>
                      ))}
                  </div>
                  <div className="reward-buttons">
                    <button
                      className={`continue-button ${!selectedReward || isChoosingReward ? 'disabled' : ''}`}
                      onClick={handleConfirmReward}
                      disabled={!selectedReward || isChoosingReward}
                    >
                      {isChoosingReward ? 'Adding...' : 'Add to Deck'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Whale Room Overlay */}
            {gameState?.runState === 1 && (
              <div className={`whale-room-overlay ${isGateOpen ? 'gate-open' : ''}`}>
                {!isGateOpen ? (
                  <div className="whale-room-gate" onClick={handleGateClick}>
                    <div className="whale-room-gate-text">
                      Enter The Gate
                    </div>
                  </div>
                ) : (
                  <div className="whale-room-content">
                    <h2 className="whale-room-title">Choose a Divine Blessing</h2>
                    <div className="whale-room-options">
                      {WHALE_ROOM_OPTIONS.map(option => (
                        <div
                          key={option.id}
                          className={`whale-room-option ${isChoosingRoom ? 'disabled' : ''}`}
                          onClick={() => !isChoosingRoom && handleWhaleRoomChoice(option.id)}
                          style={{ 
                            cursor: isChoosingRoom ? 'not-allowed' : 'pointer',
                            opacity: isChoosingRoom ? 0.7 : 1,
                            position: 'relative'
                          }}
                        >
                          <h3>{option.title}</h3>
                          <p className="description">{option.description}</p>
                          <span className="effect">{option.effect}</span>
                          {isChoosingRoom && (
                            <div style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              background: 'rgba(0, 0, 0, 0.5)',
                              borderRadius: '12px'
                            }}>
                              <span style={{ color: '#ffd700' }}>Receiving blessing...</span>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Death Screen Overlay */}
            {gameState?.runState === 4 && (
              <div className="death-screen-overlay">
                <div className="death-screen-content">
                  <h2 className="death-screen-title">You Died</h2>
                  <p className="death-screen-message">
                    Your journey has come to an end. Would you like to try again?
                  </p>
                  <div className="death-screen-buttons">
                    <button 
                      className="retry-button" 
                      onClick={handleRetry}
                      disabled={isRetrying}
                    >
                      {isRetrying ? 'Retrying...' : 'Try Again'}
                    </button>
                    <button 
                      className="abandon-button" 
                      onClick={() => setShowAbandonConfirmation(true)}
                      disabled={isRetrying}
                    >
                      Abandon Run
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Victory Screen Overlay */}
            {gameState?.runState === 0 && gameState?.currentFloor === 11 && (
              <div className="death-screen-overlay victory">
                <div className="death-screen-content">
                  <h2 className="death-screen-title" style={{ color: '#ffd700' }}>Victory</h2>
                  <p className="death-screen-message" style={{ fontSize: '20px', lineHeight: '1.6' }}>
                    Your triumph echoes through the divine realms. Your name shall be forever etched in the sacred scrolls, a testament to your unwavering faith and courage.
                  </p>
                  <div className="death-screen-buttons">
                    <button 
                      className="abandon-button"
                      onClick={handleBackToMenu}
                      style={{
                        background: 'linear-gradient(135deg, #ffd700 0%, #b8860b 100%)',
                        color: '#000'
                      }}
                    >
                      Return to the Mortal Realm
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="bottom-area">
            <div className="bottom-left">
              {/* Only show mana and pile buttons when not in whale room */}
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
                  
                  <div className="mana-display">
                    {[...Array(gameState?.maxMana ?? 0)].map((_, i) => (
                      <div 
                        key={i} 
                        className={`mana-icon ${i >= (optimisticMana ?? gameState?.currentMana ?? 0) ? 'depleted' : ''}`}
                      />
                    ))}
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

      {/* Add deck viewer overlays */}
      {isDeckVisible && (
        <div className="deck-viewer">
          <h3>Deck ({deck.length} cards)</h3>
          <div className="deck-cards">
            {deck.map((cardId, index) => {
              const card = cardData.find(c => c.numericId === cardId);
              return card ? (
                <Card key={`deck-${cardId}-${index}`} {...card} />
              ) : null;
            })}
          </div>
        </div>
      )}

      {isDiscardVisible && (
        <div className="deck-viewer">
          <h3>Discard Pile ({discard.length} cards)</h3>
          <div className="deck-cards">
            {discard.map((cardId, index) => {
              const card = cardData.find(c => c.numericId === cardId);
              return card ? (
                <Card key={`discard-${cardId}-${index}`} {...card} />
              ) : null;
            })}
          </div>
        </div>
      )}

      {isDrawVisible && (
        <div className="deck-viewer">
          <h3>Draw Pile ({draw.length} cards)</h3>
          <p style={{ color: '#999', fontSize: '14px', marginBottom: '12px', textAlign: 'center' }}>Note: Cards shown here may not be in their actual draw order</p>
          <div className="deck-cards">
            {draw.map((cardId, index) => {
              const card = cardData.find(c => c.numericId === cardId);
              return card ? (
                <Card key={`draw-${cardId}-${index}`} {...card} />
              ) : null;
            })}
          </div>
        </div>
      )}

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