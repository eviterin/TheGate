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

        uint8[] deck;

        uint8[] hand;
        uint8[] draw;
        uint8[] discard;

        // Available card rewards when completing an encounter
        uint8[] availableCardRewards;

        // Quick transaction settings
        bool hasEnabledQuickTransactions;
        uint256 quickTransactionsEnabledAt;
    }
    
    mapping(address => GameData) public playerData;

    // Events
    event QuickTransactionsEnabled(
        address indexed user,
        uint256 timestamp
    );

    event RewardsGenerated(
        address indexed user,
        uint8 floor,
        uint8[] rewards
    );

    constructor() {
    }
    
    function enableQuickTransactions() public {
        require(
            !playerData[msg.sender].hasEnabledQuickTransactions,
            "Quick transactions already enabled"
        );
        
        playerData[msg.sender].hasEnabledQuickTransactions = true;
        playerData[msg.sender].quickTransactionsEnabledAt = block.timestamp;
        
        emit QuickTransactionsEnabled(
            msg.sender,
            block.timestamp
        );
    }

    function getQuickTransactionsEnabled(address user) public view returns (bool) {
        return playerData[user].hasEnabledQuickTransactions;
    }
    
    function startRun() public {
        playerData[msg.sender].runState = RUN_STATE_WHALE_ROOM;
        playerData[msg.sender].currentFloor = 0;
        playerData[msg.sender].maxHealth = 21;
        playerData[msg.sender].currentHealth = 21;
        playerData[msg.sender].maxMana = 5;
        playerData[msg.sender].currentMana = 0;
        
        // Initialize starting deck
        delete playerData[msg.sender].deck;
        playerData[msg.sender].deck = [CARD_ID_STRIKE, CARD_ID_STRIKE, CARD_ID_STRIKE, CARD_ID_DEFEND, CARD_ID_DEFEND];
    }
    
    function abandonRun() public {
        // Reset run state and floor
        playerData[msg.sender].runState = RUN_STATE_NONE;
        playerData[msg.sender].currentFloor = 0;
        
        // Reset health, block and mana
        playerData[msg.sender].maxHealth = 0;
        playerData[msg.sender].currentHealth = 0;
        playerData[msg.sender].currentBlock = 0;
        playerData[msg.sender].maxMana = 0;
        playerData[msg.sender].currentMana = 0;
        
        // Clear enemy data
        delete playerData[msg.sender].enemyTypes;
        delete playerData[msg.sender].enemyMaxHealth;
        delete playerData[msg.sender].enemyCurrentHealth;
        delete playerData[msg.sender].enemyIntents;
        
        // Clear card collections
        delete playerData[msg.sender].deck;
        delete playerData[msg.sender].hand;
        delete playerData[msg.sender].draw;
        delete playerData[msg.sender].discard;
        
        // Clear any pending rewards
        delete playerData[msg.sender].availableCardRewards;
    }
    
    function chooseRoom() public {
        if (playerData[msg.sender].runState == RUN_STATE_WHALE_ROOM) {
            playerData[msg.sender].runState = RUN_STATE_ENCOUNTER;
            playerData[msg.sender].currentFloor++;

            startEncounter();
        }
    }

    function playCard(uint8 playedCardIndex, uint8 targetIndex) public {
        uint8 playedCardID = playerData[msg.sender].hand[playedCardIndex];

        if (playedCardID == CARD_ID_STRIKE) {
            if (playerData[msg.sender].currentMana >= 1) {
                playerData[msg.sender].currentMana -= 1;

                dealDamageToEnemy(targetIndex, 6);
                if (checkWinCondition()) { return; }

                discardCard(playedCardIndex);
            }
        } else if (playedCardID == CARD_ID_DEFEND) {
            if (playerData[msg.sender].currentMana >= 1) {
                playerData[msg.sender].currentMana -= 1;

                playerData[msg.sender].currentBlock += 6;

                discardCard(playedCardIndex);
            }
        } else if (playedCardID == CARD_ID_POMMEL_STRIKE) {
            if (playerData[msg.sender].currentMana >= 1) {
                playerData[msg.sender].currentMana -= 1;
                
                dealDamageToEnemy(targetIndex, 7);
                if (checkWinCondition()) { return; }
                drawCard();
                
                discardCard(playedCardIndex);
            }
        } else if (playedCardID == CARD_ID_CLEAVE) {
            if (playerData[msg.sender].currentMana >= 2) {
                playerData[msg.sender].currentMana -= 2;
                
                // Deal damage to all enemies
                for (uint i = 0; i < playerData[msg.sender].enemyTypes.length; i++) {
                    if (playerData[msg.sender].enemyCurrentHealth[i] > 0) {
                        dealDamageToEnemy(uint8(i), 8);
                    }
                }
                if (checkWinCondition()) { return; }
                
                discardCard(playedCardIndex);
            }
        }
    }

    function endTurn() public {
        require(
            playerData[msg.sender].runState == RUN_STATE_ENCOUNTER,
            "Can only end turn during an encounter"
        );
        
        uint enemyCount = playerData[msg.sender].enemyTypes.length;
        for (uint i = 0; i < enemyCount; i++) {
            if (playerData[msg.sender].enemyCurrentHealth[i] > 0) {
                uint16 intent = playerData[msg.sender].enemyIntents[i];
                if (intent == INTENT_BLOCK_5) {
                    // Enemy blocks itself
                    playerData[msg.sender].enemyCurrentHealth[i] += 5;
                    if (playerData[msg.sender].enemyCurrentHealth[i] > playerData[msg.sender].enemyMaxHealth[i]) {
                        playerData[msg.sender].enemyCurrentHealth[i] = playerData[msg.sender].enemyMaxHealth[i];
                    }
                } else {
                    // Enemy deals damage
                    dealDamageToHero(uint8(intent));
                }
            }
        }

        // Check if player died from damage
        if (playerData[msg.sender].currentHealth == 0) {
            abandonRun();
            return;
        }

        // Check for win condition before proceeding with next turn
        if (checkWinCondition()) {
            return;
        }

        // Set new intents for next turn
        setNewEnemyIntents();
        
        // Reset mana for next turn
        playerData[msg.sender].currentMana = playerData[msg.sender].maxMana;
        
        // Always draw 3 new cards (keeping any unplayed cards in hand)
        drawCard();
        drawCard();
        drawCard();
    }

    function drawNewHand() private {
        // Draw exactly 3 cards for initial hand
        drawCard();
        drawCard();
        drawCard();
    }

    function discardHand() private {
        // Move all cards from hand to discard pile
        uint len = playerData[msg.sender].hand.length;
        for (uint i = 0; i < len; i++) {
            playerData[msg.sender].discard.push(playerData[msg.sender].hand[i]);
        }
        // Clear the hand
        playerData[msg.sender].hand = new uint8[](0);
    }

    function discardCard(uint cardIndex) private {
        uint8 cardID = playerData[msg.sender].hand[cardIndex];
        if (cardID != CARD_ID_NONE) {
            // Add to discard pile
            playerData[msg.sender].discard.push(cardID);
            
            // Bubble up and pop
            uint len = playerData[msg.sender].hand.length;
            for (uint i = cardIndex; i < len - 1; i++) {
                playerData[msg.sender].hand[i] = playerData[msg.sender].hand[i + 1];
            }
            playerData[msg.sender].hand.pop();
        }
    }

    function dealDamageToEnemy(uint8 enemyIndex, uint8 damage) private {
        if (playerData[msg.sender].enemyCurrentHealth[enemyIndex] < damage) {
            playerData[msg.sender].enemyCurrentHealth[enemyIndex] = 0;
        } else {
            playerData[msg.sender].enemyCurrentHealth[enemyIndex] -= damage;
        }

        // Check for win condition after dealing damage
        checkWinCondition();
    }

    function dealDamageToHero(uint8 damage) private {
        if (playerData[msg.sender].currentBlock >= damage) {
            playerData[msg.sender].currentBlock -= damage;
        } else {
            uint8 newDamage = damage - playerData[msg.sender].currentBlock;
            playerData[msg.sender].currentBlock = 0;
            
            if (newDamage >= playerData[msg.sender].currentHealth) {
                // ded
                playerData[msg.sender].currentHealth = 0;
            } else {
                playerData[msg.sender].currentHealth -= newDamage;
            }
        }
    }

    function shuffleDrawPile() private {
        uint256 seed = 420;
        uint8[] storage array = playerData[msg.sender].draw;
        uint256 len = array.length;

        uint256 j;

        for (uint256 i = len - 1; i > 0; i--) {
            j = uint256(keccak256(abi.encodePacked(seed, i))) % (i + 1);

            (array[i], array[j]) = (array[j], array[i]);
        }
    }

    function startEncounter() private {
        // Set up enemies
        playerData[msg.sender].enemyTypes = [ENEMY_TYPE_A, ENEMY_TYPE_B];
        playerData[msg.sender].enemyMaxHealth = [10, 12];
        playerData[msg.sender].enemyCurrentHealth = [10, 12];

        // Initialize enemy intents
        setNewEnemyIntents();

        // Clear hand and discard pile
        delete playerData[msg.sender].hand;
        delete playerData[msg.sender].discard;
        
        // Reset block
        playerData[msg.sender].currentBlock = 0;

        // Copy deck into draw pile and shuffle
        copyDeckIntoDrawpile();
        shuffleDrawPile();

        // Start first turn
        drawNewHand();
        playerData[msg.sender].currentMana = playerData[msg.sender].maxMana;
    }

    function setNewEnemyIntents() private {
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, msg.sender)));
        playerData[msg.sender].enemyIntents = new uint16[](playerData[msg.sender].enemyTypes.length);
        
        for (uint i = 0; i < playerData[msg.sender].enemyTypes.length; i++) {
            if (playerData[msg.sender].enemyCurrentHealth[i] > 0) {
                uint8 enemyType = playerData[msg.sender].enemyTypes[i];
                if (enemyType == ENEMY_TYPE_A) {
                    // Enemy Type A: Can do 6-10 damage
                    playerData[msg.sender].enemyIntents[i] = uint16(6 + (seed % 5));
                } else if (enemyType == ENEMY_TYPE_B) {
                    // Enemy Type B: Can do 4-8 damage or block 5
                    if (seed % 3 == 0) {
                        playerData[msg.sender].enemyIntents[i] = INTENT_BLOCK_5;
                    } else {
                        playerData[msg.sender].enemyIntents[i] = uint16(4 + (seed % 5));
                    }
                }
            } else {
                playerData[msg.sender].enemyIntents[i] = 0;
            }
            seed = uint256(keccak256(abi.encodePacked(seed)));
        }
    }

    function copyDeckIntoDrawpile() private {
        playerData[msg.sender].draw = new uint8[](0);
        uint len = playerData[msg.sender].deck.length;
        for (uint i = 0; i < len; i++) {
            playerData[msg.sender].draw.push(playerData[msg.sender].deck[i]);
        }
    }

    function moveDiscardIntoDrawpile() private {
        playerData[msg.sender].draw = new uint8[](0);
        uint len = playerData[msg.sender].discard.length;
        for (uint i = 0; i < len; i++) {
            playerData[msg.sender].draw.push(playerData[msg.sender].discard[i]);
        }
        playerData[msg.sender].discard = new uint8[](0);
    }

    function drawCard() private {
        if (playerData[msg.sender].draw.length == 0) {
            // Shuffle discard pile into deck if deck is empty.
            if (playerData[msg.sender].discard.length == 0) { return; } // If discard pile is empty there is nothing to draw.
            moveDiscardIntoDrawpile();
            shuffleDrawPile();
        }
        uint8 cardID = playerData[msg.sender].draw[playerData[msg.sender].draw.length - 1];
        playerData[msg.sender].draw.pop();
        playerData[msg.sender].hand.push(cardID);
    }

    function checkWinCondition() private returns (bool) {
        bool allEnemiesDead = true;
        for (uint i = 0; i < playerData[msg.sender].enemyCurrentHealth.length; i++) {
            if (playerData[msg.sender].enemyCurrentHealth[i] > 0) {
                allEnemiesDead = false;
                break;
            }
        }
        
        if (allEnemiesDead) {
            completeEncounter();
            return true;
        }
        return false;
    }

    function completeEncounter() private {
        // Change state to reward selection
        playerData[msg.sender].runState = RUN_STATE_CARD_REWARD;
        
        // Generate rewards based on current floor
        generateRewards();
    }

    function generateRewards() private {
        // Clear previous rewards
        delete playerData[msg.sender].availableCardRewards;

        // For now, all floors give the same rewards
        playerData[msg.sender].availableCardRewards = [CARD_ID_POMMEL_STRIKE, CARD_ID_CLEAVE];

        emit RewardsGenerated(
            msg.sender,
            playerData[msg.sender].currentFloor,
            playerData[msg.sender].availableCardRewards
        );
    }

    function skipCardReward() public {
        require(
            playerData[msg.sender].runState == RUN_STATE_CARD_REWARD,
            "Can only skip reward after winning an encounter"
        );

        // Clear rewards and return to whale room for next floor
        delete playerData[msg.sender].availableCardRewards;
        playerData[msg.sender].runState = RUN_STATE_WHALE_ROOM;
    }

    function chooseCardReward(uint8 cardId) public {
        require(
            playerData[msg.sender].runState == RUN_STATE_CARD_REWARD,
            "Can only choose reward after winning an encounter"
        );
        
        // Verify the chosen card is in the available rewards
        bool isValidChoice = false;
        for (uint i = 0; i < playerData[msg.sender].availableCardRewards.length; i++) {
            if (playerData[msg.sender].availableCardRewards[i] == cardId) {
                isValidChoice = true;
                break;
            }
        }
        require(isValidChoice, "Invalid card choice");

        // Add the chosen card to the deck
        playerData[msg.sender].deck.push(cardId);

        // Clear rewards and return to whale room for next floor
        delete playerData[msg.sender].availableCardRewards;
        playerData[msg.sender].runState = RUN_STATE_WHALE_ROOM;
    }

    function getAvailableRewards(address player) public view returns (uint8[] memory) {
        return playerData[player].availableCardRewards;
    }

    function getEnemyData(address player) public view returns (
        uint8[] memory, 
        uint16[] memory, 
        uint16[] memory, 
        uint16[] memory) {
        return (
            playerData[player].enemyTypes, 
            playerData[player].enemyMaxHealth, 
            playerData[player].enemyCurrentHealth, 
            playerData[player].enemyIntents
        );
    }

     function getPlayerData(address player) public view returns (
        uint8[] memory,
        uint8[] memory,
        uint8[] memory,
        uint8[] memory) {
        return (
            playerData[player].deck,
            playerData[player].hand,
            playerData[player].draw,
            playerData[player].discard
        );
    }

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
    
    // Constants for enemy intents
    uint16 constant INTENT_BLOCK_5 = 1000;
}
