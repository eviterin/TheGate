// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

library CardEffects {
    function dealDamageToHero(uint8 damage, uint8 currentBlock, uint8 currentHealth) internal pure returns (uint8 newHealth, uint8 newBlock) {
        newBlock = currentBlock;
        newHealth = currentHealth;
        
        if (newBlock >= damage) {
            newBlock -= damage;
        } else {
            uint8 newDamage = damage - newBlock;
            newBlock = 0;
            
            if (newDamage >= newHealth) {
                newHealth = 0;
            } else {
                newHealth -= newDamage;
            }
        }
        
        return (newHealth, newBlock);
    }

    function dealDamageToEnemy(uint16 damage, uint16 blockAmount, uint16 currentHealth) internal pure returns (uint16 newHealth, uint16 newBlock, bool isDead) {
        newBlock = blockAmount;
        newHealth = currentHealth;
        
        if (newBlock >= damage) {
            newBlock -= damage;
            return (newHealth, newBlock, false);
        }
        
        uint16 remainingDamage = damage - newBlock;
        newBlock = 0;
        
        if (currentHealth <= remainingDamage) {
            newHealth = 0;
            return (newHealth, newBlock, true);
        } else {
            newHealth -= remainingDamage;
            return (newHealth, newBlock, false);
        }
    }

    function healHero(uint8 healAmount, uint8 currentHealth, uint8 maxHealth) internal pure returns (uint8 newHealth) {
        if (currentHealth + healAmount > maxHealth) {
            return maxHealth;
        } else {
            return currentHealth + healAmount;
        }
    }
} 