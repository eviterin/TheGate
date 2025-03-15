import { useEffect } from 'react';
import { soundEffectManager } from '../game/SoundEffectManager';

interface SoundManagerProps {
    soundEffect?: string;
    intent?: number;
    isPlaying: boolean;
    type: 'card' | 'intent';
}

const SoundManager: React.FC<SoundManagerProps> = ({ soundEffect, intent, isPlaying, type }) => {
    useEffect(() => {
        if (!isPlaying) return;

        // Basic validation
        if (type === 'card' && !soundEffect) return;
        if (type === 'intent' && intent === undefined) return;

        // Play the appropriate sound
        if (type === 'card' && soundEffect) {
            soundEffectManager.playCardSound(soundEffect);
        } else if (type === 'intent' && intent !== undefined) {
            soundEffectManager.playIntentSound(intent);
        }
    }, [soundEffect, intent, isPlaying, type]);

    return null; // This is a non-visual component
};

export default SoundManager; 