// Import the central audio controller
import { audioController } from '../components/MusicPlayer';

// Import enemy sound files
import enemyAttackSound from '../assets/soundeffects/enemy_attack.wav';
import enemyBlockSound from '../assets/soundeffects/enemy_block.wav';
import enemyBuffSound from '../assets/soundeffects/enemy_buff.wav';
import enemyHealSound from '../assets/soundeffects/enemy_heal.wav';
import enemyDeathSound from '../assets/soundeffects/enemy_death.wav';
import enemyBiteSound from '../assets/soundeffects/enemy_bite.wav';
import enemyTauntSound from '../assets/soundeffects/enemy_taunt.wav';
import enemyTurnSound from '../assets/soundeffects/enemy_turn.wav';
import playerTurnSound from '../assets/soundeffects/player_turn.wav';
import heroDeathSound from '../assets/soundeffects/hero_death.wav';
import victorySound from '../assets/soundeffects/victory.wav';
import defeatSound from '../assets/soundeffects/defeat.wav';

// Import cards data
import cardsData from '../../../shared/cards.json';

// Map special events to their sound files
const EVENT_SOUNDS: Record<string, string> = {
    'enemyDeath': enemyDeathSound,
    'heroDeath': heroDeathSound,
    'victory': victorySound,
    'defeat': defeatSound,
    'enemyTurn': enemyTurnSound,
    'playerTurn': playerTurnSound
};

// Map intent types to their sound files
const INTENT_SOUNDS: Record<number, string> = {
    1000: enemyBlockSound,  // Block
    1002: enemyHealSound,   // Heal
    1003: enemyBuffSound,   // Buff
    1005: enemyHealSound,   // Heal All
    1006: enemyBiteSound    // Vampiric Bite
};

// Default sounds
const DEFAULT_ATTACK_SOUND = enemyAttackSound;
const DEFAULT_TAUNT_SOUND = enemyTauntSound;

interface AudioCache {
    audio: HTMLAudioElement;
    isPlaying: boolean;
    lastPlayedTime: number;
}

export class SoundEffectManager {
    private static instance: SoundEffectManager;
    private audioCache: Map<string, AudioCache> = new Map();
    private cardSounds: Map<string, string> = new Map();
    private roomSpecificSounds: Map<string, string> = new Map();
    private enemyHasTaunted: Set<string> = new Set(); // Track which enemies have taunted
    private readonly CLEANUP_DELAY = 500; // ms to wait before cleaning up audio
    private readonly MIN_REPLAY_DELAY = 50; // ms to wait before playing the same sound again
    private readonly MAX_ROOMS = 10;
    private readonly MAX_ENEMIES_PER_ROOM = 10;
    private readonly DEFAULT_VOLUME = 0.5;
    private readonly TURN_VOLUME = 0.8;

    private constructor() {
        this.loadCardSounds();
    }

    private async tryLoadRoomSpecificSound(room: number, enemy: number, type: string): Promise<string | null> {
        // Validate room and enemy numbers
        if (room < 0 || room >= this.MAX_ROOMS || enemy < 0 || enemy >= this.MAX_ENEMIES_PER_ROOM) {
            return null;
        }

        const soundName = `room_${room}_enemy_${enemy}_${type}`;
        
        // Check if we already have this sound cached
        const cachedSound = this.roomSpecificSounds.get(soundName);
        if (cachedSound) {
            return cachedSound;
        }

        try {
            // Try to dynamically import the sound file
            const soundModule = await import(`../assets/soundeffects/${soundName}.wav`);
            const soundPath = soundModule.default;
            
            // Cache the sound path
            this.roomSpecificSounds.set(soundName, soundPath);
            
            // Create and cache the audio element
            this.createAndCacheAudio(soundPath);
            
            return soundPath;
        } catch (error) {
            // If the sound file doesn't exist, return null silently
            return null;
        }
    }

    private async getEnemySound(room: number, enemy: number, type: string, defaultSound: string): Promise<string> {
        const roomSound = await this.tryLoadRoomSpecificSound(room, enemy, type);
        return roomSound || defaultSound;
    }

    private async loadCardSounds(): Promise<void> {
        for (const card of cardsData.cards) {
            try {
                // Try to load the sound file based on card name
                const soundFileName = card.name.toLowerCase().replace(/\s+/g, '_');
                const soundModule = await import(`../assets/soundeffects/${soundFileName}.wav`);
                this.cardSounds.set(card.name.toLowerCase(), soundModule.default);
                // Preload the audio
                this.createAndCacheAudio(soundModule.default);
            } catch (error) {
                // If sound file doesn't exist, load default sound
                const defaultSound = await import('../assets/soundeffects/smite.wav');
                this.cardSounds.set(card.name.toLowerCase(), defaultSound.default);
                this.createAndCacheAudio(defaultSound.default);
            }
        }

        // Preload event sounds
        Object.values(EVENT_SOUNDS).forEach(soundPath => {
            this.createAndCacheAudio(soundPath);
        });

        // Preload intent sounds and default attack sound
        Object.values(INTENT_SOUNDS).forEach(soundPath => {
            this.createAndCacheAudio(soundPath);
        });
        this.createAndCacheAudio(DEFAULT_ATTACK_SOUND);
    }

    public static getInstance(): SoundEffectManager {
        if (!SoundEffectManager.instance) {
            SoundEffectManager.instance = new SoundEffectManager();
        }
        return SoundEffectManager.instance;
    }

    private createAndCacheAudio(soundPath: string): void {
        if (!this.audioCache.has(soundPath)) {
            const audio = new Audio(soundPath);
            audio.volume = this.DEFAULT_VOLUME;
            this.audioCache.set(soundPath, {
                audio,
                isPlaying: false,
                lastPlayedTime: 0
            });
        }
    }

    private async playSound(soundPath: string, volume: number = this.DEFAULT_VOLUME): Promise<void> {
        if (!soundPath) return;

        // Get or create cached audio instance
        let cache = this.audioCache.get(soundPath);
        if (!cache) {
            const audio = new Audio(soundPath);
            cache = {
                audio,
                isPlaying: false,
                lastPlayedTime: 0
            };
            this.audioCache.set(soundPath, cache);
        }

        // Check replay delay
        const now = Date.now();
        if (now - cache.lastPlayedTime < this.MIN_REPLAY_DELAY) {
            return;
        }
        cache.lastPlayedTime = now;

        // Reset the audio to start and play through controller
        cache.audio.currentTime = 0;
        audioController.playAudio(cache.audio, volume);
    }

    public getCardSoundEffect(cardName: string): { soundPath: string; volume: number } {
        const defaultSound = this.cardSounds.get('holy_fire') || '';
        const soundPath = this.cardSounds.get(cardName.toLowerCase()) || defaultSound;
        return { soundPath, volume: this.DEFAULT_VOLUME };
    }

    public async playIntentSound(intent: number, room?: number, enemy?: number): Promise<void> {
        let soundPath;
        
        // For regular attacks (intent < 1000)
        if (intent < 1000) {
            if (room !== undefined && enemy !== undefined) {
                soundPath = await this.getEnemySound(room, enemy, 'attack', DEFAULT_ATTACK_SOUND);
            } else {
                soundPath = DEFAULT_ATTACK_SOUND;
            }
        } 
        // For special intents
        else {
            const defaultSound = INTENT_SOUNDS[intent] || DEFAULT_ATTACK_SOUND;
            if (room !== undefined && enemy !== undefined) {
                const intentType = this.getIntentType(intent);
                soundPath = await this.getEnemySound(room, enemy, intentType, defaultSound);
            } else {
                soundPath = defaultSound;
            }
        }

        await this.playSound(soundPath);
    }

    private getIntentType(intent: number): string {
        switch (intent) {
            case 1000: return 'block';
            case 1002: return 'heal';
            case 1003: return 'buff';
            case 1005: return 'heal';
            case 1006: return 'bite';
            default: return 'attack';
        }
    }

    public async playTauntSound(room: number, enemy: number): Promise<void> {
        const enemyKey = `room_${room}_enemy_${enemy}`;
        
        if (!this.enemyHasTaunted.has(enemyKey)) {
            const soundPath = await this.getEnemySound(room, enemy, 'taunt', DEFAULT_TAUNT_SOUND);
            await this.playSound(soundPath);
            this.enemyHasTaunted.add(enemyKey);
        }
    }

    // Add method to reset taunt tracking (useful for new games/rooms)
    public resetTauntTracking(): void {
        this.enemyHasTaunted.clear();
    }

    public async playEventSound(eventName: string, room?: number, enemy?: number): Promise<void> {
        let soundPath;
        
        if (eventName === 'enemyDeath' && room !== undefined && enemy !== undefined) {
            soundPath = await this.getEnemySound(room, enemy, 'outro', EVENT_SOUNDS[eventName]);
        } else {
            soundPath = EVENT_SOUNDS[eventName];
        }
        
        if (!soundPath) {
            return;
        }
        
        if (!this.audioCache.has(soundPath)) {
            this.createAndCacheAudio(soundPath);
        }
        
        const volume = (eventName === 'enemyTurn' || eventName === 'playerTurn') ? this.TURN_VOLUME : this.DEFAULT_VOLUME;
        await this.playSound(soundPath, volume);
    }

    public async playCardSound(cardName: string): Promise<void> {
        const { soundPath } = this.getCardSoundEffect(cardName);
        await this.playSound(soundPath);
    }

    public async playIntroSound(room: number, enemy: number): Promise<void> {
        const soundPath = await this.getEnemySound(room, enemy, 'intro', DEFAULT_TAUNT_SOUND);
        await this.playSound(soundPath);
    }
}

// Export a singleton instance
export const soundEffectManager = SoundEffectManager.getInstance();