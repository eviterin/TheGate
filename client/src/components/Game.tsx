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
  turnCounter?: number;
}

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
  const [isRetrying, setIsRetrying] = useState(false);
  const [isLoadingGameState, setIsLoadingGameState] = useState(true);
  const [isChoosingRoom, setIsChoosingRoom] = useState(false);
  const [isChoosingReward, setIsChoosingReward] = useState(false);
  const [currentAnimation, setCurrentAnimation] = useState<AnimationState | null>(null);
  const [turnState, setTurnState] = useState<'player' | 'enemy' | 'transitioning'>('player');
  const [showTurnBanner, setShowTurnBanner] = useState(false);
  const [turnBannerMessage, setTurnBannerMessage] = useState('');
  const [turnBannerType, setTurnBannerType] = useState<'enemy' | 'player'>('player');
  const [previousHealth, setPreviousHealth] = useState<number>(0);
  const [previousBlock, setPreviousBlock] = useState<number>(0);
  const [previousEnemyHealth, setPreviousEnemyHealth] = useState<number[]>([]);
  const [previousEnemyBlock, setPreviousEnemyBlock] = useState<number[]>([]);
  const { playCards: playCardsAction } = usePlayCards();
  const [pendingCardIDs, setPendingCardIDs] = useState<number[]>([]);
  const [pendingCardIndices, setPendingCardIndices] = useState<number[]>([]);
  const [pendingCardTargets, setPendingCardTargets] = useState<number[]>([]);
  const [initialHandState, setInitialHandState] = useState<number[]>([]);
  const [showAbandonConfirmation, setShowAbandonConfirmation] = useState(false);
  const [isAbandoning, setIsAbandoning] = useState(false);
  const [isApproaching, setIsApproaching] = useState(false);
  const [currentSound, setCurrentSound] = useState<string | undefined>();
  const [isSoundPlaying, setIsSoundPlaying] = useState(false);
  const [soundType, setSoundType] = useState<'card' | 'intent'>('card');
  const [needsBlockchainSync, setNeedsBlockchainSync] = useState(false);
  const [inTurn, setInTurn] = useState(false);
  const [pendingEnemyTurnTransaction, setPendingEnemyTurnTransaction] = useState(false);
  const [predictedVictoryTime, setPredictedVictoryTime] = useState<number | null>(null);
  const [predictedDefeatTime, setPredictedDefeatTime] = useState<number | null>(null);
  const [showVictoryScreen, setShowVictoryScreen] = useState(false);
  const [victoryScreenVisible, setVictoryScreenVisible] = useState(false);
  const [showDefeatScreen, setShowDefeatScreen] = useState(false);
  const [defeatScreenVisible, setDefeatScreenVisible] = useState(false);
  const [isPraying, setIsPraying] = useState(false);
  const [hasPrayed, setHasPrayed] = useState(false);
  const [showGameVictoryScreen, setShowGameVictoryScreen] = useState(false);
  const [gameVictoryScreenVisible, setGameVictoryScreenVisible] = useState(false);
  const [currentIntent, setCurrentIntent] = useState<number | undefined>(undefined);
  const [currentEnemy, setCurrentEnemy] = useState<number | undefined>(undefined);
  const [initialEnemyHealth, setInitialEnemyHealth] = useState<number[]>([]);
  const [currentTurnIntents, setCurrentTurnIntents] = useState<number[]>([]);

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

        // Skip fetching during player turn unless explicitly requested
        if (turnState === 'player' && !needsBlockchainSync && gameState && gameState.runState === 2) {
          return;
        }

        // Always fetch state, but don't always update the UI with it
        const state = await getGameState();
        if (!mounted || !state) return;

        // Save previous state for animations
        if (gameState) {
          setPreviousHealth(gameState.currentHealth);
          setPreviousBlock(gameState.currentBlock);
          setPreviousEnemyHealth(gameState.enemyCurrentHealth || []);
          setPreviousEnemyBlock(gameState.enemyBlock || []);
        }

        // Check if we're in grace period
        const inGracePeriod = predictedVictoryTime && (Date.now() - predictedVictoryTime < 3000);
        
        // During a turn or grace period, preserve our predicted values
        if ((inTurn || turnState === 'enemy' || inGracePeriod) && gameState) {
          setGameState((prev: GameStateUpdate | null) => {
            if (!prev) return state;
            return {
              ...state,
              // Preserve our optimistic updates
              currentHealth: prev.currentHealth,
              currentBlock: prev.currentBlock,
              enemyCurrentHealth: prev.enemyCurrentHealth,
              enemyBlock: prev.enemyBlock,
              hand: optimisticHand.length > 0 ? optimisticHand : state.hand,
              currentMana: optimisticMana !== null ? optimisticMana : state.currentMana,
              // During enemy turn, use the locked intents instead of new ones from blockchain
              enemyIntents: turnState === 'enemy' ? currentTurnIntents : state.enemyIntents
            };
          });
        } else {
          // Just store the state as is
          setGameState(state);
        }

        // Only update optimistic UI when not in a turn AND not in grace period AND not in enemy turn
        if (!inTurn && !inGracePeriod && turnState !== 'enemy') {
          syncWithBlockchain(state);
        }

        // Update other state
        setDeck(state?.deck || []);
        setDiscard(state?.discard || []);
        setDraw(state?.draw || []);
        
        if (state?.runState === 3) {
          setOptimisticHand([]);
          setVictoryScreenVisible(false);
          setPredictedVictoryTime(null);
          setHasPrayed(false); // Reset prayer state for next combat
        }

        setIsLoadingGameState(false);
      } catch (error) {
        console.error('Failed to fetch game state:', error);
        setIsLoadingGameState(false);
      }
    };

    fetchGameState();
    interval = window.setInterval(fetchGameState, 2000);
    
    return () => {
      mounted = false;
      clearInterval(interval);
    };
  }, [getGameState, gameState, inTurn, needsBlockchainSync, predictedVictoryTime]);

  useEffect(() => {
    console.log('[TURN] Turn state changed to:', turnState);
    if (turnState === 'player') {
      // Only set needsBlockchainSync at the start of player turn
      // NOT during the player's entire turn
      if (!inTurn) {
        setNeedsBlockchainSync(true);
        console.log("[TURN] Entered player turn, set needsBlockchainSync to true");
      }
      
      // Reset selected card
      setSelectedCardIndex(null);
      
      // Log current pending cards
      console.log('[TURN] Current pending cards at start of player turn:', pendingCardIDs);
      
      // Don't clear pending cards here - they should be cleared after processing
    }
  }, [turnState, pendingCardIDs, inTurn]);

  useEffect(() => {
    if (turnState === 'player') {
      // At player turn start after enemy turn, force a blockchain sync
      const syncWithBlockchain = async () => {
        console.log("[SYNC] Player turn starting - syncing with blockchain");
        
        // Keep UI frozen until both transactions are confirmed
        if (pendingEnemyTurnTransaction) {
          console.log("[SYNC] Waiting for pending transactions to complete before unfreezing UI", 
            { pendingEnemyTx: pendingEnemyTurnTransaction });
          return; // Don't sync yet, we'll try again on next interval
        }
        
        try {
          const state = await getGameState();
          if (!state) {
            console.log("No game state available yet");
            return;
          }
          
          console.log("Syncing with blockchain state:", state);
          
          // Update all state from blockchain
          setGameState(state);
          setOptimisticHand(state.hand || []);
          setOptimisticMana(state.currentMana || 0);
          setInitialHandState([...state.hand || []]);
          setNeedsBlockchainSync(false);
          
          // Clear pending card arrays when syncing with blockchain
          setPendingCardIDs([]);
          setPendingCardIndices([]);
          setPendingCardTargets([]);
        } catch (error) {
          console.log("Blockchain state not ready yet - will retry", error);
        }
      };
      
      syncWithBlockchain();
    }
  }, [turnState, getGameState, pendingEnemyTurnTransaction]);

  useEffect(() => {
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

  useEffect(() => {
    // Set initial hand state when hand is first loaded
    if (gameState?.hand && gameState.hand.length > 0) {
      setInitialHandState(gameState.hand);
    }
  }, [gameState?.hand]);

  useEffect(() => {
    if (gameState && gameState.isHeroTurn) {
      // Reset initial enemy health at the start of hero's turn
      setInitialEnemyHealth([...gameState.enemyCurrentHealth]);
    }
  }, [gameState?.isHeroTurn]);

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
    
    if (!card || !gameState) {
      console.error('Card not found or no game state:', cardId);
      return;
    }
    
    // Check if we have enough mana
    if (card.manaCost > (optimisticMana || 0)) return;

    console.log(`[CARDPLAY] Playing card ${card.name} (ID: ${cardId}) from hand index ${selectedCardIndex} targeting enemy ${targetIndex}`);
    
    // Track both the card ID, its original index in the hand, and the target
    const newPendingCardIDs = [...pendingCardIDs, cardId];
    const newPendingCardIndices = [...pendingCardIndices, selectedCardIndex];
    const newPendingCardTargets = [...pendingCardTargets, targetIndex];
    
    setPendingCardIDs(newPendingCardIDs);
    setPendingCardIndices(newPendingCardIndices);
    setPendingCardTargets(newPendingCardTargets);
    
    console.log('[CARDPLAY] Updated pending cards:', newPendingCardIDs, newPendingCardIndices, 'targets:', newPendingCardTargets);
    
    // Explicitly set inTurn to true during card play to prevent blockchain sync
    setInTurn(true);

    // Update optimistic mana and hand immediately
    setOptimisticMana((prev) => (prev || 0) - card.manaCost);
    setOptimisticHand(prev => prev.filter((_, i) => i !== selectedCardIndex));
    setSelectedCardIndex(null);

    // Create current game state for prediction
    const currentGameState = {
      enemyCurrentHealth: gameState.enemyCurrentHealth || [],
      enemyBlock: gameState.enemyBlock || [],
      enemyMaxHealth: gameState.enemyMaxHealth || [],
      currentHealth: gameState.currentHealth,
      currentBlock: gameState.currentBlock,
      maxHealth: gameState.maxHealth,
      hand: optimisticHand,
      currentMana: optimisticMana
    };

    // Predict card effect
    const prediction = predictCardEffect(
      card.numericId,
      targetIndex,
      currentGameState
    );

    // Check for predicted enemy deaths by comparing with their current health
    const predictedDeaths = prediction.enemyHealth.map((health, idx) => ({
      index: idx,
      // An enemy died if:
      // 1. Their new health is 0 or less AND
      // 2. They were alive before this card
      died: health <= 0 && gameState.enemyCurrentHealth[idx] > 0
    })).filter(enemy => enemy.died);

    console.log('💀 Current enemy health:', gameState.enemyCurrentHealth);
    console.log('💀 Predicted health after card:', prediction.enemyHealth);
    console.log('💀 Predicted deaths from card:', predictedDeaths);

    // Play both card sound and death sounds if needed
    setCurrentSound(card.name.toLowerCase());
    setSoundType('card');
    setIsSoundPlaying(true);

    if (predictedDeaths.length > 0) {
      console.log('🔊 Playing death sounds for', predictedDeaths.length, 'enemies');
      // Play death sounds immediately without waiting
      predictedDeaths.forEach(death => 
        soundEffectManager.playEventSound('enemyDeath', gameState.currentFloor, death.index)
      );
    }

    // Check for predicted defeat
    if (prediction.heroDied && !predictedDefeatTime) {
      setPredictedDefeatTime(Date.now());
      setShowDefeatScreen(true);
      // Play defeat sound immediately when we predict a loss
      soundEffectManager.playEventSound('defeat');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDefeatScreenVisible(true);
        });
      });
    }

    // Check for predicted victory - if all enemies are dead
    if (!showVictoryScreen && prediction.enemyHealth.every(health => health <= 0)) {
      console.log('[VICTORY] Predicted victory from card play');
      setShowVictoryScreen(true);
      setPredictedVictoryTime(Date.now());
      // Play victory sound immediately when we predict victory
      soundEffectManager.playEventSound('victory');
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVictoryScreenVisible(true);
        });
      });
    }

    // Update optimistic state with prediction
    setGameState((prev: any) => {
      if (!prev) return prev;
      
      return {
        ...prev,
        currentHealth: prediction.heroHealth,
        currentBlock: prediction.heroBlock,
        enemyCurrentHealth: prediction.enemyHealth,
        enemyBlock: prediction.enemyBlock
      };
    });

    // Predict and apply card effect immediately
    const levelConfig = getLevelConfig(gameState.currentFloor);
    
    // Use the prediction directly instead of processEnemyIntent for self-targeting cards
    // This fixes issues with cards like "Pray" that add block to the player
    const currentState = {
      heroHealth: prediction.heroHealth,
      heroBlock: prediction.heroBlock,
      enemyHealth: prediction.enemyHealth,
      enemyBlock: prediction.enemyBlock
    };

    // Then play animation
    const animationState: AnimationState = {
      sourceType: 'hero',
      sourceIndex: 0,
      targetPosition: levelConfig.enemyPositions[targetIndex],
      timestamp: Date.now(),
      animationType: card.animationType
    };

    setCurrentAnimation(animationState);
    
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
      const newState = { ...prev, ...update };
      return newState;
    });
    
    // Wait for rest of animation
    await new Promise(resolve => setTimeout(resolve, 250));
    
    // Reset animation and sound
    setCurrentAnimation(null);
    setIsSoundPlaying(false);
    
    // Log pending cards after each card play
    console.log('[CARDPLAY] Updated pending cards after play:', pendingCardIDs, pendingCardIndices, 'targets:', pendingCardTargets);
  };

  const handleEndTurn = async () => {
    if (showVictoryScreen) {
      // Start grace period when button is clicked
      setPredictedVictoryTime(Date.now());
      
      console.log('[ENDTURN] Victory end turn, starting grace period');
    }

    console.log('[ENDTURN] handleEndTurn called with pendingCardIDs:', pendingCardIDs);
    
    // Still in a turn for enemy actions
    setInTurn(true);
    setTurnState('transitioning');

    soundEffectManager.playEventSound('end_turn');

    try {
      // Process all queued cards in a single transaction
      if (pendingCardIDs.length > 0) {
        console.log('[ENDTURN] Processing pending cards:', pendingCardIDs.length);
        
        // Use the tracked indices directly
        const cardPlays = pendingCardIndices.map((handIndex, i) => {
          return {
            cardIndex: handIndex,
            targetIndex: pendingCardTargets[i]  // Use the tracked target index
          };
        });
        
        console.log('[ENDTURN] Card plays to send in transaction:', cardPlays);
        
        // Mark that we have a pending enemy turn transaction
        setPendingEnemyTurnTransaction(true);
        
        // Send transaction but don't await it
        console.log('[PLAYCARDS] Starting playCards transaction with plays:', cardPlays);
        playCardsAction(cardPlays)
          .then(() => {
            console.log('[PLAYCARDS] Transaction completed successfully');
            setPendingEnemyTurnTransaction(false);
            // Clear pending cards after successful transaction
            setPendingCardIDs([]);
            setPendingCardIndices([]);
            setPendingCardTargets([]);
            // Force a blockchain sync to get new cards AFTER the transaction completes
            setNeedsBlockchainSync(true);
            console.log('[ENDTURN] Set needsBlockchainSync to true');
          })
          .catch(error => {
            console.error('[PLAYCARDS] Error in transaction:', error);
            setPendingEnemyTurnTransaction(false);
            // Force a blockchain sync even on error
            setNeedsBlockchainSync(true);
          });
      } else {
        console.log('[ENDTURN] No pending cards to process, sending endTurn directly');
        
        // If no cards were played, we still need to end the turn manually
        // Mark that we have a pending enemy turn transaction
        setPendingEnemyTurnTransaction(true);
        
        // Send transaction but don't await it
        console.log('[ENDTURN] Starting endTurn transaction');
        endTurnAction()
          .then(() => {
            console.log('[ENDTURN] Transaction completed successfully');
            setPendingEnemyTurnTransaction(false);
            // Force a blockchain sync to get new cards AFTER the transaction completes
            setNeedsBlockchainSync(true);
            console.log('[ENDTURN] Set needsBlockchainSync to true');
          })
          .catch(error => {
            console.error('[ENDTURN] Error in transaction:', error);
            setPendingEnemyTurnTransaction(false);
            // Force a blockchain sync even on error
            setNeedsBlockchainSync(true);
            console.log('[ENDTURN] Set needsBlockchainSync to true (after error)');
          });
      }
    } catch (error) {
      console.error('Error during end turn:', error);
      // If there's an error playing cards, still try to end turn directly
      setPendingEnemyTurnTransaction(true);
      console.log('[ENDTURN] Starting endTurn transaction (from error handler)');
      endTurnAction()
        .then(() => {
          console.log('[ENDTURN] Transaction completed successfully');
          setPendingEnemyTurnTransaction(false);
          // Force a blockchain sync to get new cards
          setNeedsBlockchainSync(true);
          console.log('[ENDTURN] Set needsBlockchainSync to true');
        })
        .catch(error => {
          console.error('[ENDTURN] Error in transaction:', error);
          setPendingEnemyTurnTransaction(false);
          // Force a blockchain sync even on error
          setNeedsBlockchainSync(true);
          console.log('[ENDTURN] Set needsBlockchainSync to true (after error)');
        });
    }
    
    await new Promise(resolve => setTimeout(resolve, 800));
    setTurnState('enemy');
    // Get latest state for enemy intents but keep using our predicted health/block
    const currentState = gameState;
    if (!currentState) return;

    // Save current intents before enemy turn starts
    setCurrentTurnIntents(currentState.enemyIntents);

    await processEnemyTurn(currentState, {
      enemyHealth: currentState.enemyCurrentHealth,
      enemyBlock: currentState.enemyBlock,
      heroHealth: currentState.currentHealth,
      heroBlock: currentState.currentBlock,
      mana: currentState.currentMana,
      enemyBuffs: currentState.enemyBuffs || []
    });
  };

  // Simplified enemy turn processing without waiting for chain
  const processEnemyTurn = async (
    initialState: any,
    postPlayerTurnState: { 
      enemyHealth: number[], 
      enemyBlock: number[], 
      heroHealth: number, 
      heroBlock: number,
      mana: number,
      enemyBuffs: number[]
    }
  ) => {
    try {
      // Start transition to enemy turn
      setTurnState('transitioning');
      setShowTurnBanner(false);
      
      // Show enemy turn banner immediately
      setTurnBannerMessage("Enemy Turn");
      setTurnBannerType('enemy');
      setShowTurnBanner(true);
      soundEffectManager.playEventSound('enemyTurn');
      
      // Show enemy turn banner for 2 seconds
      await new Promise(resolve => setTimeout(resolve, 2000));
      setShowTurnBanner(false);
      
      // Play taunt sounds for all living enemies before their actions
      for (let i = 0; i < initialState.enemyTypes.length; i++) {
        if (postPlayerTurnState.enemyHealth[i] > 0) {
          soundEffectManager.playTauntSound(initialState.currentFloor, i);
          // Small delay between taunts if multiple enemies
          if (i < initialState.enemyTypes.length - 1) {
            await new Promise(resolve => setTimeout(resolve, 200));
          }
        }
      }
      
      // Wait 1 second after banner hides before starting enemy actions
      await new Promise(resolve => setTimeout(resolve, 1000));
      setTurnState('enemy');
      
      // We can start processing enemy actions immediately with our current state
      const enemyTypes = initialState.enemyTypes;
      const enemyIntents = initialState.enemyIntents;
      
      // Current state tracks our optimistic predictions throughout the turn
      let currentState = {
        ...postPlayerTurnState,
        enemyBuffs: initialState.enemyBuffs || []  // Include enemy buffs in current state
      };
      
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
            currentState.enemyBuffs[i] || 0  // Pass through enemy buff for accurate damage prediction
          );

          // Check for predicted defeat
          if (enemyIntentResult.heroDied && !predictedDefeatTime) {
            setPredictedDefeatTime(Date.now());
            setShowDefeatScreen(true);
            // Play defeat sound immediately when we predict a loss
            soundEffectManager.playEventSound('defeat');
            requestAnimationFrame(() => {
              requestAnimationFrame(() => {
                setDefeatScreenVisible(true);
              });
            });
          }

          // Update our current state with the predicted results
          currentState.heroHealth = enemyIntentResult.newHeroHealth;
          currentState.heroBlock = enemyIntentResult.newHeroBlock;
          currentState.enemyHealth[i] = enemyIntentResult.newEnemyHealth;
          currentState.enemyBlock[i] = enemyIntentResult.newEnemyBlock;
          
          // Check for predicted deaths from this enemy action
          const predictedDeaths = currentState.enemyHealth.map((health, idx) => ({
            index: idx,
            died: health <= 0 && initialState.enemyCurrentHealth[idx] > 0
          })).filter(enemy => enemy.died);

          console.log('💀 Predicted deaths from enemy action:', predictedDeaths);
          if (predictedDeaths.length > 0) {
            console.log('🔊 Playing death sounds for', predictedDeaths.length, 'enemies');
            Promise.all(predictedDeaths.map(death => 
              soundEffectManager.playEventSound('enemyDeath', initialState.currentFloor, death.index)
            ));
          }
          
          // Then play animation and sound
          const animationState: AnimationState = {
            sourceType: 'enemy',
            sourceIndex: i,
            targetPosition: levelConfig.heroPosition,
            timestamp: Date.now(),
            animationType: 'slash'
          };

          setCurrentAnimation(animationState);
          setCurrentSound(undefined);
          setCurrentIntent(enemyIntents[i]);
          setCurrentEnemy(i);
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
      
      // Wait 1 second after all enemy actions before transitioning back
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Force a blockchain sync to get the latest state with new cards
      setNeedsBlockchainSync(true);
      console.log('[ENDTURN] Transaction completed, forcing blockchain sync');
      
      // Wait a moment for the sync to complete
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Transition to player turn
      setTurnState('transitioning');
      setTurnBannerMessage("Your Turn");
      setTurnBannerType('player');
      setShowTurnBanner(true);
      soundEffectManager.playEventSound('playerTurn');
      
      // Hide player turn banner after 2 seconds
      setTimeout(() => {
        setShowTurnBanner(false);
      }, 2000);

      // Wait a moment after banner hides before starting player turn
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Finally set to player turn
      setTurnState('player');
      setInTurn(false);
      
    } catch (error) {
      console.error('Error processing enemy turn:', error);
      // Recover from error by transitioning to player turn
      setTurnState('player');
      setInTurn(false);
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
      window.location.reload(); // Refresh the page to start fresh
    } catch (error) {
      console.error('Failed to retry:', error);
    }
    setIsRetrying(false);
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

  const syncWithBlockchain = (state: any) => {
    console.log("Syncing UI state with blockchain");
    setOptimisticHand(state.hand || []);
    setOptimisticMana(state.currentMana || 0);
    
    if (needsBlockchainSync) {
      setNeedsBlockchainSync(false);
    }
  };

  const checkAndHandleVictory = (state: any) => {
    const isVictory = state.enemyCurrentHealth?.every((health: number) => health <= 0) ?? false;
    if (isVictory && !showVictoryScreen) {
      console.log('[VICTORY] Detected victory, showing victory screen');
      setShowVictoryScreen(true);
      // Use RAF to ensure mount happens before adding visible class
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setVictoryScreenVisible(true);
        });
      });
    }
  };

  useEffect(() => {
    if (predictedVictoryTime && (Date.now() - predictedVictoryTime >= 3000)) {
      // Check if victory condition still holds in blockchain state
      const isVictory = gameState?.enemyCurrentHealth?.every((health: number) => health <= 0) ?? false;
      if (!isVictory) {
        setPredictedVictoryTime(null);
        setVictoryScreenVisible(false);
      }
    }
  }, [gameState, predictedVictoryTime]);

  useEffect(() => {
    if (predictedDefeatTime && (Date.now() - predictedDefeatTime >= 3000)) {
      // Check if defeat condition still holds in blockchain state
      if (gameState?.currentHealth > 0) {
        setPredictedDefeatTime(null);
        setDefeatScreenVisible(false);
        setShowDefeatScreen(false);
      }
    }
  }, [gameState, predictedDefeatTime]);

  useEffect(() => {
    if (gameState?.runState === 2) {
      checkAndHandleVictory(gameState);
    }
  }, [gameState?.enemyCurrentHealth]);

  useEffect(() => {
    if (gameState?.runState === 3) {
      setShowVictoryScreen(false);
      setVictoryScreenVisible(false);
      setPredictedVictoryTime(null);
      setHasPrayed(false); // Reset prayer state for next combat
    }
  }, [gameState?.runState]);

  useEffect(() => {
    if ((gameState?.runState === 1 || gameState?.runState === 4) && gameState?.currentFloor > 0) {
      setShowDefeatScreen(true);
      // Use RAF to ensure mount happens before adding visible class
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setDefeatScreenVisible(true);
        });
      });
    }
  }, [gameState?.runState, gameState?.currentFloor]);

  useEffect(() => {
    if (gameState?.runState === 5 && !showGameVictoryScreen) {
      setShowGameVictoryScreen(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setGameVictoryScreenVisible(true);
        });
      });
    }
  }, [gameState?.runState]);

  const handlePray = async () => {
    setIsPraying(true);
    setHasPrayed(true);
    await handleEndTurn();
    setIsPraying(false);
  };

  return (
    <div className="game">
      <SoundManager 
        soundEffect={currentSound}
        intent={currentIntent}
        enemyIndex={currentEnemy}
        currentFloor={gameState?.currentFloor}
        isPlaying={isSoundPlaying}
        type={soundType}
      />
      <div className="game-wrapper">
        <div className="game-container">
          <div className="side-decorations left"></div>
          <div className="side-decorations right"></div>
          <div className="game-content" style={{ backgroundImage: `url(${getBackground()})` }}>
            {showTurnBanner && !victoryScreenVisible && !defeatScreenVisible && !gameVictoryScreenVisible && (
              <TurnBanner 
                message={turnBannerMessage}
                isVisible={showTurnBanner}
                type={turnBannerType}
              />
            )}

            {/* Info Bar - Only show when not in whale room */}
            {gameState && gameState.runState !== 1 && (
              <InfoBar clientState={{
                turnState,
                pendingCardIDs,
                pendingCardIndices,
                pendingCardTargets,
                optimisticHand,
                optimisticMana: optimisticMana === null ? undefined : optimisticMana,
                optimisticEnemies: gameState?.enemyCurrentHealth.map((health: number, index: number) => ({
                  health,
                  block: gameState?.enemyBlock[index] || 0,
                  type: gameState?.enemyTypes[index] || 0
                }))
              }} />
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
                    currentEnemy={turnState === 'enemy' ? (
                      // If currentEnemy is not set yet but we're in enemy turn,
                      // show for the first enemy that has intent and is alive
                      currentEnemy !== undefined ? currentEnemy :
                      gameState.enemyTypes.findIndex((type: number, i: number) => 
                        gameState.enemyCurrentHealth[i] > 0 && gameState.enemyIntents[i]
                      )
                    ) : undefined}
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

            {/* Victory screen */}
            {showVictoryScreen && gameState?.runState === 2 && (
              <div className={`victory-screen ${victoryScreenVisible ? 'visible' : ''}`}>
                {!isPraying && !hasPrayed && (
                  <div className="overlay-button" onClick={handlePray}>
                    <div className="overlay-button-text">
                      PRAY FOR THE LOST
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Defeat screen */}
            {showDefeatScreen && (gameState?.runState === 1 || gameState?.runState === 4) && gameState?.currentFloor > 0 && (
              <div className={`defeat-screen ${defeatScreenVisible ? 'visible' : ''}`}>
                {!isRetrying && (
                  <div className="overlay-button" onClick={handleRetry}>
                    <div className="overlay-button-text">
                      TRY AGAIN?
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Game Victory screen */}
            {showGameVictoryScreen && gameState?.runState === 5 && (
              <div className={`game-victory-screen ${gameVictoryScreenVisible ? 'visible' : ''}`}>
                <div className="victory-message">
                  Your journey has ended.
                  <br />
                  Your name has been etched into the sacred record.
                </div>
                <div className="whale-room-gate" onClick={handleAbandonRun}>
                  <div className="whale-room-gate-text">
                    END GAME
                  </div>
                </div>
              </div>
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
                  ABANDON RUN
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
                isUIFrozen={turnState !== 'player'}
              />
            </div>

            <div className="bottom-right">
              {/* Add End Turn button */}
              {gameState?.runState === 2 && !victoryScreenVisible && !defeatScreenVisible && !gameVictoryScreenVisible && turnState === 'player' && (
                <div className="end-turn-button-container">
                  <button 
                    className="end-turn-button"
                    onClick={handleEndTurn}
                    disabled={turnState !== 'player' || pendingEnemyTurnTransaction}
                  >
                    END TURN
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Add loading overlays */}
        <LoadingOverlay 
          isVisible={isLoadingGameState} 
          message="Loading game..." 
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
        <LoadingOverlay 
          isVisible={isPraying} 
          message="A divine presence stirs within..." 
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
    </div>
  );
};

export default Game;