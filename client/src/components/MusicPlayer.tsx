import { useState, useRef, useEffect } from 'react';
import boomboxIcon from '../assets/misc/boombox.svg';
import themeMusic from '../assets/music/theme.mp3';
import './MusicPlayer.css';

// Create a global audio controller
class GlobalAudioController {
    private static instance: GlobalAudioController;
    private isEnabled: boolean = true;

    private constructor() {}

    public static getInstance(): GlobalAudioController {
        if (!GlobalAudioController.instance) {
            GlobalAudioController.instance = new GlobalAudioController();
        }
        return GlobalAudioController.instance;
    }

    public setEnabled(enabled: boolean) {
        this.isEnabled = enabled;
    }

    public playAudio(audio: HTMLAudioElement, volume: number = 0.5) {
        if (!this.isEnabled) return;
        
        audio.volume = volume;
        
        // Just play/resume the audio
        audio.play().catch(() => {
            // Silently handle autoplay errors
        });
    }
}

export const audioController = GlobalAudioController.getInstance();

interface AudioControllerProps {
    track?: string;
    currentFloor?: number;
}

const AudioController: React.FC<AudioControllerProps> = ({ track }) => {
    const [isEnabled, setIsEnabled] = useState(true);
    const audioRef = useRef<HTMLAudioElement | null>(null);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio(themeMusic);
            audioRef.current.loop = true;
            audioRef.current.volume = 0.5;

            if (isEnabled) {
                audioController.playAudio(audioRef.current);
            }
        }

        return () => {
            if (audioRef.current) {
                audioRef.current.pause();
                audioRef.current.remove();
                audioRef.current = null;
            }
        };
    }, []);

    const toggleAudio = async () => {
        const newEnabledState = !isEnabled;
        if (audioRef.current) {
            if (newEnabledState) {
                // Resume from where it was paused
                audioRef.current.play().catch(() => {
                    // Silently handle autoplay errors
                });
            } else {
                audioRef.current.pause();
            }
        }
        audioController.setEnabled(newEnabledState);
        setIsEnabled(newEnabledState);
    };

    return (
        <div className="music-player">
            <button 
                className={`music-toggle ${isEnabled ? 'playing' : ''}`}
                onClick={toggleAudio}
                title={isEnabled ? "Disable audio" : "Enable audio"}
            >
                <img src={boomboxIcon} alt="Toggle audio" />
            </button>
        </div>
    );
};

export default AudioController;