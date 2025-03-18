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

    // getRewardPair ensures every non-starter card (IDs 3-11) is available as a reward
    // through some path in the reward tree, making all cards obtainable during gameplay.
    function getRewardPair(uint8 lastChosen, uint8 currentFloor) internal pure returns (uint8, uint8) {
        if (currentFloor == 1) {
            return (CARD_ID_UNFOLD_TRUTH, CARD_ID_BALANCE); // (3, 5)
        } else if (currentFloor == 2) {
            return (CARD_ID_PREACH, CARD_ID_SEEK_GUIDANCE); // (4, 8)
        } else if (currentFloor == 3) {
            return (CARD_ID_READ_SCRIPTURE, CARD_ID_UNVEIL); // (7, 6)
        } else if (currentFloor == 4) {
            return (CARD_ID_SEEK_GUIDANCE, CARD_ID_PREACH); // (8, 4)
        } else if (currentFloor == 5) {
            return (CARD_ID_UNVEIL, CARD_ID_BALANCE); // (6, 5)
        } else if (currentFloor == 6) {
            return (CARD_ID_READ_SCRIPTURE, CARD_ID_UNFOLD_TRUTH); // (7, 3)
        } else if (currentFloor == 7) {
            return (CARD_ID_SACRED_RITUAL, CARD_ID_DIVINE_WRATH); // (9, 10)
        } else if (currentFloor == 8) {
            return (CARD_ID_EXPLODICATE, CARD_ID_SACRED_RITUAL); // (11, 9)
        } else if (currentFloor == 9) {
            return (CARD_ID_DIVINE_WRATH, CARD_ID_EXPLODICATE); // (10, 11)
        }
        return (0, 0); // Fallback, unreachable with 9 rewards (10 floors)
    }

    function generateRewards(uint8 lastChosenCard, uint8 currentFloor) internal pure returns (uint8[] memory) {
        (uint8 reward1, uint8 reward2) = getRewardPair(lastChosenCard, currentFloor);
        uint8[] memory rewards = new uint8[](2);
        rewards[0] = reward1;
        rewards[1] = reward2;
        return rewards;
    }
} 