// Import all sound files
import smiteSound from '../assets/soundeffects/smite.wav';
import enemyAttackSound from '../assets/soundeffects/enemy_attack.wav';
import enemyBlockSound from '../assets/soundeffects/enemy_block.wav';
import enemyBuffSound from '../assets/soundeffects/enemy_buff.wav';
import enemyHealSound from '../assets/soundeffects/enemy_heal.wav';

// Map of sound file names to their imported paths
const soundFiles: { [key: string]: string } = {
    'smite.wav': smiteSound,
    'enemy_attack.wav': enemyAttackSound,
    'enemy_block.wav': enemyBlockSound,
    'enemy_buff.wav': enemyBuffSound,
    'enemy_heal.wav': enemyHealSound
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

    public getCardSoundEffect(cardId: string): { soundPath: string; volume: number } {
        // Use the imported sound file directly
        return {
            soundPath: smiteSound,
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