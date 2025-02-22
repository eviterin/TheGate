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
        bool extraCardDrawEnabled;  // New field for extra card draw option
        bool hasProtectionBlessing;  // New field for Divine Protection blessing
    }
    
    mapping(address => GameData) public playerData;

    event QuickTransactionsEnabled(address indexed user, uint256 timestamp);
    event RewardsGenerated(address indexed user, uint8 floor, uint8[] rewards);

    // Constants
    uint8 constant RUN_STATE_NONE = 0;
    uint8 constant RUN_STATE_WHALE_ROOM = 1;
    uint8 constant RUN_STATE_ENCOUNTER = 2;
    uint8 constant RUN_STATE_CARD_REWARD = 3;
    uint8 constant RUN_STATE_DEATH = 4;  // New state for when player dies

    uint8 constant ENEMY_TYPE_NONE = 0;
    uint8 constant ENEMY_TYPE_A = 1;
    uint8 constant ENEMY_TYPE_B = 2;

    // Whale Room options
    uint8 constant WHALE_OPTION_EXTRA_CARD = 1;
    uint8 constant WHALE_OPTION_EXTRA_FAITH = 2;
    uint8 constant WHALE_OPTION_PROTECTION = 3;  // Changed from HEAL
    uint8 constant WHALE_OPTION_UPGRADE = 4;

    uint8 constant CARD_ID_NONE = 0;
    uint8 constant CARD_ID_STRIKE = 1;
    uint8 constant CARD_ID_DEFEND = 2;
    uint8 constant CARD_ID_POMMEL_STRIKE = 3;
    uint8 constant CARD_ID_CLEAVE = 4;
    
    uint16 constant INTENT_BLOCK_5 = 1000;
    uint16 constant INTENT_BLOCK_AND_ATTACK = 1001;  // New intent type

    function enableQuickTransactions() public {
        require(!playerData[msg.sender].hasEnabledQuickTransactions, "Already enabled");
        playerData[msg.sender].hasEnabledQuickTransactions = true;
        playerData[msg.sender].quickTransactionsEnabledAt = block.timestamp;
        emit QuickTransactionsEnabled(msg.sender, block.timestamp);
    }
    
    function startRun() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_NONE, "Cannot start new run while one is active");
        
        // Reset all game state including blessings
        data.runState = RUN_STATE_WHALE_ROOM;
        data.currentFloor = 0;
        data.maxHealth = 21;
        data.currentHealth = 21;
        data.maxMana = 3;
        data.currentMana = 0;
        data.extraCardDrawEnabled = false;  // Reset extra card draw blessing
        data.hasProtectionBlessing = false;  // Reset protection blessing
        delete data.deck;
        data.deck = [CARD_ID_STRIKE, CARD_ID_STRIKE, CARD_ID_STRIKE, CARD_ID_DEFEND, CARD_ID_DEFEND];
    }
    
    function abandonRun() public {
        GameData storage data = playerData[msg.sender];
        // Reset all state variables including blessings
        data.runState = RUN_STATE_NONE;
        data.currentFloor = 0;
        data.maxHealth = 0;
        data.currentHealth = 0;
        data.currentBlock = 0;
        data.maxMana = 0;
        data.currentMana = 0;
        data.extraCardDrawEnabled = false;  // Reset extra card draw blessing
        data.hasProtectionBlessing = false;  // Reset protection blessing
        delete data.enemyTypes;
        delete data.enemyMaxHealth;
        delete data.enemyCurrentHealth;
        delete data.enemyIntents;
        delete data.enemyBlock;
        delete data.deck;
        delete data.hand;
        delete data.draw;
        delete data.discard;
        delete data.availableCardRewards;
    }
    
    function chooseRoom(uint8 option) public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_WHALE_ROOM, "Not in whale room");
        require(option >= 1 && option <= 4, "Invalid whale room option");

        // Store current floor to prevent multiple blessings per floor
        uint8 currentFloor = data.currentFloor;
        require(currentFloor == 0 || currentFloor != data.currentFloor, "Already chose blessing for this floor");

        if (option == WHALE_OPTION_EXTRA_CARD) {
            data.extraCardDrawEnabled = true;
        } else if (option == WHALE_OPTION_EXTRA_FAITH) {
            data.maxMana += 1;
            data.currentMana += 1;
        } else if (option == WHALE_OPTION_PROTECTION) {
            data.hasProtectionBlessing = true;  // Set the blessing flag
            data.currentBlock = 5;  // Apply initial block
        } else if (option == WHALE_OPTION_UPGRADE) {
            data.maxHealth += 5;
            data.currentHealth += 5;  // Also increase current health
        }

        data.runState = RUN_STATE_ENCOUNTER;
        data.currentFloor++;
        startEncounter();
    }

    function playCard(uint8 playedCardIndex, uint8 targetIndex) public {
        GameData storage data = playerData[msg.sender];
        require(playedCardIndex < data.hand.length, "Invalid card index");
        uint8 playedCardID = data.hand[playedCardIndex];

        // Only validate enemy targeting for attack cards
        if (playedCardID == CARD_ID_STRIKE || playedCardID == CARD_ID_POMMEL_STRIKE || playedCardID == CARD_ID_CLEAVE) {
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
            // Target validation already done above
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
                } else if (intent == INTENT_BLOCK_AND_ATTACK) {
                    data.enemyBlock[i] = 5;  // Apply block first
                    dealDamageToHero(6);     // Then deal damage
                } else {
                    dealDamageToHero(uint8(intent));
                }
            }
        }

        if (data.currentHealth == 0) {
            data.runState = RUN_STATE_DEATH;
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
        
        // Get encounter data based on floor
        if (data.currentFloor == 3) {
            // For level 3, randomly choose between TYPE_A and TYPE_B
            uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
            uint8 randomType = (seed % 2 == 0) ? ENEMY_TYPE_A : ENEMY_TYPE_B;
            
            data.enemyTypes = new uint8[](1);
            data.enemyMaxHealth = new uint16[](1);
            data.enemyCurrentHealth = new uint16[](1);
            data.enemyBlock = new uint16[](1);
            
            data.enemyTypes[0] = randomType;
            data.enemyMaxHealth[0] = 18;  // Much higher health for single enemy
            data.enemyCurrentHealth[0] = data.enemyMaxHealth[0];
            data.enemyBlock[0] = 0;
        } else {
            // Default behavior for other floors
            data.enemyTypes = [ENEMY_TYPE_A, ENEMY_TYPE_B];
            data.enemyMaxHealth = [10, 12];
            data.enemyCurrentHealth = [10, 12];
            data.enemyBlock = new uint16[](2);
            // Clear enemy block
            for (uint i = 0; i < data.enemyBlock.length; i++) {
                data.enemyBlock[i] = 0;
            }
        }
        
        setNewEnemyIntents();
        delete data.hand;
        delete data.discard;
        data.currentBlock = data.hasProtectionBlessing ? 5 : 0;  // Apply protection blessing if active
        copyDeckIntoDrawpile();
        shuffleDrawPile();
        drawNewHand();
        data.currentMana = data.maxMana;
    }

    function setNewEnemyIntents() private {
        GameData storage data = playerData[msg.sender];
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        data.enemyIntents = new uint16[](data.enemyTypes.length);
        
        // Handle specific level patterns
        if (data.currentFloor == 1) {
            // Level 1: Dunes - Two bandits with different patterns
            for (uint i = 0; i < data.enemyTypes.length; i++) {
                if (data.enemyCurrentHealth[i] > 0) {
                    if (data.enemyTypes[i] == ENEMY_TYPE_A) {
                        // Aggressive bandit: Always attacks with 6-8 damage
                        data.enemyIntents[i] = uint16(6 + (seed % 3));  // 6-8 damage
                    } else if (data.enemyTypes[i] == ENEMY_TYPE_B) {
                        // Defensive bandit: Mix of block, attack, and combined
                        uint256 action = seed % 10;  // 0-9 for percentage rolls
                        if (action < 4) {  // 40% chance to block
                            data.enemyIntents[i] = INTENT_BLOCK_5;
                        } else if (action < 7) {  // 30% chance for block and attack
                            data.enemyIntents[i] = INTENT_BLOCK_AND_ATTACK;
                        } else {  // 30% chance to attack
                            data.enemyIntents[i] = uint16(4 + (seed % 3));  // 4-6 damage
                        }
                    }
                }
                seed = uint256(keccak256(abi.encodePacked(seed)));
            }
        }
        else if (data.currentFloor == 2) {
            // Level 2: Cursed Hamlet - Synchronized villagers
            // Both enemies will always do the same action
            uint256 action = seed % 10;  // 0-9 for percentage rolls
            uint16 sharedIntent;
            
            if (action < 5) {  // 50% chance to block
                sharedIntent = INTENT_BLOCK_5;
            } else {  // 50% chance to attack
                sharedIntent = uint16(5 + (seed % 3));  // 5-7 damage
            }
            
            for (uint i = 0; i < data.enemyTypes.length; i++) {
                if (data.enemyCurrentHealth[i] > 0) {
                    data.enemyIntents[i] = sharedIntent;
                }
            }
        }
        else if (data.currentFloor == 3) {
            // Level 3: Forsaken Outpost - Single powerful guardian
            if (data.enemyCurrentHealth[0] > 0) {
                uint256 action = seed % 10;  // 0-9 for percentage rolls
                
                if (action < 3) {  // 30% chance to block
                    data.enemyIntents[0] = INTENT_BLOCK_5;
                    data.enemyBlock[0] = 8;  // Higher block amount
                } else if (action < 7) {  // 40% chance for block and attack
                    data.enemyIntents[0] = INTENT_BLOCK_AND_ATTACK;
                } else {  // 30% chance to attack
                    data.enemyIntents[0] = uint16(8 + (seed % 5));  // 8-12 damage
                }
            }
        }
        else {
            // Default behavior for other levels
            for (uint i = 0; i < data.enemyTypes.length; i++) {
                if (data.enemyCurrentHealth[i] > 0) {
                    uint8 enemyType = data.enemyTypes[i];
                    
                    if (enemyType == ENEMY_TYPE_A) {
                        data.enemyIntents[i] = uint16(6 + (seed % 5));  // 6-10 damage
                    } else if (enemyType == ENEMY_TYPE_B) {
                        uint256 action = seed % 3;  // Basic 3-way split
                        if (action == 0) {
                            data.enemyIntents[i] = INTENT_BLOCK_5;
                        } else if (action == 1) {
                            data.enemyIntents[i] = INTENT_BLOCK_AND_ATTACK;
                        } else {
                            data.enemyIntents[i] = uint16(4 + (seed % 5));  // 4-8 damage
                        }
                    }
                }
                seed = uint256(keccak256(abi.encodePacked(seed)));
            }
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
        data.runState = RUN_STATE_ENCOUNTER;
        data.currentFloor++;
        startEncounter();
    }

    function skipCardReward() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_CARD_REWARD, "Not in reward state");
        delete data.availableCardRewards;
        data.runState = RUN_STATE_ENCOUNTER;
        data.currentFloor++;
        startEncounter();
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
        GameData storage data = playerData[msg.sender];
        uint8 cardsToDraw = data.extraCardDrawEnabled ? 4 : 3;
        
        for (uint8 i = 0; i < cardsToDraw; i++) {
            drawCard();
        }
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

    // Add new function to retry from death
    function retryFromDeath() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_DEATH, "Not in death state");
        
        // Clear all state before starting new run
        data.runState = RUN_STATE_NONE;
        data.currentFloor = 0;
        data.maxHealth = 0;
        data.currentHealth = 0;
        data.currentBlock = 0;
        data.maxMana = 0;
        data.currentMana = 0;
        data.extraCardDrawEnabled = false;
        data.hasProtectionBlessing = false;  // Reset protection blessing
        delete data.enemyTypes;
        delete data.enemyMaxHealth;
        delete data.enemyCurrentHealth;
        delete data.enemyIntents;
        delete data.enemyBlock;
        delete data.deck;
        delete data.hand;
        delete data.draw;
        delete data.discard;
        delete data.availableCardRewards;
        
        // Start a new run
        startRun();
    }
}
