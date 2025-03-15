// Import card sound files
import smiteSound from '../assets/soundeffects/smite.wav';
import praySound from '../assets/soundeffects/pray.wav';

// Import enemy sound files
import enemyAttackSound from '../assets/soundeffects/enemy_attack.wav';
import enemyBlockSound from '../assets/soundeffects/enemy_block.wav';
import enemyBuffSound from '../assets/soundeffects/enemy_buff.wav';
import enemyHealSound from '../assets/soundeffects/enemy_heal.wav';

// Map card names (lowercase) to their sound files
const CARD_SOUNDS: Record<string, string> = {
    'smite': smiteSound,
    'pray': praySound,
    // Add more mappings as needed
};

export class SoundEffectManager {
    private static instance: SoundEffectManager;

    private constructor() {}

    public static getInstance(): SoundEffectManager {
        if (!SoundEffectManager.instance) {
            SoundEffectManager.instance = new SoundEffectManager();
        }
        return SoundEffectManager.instance;
    }

    public getCardSoundEffect(cardName: string): { soundPath: string; volume: number } {
        console.log('🎮 Getting sound for card name:', cardName);
        
        // Look up the sound in our mapping
        const soundPath = CARD_SOUNDS[cardName] || smiteSound;
        
        // Log which sound we're using
        if (CARD_SOUNDS[cardName]) {
            console.log(`✅ Found sound for ${cardName}`);
        } else {
            console.log(`⚠️ No sound found for ${cardName}, using fallback`);
        }
        
        console.log('🎵 Using sound path:', soundPath);
        
        return {
            soundPath,
            volume: 0.5
        };
    }

    public getIntentSoundEffect(intent: number): { soundPath: string; volume: number } {
        console.log('🎯 Getting sound for intent:', intent);
        
        let soundPath: string;
        // Determine sound based on intent number
        if (intent < 1000) {
            // Regular attack
            soundPath = enemyAttackSound;
            console.log('🗡️ Using attack sound');
        } else if (intent === 1000) {
            // Block
            soundPath = enemyBlockSound;
            console.log('🛡️ Using block sound');
        } else if (intent === 1002 || intent === 1005) {
            // Heal
            soundPath = enemyHealSound;
            console.log('💚 Using heal sound');
        } else if (intent === 1003) {
            // Buff
            soundPath = enemyBuffSound;
            console.log('💪 Using buff sound');
        } else {
            // Fallback
            soundPath = enemyAttackSound;
            console.log('⚠️ Unknown intent, falling back to attack sound');
        }

        console.log('🔊 Selected sound path:', soundPath);
        return {
            soundPath,
            volume: 0.5
        };
    }
}

// Export a singleton instance
export const soundEffectManager = SoundEffectManager.getInstance();