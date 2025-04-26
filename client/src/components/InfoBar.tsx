import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/GameState';
import { getFloorName } from '../game/encounters';
import './InfoBar.css';

interface InfoBarProps {
    clientState: {
        turnState: 'player' | 'enemy' | 'transitioning';
        pendingCardIDs: number[];
        pendingCardIndices: number[];
        pendingCardTargets: number[];
        optimisticHand: number[];
        optimisticMana: number | undefined;
        optimisticEnemies: any[];
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

    return (
        <div className="info-bar">
            {gameState && (
                <>
                    <div className="location-info">
                        <span className="location-name">
                            {getFloorName(gameState.currentFloor)} | Part {gameState.currentFloor}/10
                        </span>
                    </div>
                    {clientState && (
                        <div className="turn-info">
                            <span className="turn-state">
                                Turn: {clientState.turnState}
                            </span>
                            {clientState.pendingCardIDs.length > 0 && (
                                <span className="pending-cards">
                                    Pending Cards: {clientState.pendingCardIDs.length}
                                </span>
                            )}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default InfoBar;