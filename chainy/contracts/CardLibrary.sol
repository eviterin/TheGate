// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

library CardLibrary {
    uint8 constant CARD_ID_NONE = 0;
    uint8 constant CARD_ID_SMITE = 1;
    uint8 constant CARD_ID_PRAY = 2;
    uint8 constant CARD_ID_UNFOLD_TRUTH = 3;
    uint8 constant CARD_ID_PREACH = 4;
    uint8 constant CARD_ID_BALANCE = 5;
    uint8 constant CARD_ID_UNVEIL = 6;
    uint8 constant CARD_ID_READ_SCRIPTURE = 7;
    uint8 constant CARD_ID_SEEK_GUIDANCE = 8;
    uint8 constant CARD_ID_SACRED_RITUAL = 9;
    uint8 constant CARD_ID_DIVINE_WRATH = 10;
    uint8 constant CARD_ID_EXPLODICATE = 11;

    function requiresTarget(uint8 cardId) internal pure returns (bool) {
        return cardId != CARD_ID_PRAY && 
               cardId != CARD_ID_SACRED_RITUAL &&
               cardId != CARD_ID_SEEK_GUIDANCE &&
               cardId != CARD_ID_UNVEIL;
    }

    function isUnimplementedCard(uint8) internal pure returns (bool) {
        return false;
    }


    function getRewardPair(uint8 lastChosen, uint8 currentFloor) internal pure returns (uint8, uint8) {
        // Starting deck: 2x Smite, 2x Pray, 1x Preach
        
        if (currentFloor == 1) {
            // First choice: Divine Wrath or Explodicate
            return (CARD_ID_DIVINE_WRATH, CARD_ID_EXPLODICATE);
        }
        
        if (currentFloor == 2) {
            // Second choice: Balance or the card not chosen from floor 1
            if (lastChosen == CARD_ID_DIVINE_WRATH) {
                return (CARD_ID_BALANCE, CARD_ID_EXPLODICATE);
            } else if (lastChosen == CARD_ID_EXPLODICATE) {
                return (CARD_ID_BALANCE, CARD_ID_DIVINE_WRATH);
            }
        }
        
        if (currentFloor == 3) {
            // Third choice: Unfold Truth or the card not chosen from floor 2
            if (lastChosen == CARD_ID_BALANCE) {
                if (currentFloor == 1) {
                    return (CARD_ID_UNFOLD_TRUTH, CARD_ID_DIVINE_WRATH);
                } else {
                    return (CARD_ID_UNFOLD_TRUTH, CARD_ID_EXPLODICATE);
                }
            } else {
                return (CARD_ID_UNFOLD_TRUTH, CARD_ID_BALANCE);
            }
        }
        
        if (currentFloor == 4) {
            // Fourth choice: Read Scripture or the card not chosen from floor 3
            if (lastChosen == CARD_ID_UNFOLD_TRUTH) {
                return (CARD_ID_READ_SCRIPTURE, CARD_ID_BALANCE);
            } else {
                return (CARD_ID_READ_SCRIPTURE, CARD_ID_UNFOLD_TRUTH);
            }
        }
        
        if (currentFloor == 5) {
            // Fifth choice: Seek Guidance or Sacred Ritual
            return (CARD_ID_SEEK_GUIDANCE, CARD_ID_SACRED_RITUAL);
        }
        
        if (currentFloor == 6) {
            // Sixth choice: Unveil or the card not chosen from floor 4
            if (lastChosen == CARD_ID_READ_SCRIPTURE) {
                return (CARD_ID_UNVEIL, CARD_ID_BALANCE);
            } else {
                return (CARD_ID_UNVEIL, CARD_ID_READ_SCRIPTURE);
            }
        }
        
        if (currentFloor == 7 || currentFloor == 8) {
            // Seventh and Eighth choice: Smite or Pray
            return (CARD_ID_SMITE, CARD_ID_PRAY);
        }
        
        if (currentFloor == 9) {
            // Ninth choice: Seek Guidance or Sacred Ritual
            return (CARD_ID_SEEK_GUIDANCE, CARD_ID_SACRED_RITUAL);
        }
        
        // Fallback for floor 10 or invalid floors
        return (CARD_ID_SMITE, CARD_ID_PRAY);
    }

    function generateRewards(uint8 lastChosenCard, uint8 currentFloor) internal pure returns (uint8[] memory) {
        (uint8 reward1, uint8 reward2) = getRewardPair(lastChosenCard, currentFloor);
        uint8[] memory rewards = new uint8[](2);
        rewards[0] = reward1;
        rewards[1] = reward2;
        return rewards;
    }
} 