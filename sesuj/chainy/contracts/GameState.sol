// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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

contract GameState {
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
    }
    
    mapping(address => GameData) public playerData;
    IGameEncounters public encounters;

    event QuickTransactionsEnabled(address indexed user, uint256 timestamp);
    event RewardsGenerated(address indexed user, uint8 floor, uint8[] rewards);

    uint8 constant RUN_STATE_NONE = 0;
    uint8 constant RUN_STATE_WHALE_ROOM = 1;
    uint8 constant RUN_STATE_ENCOUNTER = 2;
    uint8 constant RUN_STATE_CARD_REWARD = 3;
    uint8 constant RUN_STATE_DEATH = 4;

    uint8 constant CARD_ID_NONE = 0;
    uint8 constant CARD_ID_STRIKE = 1;
    uint8 constant CARD_ID_DEFEND = 2;
    uint8 constant CARD_ID_POMMEL_STRIKE = 3;
    uint8 constant CARD_ID_CLEAVE = 4;

    constructor(address _encountersContract) {
        encounters = IGameEncounters(_encountersContract);
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
        
        data.runState = RUN_STATE_WHALE_ROOM;
        data.currentFloor = 0;
        data.maxHealth = 21;
        data.currentHealth = 21;
        data.maxMana = 3;
        data.currentMana = 0;
        data.extraCardDrawEnabled = false;
        data.hasProtectionBlessing = false;
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
        data.extraCardDrawEnabled = false;
        data.hasProtectionBlessing = false;
        delete data.deck;
        delete data.hand;
        delete data.draw;
        delete data.discard;
        delete data.availableCardRewards;
        encounters.clearEnemyData(msg.sender);
    }
    
    function chooseRoom(uint8 option) public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_WHALE_ROOM, "Not in whale room");
        require(option >= 1 && option <= 4, "Invalid whale room option");

        if (option == 1) { // WHALE_OPTION_EXTRA_CARD
            data.extraCardDrawEnabled = true;
        } else if (option == 2) { // WHALE_OPTION_EXTRA_FAITH
            data.maxMana += 1;
            data.currentMana += 1;
        } else if (option == 3) { // WHALE_OPTION_PROTECTION
            data.hasProtectionBlessing = true;
            data.currentBlock = 5;
        } else if (option == 4) { // WHALE_OPTION_UPGRADE
            data.maxHealth += 5;
            data.currentHealth += 5;
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

        if (playedCardID == CARD_ID_STRIKE || playedCardID == CARD_ID_POMMEL_STRIKE || playedCardID == CARD_ID_CLEAVE) {
            require(targetIndex < types.length, "Invalid target");
            require(currentHealth[targetIndex] > 0, "Cannot target a dead enemy");
        }

        if (playedCardID == CARD_ID_STRIKE && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(msg.sender, targetIndex, 6)) {
                if (checkWinCondition()) return;
            }
            discardCard(playedCardIndex);
        } else if (playedCardID == CARD_ID_DEFEND && data.currentMana >= 1) {
            data.currentMana--;
            data.currentBlock += 6;
            discardCard(playedCardIndex);
        } else if (playedCardID == CARD_ID_POMMEL_STRIKE && data.currentMana >= 1) {
            data.currentMana--;
            if (encounters.dealDamageToEnemy(msg.sender, targetIndex, 7)) {
                if (checkWinCondition()) return;
            }
            drawCard();
            discardCard(playedCardIndex);
        } else if (playedCardID == CARD_ID_CLEAVE && data.currentMana >= 2) {
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
            discardCard(playedCardIndex);
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

        // Play each card in sequence
        // If any card fails (reverts), the entire transaction will revert automatically
        for (uint i = 0; i < plays.length; i++) {
            // Stop if we're no longer in combat (e.g., all enemies died)
            if (data.runState != RUN_STATE_ENCOUNTER) break;
            
            // Play the card - any failure here will revert the whole transaction
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
            drawCard();
            drawCard();
            drawCard();
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
        copyDeckIntoDrawpile();
        shuffleDrawPile();
        drawNewHand();
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

    function retryFromDeath() public {
        GameData storage data = playerData[msg.sender];
        require(data.runState == RUN_STATE_DEATH, "Not in death state");
        
        data.runState = RUN_STATE_NONE;
        data.currentFloor = 0;
        data.maxHealth = 0;
        data.currentHealth = 0;
        data.currentBlock = 0;
        data.maxMana = 0;
        data.currentMana = 0;
        data.extraCardDrawEnabled = false;
        data.hasProtectionBlessing = false;
        delete data.deck;
        delete data.hand;
        delete data.draw;
        delete data.discard;
        delete data.availableCardRewards;
        encounters.clearEnemyData(msg.sender);
        
        startRun();
    }
}
