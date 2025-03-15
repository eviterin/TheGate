import { useEffect, useRef } from 'react';

// Import the sound file
import smiteSound from '../assets/soundeffects/smite.wav';

// Map of sound effects to their imported paths
const soundEffects: { [key: string]: string } = {
    'smite.wav': smiteSound
};

interface SoundManagerProps {
    soundEffect?: string;
    isPlaying: boolean;
}

const SoundManager: React.FC<SoundManagerProps> = ({ soundEffect, isPlaying }) => {
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!soundEffect || !isPlaying) {
            // If we're stopping playback, fade out gracefully
            if (audioRef.current) {
                const audio = audioRef.current;
                // Fade out over 100ms
                const fadeOut = setInterval(() => {
                    if (audio.volume > 0.1) {
                        audio.volume -= 0.1;
                    } else {
                        clearInterval(fadeOut);
                        audio.pause();
                        audio.currentTime = 0;
                        audioRef.current = null;
                    }
                }, 20);
            }
            return;
        }

        try {
            console.log('🔊 Attempting to play sound:', soundEffect);
            // Get the correct imported sound path
            const soundPath = soundEffects[soundEffect];
            if (!soundPath) {
                console.error('❌ Sound effect not found:', soundEffect);
                return;
            }

            // Create audio element with imported sound
            const audio = new Audio(soundPath);
            audio.volume = 0.5; // Set moderate volume
            
            // Store ref for cleanup
            audioRef.current = audio;
            
            // Play sound
            const playPromise = audio.play();
            if (playPromise !== undefined) {
                playPromise
                    .then(() => {
                        console.log('🎵 Sound started playing successfully');
                    })
                    .catch(error => {
                        console.error('❌ Sound playback failed:', error);
                    });
            }

            // Cleanup
            return () => {
                if (audioRef.current) {
                    console.log('🛑 Cleaning up sound:', soundEffect);
                    // Don't immediately pause, let the fade out handle it
                    if (!isPlaying) {
                        const audio = audioRef.current;
                        // Fade out over 100ms
                        const fadeOut = setInterval(() => {
                            if (audio.volume > 0.1) {
                                audio.volume -= 0.1;
                            } else {
                                clearInterval(fadeOut);
                                audio.pause();
                                audio.currentTime = 0;
                                audioRef.current = null;
                            }
                        }, 20);
                    }
                }
            };
        } catch (error) {
            console.error('❌ Sound effect error:', error);
        }
    }, [soundEffect, isPlaying]);

    // Log prop changes
    useEffect(() => {
        console.log('🎮 SoundManager props changed:', { soundEffect, isPlaying });
    }, [soundEffect, isPlaying]);

    return null; // This is a non-visual component
};

export default SoundManager; 