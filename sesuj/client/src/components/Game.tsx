import React, { useState, useEffect } from 'react';
import { Level0 } from '../game/levels/Level0';
import DebugOverlay from './DebugOverlay';
import ResourceBar from './ResourceBar';
import InfoBar from './InfoBar';
import Hand from './Hand';
import Card from './Card';
import GameEntity from './GameEntity';
import { Health } from '../game/resources/Health';
import { Faith } from '../game/resources/Faith';
import { useStartRun, useAbandonRun, useGameState, useGameContract, useChooseRoom, usePlayCard, useEndTurn, useChooseCardReward, useSkipCardReward } from '../hooks/GameState';
import { useCards } from '../hooks/CardsContext';
import './Game.css';

const Game: React.FC = () => {
  const [currentLevel, setCurrentLevel] = useState<Level0>(new Level0());
  const [hand, setHand] = useState<number[]>([]);
  const [deck, setDeck] = useState<number[]>([]);
  const [draw, setDraw] = useState<number[]>([]);
  const [discard, setDiscard] = useState<number[]>([]);
  const [gameState, setGameState] = useState<any>(null);
  const [selectedCardIndex, setSelectedCardIndex] = useState<number | null>(null);
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
  const [hasChosenReward, setHasChosenReward] = useState(false);
  const [selectedReward, setSelectedReward] = useState<number | null>(null);

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

  // Fetch game state
  useEffect(() => {
    let mounted = true;
    
    const fetchGameState = async () => {
      try {
        const state = await getGameState();
        if (!mounted) return;
        
        if (JSON.stringify(state) !== JSON.stringify(gameState)) {
          console.log('Game state updated:', state);
          setGameState(state);
          if (state) {
            setHand(state.hand || []);
            setDeck(state.deck || []);
            setDraw(state.draw || []);
            setDiscard(state.discard || []);
          }
        }
      } catch (error) {
        console.error('Failed to fetch game state:', error);
      }
    };

    fetchGameState();
    const interval = setInterval(fetchGameState, 5000);
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getGameState, gameState]);

  // Handle card selection
  const handleCardSelect = (cardIndex: number) => {
    const cardId = hand[cardIndex];
    const card = cardData.find(c => c.numericId === cardId);
    
    if (cardIndex === selectedCardIndex) {
      console.log('Card deselected:', {
        index: cardIndex,
        cardId,
        cardName: card?.name,
        fullCard: card,
        allCards: cardData,
        currentHand: hand
      });
      setSelectedCardIndex(null);
    } else {
      console.log('Card selected:', {
        index: cardIndex,
        cardId,
        cardName: card?.name,
        fullCard: card,
        allCards: cardData,
        currentHand: hand
      });
      setSelectedCardIndex(cardIndex);
    }
  };

  // Handle entity click (for targeting)
  const handleEntityClick = async (targetIndex: number) => {
    if (selectedCardIndex === null) return;
    
    const cardId = hand[selectedCardIndex];
    const card = cardData.find(c => c.numericId === cardId);
    
    console.log('Attempting to play card:', {
      selectedCardIndex,
      targetIndex,
      cardId,
      card,
      hand,
      cardData
    });

    try {
      // For non-targeted cards, always use target index 0
      const effectiveTargetIndex = card.targeted ? targetIndex : 0;
      await playCard(selectedCardIndex, effectiveTargetIndex);
      console.log('Card played successfully');
      setSelectedCardIndex(null); // Reset selection after playing
      
      // Refresh game state
      const newState = await getGameState();
      if (newState) {
        setGameState(newState);
        setHand(newState.hand || []);
        setDeck(newState.deck || []);
        setDraw(newState.draw || []);
        setDiscard(newState.discard || []);
      }
    } catch (error) {
      console.error('Failed to play card:', error);
    }
  };

  const handleBackToMenu = () => {
    window.location.href = '/';
  };

  // Determine if an entity is a valid target for the selected card
  const isValidTarget = (entityType: 'hero' | 'enemy', index: number) => {
    if (selectedCardIndex === null) return false;
    
    const cardId = hand[selectedCardIndex];
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

  const handleEndTurn = async () => {
    try {
      console.log('Starting end turn action...');
      const result = await endTurnAction();
      console.log('End turn action completed:', result);
      
      console.log('Fetching new game state...');
      const newState = await getGameState();
      console.log('New game state received:', newState);
      
      if (newState) {
        console.log('Updating local state with:', {
          hand: newState.hand,
          deck: newState.deck,
          draw: newState.draw,
          discard: newState.discard
        });
        
        setGameState(newState);
        setHand(newState.hand || []);
        setDeck(newState.deck || []);
        setDraw(newState.draw || []);
        setDiscard(newState.discard || []);
      } else {
        console.warn('No new state received after end turn');
      }
    } catch (error) {
      console.error('Failed to end turn:', error);
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

  return (
    <div className="game-wrapper">
      <div 
        className="game-container"
        style={{
          backgroundImage: `url(${getBackgroundImage()})`,
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        <div className="game-content">
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
            </>
          )}
          
          <DebugOverlay />

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
        <Hand 
          cards={hand}
          onCardSelect={handleCardSelect}
          className="game-hand"
          selectedCardIndex={selectedCardIndex}
          cardData={cardData}
          currentMana={gameState?.currentMana || 0}
        />
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
            <p className="draw-notice">Cards shown here are not in their actual draw order</p>
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
        <button 
          className="view-deck-button menu-button"
          onClick={toggleDeck}
        >
          {isDeckVisible ? 'Hide Deck' : `View Deck (${deck.length})`}
        </button>
        <button 
          className="view-discard-button menu-button"
          onClick={toggleDiscard}
        >
          {isDiscardVisible ? 'Hide Discard' : `View Discard (${discard.length})`}
        </button>
        <button 
          className="view-draw-button menu-button"
          onClick={toggleDraw}
        >
          {isDrawVisible ? 'Hide Draw' : `View Draw (${draw.length})`}
        </button>
        <button 
          className="back-to-menu menu-button"
          onClick={handleBackToMenu}
        >
          Back to Menu
        </button>
        <button 
          className="end-turn-button menu-button"
          onClick={handleEndTurn}
        >
          End Turn
        </button>
      </div>
    </div>
  );
};

export default Game; 