import { useEffect, useRef, useState } from 'react';
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
    const [isLoading, setIsLoading] = useState(false);
    const playPromiseRef = useRef<Promise<void> | null>(null);

    // Handle cleanup separately from the main effect to avoid race conditions
    useEffect(() => {
        return () => {
            // Final cleanup when component unmounts
            if (cleanupTimeoutRef.current) {
                window.clearTimeout(cleanupTimeoutRef.current);
                cleanupTimeoutRef.current = null;
            }
            
            if (audioRef.current) {
                // Only pause if play promise is resolved
                if (playPromiseRef.current) {
                    playPromiseRef.current
                        .then(() => {
                            if (audioRef.current) {
                                audioRef.current.pause();
                                audioRef.current.currentTime = 0;
                                audioRef.current = null;
                            }
                        })
                        .catch(() => {
                            // If play failed, we can safely clean up
                            if (audioRef.current) {
                                audioRef.current = null;
                            }
                        });
                } else {
                    // No play promise, safe to clean up
                    audioRef.current.pause();
                    audioRef.current.currentTime = 0;
                    audioRef.current = null;
                }
            }
        };
    }, []);

    // Main effect for playing sounds
    useEffect(() => {
        // Don't do anything if we're not supposed to play
        if (!isPlaying) {
            if (audioRef.current && !cleanupTimeoutRef.current) {
                // Schedule cleanup with a delay to let the sound play
                cleanupTimeoutRef.current = window.setTimeout(() => {
                    console.log('🧹 Cleaning up audio after delay...');
                    
                    if (audioRef.current) {
                        // Only fade out if play promise is resolved
                        if (playPromiseRef.current) {
                            playPromiseRef.current
                                .then(() => {
                                    if (audioRef.current) {
                                        // Fade out over 100ms
                                        const fadeOut = setInterval(() => {
                                            if (audioRef.current && audioRef.current.volume > 0.1) {
                                                audioRef.current.volume -= 0.1;
                                            } else {
                                                clearInterval(fadeOut);
                                                if (audioRef.current) {
                                                    audioRef.current.pause();
                                                    audioRef.current.currentTime = 0;
                                                    audioRef.current = null;
                                                }
                                            }
                                        }, 20);
                                    }
                                })
                                .catch(() => {
                                    // If play failed, we can safely clean up
                                    if (audioRef.current) {
                                        audioRef.current = null;
                                    }
                                });
                        } else {
                            // No play promise, safe to clean up
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                            audioRef.current = null;
                        }
                    }
                    
                    cleanupTimeoutRef.current = null;
                }, 500); // Wait 500ms before starting cleanup
            }
            return;
        }

        // Basic validation
        if (type === 'card' && !soundEffect) return;
        if (type === 'intent' && intent === undefined) return;
        if (isLoading) return;

        // Clear any existing cleanup timeout
        if (cleanupTimeoutRef.current) {
            window.clearTimeout(cleanupTimeoutRef.current);
            cleanupTimeoutRef.current = null;
        }

        // Cleanup any existing audio before starting a new one
        if (audioRef.current) {
            // Only cleanup if play promise is resolved
            if (playPromiseRef.current) {
                playPromiseRef.current
                    .then(() => {
                        if (audioRef.current) {
                            audioRef.current.pause();
                            audioRef.current.currentTime = 0;
                            audioRef.current = null;
                            // Now we can start the new sound
                            startNewSound();
                        }
                    })
                    .catch(() => {
                        // If play failed, we can safely clean up and start new sound
                        audioRef.current = null;
                        startNewSound();
                    });
            } else {
                // No play promise, safe to clean up
                audioRef.current.pause();
                audioRef.current.currentTime = 0;
                audioRef.current = null;
                // Now we can start the new sound
                startNewSound();
            }
        } else {
            // No existing audio, start new sound immediately
            startNewSound();
        }

        function startNewSound() {
            try {
                setIsLoading(true);
                
                // Get the correct sound effect based on type
                let soundConfig;
                if (type === 'card' && soundEffect) {
                    console.log('🎮 Playing sound for card name:', soundEffect);
                    
                    // Get card sound (now synchronous)
                    soundConfig = soundEffectManager.getCardSoundEffect(soundEffect);
                    console.log('🎵 Got card sound config:', soundConfig);
                } else if (type === 'intent' && intent !== undefined) {
                    console.log('🔊 Attempting to play enemy sound for intent:', intent);
                    soundConfig = soundEffectManager.getIntentSoundEffect(intent);
                    console.log('🎵 Got enemy sound config:', soundConfig);
                } else {
                    setIsLoading(false);
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
                playPromiseRef.current = audio.play();
                
                if (playPromiseRef.current) {
                    playPromiseRef.current
                        .then(() => {
                            console.log('✅ Sound started playing successfully');
                        })
                        .catch(error => {
                            console.error('❌ Sound playback failed:', error);
                            // Clear refs on error
                            audioRef.current = null;
                            playPromiseRef.current = null;
                        });
                }
            } catch (error) {
                console.error('❌ Sound effect error:', error);
                // Clear refs on error
                audioRef.current = null;
                playPromiseRef.current = null;
            } finally {
                setIsLoading(false);
            }
        }
    }, [soundEffect, intent, isPlaying, type, isLoading]);

    return null; // This is a non-visual component
};

export default SoundManager; 