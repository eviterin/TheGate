// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract GameState {
    // Game state variables
    struct GameData {
        uint8 runState;
        uint8 currentFloor;
        uint8 maxHealth;
        uint8 currentHealth;
        uint8 currentBlock;
        uint8 currentMana;
        uint8 maxMana;
        uint8[] enemyTypes;
        uint16[] enemyMaxHealth;
        uint16[] enemyCurrentHealth;
        uint16[] enemyIntents;
        uint16[] enemyBlock;
        uint8[] deck;
        uint8[] hand;
        uint8[] draw;
        uint8[] discard;
        uint8[] availableCardRewards;
        bool hasEnabledQuickTransactions;
        uint256 quickTransactionsEnabledAt;
    }
    
    mapping(address => GameData) public playerData;

    event QuickTransactionsEnabled(address indexed user, uint256 timestamp);
    event RewardsGenerated(address indexed user, uint8 floor, uint8[] rewards);

    // Constants
    uint8 constant RUN_STATE_NONE = 0;
    uint8 constant RUN_STATE_WHALE_ROOM = 1;
    uint8 constant RUN_STATE_ENCOUNTER = 2;
    uint8 constant RUN_STATE_CARD_REWARD = 3;

    uint8 constant ENEMY_TYPE_NONE = 0;
    uint8 constant ENEMY_TYPE_A = 1;
    uint8 constant ENEMY_TYPE_B = 2;

    uint8 constant CARD_ID_NONE = 0;
    uint8 constant CARD_ID_STRIKE = 1;
    uint8 constant CARD_ID_DEFEND = 2;
    uint8 constant CARD_ID_POMMEL_STRIKE = 3;
    uint8 constant CARD_ID_CLEAVE = 4;
    
    uint16 constant INTENT_BLOCK_5 = 1000;

    function enableQuickTransactions() public {
        require(!playerData[msg.sender].hasEnabledQuickTransactions, "Already enabled");
        playerData[msg.sender].hasEnabledQuickTransactions = true;
        playerData[msg.sender].quickTransactionsEnabledAt = block.timestamp;
        emit QuickTransactionsEnabled(msg.sender, block.timestamp);
    }
    
    function startRun() public {
        GameData storage data = playerData[msg.sender];
        data.runState = RUN_STATE_WHALE_ROOM;
        data.currentFloor = 0;
        data.maxHealth = 21;
        data.currentHealth = 21;
        data.maxMana = 5;
        data.currentMana = 0;
        delete data.deck;
        data.deck = [CARD_ID_STRIKE, CARD_ID_STRIKE, CARD_ID_STRIKE, CARD_ID_DEFEND, CARD_ID_DEFEND];
    }
    
    function abandonRun() public {
        GameData storage data = playerData[msg.sender];
        data.runState = RUN_STATE_NONE;
        data.currentFloor = 0;
        data.maxHealth = 0;
        data.currentHealth = 0;
        data.currentBlock = 0;
        data.maxMana = 0;
        data.currentMana = 0;
        delete data.enemyTypes;
        delete data.enemyMaxHealth;
        delete data.enemyCurrentHealth;
        delete data.enemyIntents;
        delete data.deck;
        delete data.hand;
        delete data.draw;
        delete data.discard;
        delete data.availableCardRewards;
    }
    
    function chooseRoom() public {
        GameData storage data = playerData[msg.sender];
        if (data.runState == RUN_STATE_WHALE_ROOM) {
            data.runState = RUN_STATE_ENCOUNTER;
            data.currentFloor++;
            startEncounter();
        }
    }

    function playCard(uint8 playedCardIndex, uint8 targetIndex) public {
        GameData storage data = playerData[msg.sender];
        require(playedCardIndex < data.hand.length, "Invalid card index");
        uint8 playedCardID = data.hand[playedCardIndex];

        // Only validate enemy targeting for attack cards
        if (playedCardID == CARD_ID_STRIKE || playedCardID == CARD_ID_POMMEL_STRIKE) {
            require(targetIndex < data.enemyTypes.length, "Invalid target");
            require(data.enemyCurrentHealth[targetIndex] > 0, "Cannot target a dead enemy");
        }

        if (playedCardID == CARD_ID_STRIKE && data.currentMana >= 1) {
            data.currentMana--;
            dealDamageToEnemy(targetIndex, 6);
            if (checkWinCondition()) return;
            discardCard(playedCardIndex);
        } else if (playedCardID == CARD_ID_DEFEND && data.currentMana >= 1) {
            data.currentMana--;
            data.currentBlock += 6;
            discardCard(playedCardIndex);
        } else if (playedCardID == CARD_ID_POMMEL_STRIKE && data.currentMana >= 1) {
            data.currentMana--;
            dealDamageToEnemy(targetIndex, 7);
            if (checkWinCondition()) return;
            drawCard();
            discardCard(playedCardIndex);
        } else if (playedCardID == CARD_ID_CLEAVE && data.currentMana >= 2) {
            data.currentMana -= 2;
            for (uint i = 0; i < data.enemyTypes.length; i++) {
                if (data.enemyCurrentHealth[i] > 0) {
                    dealDamageToEnemy(uint8(i), 8);
                }
            }
            if (checkWinCondition()) return;
            discardCard(playedCardIndex);
        }
    }

    function endTurn() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_ENCOUNTER, "Not in encounter");
        
        uint enemyCount = data.enemyTypes.length;

        // Process enemy intents first
        for (uint i = 0; i < enemyCount; i++) {
            if (data.enemyCurrentHealth[i] > 0) {
                uint16 intent = data.enemyIntents[i];
                if (intent == INTENT_BLOCK_5) {
                    data.enemyBlock[i] = 5;
                } else {
                    dealDamageToHero(uint8(intent));
                }
            }
        }

        if (data.currentHealth == 0) {
            abandonRun();
            return;
        }

        if (checkWinCondition()) return;

        // Only clear player block at end of turn
        data.currentBlock = 0;

        setNewEnemyIntents();
        data.currentMana = data.maxMana;
        drawCard();
        drawCard();
        drawCard();
    }

    function dealDamageToEnemy(uint8 enemyIndex, uint8 damage) private {
        GameData storage data = playerData[msg.sender];
        uint16 remainingDamage = damage;
        
        if (data.enemyBlock[enemyIndex] > 0) {
            if (data.enemyBlock[enemyIndex] >= remainingDamage) {
                data.enemyBlock[enemyIndex] -= remainingDamage;
                return;
            }
            remainingDamage -= data.enemyBlock[enemyIndex];
            data.enemyBlock[enemyIndex] = 0;
        }
        
        if (data.enemyCurrentHealth[enemyIndex] < remainingDamage) {
            data.enemyCurrentHealth[enemyIndex] = 0;
        } else {
            data.enemyCurrentHealth[enemyIndex] -= remainingDamage;
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
        data.enemyTypes = [ENEMY_TYPE_A, ENEMY_TYPE_B];
        data.enemyMaxHealth = [10, 12];
        data.enemyCurrentHealth = [10, 12];
        data.enemyBlock = new uint16[](2);
        // Clear enemy block at start of encounter
        for (uint i = 0; i < data.enemyBlock.length; i++) {
            data.enemyBlock[i] = 0;
        }
        setNewEnemyIntents();
        delete data.hand;
        delete data.discard;
        data.currentBlock = 0;
        copyDeckIntoDrawpile();
        shuffleDrawPile();
        drawNewHand();
        data.currentMana = data.maxMana;
    }

    function setNewEnemyIntents() private {
        GameData storage data = playerData[msg.sender];
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        data.enemyIntents = new uint16[](data.enemyTypes.length);
        
        for (uint i = 0; i < data.enemyTypes.length; i++) {
            if (data.enemyCurrentHealth[i] > 0) {
                uint8 enemyType = data.enemyTypes[i];
                if (enemyType == ENEMY_TYPE_A) {
                    data.enemyIntents[i] = uint16(6 + (seed % 5));
                } else if (enemyType == ENEMY_TYPE_B) {
                    data.enemyIntents[i] = (seed % 3 == 0) ? INTENT_BLOCK_5 : uint16(4 + (seed % 5));
                }
            }
            seed = uint256(keccak256(abi.encodePacked(seed)));
        }
    }

    function checkWinCondition() private returns (bool) {
        GameData storage data = playerData[msg.sender];
        for (uint i = 0; i < data.enemyCurrentHealth.length; i++) {
            if (data.enemyCurrentHealth[i] > 0) return false;
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
        data.availableCardRewards = [CARD_ID_POMMEL_STRIKE, CARD_ID_CLEAVE];
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
        delete data.availableCardRewards;
        data.runState = RUN_STATE_WHALE_ROOM;
    }

    function skipCardReward() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_CARD_REWARD, "Not in reward state");
        delete data.availableCardRewards;
        data.runState = RUN_STATE_WHALE_ROOM;
    }

    // View functions
    function getEnemyData(address player) public view returns (
        uint8[] memory, uint16[] memory, uint16[] memory, uint16[] memory) {
        GameData storage data = playerData[player];
        return (data.enemyTypes, data.enemyMaxHealth, data.enemyCurrentHealth, data.enemyIntents);
    }

    function getEnemyBlock(address player) public view returns (uint16[] memory) {
        return playerData[player].enemyBlock;
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

    // Helper functions
    function drawCard() private {
        GameData storage data = playerData[msg.sender];
        if (data.draw.length == 0) {
            if (data.discard.length == 0) return;
            moveDiscardIntoDrawpile();
            shuffleDrawPile();
        }
        data.hand.push(data.draw[data.draw.length - 1]);
        data.draw.pop();
    }

    function drawNewHand() private {
        drawCard();
        drawCard();
        drawCard();
    }

    function discardCard(uint cardIndex) private {
        GameData storage data = playerData[msg.sender];
        uint8 cardID = data.hand[cardIndex];
        if (cardID != CARD_ID_NONE) {
            data.discard.push(cardID);
            for (uint i = cardIndex; i < data.hand.length - 1; i++) {
                data.hand[i] = data.hand[i + 1];
            }
            data.hand.pop();
        }
    }

    function copyDeckIntoDrawpile() private {
        GameData storage data = playerData[msg.sender];
        delete data.draw;
        for (uint i = 0; i < data.deck.length; i++) {
            data.draw.push(data.deck[i]);
        }
    }

    function moveDiscardIntoDrawpile() private {
        GameData storage data = playerData[msg.sender];
        delete data.draw;
        for (uint i = 0; i < data.discard.length; i++) {
            data.draw.push(data.discard[i]);
        }
        delete data.discard;
    }

    function shuffleDrawPile() private {
        GameData storage data = playerData[msg.sender];
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        uint256 len = data.draw.length;
        for (uint256 i = len - 1; i > 0; i--) {
            uint256 j = uint256(keccak256(abi.encodePacked(seed, i))) % (i + 1);
            (data.draw[i], data.draw[j]) = (data.draw[j], data.draw[i]);
        }
    }
}
