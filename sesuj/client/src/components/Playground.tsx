import React, { useState, useEffect } from 'react';
import { useStartRun, useAbandonRun, useGameState, useGameContract, useChooseRoom, usePlayCard, useEndTurn } from '../hooks/GameState';
import { useCards, CardData } from '../hooks/CardsContext';
import './Playground.css';
import LoadingIndicator from './LoadingIndicator';
import Card from './Card';
import { getCurrentUser } from '@happy.tech/core';

interface GameStatus {
    runState: number;
    currentFloor: number;
    maxHealth: number;
    currentHealth: number;
    currentBlock: number;
    currentMana: number;
    maxMana: number;
    enemyTypes: number[];
    enemyMaxHealth: number[];
    enemyCurrentHealth: number[];
    enemyIntents: number[];
    hand: number[];
    deck: number[];
    draw: number[];
    discard: number[];
}

const Playground: React.FC = () => {
    const [gameStatus, setGameStatus] = useState<GameStatus | null>(null);
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [cardPlayIndex, setCardPlayIndex] = useState<string>('');
    const [targetIndex, setTargetIndex] = useState<string>('');
    const [chainCards, setChainCards] = useState<CardData[]>([]);
    const [isLoadingCards, setIsLoadingCards] = useState(true);

    let contractConfig;
    try {
        contractConfig = useGameContract();
    } catch (error) {
        return (
            <div className="playground">
                <LoadingIndicator message="Loading Contract Configuration..." />
            </div>
        );
    }

    const { startRun } = useStartRun();
    const { abandonRun } = useAbandonRun();
    const { getGameState } = useGameState();
    const { chooseRoom } = useChooseRoom();
    const { playCard } = usePlayCard();
    const { endTurn } = useEndTurn();
    const { getActiveCards } = useCards();

    const refreshGameState = async () => {
        try {
            const state = await getGameState();
            setGameStatus(state);
        } catch (error) {
            console.error('Failed to fetch game state:', error);
        }
    };

    useEffect(() => {
        console.log('Ready');
        refreshGameState();
        const interval = setInterval(refreshGameState, 5000);
        return () => clearInterval(interval);
    }, [contractConfig]);

    const handleStartRun = async () => {
        try {
            await startRun();
            console.log('Successfully started run');
            await refreshGameState();
        } catch (error) {
            console.error('Failed to start run:', error);
        }
    };

    const handleAbandonRun = async () => {
        try {
            await abandonRun();
            console.log('Successfully abandoned run');
            await refreshGameState();
        } catch (error) {
            console.error('Failed to abandon run:', error);
        }
    };

    const handleChooseRoom = async () => {
        try {
            await chooseRoom();
            console.log('Successfully chose room');
            await refreshGameState();
        } catch (error) {
            console.error('Failed to choose room:', error);
        }
    };

    const handlePlayCard = async () => {
        try {
            const cardIndex = parseInt(cardPlayIndex);
            const target = parseInt(targetIndex);
            if (isNaN(cardIndex) || isNaN(target)) {
                console.error('Invalid card index or target');
                return;
            }
            await playCard(cardIndex, target);
            console.log('Successfully played card');
            await refreshGameState();
        } catch (error) {
            console.error('Failed to play card:', error);
        }
    };

    const handleEndTurn = async () => {
        try {
            await endTurn();
            console.log('Successfully ended turn');
            await refreshGameState();
        } catch (error) {
            console.error('Failed to end turn:', error);
        }
    };

    const handleRefreshState = async () => {
        setIsRefreshing(true);
        try {
            await refreshGameState();
            console.log('Game state refreshed');
        } catch (error) {
            console.error('Failed to refresh state:', error);
        } finally {
            setIsRefreshing(false);
        }
    };

    // Fetch cards on component mount
    useEffect(() => {
        const fetchCards = async () => {
            setIsLoadingCards(true);
            try {
                const cards = await getActiveCards();
                setChainCards(cards);
                console.log('Successfully fetched cards from chain');
            } catch (error) {
                console.error('Failed to fetch cards:', error);
            } finally {
                setIsLoadingCards(false);
            }
        };
        fetchCards();
    }, []);

    // Map chain cards to display cards with local images
    const displayCards = chainCards.map(card => ({
        ...card,
        imageUrl: `/src/assets/cardart/${card.id}.png`
    }));

    return (
        <div className="playground" style={{ 
            padding: '2rem', 
            maxWidth: '1200px', 
            margin: '0 auto',
            backgroundColor: '#1a1a1a',
            color: '#e0e0e0',
            minHeight: '100vh'
        }}>
            <h1 style={{ marginBottom: '2rem', color: '#e0e0e0' }}>Game State Playground</h1>
            
            <div className="game-status" style={{ 
                backgroundColor: '#2d2d2d', 
                padding: '2rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <h2 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Current Game Status</h2>
                <button 
                    onClick={handleRefreshState}
                    disabled={isRefreshing}
                    style={{
                        padding: '0.5rem 1rem',
                        marginBottom: '1rem',
                        backgroundColor: isRefreshing ? '#4a4a4a' : '#2c5282',
                        color: '#e0e0e0',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: isRefreshing ? 'not-allowed' : 'pointer'
                    }}
                >
                    {isRefreshing ? 'Refreshing...' : 'Refresh State'}
                </button>
                
                {gameStatus ? (
                    <div style={{ display: 'grid', gap: '1.5rem' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                            <div style={{ padding: '1rem', backgroundColor: '#363636', borderRadius: '4px' }}>
                                <p><strong>Run State:</strong> {gameStatus.runState}</p>
                                <p><strong>Current Floor:</strong> {gameStatus.currentFloor}</p>
                            </div>
                            <div style={{ padding: '1rem', backgroundColor: '#363636', borderRadius: '4px' }}>
                                <p><strong>Health:</strong> {gameStatus.currentHealth}/{gameStatus.maxHealth}</p>
                                <p><strong>Block:</strong> {gameStatus.currentBlock}</p>
                                <p><strong>Mana:</strong> {gameStatus.currentMana}/{gameStatus.maxMana}</p>
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#363636', padding: '1rem', borderRadius: '4px' }}>
                            <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Enemies</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                                {gameStatus.enemyTypes.map((type, index) => (
                                    <div key={index} style={{ 
                                        padding: '1rem', 
                                        backgroundColor: '#404040',
                                        borderRadius: '4px',
                                        border: '1px solid #505050'
                                    }}>
                                        <p><strong>Enemy {index}:</strong> Type {type}</p>
                                        <p><strong>Health:</strong> {gameStatus.enemyCurrentHealth[index]}/{gameStatus.enemyMaxHealth[index]}</p>
                                        <p><strong>Intent:</strong> {gameStatus.enemyIntents[index]}</p>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div style={{ backgroundColor: '#363636', padding: '1rem', borderRadius: '4px' }}>
                            <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Hand</h3>
                            <p><strong>Cards:</strong> {gameStatus.hand.join(', ')}</p>
                        </div>

                        <div style={{ backgroundColor: '#363636', padding: '1rem', borderRadius: '4px' }}>
                            <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Card Piles</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
                                <div>
                                    <h4 style={{ color: '#e0e0e0', marginBottom: '0.5rem' }}>Deck ({gameStatus.deck.length})</h4>
                                    <p>{gameStatus.deck.join(', ')}</p>
                                </div>
                                <div>
                                    <h4 style={{ color: '#e0e0e0', marginBottom: '0.5rem' }}>Draw ({gameStatus.draw.length})</h4>
                                    <p>{gameStatus.draw.join(', ')}</p>
                                </div>
                                <div>
                                    <h4 style={{ color: '#e0e0e0', marginBottom: '0.5rem' }}>Discard ({gameStatus.discard.length})</h4>
                                    <p>{gameStatus.discard.join(', ')}</p>
                                </div>
                            </div>
                        </div>
                    </div>
                ) : (
                    <p style={{ color: '#999' }}>Loading game state...</p>
                )}
            </div>

            <div className="game-controls" style={{ 
                backgroundColor: '#2d2d2d',
                padding: '2rem',
                borderRadius: '8px',
                marginBottom: '2rem',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <h2 style={{ marginBottom: '1.5rem', color: '#e0e0e0' }}>Game Controls</h2>
                <div className="basic-controls" style={{ 
                    display: 'flex', 
                    gap: '1rem',
                    marginBottom: '2rem',
                    flexWrap: 'wrap'
                }}>
                    {[
                        { label: 'Start Run', handler: handleStartRun },
                        { label: 'Abandon Run', handler: handleAbandonRun },
                        { label: 'Choose Room', handler: handleChooseRoom },
                        { label: 'End Turn', handler: handleEndTurn }
                    ].map(({ label, handler }) => (
                        <button 
                            key={label}
                            onClick={handler}
                            style={{
                                padding: '0.75rem 1.5rem',
                                backgroundColor: '#2c5282',
                                color: '#e0e0e0',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s',
                                flex: '1',
                                minWidth: '150px'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#3182ce'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#2c5282'}
                        >
                            {label}
                        </button>
                    ))}
                </div>

                <div className="card-controls" style={{ backgroundColor: '#363636', padding: '1.5rem', borderRadius: '4px' }}>
                    <h3 style={{ marginBottom: '1rem', color: '#e0e0e0' }}>Play Card</h3>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                        <input
                            type="number"
                            placeholder="Card Index"
                            value={cardPlayIndex}
                            onChange={(e) => setCardPlayIndex(e.target.value)}
                            min="0"
                            style={{
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #505050',
                                backgroundColor: '#404040',
                                color: '#e0e0e0',
                                width: '120px'
                            }}
                        />
                        <input
                            type="number"
                            placeholder="Target Index"
                            value={targetIndex}
                            onChange={(e) => setTargetIndex(e.target.value)}
                            min="0"
                            style={{
                                padding: '0.5rem',
                                borderRadius: '4px',
                                border: '1px solid #505050',
                                backgroundColor: '#404040',
                                color: '#e0e0e0',
                                width: '120px'
                            }}
                        />
                        <button 
                            onClick={handlePlayCard}
                            style={{
                                padding: '0.5rem 1rem',
                                backgroundColor: '#276749',
                                color: '#e0e0e0',
                                border: 'none',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                transition: 'background-color 0.2s'
                            }}
                            onMouseOver={e => e.currentTarget.style.backgroundColor = '#2f855a'}
                            onMouseOut={e => e.currentTarget.style.backgroundColor = '#276749'}
                        >
                            Play Card
                        </button>
                    </div>
                </div>
            </div>

            <div className="cards-section" style={{ 
                backgroundColor: '#2d2d2d',
                padding: '2rem',
                borderRadius: '8px',
                boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
                <h2 style={{ marginBottom: '1.5rem', color: '#e0e0e0' }}>Available Cards</h2>
                {isLoadingCards ? (
                    <LoadingIndicator message="Loading cards..." />
                ) : (
                    <div className="cards-container" style={{ 
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                        gap: '1rem',
                        padding: '1rem',
                        backgroundColor: '#363636',
                        borderRadius: '4px'
                    }}>
                        {displayCards.map(card => (
                            <Card
                                key={card.id}
                                {...card}
                                isSelected={selectedCardId === card.id}
                                onSelect={(id) => setSelectedCardId(id === selectedCardId ? null : id)}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default Playground; 