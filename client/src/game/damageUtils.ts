// Client-side damage prediction utilities that mirror the smart contract logic

import { soundEffectManager } from './SoundEffectManager';

/**
 * Calculate damage to enemy after applying block
 * @param damage Amount of damage being dealt
 * @param blockAmount Current block amount on the enemy
 * @param currentHealth Current enemy health
 * @returns Object containing new health, new block, and whether the enemy died
 */
export const calculateDamageToEnemy = (
  damage: number,
  blockAmount: number,
  currentHealth: number
): { newHealth: number; newBlock: number; isDead: boolean } => {
  let remainingDamage = damage;
  let newBlock = blockAmount;
  
  // Process block first
  if (newBlock > 0) {
    if (newBlock >= remainingDamage) {
      newBlock -= remainingDamage;
      return { newHealth: currentHealth, newBlock, isDead: false };
    }
    remainingDamage -= newBlock;
    newBlock = 0;
  }
  
  // Then process health
  let newHealth = currentHealth;
  if (newHealth <= remainingDamage) {
    newHealth = 0;
    soundEffectManager.playEventSound('enemyDeath');
    return { newHealth, newBlock, isDead: true };
  } else {
    newHealth -= remainingDamage;
    return { newHealth, newBlock, isDead: false };
  }
};

/**
 * Calculate direct damage to enemy bypassing block
 * @param damage Amount of damage being dealt
 * @param currentHealth Current enemy health
 * @returns Object containing new health and whether the enemy died
 */
export const calculateDirectDamageToEnemy = (
  damage: number,
  currentHealth: number
): { newHealth: number; isDead: boolean } => {
  let newHealth = currentHealth;
  if (newHealth <= damage) {
    newHealth = 0;
    soundEffectManager.playEventSound('enemyDeath');
    return { newHealth, isDead: true };
  } else {
    newHealth -= damage;
    return { newHealth, isDead: false };
  }
};

/**
 * Calculate damage to hero after applying block
 * @param damage Amount of damage being dealt
 * @param blockAmount Current hero block
 * @param currentHealth Current hero health
 * @returns Object containing new health and new block
 */
export const calculateDamageToHero = (
  damage: number,
  blockAmount: number,
  currentHealth: number
): { newHealth: number; newBlock: number } => {
  let newBlock = blockAmount;
  let newHealth = currentHealth;
  
  if (newBlock >= damage) {
    newBlock -= damage;
  } else {
    const remainingDamage = damage - newBlock;
    newBlock = 0;
    
    if (remainingDamage >= newHealth) {
      newHealth = 0;
    } else {
      newHealth -= remainingDamage;
    }
  }
  
  return { newHealth, newBlock };
};

/**
 * Process enemy intent and calculate result
 * @param intentType The type of intent (attack, block, etc)
 * @param intentValue The value associated with the intent
 * @param enemyBlock Current enemy block
 * @param enemyHealth Current enemy health
 * @param enemyMaxHealth Maximum enemy health
 * @param heroHealth Current hero health
 * @param heroBlock Current hero block
 * @param enemyBuff Current enemy buff value
 * @param allEnemiesHealth Array of current healths of all enemies
 * @param allEnemiesMaxHealth Array of maximum healths of all enemies
 * @returns Object containing updated stats after processing the intent
 */
export const processEnemyIntent = (
  intentType: number,
  intentValue: number,
  enemyBlock: number,
  enemyHealth: number,
  enemyMaxHealth: number,
  heroHealth: number,
  heroBlock: number,
  enemyBuff: number = 0,
  allEnemiesHealth?: number[],
  allEnemiesMaxHealth?: number[]
): {
  newEnemyBlock: number;
  newEnemyHealth: number;
  newHeroHealth: number;
  newHeroBlock: number;
  damageToHero: number;
  heroDied: boolean;
  allEnemiesNewHealth?: number[];
} => {
  // Get constants from shared data
  const INTENT_BLOCK_5 = 1000;
  const INTENT_BLOCK_AND_ATTACK = 1001;
  const INTENT_HEAL = 1002;
  const INTENT_ATTACK_BUFF = 1003;
  const INTENT_BLOCK_AND_HEAL = 1004;
  const INTENT_HEAL_ALL = 1005;
  const INTENT_VAMPIRIC_BITE = 1006;
  
  let newEnemyBlock = enemyBlock;
  let newEnemyHealth = enemyHealth;
  let newHeroHealth = heroHealth;
  let newHeroBlock = heroBlock;
  let damageToHero = 0;
  let heroDied = false;
  
  if (intentType === INTENT_BLOCK_5) {
    // Enemy blocks
    newEnemyBlock = 5;
  } else if (intentType === INTENT_BLOCK_AND_ATTACK) {
    // Enemy blocks and attacks
    newEnemyBlock = 5;
    damageToHero = 6 + enemyBuff;  // Add buff to base damage
    
    // Calculate damage to hero
    const result = calculateDamageToHero(damageToHero, newHeroBlock, newHeroHealth);
    newHeroHealth = result.newHealth;
    newHeroBlock = result.newBlock;
    heroDied = newHeroHealth <= 0;
  } else if (intentType === INTENT_HEAL) {
    // Enemy heals
    newEnemyHealth = Math.min(enemyMaxHealth, enemyHealth + 5);
  } else if (intentType === INTENT_ATTACK_BUFF) {
    // Enemy buffs attack (no damage calculation needed)
    // Buff logic handled separately
  } else if (intentType === INTENT_BLOCK_AND_HEAL) {
    // Enemy blocks and heals
    newEnemyBlock = 5;
    newEnemyHealth = Math.min(enemyMaxHealth, enemyHealth + 5);
  } else if (intentType === INTENT_HEAL_ALL) {
    // Heal all enemies for 5 HP
    if (allEnemiesHealth && allEnemiesMaxHealth) {
      const healedHealth = allEnemiesHealth.map((health, i) => 
        Math.min(allEnemiesMaxHealth[i], health + 5)
      );
      newEnemyHealth = healedHealth[enemyHealth] || enemyHealth;
      return {
        newEnemyBlock,
        newEnemyHealth,
        newHeroHealth,
        newHeroBlock,
        damageToHero,
        heroDied,
        allEnemiesNewHealth: healedHealth
      };
    }
    // Fallback if arrays not provided
    newEnemyHealth = Math.min(enemyMaxHealth, enemyHealth + 5);
  } else if (intentType === INTENT_VAMPIRIC_BITE) {
    // Vampiric bite - deal 5 damage and heal for 5
    damageToHero = 5;
    
    // Calculate damage to hero
    const result = calculateDamageToHero(damageToHero, newHeroBlock, newHeroHealth);
    newHeroHealth = result.newHealth;
    newHeroBlock = result.newBlock;
    heroDied = newHeroHealth <= 0;
    
    // Heal enemy
    newEnemyHealth = Math.min(enemyMaxHealth, enemyHealth + 5);
  } else if (intentType > 0 && intentType < 1000) {
    // Regular attack intent
    damageToHero = intentType + enemyBuff;
    
    // Calculate damage to hero
    const result = calculateDamageToHero(damageToHero, newHeroBlock, newHeroHealth);
    newHeroHealth = result.newHealth;
    newHeroBlock = result.newBlock;
    heroDied = newHeroHealth <= 0;
  }
  
  return {
    newEnemyBlock,
    newEnemyHealth,
    newHeroHealth,
    newHeroBlock,
    damageToHero,
    heroDied,
    allEnemiesNewHealth: undefined
  };
};

/**
 * Client-side prediction for playing a card
 * @param cardId Card being played
 * @param targetIndex Target enemy index
 * @param gameState Current game state
 * @returns Updated game state after card play
 */
export const predictCardEffect = (
  cardId: number,
  targetIndex: number,
  gameState: any
): {
  enemyHealth: number[];
  enemyBlock: number[];
  heroHealth: number;
  heroBlock: number;
  manaSpent: number;
  enemyDied: boolean;
  heroDied: boolean;
} => {
  // Clone state arrays to avoid mutations
  const enemyCurrentHealth = gameState.enemyCurrentHealth;
  const enemyBlock = gameState.enemyBlock;
  let heroHealth = gameState.currentHealth;
  let heroBlock = gameState.currentBlock;
  let manaSpent = 0;
  let enemyDied = false;
  let heroDied = false;
  
  // Apply card effects based on card ID
  switch (cardId) {
    case 1: // Smite - Deal 6 damage
      manaSpent = 1;
      const smiteResult = calculateDamageToEnemy(6, enemyBlock[targetIndex], enemyCurrentHealth[targetIndex]);
      enemyCurrentHealth[targetIndex] = smiteResult.newHealth;
      enemyBlock[targetIndex] = smiteResult.newBlock;
      enemyDied = smiteResult.isDead;
      break;
      
    case 2: // Pray - Gain 6 block
      manaSpent = 1;
      heroBlock += 6;
      break;
      
    case 3: // Unfold Truth - Deal 7 damage. Draw a card.
      manaSpent = 1;
      const unfoldResult = calculateDamageToEnemy(7, enemyBlock[targetIndex], enemyCurrentHealth[targetIndex]);
      enemyCurrentHealth[targetIndex] = unfoldResult.newHealth;
      enemyBlock[targetIndex] = unfoldResult.newBlock;
      enemyDied = unfoldResult.isDead;
      // Card draw handled separately
      break;
      
    case 4: // Preach - Deal 8 damage to ALL enemies
      manaSpent = 2;
      // Process for all enemies
      enemyDied = false;
      for (let i = 0; i < enemyCurrentHealth.length; i++) {
        if (enemyCurrentHealth[i] > 0) {
          const preachResult = calculateDamageToEnemy(8, enemyBlock[i], enemyCurrentHealth[i]);
          enemyCurrentHealth[i] = preachResult.newHealth;
          enemyBlock[i] = preachResult.newBlock;
          if (preachResult.isDead) enemyDied = true;
        }
      }
      break;
      
    case 5: // Balance the Scales - Deal 5 damage. Gain 5 block.
      manaSpent = 1;
      heroBlock += 5;
      const balanceResult = calculateDamageToEnemy(5, enemyBlock[targetIndex], enemyCurrentHealth[targetIndex]);
      enemyCurrentHealth[targetIndex] = balanceResult.newHealth;
      enemyBlock[targetIndex] = balanceResult.newBlock;
      enemyDied = balanceResult.isDead;
      break;
      
    case 6: // Unveil - Gain 10 block. Draw 3 cards.
      manaSpent = 3;
      heroBlock += 10;
      // Card draw handled separately
      break;
      
    case 7: // Read Scripture - Deal 8 damage. If you have 4+ cards in hand, deal 8 more.
      manaSpent = 2;
      let damage = 8;
      // Use current hand size for the check
      const currentHandSize = gameState.hand?.length ?? 0;
      if (currentHandSize >= 4) {
        damage = 16;
      }
      const scriptureResult = calculateDamageToEnemy(damage, enemyBlock[targetIndex], enemyCurrentHealth[targetIndex]);
      enemyCurrentHealth[targetIndex] = scriptureResult.newHealth;
      enemyBlock[targetIndex] = scriptureResult.newBlock;
      enemyDied = scriptureResult.isDead;
      break;
      
    case 8: // Seek Guidance - Permanently gain 1 Faith.
      manaSpent = 1;
      // Note: maxMana increase handled in contract
      // Note: current mana increase handled in contract
      // Note: card removal handled in contract
      break;
      
    case 9: // Sacred Ritual - Gain 10 block. Heal 30 HP.
      manaSpent = 2;
      heroBlock += 10;
      heroHealth = Math.min(gameState.maxHealth, heroHealth + 30);
      break;
      
    case 10: // Divine Wrath - Deal 4 damage. Double if enemy at full HP.
      manaSpent = 1;
      const maxHealth = gameState.enemyMaxHealth[targetIndex];
      const currentHealth = enemyCurrentHealth[targetIndex];
      const isEnemyFull = currentHealth === maxHealth;
      const wrathDamage = isEnemyFull ? 8 : 4;
      const wrathResult = calculateDamageToEnemy(wrathDamage, enemyBlock[targetIndex], currentHealth);
      enemyCurrentHealth[targetIndex] = wrathResult.newHealth;
      enemyBlock[targetIndex] = wrathResult.newBlock;
      enemyDied = wrathResult.isDead;
      break;
      
    case 11: // Explodicate - Deal 4 damage. Ignores block.
      manaSpent = 1;
      const explodicateResult = calculateDirectDamageToEnemy(4, enemyCurrentHealth[targetIndex]);
      enemyCurrentHealth[targetIndex] = explodicateResult.newHealth;
      enemyDied = explodicateResult.isDead;
      break;
      
    case 12: // Radiance - Remove all block from all enemies (not targeted despite cards.json entry)
      manaSpent = 1;
      // Set block to 0 for all enemies
      for (let i = 0; i < enemyBlock.length; i++) {
        enemyBlock[i] = 0;
      }
      break;
      
    case 13: // Resolve - Heal 6 HP. Card is removed from deck after use.
      manaSpent = 1;
      heroHealth = Math.min(gameState.maxHealth, heroHealth + 6);
      // Card removal handled in contract
      break;
      
    case 14: // Brace - Gain 15 block. Card is removed from deck after use.
      manaSpent = 0; // Free card
      heroBlock += 15;
      // Card removal handled in contract
      break;
      
    default:
      // Unimplemented card (from contract fallback)
      if (gameState.currentMana >= 1) {
        manaSpent = 1;
        heroBlock += 6;
      }
      break;
  }
  
  // Check for hero death
  if (heroHealth <= 0) {
    soundEffectManager.playEventSound('heroDeath');
    heroDied = true;
  }

  return {
    enemyHealth: enemyCurrentHealth,
    enemyBlock,
    heroHealth,
    heroBlock,
    manaSpent,
    enemyDied,
    heroDied
  };
};

/**
 * Predict effects of playing multiple cards in sequence
 * @param plays Array of card plays (indices and targets)
 * @param gameState Current game state
 * @param cardData Card definitions
 * @returns Updated game state after all card plays
 */
export const predictMultipleCardEffects = (
  plays: Array<{ cardIndex: number; targetIndex: number }>,
  gameState: any,
  cardData: any[]
): {
  enemyHealth: number[];
  enemyBlock: number[];
  heroHealth: number;
  heroBlock: number;
  remainingMana: number;
  enemyDied: boolean;
} => {
  // Clone state to avoid mutations
  let enemyHealth = [...gameState.enemyCurrentHealth];
  let enemyBlock = [...gameState.enemyBlock];
  let heroHealth = gameState.currentHealth;
  let heroBlock = gameState.currentBlock;
  let remainingMana = gameState.currentMana;
  let enemyDied = false;
  
  // Keep track of what cards have been played to adjust indices
  const playedIndices: number[] = [];
  let remainingHandSize = gameState.hand.length;
  
  for (const play of plays) {
    // Adjust card index based on what's been played already
    const adjustedIndex = play.cardIndex - playedIndices.filter(i => i < play.cardIndex).length;
    
    // Get the actual card ID from the hand
    const cardId = gameState.hand[adjustedIndex];
    const targetIndex = play.targetIndex;
    
    // Find card data
    const card = cardData.find(c => c.numericId === cardId);
    if (!card || remainingMana < card.manaCost) continue;
    
    // Predict effect of this card
    const prediction = predictCardEffect(
      cardId,
      targetIndex,
      {
        ...gameState,
        enemyCurrentHealth: enemyHealth,
        enemyBlock: enemyBlock,
        currentHealth: heroHealth,
        currentBlock: heroBlock,
        currentMana: remainingMana,
        hand: { length: remainingHandSize } // Pass current hand size
      }
    );
    
    // Update state
    enemyHealth = prediction.enemyHealth;
    enemyBlock = prediction.enemyBlock;
    heroHealth = prediction.heroHealth;
    heroBlock = prediction.heroBlock;
    remainingMana -= prediction.manaSpent;
    if (prediction.enemyDied) enemyDied = true;
    
    // Record that we've played this card and update hand size
    playedIndices.push(play.cardIndex);
    remainingHandSize--;
  }
  
  return {
    enemyHealth,
    enemyBlock,
    heroHealth,
    heroBlock,
    remainingMana,
    enemyDied
  };
}; 