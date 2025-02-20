import React, { useState, useEffect } from 'react';
import { useGameState, useDebugFloorControls, useDebugHealthControls } from '../hooks/GameState';
import './DebugOverlay.css';

const DebugOverlay: React.FC = () => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [healthAmount, setHealthAmount] = useState<number>(5);
    const [gameState, setGameState] = useState<any>(null);
    const { getGameState } = useGameState();
    const { nextFloor, previousFloor, setFloor } = useDebugFloorControls();
    const { addHealth, removeHealth, setMaxHealth } = useDebugHealthControls();

    useEffect(() => {
        const fetchGameState = async () => {
            const state = await getGameState();
            setGameState(state);
        };

        fetchGameState();
        const interval = setInterval(fetchGameState, 5000);
        return () => clearInterval(interval);
    }, [getGameState]);

    const handleGetState = async () => {
        const state = await getGameState();
        console.log('🎮 Full Game State:', state);
    };

    const handleNextFloor = async () => {
        try {
            await nextFloor();
            // Get updated state after floor change
            const state = await getGameState();
            console.log('🎮 Updated Game State:', state);
        } catch (error) {
            console.error('Failed to move to next floor:', error);
        }
    };

    const handlePreviousFloor = async () => {
        try {
            await previousFloor();
            // Get updated state after floor change
            const state = await getGameState();
            console.log('🎮 Updated Game State:', state);
        } catch (error) {
            console.error('Failed to move to previous floor:', error);
        }
    };

    const handleAddHealth = async () => {
        try {
            await addHealth(healthAmount);
            const state = await getGameState();
            console.log('🎮 Updated Game State:', state);
        } catch (error) {
            console.error('Failed to add health:', error);
        }
    };

    const handleRemoveHealth = async () => {
        try {
            await removeHealth(healthAmount);
            const state = await getGameState();
            console.log('🎮 Updated Game State:', state);
        } catch (error) {
            console.error('Failed to remove health:', error);
        }
    };

    if (!isExpanded) {
        return (
            <div 
                className="debug-overlay-toggle"
                onClick={() => setIsExpanded(true)}
                style={{
                    position: 'fixed',
                    bottom: '10px',
                    right: '10px',
                    background: '#333',
                    color: '#fff',
                    padding: '5px 10px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    zIndex: 1000,
                }}
            >
                🐛 Debug
            </div>
        );
    }

    return (
        <div 
            className="debug-overlay"
            style={{
                position: 'fixed',
                bottom: '10px',
                right: '10px',
                background: 'rgba(0, 0, 0, 0.9)',
                color: '#fff',
                padding: '15px',
                borderRadius: '4px',
                zIndex: 1000,
            }}
        >
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <h3 style={{ margin: 0 }}>Debug Controls</h3>
                <button 
                    onClick={() => setIsExpanded(false)}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#fff',
                        cursor: 'pointer',
                    }}
                >
                    ✕
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button 
                    onClick={handleGetState}
                    style={{
                        background: '#444',
                        border: 'none',
                        color: '#fff',
                        padding: '5px 10px',
                        borderRadius: '4px',
                        cursor: 'pointer',
                    }}
                >
                    Get Full Game State
                </button>

                <div style={{ display: 'flex', gap: '8px' }}>
                    <button 
                        onClick={handlePreviousFloor}
                        style={{
                            background: '#444',
                            border: 'none',
                            color: '#fff',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flex: 1,
                        }}
                    >
                        ⬅️ Previous Floor
                    </button>
                    <button 
                        onClick={handleNextFloor}
                        style={{
                            background: '#444',
                            border: 'none',
                            color: '#fff',
                            padding: '5px 10px',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            flex: 1,
                        }}
                    >
                        Next Floor ➡️
                    </button>
                </div>

                <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    gap: '8px',
                    background: '#333',
                    padding: '8px',
                    borderRadius: '4px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span>Amount:</span>
                        <input
                            type="number"
                            value={healthAmount}
                            onChange={(e) => setHealthAmount(Math.max(1, parseInt(e.target.value) || 1))}
                            style={{
                                background: '#444',
                                border: 'none',
                                color: '#fff',
                                padding: '4px 8px',
                                borderRadius: '4px',
                                width: '60px'
                            }}
                            min="1"
                        />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                        <button 
                            onClick={handleAddHealth}
                            style={{
                                background: '#2a6',
                                border: 'none',
                                color: '#fff',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                flex: 1,
                            }}
                        >
                            Add Health
                        </button>
                        <button 
                            onClick={handleRemoveHealth}
                            style={{
                                background: '#a26',
                                border: 'none',
                                color: '#fff',
                                padding: '5px 10px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                flex: 1,
                            }}
                        >
                            Remove Health
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DebugOverlay; 