import React, { useState, useEffect } from 'react';
import ResourceBar from './ResourceBar';
import InfoBar from './InfoBar';
import Hand from './Hand';
import Card from './Card';
import GameEntity from './GameEntity';
import PendingActions, { PendingAction } from './PendingActions';
import { Health } from '../game/resources/Health';
import { Faith } from '../game/resources/Faith';
import { useStartRun, useAbandonRun, useGameState, useGameContract, useChooseRoom, usePlayCard, useEndTurn, useChooseCardReward, useSkipCardReward } from '../hooks/GameState';
import { useCards } from '../hooks/CardsContext';
import './Game.css';

const TRANSACTION_TIMEOUT = 30000; // 30 seconds timeout for transactions

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
  const [optimisticUpdatesEnabled, setOptimisticUpdatesEnabled] = useState(false);

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
                // Also check if the targeted enemy was defeated (health <= 0)
                const targetDefeated = action.targetIndex !== undefined && 
                  action.targetIndex > 0 && // Only check for enemy targets (index > 0)
                  (!state.enemyCurrentHealth[action.targetIndex - 1] || 
                   state.enemyCurrentHealth[action.targetIndex - 1] <= 0);
                
                if (!cardStillInHand || targetDefeated) {
                  return { ...action, status: 'completed' as const };
                }
              }
              // For end turn, check if we got new cards or mana was reset
              else if (action.type === 'endTurn') {
                if (state.hand.length > 0 || state.currentMana === state.maxMana) {
                  return { ...action, status: 'completed' as const };
                }
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

            // Remove both completed and failed actions after a delay
            setTimeout(() => {
              setPendingActions(prev => 
                prev.filter(a => 
                  !completedActions.find(ca => ca.id === a.id) && 
                  !failedActions.find(fa => fa.id === a.id)
                )
              );
            }, 1000);
          }

          setPendingActions(updatedActions);
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
        
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
        description: `Playing ${card.name}${card.targeted ? ` on target ${targetIndex}` : ''}`,
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
    
    try {
      console.log('Choosing reward card and continuing:', selectedReward);
      await chooseCardReward(selectedReward);
      await chooseRoom();
      
      // Reset selection
      setSelectedReward(null);
      
      // Refresh game state after choosing reward and continuing
      const newState = await getGameState();
      if (newState) {
        setGameState(newState);
        setHand(newState.hand || []);
        setDeck(newState.deck || []);
        setDraw(newState.draw || []);
        setDiscard(newState.discard || []);
      }
    } catch (error) {
      console.error('Failed to choose reward and continue:', error);
    }
  };

  const handleSkipReward = async () => {
    try {
      console.log('Skipping reward and continuing');
      await skipCardReward();
      await chooseRoom();
      
      // Reset selection
      setSelectedReward(null);
      
      // Refresh game state after skipping and continuing
      const newState = await getGameState();
      if (newState) {
        setGameState(newState);
        setHand(newState.hand || []);
        setDeck(newState.deck || []);
        setDraw(newState.draw || []);
        setDiscard(newState.discard || []);
      }
    } catch (error) {
      console.error('Failed to skip and continue:', error);
    }
  };

  // Add a helper function to check if there are pending card actions
  const hasPendingCardActions = () => {
    return pendingActions.some(action => 
      action.type === 'playCard' && action.status === 'pending'
    );
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
    </>
  );
};

export default Game; 