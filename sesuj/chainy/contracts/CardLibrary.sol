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
               cardId != CARD_ID_READ_SCRIPTURE && 
               cardId != CARD_ID_SEEK_GUIDANCE;
    }

    function isUnimplementedCard(uint8 cardId) internal pure returns (bool) {
        return cardId == CARD_ID_PREACH ||
               cardId == CARD_ID_BALANCE ||
               cardId == CARD_ID_UNVEIL ||
               cardId == CARD_ID_READ_SCRIPTURE ||
               cardId == CARD_ID_SEEK_GUIDANCE ||
               cardId == CARD_ID_DIVINE_WRATH;
    }

    function getRewardPair(uint8 lastChosen, uint8 currentFloor) internal pure returns (uint8, uint8) {
        if (currentFloor == 1) { // First floor
            return (CARD_ID_UNFOLD_TRUTH, CARD_ID_PREACH);
        } else if (lastChosen == CARD_ID_UNFOLD_TRUTH) {
            return (CARD_ID_PREACH, CARD_ID_BALANCE);
        } else if (lastChosen == CARD_ID_PREACH) {
            return (CARD_ID_UNFOLD_TRUTH, CARD_ID_BALANCE);
        } else if (lastChosen == CARD_ID_BALANCE) {
            return (CARD_ID_UNVEIL, CARD_ID_READ_SCRIPTURE);
        } else if (lastChosen == CARD_ID_UNVEIL) {
            return (CARD_ID_READ_SCRIPTURE, CARD_ID_SEEK_GUIDANCE);
        } else if (lastChosen == CARD_ID_READ_SCRIPTURE) {
            return (CARD_ID_UNVEIL, CARD_ID_SEEK_GUIDANCE);
        } else if (lastChosen == CARD_ID_SEEK_GUIDANCE) {
            return (CARD_ID_SACRED_RITUAL, CARD_ID_DIVINE_WRATH);
        } else if (lastChosen == CARD_ID_SACRED_RITUAL) {
            return (CARD_ID_DIVINE_WRATH, CARD_ID_EXPLODICATE);
        } else if (lastChosen == CARD_ID_DIVINE_WRATH) {
            return (CARD_ID_SACRED_RITUAL, CARD_ID_EXPLODICATE);
        }
        return (0, 0); // Should never happen
    }
} 