// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./CardLibrary.sol";
import "./DeckManager.sol";
import "./CardEffects.sol";
import "./IGameEncounters.sol";

library CardPlayer {
    using DeckManager for uint8[];
    
    // Constants for game run states
    uint8 constant RUN_STATE_NONE = 0;
    uint8 constant RUN_STATE_WHALE_ROOM = 1;
    uint8 constant RUN_STATE_ENCOUNTER = 2;
    uint8 constant RUN_STATE_CARD_REWARD = 3;
    uint8 constant RUN_STATE_DEATH = 4;
    uint8 constant RUN_STATE_VICTORY = 5;
    
    struct GameData {
        uint8 runState;
        uint8 currentFloor;
        uint8 maxHealth;
        uint8 currentHealth;
        uint8 currentBlock;
        uint8 currentMana;
        uint8 maxMana;
        uint8[] deck;
        uint8[] hand;
        uint8[] draw;
        uint8[] discard;
        uint8[] availableCardRewards;
        bool hasEnabledQuickTransactions;
        bool extraCardDrawEnabled;
        bool hasProtectionBlessing;
        uint8 lastChosenCard;
        uint8 secondLastChosenCard;
    }
    
    struct CardPlay {
        uint8 cardIndex;
        uint8 targetIndex;
    }

    function playCard(
        GameData storage data,
        IGameEncounters encounters,
        address player,
        uint8 playedCardIndex,
        uint8 targetIndex,
        function() returns (bool) checkWinConditionFunc
    ) internal returns (bool shouldReturn) {
        require(playedCardIndex < data.hand.length, "Invalid card index");
        uint8 playedCardID = data.hand[playedCardIndex];

        (uint8[] memory types,,uint16[] memory currentHealth,,,) = encounters.getEnemyData(player);

        if (CardLibrary.requiresTarget(playedCardID)) {
            require(targetIndex < types.length, "Invalid target");
        }

        if (data.currentMana >= 1 && CardLibrary.isUnimplementedCard(playedCardID)) {
            data.currentMana--;
            data.currentBlock += 6;
            DeckManager.discardCard(data.hand, data.discard, playedCardIndex);
            return true;
        }

        if (playedCardID == CardLibrary.CARD_ID_SMITE && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(player, targetIndex, 6)) {
                checkWinConditionFunc();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_PRAY && data.currentMana >= 1) {
            data.currentMana--;
            data.currentBlock += 6;
        } else if (playedCardID == CardLibrary.CARD_ID_UNFOLD_TRUTH && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(player, targetIndex, 7)) {
                checkWinConditionFunc();
            }
            DeckManager.drawCard(data.hand, data.draw, data.discard);
        } else if (playedCardID == CardLibrary.CARD_ID_PREACH && data.currentMana >= 2) {
            data.currentMana -= 2;
            bool anyKilled = false;
            for (uint i = 0; i < types.length; i++) {
                if (currentHealth[i] > 0) {
                    if (encounters.dealDamageToEnemy(player, uint8(i), 8)) {
                        anyKilled = true;
                    }
                }
            }
            if (anyKilled) {
                checkWinConditionFunc();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_SACRED_RITUAL && data.currentMana >= 2) {
            data.currentMana -= 2;
            data.currentBlock += 10;
            data.currentHealth = CardEffects.healHero(30, data.currentHealth, data.maxHealth);
            DeckManager.removeCardFromGame(data.hand, data.deck, playedCardIndex);
            return true;
        } else if (playedCardID == CardLibrary.CARD_ID_DIVINE_WRATH && data.currentMana >= 1) {
            data.currentMana--;
            (,uint16[] memory maxHealth, uint16[] memory enemyHealth,,,) = encounters.getEnemyData(player);
            uint8 damage = 4;
            if (enemyHealth[targetIndex] == maxHealth[targetIndex]) {
                damage = 8;
            }
            if (encounters.dealDamageToEnemy(player, targetIndex, damage)) {
                checkWinConditionFunc();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_BALANCE && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(player, targetIndex, 5)) {
                checkWinConditionFunc();
            }
            data.currentBlock += 5;
        } else if (playedCardID == CardLibrary.CARD_ID_SEEK_GUIDANCE && data.currentMana >= 1) {
            data.currentMana--;
            data.maxMana += 1;
            data.currentMana += 1;
            DeckManager.removeCardFromGame(data.hand, data.deck, playedCardIndex);
            return true;
        } else if (playedCardID == CardLibrary.CARD_ID_UNVEIL && data.currentMana >= 3) {
            data.currentMana -= 3;
            data.currentBlock += 10;
            DeckManager.drawCard(data.hand, data.draw, data.discard);
            DeckManager.drawCard(data.hand, data.draw, data.discard);
            DeckManager.drawCard(data.hand, data.draw, data.discard);
        } else if (playedCardID == CardLibrary.CARD_ID_READ_SCRIPTURE && data.currentMana >= 2) {
            data.currentMana -= 2;
            uint8 damage = 8;
            if (data.hand.length >= 4) {
                damage = 16;
            }
            if (encounters.dealDamageToEnemy(player, targetIndex, damage)) {
                checkWinConditionFunc();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_EXPLODICATE && data.currentMana >= 1) {
            data.currentMana -= 1;
            if (encounters.dealDirectDamage(player, targetIndex, 4)) {
                checkWinConditionFunc();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_RADIANCE && data.currentMana >= 1) {
            data.currentMana--;
            encounters.removeAllEnemyBlock(player);
        } else if (playedCardID == CardLibrary.CARD_ID_RESOLVE && data.currentMana >= 1) {
            data.currentHealth = CardEffects.healHero(6, data.currentHealth, data.maxHealth);
            DeckManager.removeCardFromGame(data.hand, data.deck, playedCardIndex);
            return true;
        } else if (playedCardID == CardLibrary.CARD_ID_BRACE && data.currentMana >= 0) {
            // Brace costs 0 mana
            data.currentBlock += 15;
            DeckManager.removeCardFromGame(data.hand, data.deck, playedCardIndex);
            return true;
        }

        DeckManager.discardCard(data.hand, data.discard, playedCardIndex);
        return false;
    }

    function playCards(
        GameData storage data,
        IGameEncounters encounters,
        address player,
        CardPlay[] memory plays,
        function() returns (bool) checkWinConditionFunc,
        function() endTurnFunc
    ) internal {
        require(data.runState == 2, "Not in encounter"); // 2 = RUN_STATE_ENCOUNTER
        require(plays.length > 0, "No cards to play");

        for (uint i = 0; i < plays.length; i++) {
            // If we're no longer in encounter (e.g. due to win), stop processing cards
            if (data.runState != 2) { // 2 = RUN_STATE_ENCOUNTER
                // Don't call endTurn if we're not in encounter anymore
                return;
            }
            
            playCard(data, encounters, player, plays[i].cardIndex, plays[i].targetIndex, checkWinConditionFunc);
        }
        
        // Only end turn if we're still in encounter
        if (data.runState == 2) { // 2 = RUN_STATE_ENCOUNTER
            endTurnFunc();
        }
    }
} 