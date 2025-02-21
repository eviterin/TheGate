import React, { useState, useEffect } from 'react';
import { useGameState } from '../hooks/GameState';
import './InfoBar.css';

export const FLOOR_NAMES: { [key: number]: string } = {
    0: 'The Gate',
    1: 'Cursed Hamlet',
    2: 'Barren Dunes',
    3: 'Forsaken Outpost',
    4: 'Black Cathedral',
    5: 'Weeping Monastery',
    6: 'Ruined Courtyard',
    7: 'Blighted Tower',
    8: 'Blighted Spire Top',
    9: 'Abyssal Throne',
    10: 'The End of Days'
};

const InfoBar: React.FC = () => {
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

    const getLocationName = (floor: number) => {
        return FLOOR_NAMES[floor] || 'Unknown Location';
    };

    return (
        <div className="info-bar">
            {gameState && (
                <div className="location-info">
                    <span className="location-name">
                        {getLocationName(gameState.currentFloor)} | Part {gameState.currentFloor}/10
                    </span>
                </div>
            )}
        </div>
    );
};

export default InfoBar; 