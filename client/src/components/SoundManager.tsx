import { useEffect, useRef } from 'react';
import { soundEffectManager } from '../game/SoundEffectManager';

interface SoundManagerProps {
    soundEffect?: string;
    intent?: number;
    isPlaying: boolean;
    type: 'card' | 'intent';
}

const SoundManager: React.FC<SoundManagerProps> = ({ soundEffect, intent, isPlaying, type }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const cleanupTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        if (!isPlaying) {
            // If we stop playing, wait a bit before cleanup
            if (audioRef.current) {
                cleanupTimeoutRef.current = window.setTimeout(() => {
                    if (audioRef.current) {
                        console.log('🧹 Cleaning up audio...');
                        // Fade out over 100ms
                        const fadeOut = setInterval(() => {
                            if (audioRef.current && audioRef.current.volume > 0.1) {
                                audioRef.current.volume -= 0.1;
                            } else {
                                clearInterval(fadeOut);
                                if (audioRef.current) {
                                    audioRef.current.pause();
                                    audioRef.current.currentTime = 0;
                                }
                                audioRef.current = null;
                            }
                        }, 20);
                    }
                }, 500); // Wait 500ms before starting cleanup
            }
            return;
        }

        if (type === 'card' && !soundEffect) return;
        if (type === 'intent' && intent === undefined) return;

        // Clear any existing cleanup timeout
        if (cleanupTimeoutRef.current) {
            window.clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
        }

        try {
            // Get the correct sound effect based on type
            let soundConfig;
            if (type === 'card' && soundEffect) {
                soundConfig = soundEffectManager.getCardSoundEffect(soundEffect);
                console.log('🎵 Got card sound config:', soundConfig);
            } else if (type === 'intent' && intent !== undefined) {
                console.log('🔊 Attempting to play enemy sound for intent:', intent);
                soundConfig = soundEffectManager.getIntentSoundEffect(intent);
                console.log('🎵 Got enemy sound config:', soundConfig);
            } else {
                return;
            }

            console.log('🔊 Creating audio with path:', soundConfig.soundPath);
            
            // Create audio element with sound
            const audio = new Audio(soundConfig.soundPath);
            audio.volume = soundConfig.volume;
            
            // Store ref for cleanup
            audioRef.current = audio;
            
            // Play sound
            console.log('🎵 Attempting to play audio...');
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('✅ Sound started playing successfully');
                    })
                    .catch(error => {
                        console.error('❌ Sound playback failed:', error);
                    });
            }

        } catch (error) {
            console.error('❌ Sound effect error:', error);
        }

        // Cleanup function
        return () => {
            if (cleanupTimeoutRef.current) {
                window.clearTimeout(cleanupTimeoutRef.current);
                cleanupTimeoutRef.current = null;
            }
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current = null;
            }
        };
    }, [soundEffect, intent, isPlaying, type]);

    return null; // This is a non-visual component
};

export default SoundManager; 