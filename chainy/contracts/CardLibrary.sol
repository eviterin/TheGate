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
    uint8 constant CARD_ID_RADIANCE = 12;
    uint8 constant CARD_ID_RESOLVE = 13;
    uint8 constant CARD_ID_BRACE = 14;

    function requiresTarget(uint8 cardId) internal pure returns (bool) {
        return cardId != CARD_ID_PRAY && 
               cardId != CARD_ID_SACRED_RITUAL &&
               cardId != CARD_ID_SEEK_GUIDANCE &&
               cardId != CARD_ID_UNVEIL &&
               cardId != CARD_ID_RADIANCE &&
               cardId != CARD_ID_RESOLVE &&
               cardId != CARD_ID_BRACE;
    }

    function isUnimplementedCard(uint8) internal pure returns (bool) {
        return false;
    }

    function getRewardPair(uint8 lastChosen, uint8 secondLastChosen, uint8 currentFloor) internal pure returns (uint8, uint8) {
        // Starting deck: 2x Smite, 2x Pray, 1x Preach
        
        if (currentFloor == 1) {
            // First choice: Divine Wrath or Explodicate
            return (CARD_ID_DIVINE_WRATH, CARD_ID_EXPLODICATE);
        }
        
        if (currentFloor == 2) {
            // Second choice: Balance the Scales or the card not chosen from floor 1
            if (lastChosen == CARD_ID_DIVINE_WRATH) {
                return (CARD_ID_BALANCE, CARD_ID_EXPLODICATE);
            } else {
                return (CARD_ID_BALANCE, CARD_ID_DIVINE_WRATH);
            }
        }
        
        if (currentFloor == 3) {
            // Third choice: Resolve or Brace (fixed options)
            return (CARD_ID_RESOLVE, CARD_ID_BRACE);
        }
        
        if (currentFloor == 4) {
            // Fourth choice: Unfold Truth or the card not chosen from floor 2
            if (lastChosen == CARD_ID_BALANCE) {
                // Player chose Balance on floor 2
                // Offer the card they didn't take from floor 1
                if (secondLastChosen == CARD_ID_DIVINE_WRATH) {
                    return (CARD_ID_UNFOLD_TRUTH, CARD_ID_EXPLODICATE);
                } else {
                    return (CARD_ID_UNFOLD_TRUTH, CARD_ID_DIVINE_WRATH);
                }
            } else {
                // Player chose either Divine Wrath or Explodicate on floor 2
                return (CARD_ID_UNFOLD_TRUTH, CARD_ID_BALANCE);
            }
        }
        
        if (currentFloor == 5) {
            // Fifth choice: Seek Guidance or Sacred Ritual (fixed options)
            return (CARD_ID_SEEK_GUIDANCE, CARD_ID_SACRED_RITUAL);
        }
        
        if (currentFloor == 6) {
            // Sixth choice: Read Scripture or the card not chosen from floor 4
            if (lastChosen == CARD_ID_UNFOLD_TRUTH) {
                // Player chose Unfold Truth on floor 4
                // They were offered either Divine Wrath, Explodicate, or Balance as the second option
                // We can tell which one based on secondLastChosen
                if (secondLastChosen == CARD_ID_BALANCE) {
                    // On floor 2, they chose Balance, so on floor 4 they got either Divine Wrath or Explodicate
                    // For simplicity, offer Explodicate (a reasonable approximation)
                    return (CARD_ID_READ_SCRIPTURE, CARD_ID_EXPLODICATE);
                } else {
                    // On floor 2, they chose Divine Wrath or Explodicate, so on floor 4 they got Balance
                    return (CARD_ID_READ_SCRIPTURE, CARD_ID_BALANCE);
                }
            } else {
                // Player chose the other option on floor 4, offer Unfold Truth
                return (CARD_ID_READ_SCRIPTURE, CARD_ID_UNFOLD_TRUTH);
            }
        }
        
        if (currentFloor == 7) {
            // Seventh choice: Resolve or Brace (fixed options)
            return (CARD_ID_RESOLVE, CARD_ID_BRACE);
        }
        
        if (currentFloor == 8) {
            // Eighth choice: Radiance or Unveil (fixed options)
            return (CARD_ID_RADIANCE, CARD_ID_UNVEIL);
        }
        
        if (currentFloor == 9) {
            // Ninth choice: Seek Guidance or Sacred Ritual (fixed options)
            return (CARD_ID_SEEK_GUIDANCE, CARD_ID_SACRED_RITUAL);
        }
        
        // Fallback for floor 10 or invalid floors
        return (CARD_ID_SMITE, CARD_ID_PRAY);
    }

    function generateRewards(uint8 lastChosenCard, uint8 secondLastChosenCard, uint8 currentFloor) internal pure returns (uint8[] memory) {
        (uint8 reward1, uint8 reward2) = getRewardPair(lastChosenCard, secondLastChosenCard, currentFloor);
        uint8[] memory rewards = new uint8[](2);
        rewards[0] = reward1;
        rewards[1] = reward2;
        return rewards;
    }
} 