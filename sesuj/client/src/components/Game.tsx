import React, { useState, useEffect } from 'react';
import ResourceBar from './ResourceBar';
import InfoBar from './InfoBar';
import Hand from './Hand';
import Card from './Card';
import GameEntity from './GameEntity';
import PendingActions, { PendingAction } from './PendingActions';
import LoadingOverlay from './LoadingOverlay';
import { Health } from '../game/resources/Health';
import { Faith } from '../game/resources/Faith';
import { useStartRun, useAbandonRun, useGameState, useGameContract, useChooseRoom, usePlayCard, useEndTurn, useChooseCardReward, useSkipCardReward, useRetryFromDeath } from '../hooks/GameState';
import { useCards } from '../hooks/CardsContext';
import './Game.css';

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

const Game: React.FC = () => {
  const [hand, setHand] = useState<number[]>([]);
  const [deck, setDeck] = useState<number[]>([]);
  const [draw, setDraw] = useState<number[]>([]);
  const [discard, setDiscard] = useState<number[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
  const [isHandVisible, setIsHandVisible] = useState(true);
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
  const { retryFromDeath } = useRetryFromDeath();
  const { abandonRun } = useAbandonRun();
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoadingGameState, setIsLoadingGameState] = useState(true);
  const [isChoosingRoom, setIsChoosingRoom] = useState(false);
  const [isChoosingReward, setIsChoosingReward] = useState(false);

  // Fetch card data
  useEffect(() => {
    const fetchCards = async () => {
      try {
        const cards = await getActiveCards();
        console.log('Fetched cards from blockchain:', cards);
        setCardData(cards);
      } catch (error) {
        console.error('Failed to fetch cards:', error);
      }
    };
    fetchCards();
  }, [getActiveCards]);

  // Continuously update game state
  useEffect(() => {
    let mounted = true;
    
    const fetchGameState = async () => {
      try {
        const state = await getGameState();
        if (!mounted) return;
        
        setGameState(state);
        setIsLoadingGameState(false);
        
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
            )
          );
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

  // Handle card selection
  const handleCardSelect = (cardIndex: number) => {
    const cardId = optimisticHand[cardIndex];
    const card = cardData.find(c => c.numericId === cardId);
    
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
      
      // If optimistic updates are disabled, wait for next state update
    } catch (error) {
      console.error('Failed to play card:', error);
      
      if (optimisticUpdatesEnabled && actionId) {
        // Revert optimistic updates
        setOptimisticHand(gameState.hand);
        setOptimisticMana(gameState.currentMana);
        
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

  const getBackgroundImage = () => {
    if (!gameState) return '';
    return `/src/assets/arenas/room_${gameState.currentFloor}.png`;
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
    }

    try {
      await endTurnAction();
      // If optimistic updates are disabled, wait for next state update
    } catch (error) {
      console.error('Failed to end turn:', error);
      
      if (optimisticUpdatesEnabled && actionId) {
        // Revert optimistic updates
        setOptimisticHand(gameState.hand);
        setOptimisticMana(gameState.currentMana);
        
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
    setSelectedReward(cardId);
  };

  const handleConfirmReward = async () => {
    if (!selectedReward) return;
    
    let actionId: string | undefined;
    const card = cardData.find(c => c.numericId === selectedReward);
    if (!card) return;

    if (optimisticUpdatesEnabled) {
      actionId = Date.now().toString();
      const newAction: PendingAction = {
        id: actionId,
        type: 'chooseReward',
        description: `Adding ${card.name} to deck...`,
        timestamp: Date.now(),
        status: 'pending' as const,
        cardId: selectedReward
      };
      setPendingActions(prev => [...prev, newAction]);
    }

    setIsChoosingReward(true);
    try {
      await chooseCardReward(selectedReward);
      setSelectedReward(null);
    } catch (error) {
      console.error('Failed to choose reward:', error);
      if (optimisticUpdatesEnabled && actionId) {
        setPendingActions(prev => 
          prev.map(a => a.id === actionId ? { ...a, status: 'failed' as const } : a)
        );
      }
    } finally {
      setIsChoosingReward(false);
    }
  };

  const handleSkipReward = async () => {
    let actionId: string | undefined;
    
    if (optimisticUpdatesEnabled) {
      actionId = Date.now().toString();
      const newAction: PendingAction = {
        id: actionId,
        type: 'skipReward',
        description: 'Skipping reward...',
        timestamp: Date.now(),
        status: 'pending' as const
      };
      setPendingActions(prev => [...prev, newAction]);
    }

    setIsChoosingReward(true);
    try {
      await skipCardReward();
      setSelectedReward(null);
    } catch (error) {
      console.error('Failed to skip reward:', error);
      if (optimisticUpdatesEnabled && actionId) {
        setPendingActions(prev => 
          prev.map(a => a.id === actionId ? { ...a, status: 'failed' as const } : a)
        );
      }
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
    setIsChoosingRoom(true);
    try {
      await chooseRoom(optionId);
    } catch (error) {
      console.error('Failed to choose whale room option:', error);
    } finally {
      setIsChoosingRoom(false);
    }
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

  return (
    <>
      <style>
        {`
          .feature-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            color: white;
            font-size: 14px;
            cursor: pointer;
          }
          
          .feature-toggle input[type="checkbox"] {
            width: 16px;
            height: 16px;
            cursor: pointer;
          }

          .whale-room-overlay {
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.85);
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            z-index: 1000;
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
        `}
      </style>
      <div className="game-wrapper">
        <div className="game-container">
          <div 
            className="game-content"
            style={{
              backgroundImage: `url(${getBackgroundImage()})`
            }}
          >
            <InfoBar />
            <div className="resource-bars" style={{
              position: 'absolute',
              top: '50px',
              left: '10px',
              width: '180px',
            }}>
              <div style={{ marginBottom: '8px' }}>
                <ResourceBar resource={new Health(gameState?.currentHealth || 0, gameState?.maxHealth || 0, gameState?.currentBlock || 0)} />
              </div>
              <ResourceBar resource={new Faith(gameState?.currentMana || 0, gameState?.maxMana || 0)} />
            </div>
            
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
                  {gameState.availableCardRewards.map((cardId: number, index: number) => {
                    const card = cardData.find(c => c.numericId === cardId);
                    if (!card) return null;
                    return (
                      <div 
                        key={`reward-${index}`}
                        onClick={() => handleSelectReward(cardId)}
                        className={`reward-card-container ${selectedReward === cardId ? 'selected' : ''}`}
                      >
                        <Card {...card} />
                      </div>
                    );
                  })}
                </div>
                <div className="reward-buttons">
                  <button 
                    className="skip-reward-button menu-button"
                    onClick={handleSkipReward}
                  >
                    Skip
                  </button>
                  <button 
                    className={`continue-button menu-button ${!selectedReward ? 'disabled' : ''}`}
                    onClick={handleConfirmReward}
                    disabled={!selectedReward}
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {/* Whale Room Overlay */}
            {gameState?.runState === 1 && (
              <div className="whale-room-overlay">
                <div className="whale-room-content">
                  <h2 className="whale-room-title">Choose a Divine Blessing</h2>
                  <div className="whale-room-options">
                    {WHALE_ROOM_OPTIONS.map(option => (
                      <div
                        key={option.id}
                        className="whale-room-option"
                        onClick={() => handleWhaleRoomChoice(option.id)}
                      >
                        <h3>{option.title}</h3>
                        <p className="description">{option.description}</p>
                        <span className="effect">{option.effect}</span>
                      </div>
                    ))}
                  </div>
                </div>
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

          {/* New bottom area with three columns */}
          <div className="bottom-area">
            <div className="bottom-left">
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
              <button 
                className={`menu-button end-turn-button ${hasPendingCardActions() ? 'disabled' : ''}`}
                onClick={handleEndTurn}
                disabled={hasPendingCardActions()}
                title={hasPendingCardActions() ? "Wait for pending card actions to complete" : "End Turn"}
              >
                End Turn
              </button>
              <label className="menu-button feature-toggle">
                <input
                  type="checkbox"
                  checked={optimisticUpdatesEnabled}
                  onChange={(e) => setOptimisticUpdatesEnabled(e.target.checked)}
                />
                Optimistic Updates
              </label>
            </div>
          </div>

          <button 
            className="hand-toggle"
            onClick={() => setIsHandVisible(!isHandVisible)}
          >
            {isHandVisible ? 'Hide Hand' : 'Show Hand'}
          </button>

          {/* Deck/Discard/Draw viewers */}
          {isDeckVisible && (
            <div className="deck-viewer">
              <h3>Your Deck ({deck.length} cards)</h3>
              <div className="deck-cards">
                {deck.map((cardId, index) => {
                  const card = cardData.find(c => c.numericId === cardId);
                  if (!card) return null;
                  return (
                    <Card
                      key={`deck-${index}`}
                      {...card}
                    />
                  );
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
                  if (!card) return null;
                  return (
                    <Card
                      key={`discard-${index}`}
                      {...card}
                    />
                  );
                })}
              </div>
            </div>
          )}
          {isDrawVisible && (
            <div className="deck-viewer">
              <h3>Draw Pile ({draw.length} cards)</h3>
              <div className="deck-cards">
                {draw.map((cardId, index) => {
                  const card = cardData.find(c => c.numericId === cardId);
                  if (!card) return null;
                  return (
                    <Card
                      key={`draw-${index}`}
                      {...card}
                    />
                  );
                })}
              </div>
            </div>
          )}
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
        message="Adding card to your deck..." 
      />
      <LoadingOverlay 
        isVisible={isRetrying} 
        message="Divine intervention in progress..." 
      />
    </>
  );
};

export default Game; 