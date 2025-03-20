// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./CardLibrary.sol";
import "./DeckManager.sol";

interface IGameEncounters {
    struct IEnemyData {
        uint8[] types;
        uint16[] maxHealth;
        uint16[] currentHealth;
        uint16[] intents;
        uint16[] blockAmount;
        uint8[] buffs;
    }
    
    function startEncounter(address player, uint8 floor) external returns (IEnemyData memory);
    function dealDamageToEnemy(address player, uint8 enemyIndex, uint8 damage) external returns (bool);
    function dealDirectDamage(address player, uint8 enemyIndex, uint8 damage) external returns (bool);
    function healEnemy(address player, uint8 enemyIndex, uint8 amount) external;
    function setNewEnemyIntents(address player, uint8 floor) external;
    function setEnemyBlock(address player, uint8 enemyIndex, uint16 amount) external;
    function setEnemyBuff(address player, uint8 enemyIndex, uint8 amount) external;
    function processIntent(address player, uint8 enemyIndex, uint16 intent) external returns (uint8 damageToHero);
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
    uint8 constant RUN_STATE_VICTORY = 5;

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
        
        data.deck = [CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_SMITE, CardLibrary.CARD_ID_PRAY, CardLibrary.CARD_ID_PRAY];
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
        data.currentFloor = 0;
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
        data.currentFloor = 7; //debug
        startEncounter();
    }

    function playCard(uint8 playedCardIndex, uint8 targetIndex) public {
        GameData storage data = playerData[msg.sender];
        require(playedCardIndex < data.hand.length, "Invalid card index");
        uint8 playedCardID = data.hand[playedCardIndex];

        (uint8[] memory types,,uint16[] memory currentHealth,,,) = encounters.getEnemyData(msg.sender);

        if (CardLibrary.requiresTarget(playedCardID)) {
            require(targetIndex < types.length, "Invalid target");
            //require(currentHealth[targetIndex] > 0, "Cannot target a dead enemy"); 
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
                checkWinCondition();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_PRAY && data.currentMana >= 1) {
            data.currentMana--;
            data.currentBlock += 6;
        } else if (playedCardID == CardLibrary.CARD_ID_UNFOLD_TRUTH && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(msg.sender, targetIndex, 7)) {
                checkWinCondition();
            }
            DeckManager.drawCard(data.hand, data.draw, data.discard);
        } else if (playedCardID == CardLibrary.CARD_ID_PREACH && data.currentMana >= 2) {
            data.currentMana -= 2;
            bool anyKilled = false;
            for (uint i = 0; i < types.length; i++) {
                if (currentHealth[i] > 0) {
                    if (encounters.dealDamageToEnemy(msg.sender, uint8(i), 8)) {
                        anyKilled = true;
                    }
                }
            }
            if (anyKilled) {
                checkWinCondition();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_SACRED_RITUAL && data.currentMana >= 2) {
            data.currentMana -= 2;
            data.currentBlock += 10;
            if (data.currentHealth + 3 > data.maxHealth) {
                data.currentHealth = data.maxHealth;
            } else {
                data.currentHealth += 3;
            }
        } else if (playedCardID == CardLibrary.CARD_ID_DIVINE_WRATH && data.currentMana >= 1) {
            data.currentMana--;
            (,uint16[] memory maxHealth, uint16[] memory enemyHealth,,,) = encounters.getEnemyData(msg.sender);
            uint8 damage = 5;
            if (enemyHealth[targetIndex] == maxHealth[targetIndex]) {
                damage = 10;
            }
            if (encounters.dealDamageToEnemy(msg.sender, targetIndex, damage)) {
                checkWinCondition();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_BALANCE && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(msg.sender, targetIndex, 5)) {
                checkWinCondition();
            }
            data.currentBlock += 5;
        } else if (playedCardID == CardLibrary.CARD_ID_SEEK_GUIDANCE && data.currentMana >= 1) {
            data.currentMana--;
            DeckManager.drawCard(data.hand, data.draw, data.discard);
            DeckManager.drawCard(data.hand, data.draw, data.discard);
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
            if (encounters.dealDamageToEnemy(msg.sender, targetIndex, damage)) {
                checkWinCondition();
            }
        } else if (playedCardID == CardLibrary.CARD_ID_EXPLODICATE && data.currentMana >= 1) {
            data.currentMana -= 1;
            if (encounters.dealDirectDamage(msg.sender, targetIndex, 7)) {
                checkWinCondition();
            }
        }

        DeckManager.discardCard(data.hand, data.discard, playedCardIndex);
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
            // If we're no longer in encounter (e.g. due to win), stop processing cards
            if (data.runState != RUN_STATE_ENCOUNTER) {
                // Don't call endTurn if we're not in encounter anymore
                return;
            }
            
            playCard(plays[i].cardIndex, plays[i].targetIndex);
        }
        
        // Only end turn if we're still in encounter
        if (data.runState == RUN_STATE_ENCOUNTER) {
            endTurn();
        }
    }

    function endTurn() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_ENCOUNTER, "Not in encounter");
        
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
        
        GameData storage data = playerData[msg.sender];
        if (data.currentFloor == 10) {
            // Final level victory
            data.runState = RUN_STATE_VICTORY;
            victoryTracker.recordVictory(msg.sender);
        } else {
            completeEncounter();
        }
        return true;
    }

    function completeEncounter() private {
        GameData storage data = playerData[msg.sender];
        data.runState = RUN_STATE_CARD_REWARD;
        data.availableCardRewards = CardLibrary.generateRewards(data.lastChosenCard, data.currentFloor);
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
        GameData storage data = playerData[player];
        return (data.deck, data.hand, data.draw, data.discard);
    }

    function getAvailableRewards(address player) public view returns (uint8[] memory) {
        return playerData[player].availableCardRewards;
    }

    function getQuickTransactionsEnabled(address player) public view returns (bool) {
        return playerData[player].hasEnabledQuickTransactions;
    }
}
