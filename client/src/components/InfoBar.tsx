import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/GameState';
import { getFloorName } from '../game/encounters';
import './InfoBar.css';

interface InfoBarProps {
    clientState?: {
        turnState: string;
        pendingCardIDs: number[];
        pendingCardIndices: number[];
        pendingCardTargets: number[];
        optimisticHand?: number[];
        optimisticMana?: number;
        optimisticEnemies?: any[];
    };
}

const InfoBar: React.FC<InfoBarProps> = ({ clientState }) => {
    const [gameState, setGameState] = useState<any>(null);
    const { getGameState } = useGameState();

    useEffect(() => {
        const fetchGameState = async () => {
            const state = await getGameState();
            setGameState(state);
        };

        fetchGameState();
        const interval = setInterval(fetchGameState, 5000);
        return () => clearInterval(interval);
    }, [getGameState]);

    const handleFetchGameState = async () => {
        try {
            const state = await getGameState();
            console.log("Current Game State (Blockchain):", state);
            
            if (clientState) {
                console.log("Current Client State:", clientState);
            }
            
            setGameState(state);
        } catch (error) {
            console.error("Error fetching game state:", error);
        }
    };

    return (
        <div className="info-bar">
            <button 
                className="fetch-state-button"
                onClick={handleFetchGameState}
                style={{
                    position: 'absolute',
                    left: '10px',
                    top: '10px',
                    padding: '5px 10px',
                    background: '#444',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    fontSize: '12px'
                }}
            >
                Fetch State
            </button>
            {gameState && (
                <div className="location-info">
                    <span className="location-name">
                        {getFloorName(gameState.currentFloor)} | Part {gameState.currentFloor}/10
                    </span>
                </div>
            )}
        </div>
    );
};

export default InfoBar;