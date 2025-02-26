// Client-side enemy turn processing utilities

import { processEnemyIntent } from './damageUtils';

/**
 * Process an entire enemy turn and predict the results
 * @param gameState Current game state
 * @returns Updated game state after all enemies act
 */
export const predictEnemyTurn = (gameState: any): {
  newEnemyHealth: number[];
  newEnemyBlock: number[];
  newHeroHealth: number;
  newHeroBlock: number;
  animations: Array<{
    enemyIndex: number;
    intent: number;
    damageToHero: number;
  }>;
} => {
  // Clone state to avoid mutations
  let enemyHealth = [...gameState.enemyCurrentHealth];
  let enemyBlock = [...gameState.enemyBlock];
  let heroHealth = gameState.currentHealth;
  let heroBlock = gameState.currentBlock;
  
  // Track animations to play
  const animations = [];
  
  // Process each enemy's intent
  for (let i = 0; i < gameState.enemyTypes.length; i++) {
    if (enemyHealth[i] <= 0) continue; // Skip dead enemies
    
    const intent = gameState.enemyIntents[i];
    const buff = gameState.enemyBuffs[i] || 0;
    const maxHealth = gameState.enemyMaxHealth[i];
    
    // Process this enemy's intent
    const result = processEnemyIntent(
      intent,
      intent, // Pass intent as value too
      enemyBlock[i],
      enemyHealth[i],
      maxHealth,
      heroHealth,
      heroBlock,
      buff
    );
    
    // Record animation
    animations.push({
      enemyIndex: i,
      intent,
      damageToHero: result.damageToHero
    });
    
    // Update state
    enemyBlock[i] = result.newEnemyBlock;
    enemyHealth[i] = result.newEnemyHealth;
    heroHealth = result.newHeroHealth;
    heroBlock = result.newHeroBlock;
    
    // Special case for INTENT_HEAL_ALL (1005)
    if (intent === 1005) {
      // Update health for all alive enemies
      for (let j = 0; j < enemyHealth.length; j++) {
        if (j !== i && enemyHealth[j] > 0) {
          enemyHealth[j] = Math.min(gameState.enemyMaxHealth[j], enemyHealth[j] + 5);
        }
      }
    }
  }
  
  return {
    newEnemyHealth: enemyHealth,
    newEnemyBlock: enemyBlock,
    newHeroHealth: heroHealth,
    newHeroBlock: heroBlock,
    animations
  };
};

/**
 * Predict new enemy intents for the next turn
 * @param gameState Current game state
 * @returns Predicted new intents for each enemy
 */
export const predictNewEnemyIntents = (gameState: any): number[] => {
  // This is difficult to predict precisely as it depends on the contract's algorithm
  // and may use randomness based on block timestamp
  
  // For now, just return existing intents but with a flag to indicate they're predictions
  return gameState.enemyIntents.map(intent => intent);
}; 