import { useState, useRef, useEffect } from 'react';
import boomboxIcon from '../assets/misc/boombox.svg';
import backgroundMusic from '../assets/music/background1.mp3';
import './MusicPlayer.css';

const MusicPlayer = () => {
    const [isPlaying, setIsPlaying] = useState(false);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        // Create audio element with error handling
        audioRef.current = new Audio(backgroundMusic);
        audioRef.current.loop = true;
        audioRef.current.volume = 0.5; // Set a moderate volume

        // Add error handling
        audioRef.current.addEventListener('error', (e) => {
            console.error('Audio error:', e);
        });

        // Add load handling
        audioRef.current.addEventListener('canplaythrough', () => {
            console.log('Audio loaded and ready to play');
        });

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.remove();
                audioRef.current = null;
            }
        };
    }, []);

    const toggleMusic = async () => {
        if (audioRef.current) {
            try {
                if (isPlaying) {
                    await audioRef.current.pause();
                    console.log('Music paused');
                } else {
                    const playPromise = audioRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                console.log('Music started playing');
                            })
                            .catch(error => {
                                console.error('Playback failed:', error);
                            });
                    }
                }
                setIsPlaying(!isPlaying);
            } catch (error) {
                console.error('Toggle music error:', error);
            }
        }
    };

    return (
        <div className="music-player">
            <button 
                className={`music-toggle ${isPlaying ? 'playing' : ''}`}
                onClick={toggleMusic}
            >
                <img src={boomboxIcon} alt="Music toggle" />
            </button>
        </div>
    );
};

export default MusicPlayer; 