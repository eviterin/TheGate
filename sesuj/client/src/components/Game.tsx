import React, { useState, useEffect } from 'react';
import InfoBar from './InfoBar';
import Hand from './Hand';
import Card from './Card';
import GameEntity from './GameEntity';
import PendingActions, { PendingAction } from './PendingActions';
import LoadingOverlay from './LoadingOverlay';
import { useStartRun, useAbandonRun, useGameState, useGameContract, useChooseRoom, usePlayCard, useEndTurn, useChooseCardReward, useSkipCardReward, useRetryFromDeath } from '../hooks/GameState';
import { useCards } from '../hooks/CardsContext';
import './Game.css';
import { getBackgroundImage } from '../game/encounters';
import { getLevelConfig } from '../game/levelConfigs';
import { Position } from '../game/encounters';
import { CardAnimationType } from '../game/cards';
import encountersData from '../../../shared/encounters.json';
import TurnBanner from './TurnBanner';

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
    description: 'Channel additional Faith energy into your actions.',
    effect: '+1 Faith per turn'
  },
  { 
    id: 3, 
    title: '🛡️ Divine Protection', 
    description: 'Begin each combat with a protective barrier.',
    effect: 'Start with 5 Block'
  },
  { 
    id: 4, 
    title: '💪 Sacred Might', 
    description: 'Your body is strengthened by divine power.',
    effect: '+5 Max HP'
  }
];

interface AnimationState {
  sourceType: 'hero' | 'enemy';
  sourceIndex: number;
  targetPosition: Position;
  timestamp: number;
}

// Add helper to calculate damage after block
const calculateDamageAfterBlock = (damage: number, block: number): number => {
  const remainingDamage = Math.max(0, damage - block);
  return remainingDamage;
};

const Game: React.FC = () => {
  const [hand, setHand] = useState<number[]>([]);
  const [deck, setDeck] = useState<number[]>([]);
  const [draw, setDraw] = useState<number[]>([]);
  const [discard, setDiscard] = useState<number[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isHandVisible, setIsHandVisible] = useState(true);
  const [isGateOpen, setIsGateOpen] = useState(false);
  const { getGameState } = useGameState();
  const { playCard } = usePlayCard();
  const { endTurn: endTurnAction } = useEndTurn();
  const { getActiveCards } = useCards();
  const [cardData, setCardData] = useState<any[]>([]);
  const [isDeckVisible, setIsDeckVisible] = useState(false);
  const [isDiscardVisible, setIsDiscardVisible] = useState(false);
  const [isDrawVisible, setIsDrawVisible] = useState(false);
  const { chooseCardReward } = useChooseCardReward();
  const { skipCardReward } = useSkipCardReward();
  const { chooseRoom } = useChooseRoom();
  const [selectedReward, setSelectedReward] = useState<number | null>(null);
  const [pendingActions, setPendingActions] = useState<PendingAction[]>([]);
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

  // Add helper function to check for pending end turn
  const hasPendingEndTurn = () => {
    return pendingActions.some(action => 
      action.type === 'endTurn' && action.status === 'pending'
    );
  };

  // Continuously update game state
  useEffect(() => {
    let mounted = true;
    
    const fetchGameState = async () => {
      try {
        const state = await getGameState();
        if (!mounted) return;
        
        // Store previous values before updating state
        if (gameState) {
          setPreviousHealth(gameState.currentHealth);
          setPreviousBlock(gameState.currentBlock);
          setPreviousEnemyHealth(gameState.enemyCurrentHealth);
          setPreviousEnemyBlock(gameState.enemyBlock);
        }
        
        setGameState(state);
        setIsLoadingGameState(false);
        
        // Reset auto end turn flag when:
        // 1. Game state changes significantly (different floor or run state)
        // 2. Coming back from menu (state becomes available)
        if (!gameState || !state || 
            state.currentFloor !== gameState.currentFloor || 
            state.runState !== gameState.runState) {
          setHasAutoEndedTurn(false);
        }
        
        // Auto end turn if enabled and either no mana or no playable cards
        const hasPlayableCards = cardData.length > 0 && state?.hand?.some(cardId => {
          const card = cardData.find(c => c.numericId === cardId);
          return card && card.manaCost <= (state.currentMana || 0);
        });

        // Only auto end turn if we're in combat (runState === 2) and have card data loaded
        const isInCombat = state?.runState === 2;
        if (autoEndTurnEnabled && 
            isInCombat && 
            cardData.length > 0 &&  // Make sure we have card data loaded
            !hasAutoEndedTurn && 
            !hasPendingEndTurn() && 
            (!hasPlayableCards || state?.currentMana === 0 || !state?.hand?.length)) {
          setHasAutoEndedTurn(true);
          handleEndTurn();
        }

        // Reset the flag if we have mana and playable cards again, but only in combat
        if (isInCombat && state?.currentMana && state.currentMana > 0) {
          const canPlaySomething = state.hand?.some(cardId => {
            const card = cardData.find(c => c.numericId === cardId);
            return card && card.manaCost <= state.currentMana;
          });
          if (canPlaySomething) {
            setHasAutoEndedTurn(false);
          }
        }

        // Update deck, discard, and draw piles
        setDeck(state?.deck || []);
        setDiscard(state?.discard || []);
        setDraw(state?.draw || []);
        
        // Clear pending actions when entering reward state (level complete)
        if (state?.runState === 3) { // RUN_STATE_CARD_REWARD
          setPendingActions([]);
        }
        
        // Always sync state if optimistic updates are disabled
        if (!optimisticUpdatesEnabled || pendingActions.length === 0) {
          setOptimisticHand(state?.hand || []);
          setOptimisticMana(state?.currentMana || 0);
        }
        
        // Only process pending actions if optimistic updates are enabled
        if (optimisticUpdatesEnabled && state && pendingActions.length > 0) {
          const currentTime = Date.now();
          const updatedActions = pendingActions.map(action => {
            if (action.status === 'pending') {
              // Check for timeout
              if (currentTime - action.timestamp > TRANSACTION_TIMEOUT) {
                return { ...action, status: 'failed' as const };
              }

              // For play card actions, check if the card is no longer in hand
              if (action.type === 'playCard' && action.cardId) {
                const cardStillInHand = state.hand.includes(action.cardId);
                if (!cardStillInHand) {
                  return { ...action, status: 'completed' as const };
                }
              }
              // For end turn, check if we got new cards
              else if (action.type === 'endTurn') {
                const gotNewCards = state.hand.length > 0;
                if (gotNewCards) {
                  return { ...action, status: 'completed' as const };
                }
              }
              // For reward actions, check if we're no longer in reward state
              else if ((action.type === 'chooseReward' || action.type === 'skipReward') && state.runState !== 3) {
                return { ...action, status: 'completed' as const };
              }
            }
            return action;
          });

          // Handle completed and failed actions
          const completedActions = updatedActions.filter(a => a.status === 'completed');
          const failedActions = updatedActions.filter(a => a.status === 'failed');

          if (completedActions.length > 0 || failedActions.length > 0) {
            // Sync state immediately for failed actions
            if (failedActions.length > 0) {
              setOptimisticHand(state.hand || []);
              setOptimisticMana(state.currentMana);
            }

            // Remove both completed and failed actions immediately
            setPendingActions(prev => 
              prev.filter(a => 
                !completedActions.find(ca => ca.id === a.id) && 
                !failedActions.find(fa => fa.id === a.id)
              )
            );
          } else {
            setPendingActions(updatedActions);
          }
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
        setIsLoadingGameState(false);
        
        // On error, always reset to actual state
        if (gameState) {
          setOptimisticHand(gameState.hand || []);
          setOptimisticMana(gameState.currentMana);
        }
        
        // Only process pending actions if optimistic updates are enabled
        if (optimisticUpdatesEnabled && pendingActions.some(a => a.status === 'pending')) {
          setPendingActions(prev => 
            prev.map(a => 
              a.status === 'pending' ? { ...a, status: 'failed' as const } : a
          ));
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
  }, [getGameState, pendingActions, gameState, optimisticUpdatesEnabled]);

  // Reset the auto end turn flag when we play a card
  const handleCardSelect = (cardIndex: number) => {
    setHasAutoEndedTurn(false); // Reset flag when selecting a card
    const cardId = optimisticHand[cardIndex];
    
    if (cardIndex === selectedCardIndex) {
      setSelectedCardIndex(null);
    } else {
      setSelectedCardIndex(cardIndex);
    }
  };

  // Handle entity click (for targeting) with optimistic updates
  const handleEntityClick = async (targetIndex: number) => {
    if (selectedCardIndex === null) return;
    
    const cardId = optimisticHand[selectedCardIndex];
    const card = cardData.find(c => c.numericId === cardId);
    
    if (!card || !gameState) return;

    // Check if we have enough mana
    const currentMana = optimisticMana ?? gameState.currentMana;
    if (currentMana < card.manaCost) return;

    let actionId: string | undefined;
    // Create pending action if optimistic updates are enabled
    if (optimisticUpdatesEnabled) {
      actionId = Date.now().toString();
      const newAction: PendingAction = {
        id: actionId,
        type: 'playCard',
        description: `Playing ${card.name}`,
        timestamp: Date.now(),
        status: 'pending' as const,
        cardId,
        cardName: card.name,
        targetIndex
      };

      // Get target position for animation
      const targetEntity = gameState.enemyTypes[targetIndex] ? 'enemy' : 'hero';
      const levelConfig = getLevelConfig(gameState.currentFloor);
      const targetPos = targetEntity === 'enemy' 
        ? (levelConfig.enemyPositions[targetIndex] || { x: 50, y: 50 })
        : levelConfig.heroPosition;

      // Only animate if animations are enabled
      if (animationsEnabled) {
        const animationState: AnimationState = {
          sourceType: 'hero',
          sourceIndex: 0,
          targetPosition: targetPos,
          timestamp: Date.now()
        };
        
        setCurrentAnimation(animationState);

        // Clear animation after a delay
        setTimeout(() => {
          setCurrentAnimation(null);
        }, 600);
      }

      // Apply optimistic updates
      const newHand = [...optimisticHand];
      newHand.splice(selectedCardIndex, 1);
      setOptimisticHand(newHand);
      setOptimisticMana(currentMana - card.manaCost);
      setPendingActions(prev => [...prev, newAction]);
    }
    
    setSelectedCardIndex(null);

    try {
      // For non-targeted cards, always use target index 0
      const effectiveTargetIndex = card.targeted ? targetIndex : 0;
      await playCard(selectedCardIndex, effectiveTargetIndex);
    } catch (error) {
      console.error('Failed to play card:', error);
      
      if (optimisticUpdatesEnabled && actionId) {
        // Revert optimistic updates
        setOptimisticHand(gameState.hand);
        setOptimisticMana(gameState.currentMana);
        setCurrentAnimation(null);
        
        // Update the action status
        setPendingActions(prev => 
          prev.map(a => a.id === actionId ? { ...a, status: 'failed' as const } : a)
        );
      }
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

  // Handle end turn with optimistic updates
  const handleEndTurn = async () => {
    let actionId: string | undefined;
    
    if (optimisticUpdatesEnabled) {
      actionId = Date.now().toString();
      const newAction: PendingAction = {
        id: actionId,
        type: 'endTurn',
        description: 'Ending turn...',
        timestamp: Date.now(),
        status: 'pending' as const
      };

      // Clear hand immediately for better feedback
      setOptimisticHand([]);
      setOptimisticMana(0);
      setPendingActions(prev => [...prev, newAction]);

      // Show enemy turn banner with initial delay
      setTurnState('transitioning');
      setTurnBannerMessage("Enemy Turn");
      setTurnBannerType('enemy');
      setShowTurnBanner(true);
    }

    try {
      // Call the end turn action first
      await endTurnAction();
      
      // Wait longer for banner animation and transition feel
      await new Promise(resolve => setTimeout(resolve, 1500));
      setTurnState('enemy');

      // Add delay before enemies start acting
      await new Promise(resolve => setTimeout(resolve, 800));

      // Calculate total expected damage from all enemies
      let expectedHealth = gameState?.currentHealth ?? 0;
      let currentBlock = gameState?.currentBlock ?? 0;

      // Animate enemy actions with delays
      if (animationsEnabled && gameState) {
        for (let i = 0; i < gameState.enemyTypes.length; i++) {
          if (gameState.enemyCurrentHealth[i] > 0) {
            const intent = gameState.enemyIntents[i];
            const enemyType = gameState.enemyTypes[i];
            const levelConfig = getLevelConfig(gameState.currentFloor);
            const targetPos = levelConfig.heroPosition;

            // Calculate damage from this enemy's intent
            if (intent !== INTENT_TYPES.BLOCK_5) { // If not blocking, it's damage
              const damage = calculateDamageAfterBlock(intent, currentBlock);
              expectedHealth -= damage;
              currentBlock = Math.max(0, currentBlock - intent); // Reduce block
            }

            // Create animation state for this enemy
            const animationState: AnimationState = {
              sourceType: 'enemy',
              sourceIndex: i,
              targetPosition: targetPos,
              timestamp: Date.now()
            };

            // Add longer delay before each enemy acts
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            setCurrentAnimation(animationState);
            
            // Keep animation duration the same
            await new Promise(resolve => setTimeout(resolve, 600));
            setCurrentAnimation(null);
          }
        }

        // Add delay after enemies finish
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Hide enemy turn banner
        setShowTurnBanner(false);
        
        // Show player turn banner
        await new Promise(resolve => setTimeout(resolve, 800));

        // Force a game state refresh before showing player turn
        const newState = await getGameState();
        if (newState) {
          setGameState(newState);
          setOptimisticHand(newState.hand || []);
          setOptimisticMana(newState.currentMana || 0);
        }

        setTurnBannerMessage("Your Turn");
        setTurnBannerType('player');
        setShowTurnBanner(true);
        
        // Keep player turn banner visible longer
        setTimeout(() => {
          setShowTurnBanner(false);
          setTurnState('player');
        }, 2000);
      } else {
        // If animations are disabled, just force a state refresh
        const newState = await getGameState();
        if (newState) {
          setGameState(newState);
          setOptimisticHand(newState.hand || []);
          setOptimisticMana(newState.currentMana || 0);
        }
        setTurnState('player');
      }
    } catch (error) {
      console.error('Failed to end turn:', error);
      
      if (optimisticUpdatesEnabled && actionId) {
        // Revert optimistic updates
        setOptimisticHand(gameState.hand);
        setOptimisticMana(gameState.currentMana);
        setCurrentAnimation(null);
        setShowTurnBanner(false);
        setTurnState('player');
        
        setPendingActions(prev => 
          prev.map(a => a.id === actionId ? { ...a, status: 'failed' as const } : a)
        );
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

  const handleSkipReward = async () => {
    if (isChoosingReward) return;
    
    try {
      setIsChoosingReward(true);
      await skipCardReward();
      setSelectedReward(null);
    } catch (error) {
      console.error('Failed to skip reward:', error);
    } finally {
      setIsChoosingReward(false);
    }
  };

  // Add a helper function to check if there are pending card actions
  const hasPendingCardActions = () => {
    return pendingActions.some(action => 
      action.type === 'playCard' && action.status === 'pending'
    );
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

  const handleAbandonAndExit = async () => {
    try {
      await abandonRun();
      handleBackToMenu();
    } catch (error) {
      console.error('Failed to abandon run:', error);
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
            right: 40px;
            top: 50%;
            transform: translateY(-50%);
            padding: 12px 24px;
            background: rgba(0, 0, 0, 0.6);
            border: 2px solid #ffd700;
            border-radius: 4px;
            cursor: pointer;
            transition: all 0.2s ease;
            z-index: 10;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.4);
          }

          .whale-room-gate:hover {
            background: rgba(0, 0, 0, 0.8);
            box-shadow: 0 0 25px rgba(0, 0, 0, 0.6);
            transform: translateY(-50%) scale(1.02);
          }

          .whale-room-gate-text {
            color: #ffd700;
            font-size: 16px;
            font-weight: bold;
            text-align: center;
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
            align-items: center;
            gap: 4px;
            background: rgba(89, 86, 108, 0.15);
            border: 1px solid rgba(89, 86, 108, 0.3);
            backdrop-filter: blur(5px);
            padding: 8px 12px;
            border-radius: 8px;
            margin-bottom: 10px;
            min-height: 36px;
          }

          .mana-icon {
            font-size: 16px;
            animation: sparkle 2s infinite;
            animation-delay: calc(var(--index) * 0.2s);
          }

          @keyframes sparkle {
            0%, 100% { opacity: 1; transform: scale(1); }
            50% { opacity: 0.8; transform: scale(0.95); }
          }

          .game-entity.animating {
            z-index: 100;
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
            {/* Info Bar */}
            <InfoBar />

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
                  animationTarget={currentAnimation?.sourceType === 'hero' ? currentAnimation.targetPosition : undefined}
                  previousHealth={previousHealth}
                  previousBlock={previousBlock}
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
                    animationTarget={currentAnimation?.sourceType === 'enemy' ? currentAnimation.targetPosition : undefined}
                    previousHealth={previousEnemyHealth[index]}
                    previousBlock={previousEnemyBlock[index]}
                  />
                ))}

                {optimisticUpdatesEnabled && (
                  <PendingActions 
                    actions={pendingActions}
                    onActionComplete={(actionId) => {
                      setPendingActions(prev => prev.filter(a => a.id !== actionId));
                    }}
                  />
                )}
              </>
            )}
            
            {/* Show reward selection UI when in reward state */}
            {gameState?.runState === 3 && (
              <div className="reward-overlay">
                <h2>Choose a Card</h2>
                <div className="reward-cards">
                  {cardData
                    .filter(card => gameState.availableCardRewards.includes(card.numericId))
                    .map(card => (
                      <div
                        key={card.numericId}
                        className={`reward-card-container ${selectedReward === card.numericId ? 'selected' : ''}`}
                        onClick={() => handleSelectReward(card.numericId)}
                      >
                        <Card {...card} />
                      </div>
                    ))}
                </div>
                <div className="reward-buttons">
                  <button 
                    className="menu-button skip-reward-button"
                    onClick={handleSkipReward}
                    disabled={isChoosingReward}
                  >
                    Skip
                  </button>
                  <button
                    className={`menu-button continue-button ${!selectedReward || isChoosingReward ? 'disabled' : ''}`}
                    onClick={handleConfirmReward}
                    disabled={!selectedReward || isChoosingReward}
                  >
                    {isChoosingReward ? 'Adding to deck...' : 'Continue'}
                  </button>
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
                      onClick={handleAbandonAndExit}
                      disabled={isRetrying}
                    >
                      Back to Menu
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
                      <span key={i} className={`mana-icon ${i >= (optimisticMana ?? gameState?.currentMana ?? 0) ? 'depleted' : ''}`}>
                        ✨
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <button 
                className="menu-button"
                onClick={handleBackToMenu}
              >
                Back to Menu
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
              />
            </div>

            <div className="bottom-right">
              {/* Only show End Turn button when not in whale room */}
              {(!gameState || gameState.runState !== 1) && (
                <button 
                  className={`menu-button end-turn-button ${hasPendingCardActions() ? 'disabled' : ''}`}
                  onClick={handleEndTurn}
                  disabled={hasPendingCardActions()}
                  title={hasPendingCardActions() ? "Wait for pending card actions to complete" : "End Turn"}
                >
                  End Turn
                </button>
              )}
              <div className="feature-toggles">
                <label className="menu-button feature-toggle">
                  <input
                    type="checkbox"
                    checked={optimisticUpdatesEnabled}
                    onChange={(e) => setOptimisticUpdatesEnabled(e.target.checked)}
                  />
                  Optimistic Updates
                </label>
                <label className="menu-button feature-toggle">
                  <input
                    type="checkbox"
                    checked={autoEndTurnEnabled}
                    onChange={(e) => setAutoEndTurnEnabled(e.target.checked)}
                  />
                  Auto End Turn
                </label>
                <label className="menu-button feature-toggle">
                  <input
                    type="checkbox"
                    checked={animationsEnabled}
                    onChange={(e) => setAnimationsEnabled(e.target.checked)}
                  />
                  Combat Animations
                </label>
              </div>
            </div>
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
        message={selectedReward ? "Adding card to your deck..." : "Skipping reward..."} 
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
    </>
  );
};

export default Game; 