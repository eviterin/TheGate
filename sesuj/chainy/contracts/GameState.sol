// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./CardLibrary.sol";
import "./DeckManager.sol";

interface IGameEncounters {
    struct EnemyData {
        uint8[] types;
        uint16[] maxHealth;
        uint16[] currentHealth;
        uint16[] intents;
        uint16[] blockAmount;
        uint8[] buffs;
    }
    
    function startEncounter(address player, uint8 floor) external returns (EnemyData memory);
    function dealDamageToEnemy(address player, uint8 enemyIndex, uint8 damage) external returns (bool);
    function healEnemy(address player, uint8 enemyIndex, uint8 amount) external;
    function setNewEnemyIntents(address player, uint8 floor) external;
    function setEnemyBlock(address player, uint8 enemyIndex, uint16 amount) external;
    function setEnemyBuff(address player, uint8 enemyIndex, uint8 amount) external;
    function getEnemyData(address player) external view returns (
        uint8[] memory types,
        uint16[] memory maxHealth,
        uint16[] memory currentHealth,
        uint16[] memory intents,
        uint16[] memory blockAmount,
        uint8[] memory buffs
    );
    function clearEnemyData(address player) external;
}

interface IVictoryTracker {
    function recordVictory(address player) external;
    function hasPlayerWon(address player) external view returns (bool);
    function getAllWinners() external view returns (address[] memory);
}

contract GameState {
    using CardLibrary for uint8;
    using DeckManager for uint8[];

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
        uint256 quickTransactionsEnabledAt;
        bool extraCardDrawEnabled;
        bool hasProtectionBlessing;
        uint8 lastChosenCard;
    } 
    
    mapping(address => GameData) public playerData;
    IGameEncounters public encounters;
    IVictoryTracker public victoryTracker;

    event QuickTransactionsEnabled(address indexed user, uint256 timestamp);
    event RewardsGenerated(address indexed user, uint8 floor, uint8[] rewards);

    uint8 constant RUN_STATE_NONE = 0;
    uint8 constant RUN_STATE_WHALE_ROOM = 1;
    uint8 constant RUN_STATE_ENCOUNTER = 2;
    uint8 constant RUN_STATE_CARD_REWARD = 3;
    uint8 constant RUN_STATE_DEATH = 4;

    constructor(address _encountersContract, address _victoryTracker) {
        encounters = IGameEncounters(_encountersContract);
        victoryTracker = IVictoryTracker(_victoryTracker);
    }

    function enableQuickTransactions() public {
        require(!playerData[msg.sender].hasEnabledQuickTransactions, "Already enabled");
        playerData[msg.sender].hasEnabledQuickTransactions = true;
        playerData[msg.sender].quickTransactionsEnabledAt = block.timestamp;
        emit QuickTransactionsEnabled(msg.sender, block.timestamp);
    }
    
    function startRun() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_NONE, "Cannot start new run while one is active");
        
        encounters.clearEnemyData(msg.sender);
        
        data.runState = RUN_STATE_WHALE_ROOM;
        data.currentFloor = 0;
        data.maxHealth = 21;
        data.currentHealth = 21;
        data.maxMana = 3;
        data.currentMana = 0;
        data.extraCardDrawEnabled = false;
        data.hasProtectionBlessing = false;
        data.lastChosenCard = 0;
        delete data.deck;
        data.deck = [CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_PRAY, CardLibrary.CARD_ID_PRAY];
    }
    
    function abandonRun() public {
        GameData storage data = playerData[msg.sender];
        encounters.clearEnemyData(msg.sender);
        data.runState = RUN_STATE_NONE;
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
    }
    
    function chooseRoom(uint8 option) public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_WHALE_ROOM, "Not in whale room");
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
            data.maxHealth += 15;
            data.currentHealth += 15;
        }

        data.runState = RUN_STATE_ENCOUNTER;
        data.currentFloor++;
        startEncounter();
    }

    function playCard(uint8 playedCardIndex, uint8 targetIndex) public {
        GameData storage data = playerData[msg.sender];
        require(playedCardIndex < data.hand.length, "Invalid card index");
        uint8 playedCardID = data.hand[playedCardIndex];

        (uint8[] memory types,,uint16[] memory currentHealth,,,) = encounters.getEnemyData(msg.sender);

        if (CardLibrary.requiresTarget(playedCardID)) {
            require(targetIndex < types.length, "Invalid target");
            require(currentHealth[targetIndex] > 0, "Cannot target a dead enemy");
        }

        if (data.currentMana >= 1 && CardLibrary.isUnimplementedCard(playedCardID)) {
            data.currentMana--;
            data.currentBlock += 6;
            DeckManager.discardCard(data.hand, data.discard, playedCardIndex);
            return;
        }

        if (playedCardID == CardLibrary.CARD_ID_SMITE && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(msg.sender, targetIndex, 6)) {
                if (checkWinCondition()) return;
            }
            DeckManager.discardCard(data.hand, data.discard, playedCardIndex);
        } else if (playedCardID == CardLibrary.CARD_ID_PRAY && data.currentMana >= 1) {
            data.currentMana--;
            data.currentBlock += 6;
            DeckManager.discardCard(data.hand, data.discard, playedCardIndex);
        } else if (playedCardID == CardLibrary.CARD_ID_UNFOLD_TRUTH && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(msg.sender, targetIndex, 7)) {
                if (checkWinCondition()) return;
            }
            DeckManager.drawCard(data.hand, data.draw, data.discard);
            DeckManager.discardCard(data.hand, data.discard, playedCardIndex);
        } else if (playedCardID == CardLibrary.CARD_ID_SACRED_RITUAL && data.currentMana >= 2) {
            data.currentMana -= 2;
            bool anyKilled = false;
            for (uint i = 0; i < types.length; i++) {
                if (currentHealth[i] > 0) {
                    if (encounters.dealDamageToEnemy(msg.sender, uint8(i), 8)) {
                        anyKilled = true;
                    }
                }
            }
            if (anyKilled && checkWinCondition()) return;
            DeckManager.discardCard(data.hand, data.discard, playedCardIndex);
        }
    }

    struct CardPlay {
        uint8 cardIndex;
        uint8 targetIndex;
    }

    function playCards(CardPlay[] calldata plays) public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_ENCOUNTER, "Not in encounter");
        require(plays.length > 0, "No cards to play");

        for (uint i = 0; i < plays.length; i++) {
            if (data.runState != RUN_STATE_ENCOUNTER) break;
            
            playCard(plays[i].cardIndex, plays[i].targetIndex);
        }
    }

    function endTurn() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_ENCOUNTER, "Not in encounter");
        
        (uint8[] memory types,,uint16[] memory currentHealth,uint16[] memory intents,,uint8[] memory buffs) = encounters.getEnemyData(msg.sender);

        bool shouldContinue = true;

        for (uint i = 0; i < types.length; i++) {
            if (currentHealth[i] > 0) {
                uint16 intent = intents[i];
                if (intent == 1000) { // INTENT_BLOCK_5
                    encounters.setEnemyBlock(msg.sender, uint8(i), 5);
                } else if (intent == 1001) { // INTENT_BLOCK_AND_ATTACK
                    encounters.setEnemyBlock(msg.sender, uint8(i), 5);
                    dealDamageToHero(6);
                } else if (intent == 1002) { // INTENT_HEAL
                    encounters.healEnemy(msg.sender, uint8(i), 5);
                } else if (intent == 1003) { // INTENT_ATTACK_BUFF
                    require(i < buffs.length, "Invalid enemy index for buff");
                    uint8 newBuff = buffs[i] + 2;
                    encounters.setEnemyBuff(msg.sender, uint8(i), newBuff);
                } else if (intent == 1004) { // INTENT_BLOCK_AND_HEAL
                    encounters.setEnemyBlock(msg.sender, uint8(i), 5);
                    encounters.healEnemy(msg.sender, uint8(i), 5);
                } else {
                    require(i < buffs.length, "Invalid enemy index for buff");
                    uint8 totalDamage = uint8(intent) + buffs[i];
                    dealDamageToHero(totalDamage);
                }
            }
        }

        if (data.currentHealth == 0) {
            data.runState = RUN_STATE_DEATH;
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
        GameData storage data = playerData[msg.sender];
        if (data.currentBlock >= damage) {
            data.currentBlock -= damage;
        } else {
            uint8 newDamage = damage - data.currentBlock;
            data.currentBlock = 0;
            if (newDamage >= data.currentHealth) {
                data.currentHealth = 0;
            } else {
                data.currentHealth -= newDamage;
            }
        }
    }

    function startEncounter() private {
        GameData storage data = playerData[msg.sender];
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
        
        completeEncounter();
        return true;
    }

    function completeEncounter() private {
        GameData storage data = playerData[msg.sender];
        data.runState = RUN_STATE_CARD_REWARD;
        generateRewards();
    }

    function generateRewards() private {
        GameData storage data = playerData[msg.sender];
        delete data.availableCardRewards;

        (uint8 reward1, uint8 reward2) = CardLibrary.getRewardPair(data.lastChosenCard, data.currentFloor);
        data.availableCardRewards = [reward1, reward2];
        emit RewardsGenerated(msg.sender, data.currentFloor, data.availableCardRewards);
    }

    function chooseCardReward(uint8 cardId) public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_CARD_REWARD, "Not in reward state");
        
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
        data.runState = RUN_STATE_ENCOUNTER;
        data.currentFloor++;

        if (data.currentFloor == 11) {
            victoryTracker.recordVictory(msg.sender);
            data.runState = RUN_STATE_NONE;
        } else {
            startEncounter();
        }
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

    function getEnemyBlock(address player) public view returns (uint16[] memory) {
        (,,,,uint16[] memory blockAmount,) = encounters.getEnemyData(player);
        return blockAmount;
    }

    function getPlayerData(address player) public view returns (
        uint8[] memory, uint8[] memory, uint8[] memory, uint8[] memory) {
        GameData storage data = playerData[player];
        return (data.deck, data.hand, data.draw, data.discard);
    }

    function getAvailableRewards(address player) public view returns (uint8[] memory) {
        return playerData[player].availableCardRewards;
    }

    function getQuickTransactionsEnabled(address player) public view returns (bool) {
        return playerData[player].hasEnabledQuickTransactions;
    }

    function retryFromDeath() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_DEATH, "Not in death state");
        
        encounters.clearEnemyData(msg.sender);
        
        abandonRun();
        
        startRun();
    }
}
