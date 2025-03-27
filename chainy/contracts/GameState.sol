// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./CardLibrary.sol";
import "./DeckManager.sol";
import "./IGameEncounters.sol";
import "./CardEffects.sol";
import "./CardPlayer.sol";

interface IVictoryTracker {
    function recordVictory(address player) external;
}

contract GameState {
    using CardLibrary for uint8;
    using DeckManager for uint8[];
    using CardEffects for uint8;
    using CardPlayer for CardPlayer.GameData;

    // Use the GameData struct from CardPlayer library
    mapping(address => CardPlayer.GameData) public playerData;
    IGameEncounters public encounters;
    IVictoryTracker public victoryTracker;

    event QuickTransactionsEnabled(address indexed user, uint256 timestamp);
    event RewardsGenerated(address indexed user, uint8 floor, uint8[] rewards);

    constructor(address _encountersContract, address _victoryTracker) {
        encounters = IGameEncounters(_encountersContract);
        victoryTracker = IVictoryTracker(_victoryTracker);
    }

    function enableQuickTransactions() public {
        require(!playerData[msg.sender].hasEnabledQuickTransactions, "Already enabled");
        playerData[msg.sender].hasEnabledQuickTransactions = true;
        emit QuickTransactionsEnabled(msg.sender, block.timestamp);
    }
    
    function startRun() public {
        CardPlayer.GameData storage data = playerData[msg.sender];
        require(data.runState == CardPlayer.RUN_STATE_NONE, "Cannot start new run while one is active");
        
        encounters.clearEnemyData(msg.sender);
        
        data.runState = CardPlayer.RUN_STATE_WHALE_ROOM;
        data.currentFloor = 0;
        data.maxHealth = 32;
        data.currentHealth = 32;
        data.maxMana = 3;
        data.currentMana = 0;
        data.extraCardDrawEnabled = false;
        data.hasProtectionBlessing = false;
        data.lastChosenCard = 0;
        data.secondLastChosenCard = 0;
        delete data.deck;
        
        data.deck = [CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_PREACH, CardLibrary.CARD_ID_PRAY, CardLibrary.CARD_ID_PRAY];
    }
    
    function abandonRun() public {
        CardPlayer.GameData storage data = playerData[msg.sender];
        encounters.clearEnemyData(msg.sender);
        data.runState = CardPlayer.RUN_STATE_NONE;
        delete data.hand;
        delete data.draw;
        delete data.discard;
        delete data.deck;
        delete data.availableCardRewards;
        data.maxHealth = 0;
        data.currentHealth = 0;
        data.maxMana = 0;
        data.currentMana = 0;
        data.currentBlock = 0;
        data.extraCardDrawEnabled = false;
        data.hasProtectionBlessing = false;
        data.lastChosenCard = 0;
        data.secondLastChosenCard = 0;
        data.currentFloor = 0;
    }
    
    function chooseRoom(uint8 option) public {
        CardPlayer.GameData storage data = playerData[msg.sender];
        require(data.runState == CardPlayer.RUN_STATE_WHALE_ROOM, "Not in whale room");
        require(option >= 1 && option <= 4, "Invalid whale room option");

        if (option == 1) {
            data.extraCardDrawEnabled = true;
        } else if (option == 2) {
            data.maxMana += 1;
            data.currentMana += 1;
        } else if (option == 3) { 
            data.hasProtectionBlessing = true;
            data.currentBlock = 5;
        } else if (option == 4) {
            data.maxHealth += 8;
            data.currentHealth += 8;
        }

        data.runState = CardPlayer.RUN_STATE_ENCOUNTER;
        data.currentFloor = 1; 
        startEncounter();
    }

    // Helper functions to pass to the library
    function _checkWinCondition() private returns (bool) {
        return checkWinCondition();
    }

    function _endTurn() private {
        endTurn();
    }

    function playCard(uint8 playedCardIndex, uint8 targetIndex) public {
        CardPlayer.GameData storage data = playerData[msg.sender];
        CardPlayer.playCard(data, encounters, msg.sender, playedCardIndex, targetIndex, _checkWinCondition);
    }

    function playCards(CardPlayer.CardPlay[] calldata plays) public {
        CardPlayer.GameData storage data = playerData[msg.sender];
        
        // Create a new array of the library's CardPlay type
        CardPlayer.CardPlay[] memory libraryPlays = new CardPlayer.CardPlay[](plays.length);
        for (uint i = 0; i < plays.length; i++) {
            libraryPlays[i].cardIndex = plays[i].cardIndex;
            libraryPlays[i].targetIndex = plays[i].targetIndex;
        }
        
        CardPlayer.playCards(data, encounters, msg.sender, libraryPlays, _checkWinCondition, _endTurn);
    }

    function endTurn() public {
        CardPlayer.GameData storage data = playerData[msg.sender];
        require(data.runState == CardPlayer.RUN_STATE_ENCOUNTER, "Not in encounter");
        
        (uint8[] memory types,,uint16[] memory currentHealth,uint16[] memory intents,,) = encounters.getEnemyData(msg.sender);

        bool shouldContinue = true;

        for (uint i = 0; i < types.length; i++) {
            if (currentHealth[i] > 0) {
                uint8 damage = encounters.processIntent(msg.sender, uint8(i), intents[i]);
                if (damage > 0) {
                    dealDamageToHero(damage);
                }
            }
        }

        if (data.currentHealth == 0) {
            data.runState = CardPlayer.RUN_STATE_DEATH;
            shouldContinue = false;
        }

        if (shouldContinue && checkWinCondition()) {
            shouldContinue = false;
        }

        if (shouldContinue) {
            data.currentBlock = 0;
            encounters.setNewEnemyIntents(msg.sender, data.currentFloor);
            data.currentMana = data.maxMana;
            DeckManager.drawCard(data.hand, data.draw, data.discard);
            DeckManager.drawCard(data.hand, data.draw, data.discard);
            DeckManager.drawCard(data.hand, data.draw, data.discard);
        }
    }

    function dealDamageToHero(uint8 damage) private {
        CardPlayer.GameData storage data = playerData[msg.sender];
        (data.currentHealth, data.currentBlock) = CardEffects.dealDamageToHero(damage, data.currentBlock, data.currentHealth);
    }

    function startEncounter() private {
        CardPlayer.GameData storage data = playerData[msg.sender];
        encounters.startEncounter(msg.sender, data.currentFloor);
        delete data.hand;
        delete data.discard;
        data.currentBlock = data.hasProtectionBlessing ? 5 : 0;
        DeckManager.copyDeckIntoDrawpile(data.draw, data.deck);
        DeckManager.shuffleDrawPile(data.draw);
        DeckManager.drawNewHand(data.hand, data.draw, data.discard, data.extraCardDrawEnabled);
        data.currentMana = data.maxMana;
    }

    function checkWinCondition() private returns (bool) {
        (,, uint16[] memory currentHealth,,,) = encounters.getEnemyData(msg.sender);
        
        for (uint i = 0; i < currentHealth.length; i++) {
            if (currentHealth[i] > 0) return false;
        }
        
        CardPlayer.GameData storage data = playerData[msg.sender];
        if (data.currentFloor == 10) {
            // Final level victory
            data.runState = CardPlayer.RUN_STATE_VICTORY;
            victoryTracker.recordVictory(msg.sender);
        } else {
            completeEncounter();
        }
        return true;
    }

    function completeEncounter() private {
        CardPlayer.GameData storage data = playerData[msg.sender];
        data.runState = CardPlayer.RUN_STATE_CARD_REWARD;
        data.availableCardRewards = CardLibrary.generateRewards(data.lastChosenCard, data.secondLastChosenCard, data.currentFloor);
        emit RewardsGenerated(msg.sender, data.currentFloor, data.availableCardRewards);
    }

    function chooseCardReward(uint8 cardId) public {
        CardPlayer.GameData storage data = playerData[msg.sender];
        require(data.runState == CardPlayer.RUN_STATE_CARD_REWARD, "Not in reward state");
        
        bool isValidChoice = false;
        for (uint i = 0; i < data.availableCardRewards.length; i++) {
            if (data.availableCardRewards[i] == cardId) {
                isValidChoice = true;
                break;
            }
        }
        require(isValidChoice, "Invalid card choice");

        data.deck.push(cardId);
        data.lastChosenCard = cardId;
        delete data.availableCardRewards;
        data.runState = CardPlayer.RUN_STATE_ENCOUNTER;
        data.currentFloor++;
        startEncounter();
    }

    function getEnemyData(address player) public view returns (
        uint8[] memory types,
        uint16[] memory maxHealth,
        uint16[] memory currentHealth,
        uint16[] memory intents,
        uint16[] memory blockAmount,
        uint8[] memory buffs
    ) {
        (types, maxHealth, currentHealth, intents, blockAmount, buffs) = encounters.getEnemyData(player);
    }

    function getPlayerData(address player) public view returns (
        uint8[] memory, uint8[] memory, uint8[] memory, uint8[] memory) {
        CardPlayer.GameData storage data = playerData[player];
        return (data.deck, data.hand, data.draw, data.discard);
    }

    function getAvailableRewards(address player) public view returns (uint8[] memory) {
        return playerData[player].availableCardRewards;
    }

    function getQuickTransactionsEnabled(address player) public view returns (bool) {
        return playerData[player].hasEnabledQuickTransactions;
    }
}
