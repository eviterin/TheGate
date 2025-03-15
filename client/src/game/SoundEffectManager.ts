// Import enemy sound files
import enemyAttackSound from '../assets/soundeffects/enemy_attack.wav';
import enemyBlockSound from '../assets/soundeffects/enemy_block.wav';
import enemyBuffSound from '../assets/soundeffects/enemy_buff.wav';
import enemyHealSound from '../assets/soundeffects/enemy_heal.wav';
import enemyDeathSound from '../assets/soundeffects/enemy_death.wav';
import enemyBiteSound from '../assets/soundeffects/enemy_bite.wav';
import heroDeathSound from '../assets/soundeffects/hero_death.wav';
import victorySound from '../assets/soundeffects/victory.wav';
import enemyTurnSound from '../assets/soundeffects/enemy_turn.wav';
import playerTurnSound from '../assets/soundeffects/player_turn.wav';

// Import cards data
import cardsData from '../../../shared/cards.json';

// Map special events to their sound files
const EVENT_SOUNDS: Record<string, string> = {
    'enemyDeath': enemyDeathSound,
    'heroDeath': heroDeathSound,
    'victory': victorySound,
    'enemy_turn': enemyTurnSound,
    'player_turn': playerTurnSound
};

// Map intent types to their sound files
const INTENT_SOUNDS: Record<number, string> = {
    1000: enemyBlockSound,  // Block
    1002: enemyHealSound,   // Heal
    1003: enemyBuffSound,   // Buff
    1005: enemyHealSound,   // Heal All
    1006: enemyBiteSound    // Vampiric Bite
};

// Default attack sound for intents not in the mapping
const DEFAULT_ATTACK_SOUND = enemyAttackSound;

interface AudioCache {
    audio: HTMLAudioElement;
    isPlaying: boolean;
    lastPlayedTime: number;
}

export class SoundEffectManager {
    private static instance: SoundEffectManager;
    private audioCache: Map<string, AudioCache> = new Map();
    private cardSounds: Map<string, string> = new Map();
    private readonly CLEANUP_DELAY = 500; // ms to wait before cleaning up audio
    private readonly MIN_REPLAY_DELAY = 50; // ms to wait before playing the same sound again

    private constructor() {
        this.loadCardSounds();
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
            audio.volume = 0.5;
            this.audioCache.set(soundPath, {
                audio,
                isPlaying: false,
                lastPlayedTime: 0
            });
        }
    }

    private async playSound(soundPath: string): Promise<void> {
        if (!soundPath) {
            console.log('⚠️ No sound path provided');
            return;
        }

        const cache = this.audioCache.get(soundPath);
        if (!cache) {
            console.log(`⚠️ Sound not found in cache: ${soundPath}`);
            return;
        }

        const now = Date.now();
        if (now - cache.lastPlayedTime < this.MIN_REPLAY_DELAY) {
            console.log('⏱️ Skipping sound, too soon after last play');
            return;
        }

        try {
            // If the audio is currently playing, create a new instance
            if (cache.isPlaying) {
                const newAudio = new Audio(soundPath);
                newAudio.volume = 0.5;
                await newAudio.play();
                
                // Clean up the new audio instance after it's done
                newAudio.onended = () => {
                    newAudio.remove();
                };
            } else {
                cache.audio.currentTime = 0;
                cache.isPlaying = true;
                cache.lastPlayedTime = now;
                
                await cache.audio.play();
                
                // Set up cleanup after playing
                setTimeout(() => {
                    if (cache.isPlaying) {
                        cache.isPlaying = false;
                    }
                }, this.CLEANUP_DELAY);
            }
        } catch (error) {
            console.error('❌ Sound playback failed:', error);
            cache.isPlaying = false;
        }
    }

    public getCardSoundEffect(cardName: string): { soundPath: string; volume: number } {
        const defaultSound = this.cardSounds.get('holy_fire') || '';
        const soundPath = this.cardSounds.get(cardName.toLowerCase()) || defaultSound;
        return { soundPath, volume: 0.5 };
    }

    public getIntentSoundEffect(intent: number): { soundPath: string; volume: number } {
        const soundPath = intent < 1000 ? 
            DEFAULT_ATTACK_SOUND : 
            (INTENT_SOUNDS[intent] || DEFAULT_ATTACK_SOUND);
        return { soundPath, volume: 0.5 };
    }

    public async playEventSound(eventName: string): Promise<void> {
        const soundPath = EVENT_SOUNDS[eventName];
        if (!soundPath) {
            console.log(`⚠️ No sound found for event ${eventName}`);
            return;
        }
        await this.playSound(soundPath);
    }

    public async playCardSound(cardName: string): Promise<void> {
        const { soundPath } = this.getCardSoundEffect(cardName);
        await this.playSound(soundPath);
    }

    public async playIntentSound(intent: number): Promise<void> {
        const { soundPath } = this.getIntentSoundEffect(intent);
        await this.playSound(soundPath);
    }
}

// Export a singleton instance
export const soundEffectManager = SoundEffectManager.getInstance();