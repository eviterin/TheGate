// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

contract GameEncounters {
    struct EnemyData {
        uint8[] types;
        uint16[] maxHealth;
        uint16[] currentHealth;
        uint16[] intents;
        uint16[] blockAmount;
        uint8[] buffs;
    }

    uint8 constant ENEMY_TYPE_NONE = 0;
    uint8 constant ENEMY_TYPE_A = 1;
    uint8 constant ENEMY_TYPE_B = 2;

    uint16 constant INTENT_BLOCK_5 = 1000;
    uint16 constant INTENT_BLOCK_AND_ATTACK = 1001;
    uint16 constant INTENT_HEAL = 1002;
    uint16 constant INTENT_ATTACK_BUFF = 1003;
    uint16 constant INTENT_BLOCK_AND_HEAL = 1004;
    uint16 constant INTENT_HEAL_ALL = 1005;

    address public gameStateContract;
    mapping(address => EnemyData) private enemyData;

    constructor(address _gameStateContract) {
        gameStateContract = _gameStateContract;
    }

    modifier onlyGameState() {
        require(msg.sender == gameStateContract, "Only GameState can call this");
        _;
    }

    function setGameStateContract(address _gameStateContract) external {
        require(gameStateContract == address(0), "GameState already set");
        gameStateContract = _gameStateContract;
    }

    function startEncounter(address player, uint8 floor) external onlyGameState returns (EnemyData memory) {
        EnemyData storage data = enemyData[player];
        
        if (floor == 1) {
            data.types = [ENEMY_TYPE_A, ENEMY_TYPE_B];
            data.maxHealth = [14, 16];
            data.currentHealth = [14, 16];
            data.blockAmount = new uint16[](2);
            data.buffs = new uint8[](2);
        } else if (floor == 2) {
            data.types = [ENEMY_TYPE_A, ENEMY_TYPE_A];
            data.maxHealth = [16, 16];
            data.currentHealth = [16, 16];
            data.blockAmount = new uint16[](2);
            data.buffs = new uint8[](2);
        } else if (floor == 3) {
            data.types = [ENEMY_TYPE_B];
            data.maxHealth = [32];
            data.currentHealth = [32];
            data.blockAmount = new uint16[](1);
            data.buffs = new uint8[](1);
        } else if (floor == 4) {
            data.types = [ENEMY_TYPE_A, ENEMY_TYPE_B];
            data.maxHealth = [18, 22];
            data.currentHealth = [18, 22];
            data.blockAmount = new uint16[](2);
            data.buffs = new uint8[](2);
        } else if (floor == 9) {
            data.types = [ENEMY_TYPE_B];
            data.maxHealth = [38];
            data.currentHealth = [38];
            data.blockAmount = new uint16[](1);
            data.buffs = new uint8[](1);
        } else if (floor == 10) {
            data.types = [ENEMY_TYPE_B];
            data.maxHealth = [40];
            data.currentHealth = [40];
            data.blockAmount = new uint16[](1);
            data.buffs = new uint8[](1);
        } else {
            data.types = [ENEMY_TYPE_A, ENEMY_TYPE_B];
            data.maxHealth = [10, 12];
            data.currentHealth = [10, 12];
            data.blockAmount = new uint16[](2);
            data.buffs = new uint8[](2);
        }
        
        for (uint i = 0; i < data.blockAmount.length; i++) {
            data.blockAmount[i] = 0;
            data.buffs[i] = 0;
        }
        
        setNewEnemyIntents(player, floor);
        return data;
    }

    function dealDamageToEnemy(address player, uint8 enemyIndex, uint8 damage) external onlyGameState returns (bool isDead) {
        EnemyData storage data = enemyData[player];
        uint16 remainingDamage = damage;
        
        if (data.blockAmount[enemyIndex] > 0) {
            if (data.blockAmount[enemyIndex] >= remainingDamage) {
                data.blockAmount[enemyIndex] -= remainingDamage;
                return false;
            }
            remainingDamage -= data.blockAmount[enemyIndex];
            data.blockAmount[enemyIndex] = 0;
        }
        
        if (data.currentHealth[enemyIndex] <= remainingDamage) {
            data.currentHealth[enemyIndex] = 0;
            return true;
        } else {
            data.currentHealth[enemyIndex] -= remainingDamage;
            return false;
        }
    }

    function dealDirectDamage(address player, uint8 enemyIndex, uint8 damage) external onlyGameState returns (bool isDead) {
        EnemyData storage data = enemyData[player];
        require(enemyIndex < data.currentHealth.length, "Invalid enemy index");
        
        if (data.currentHealth[enemyIndex] <= damage) {
            data.currentHealth[enemyIndex] = 0;
            return true;
        } else {
            data.currentHealth[enemyIndex] -= damage;
            return false;
        }
    }

    function healEnemy(address player, uint8 enemyIndex, uint8 amount) external onlyGameState {
        _healEnemy(player, enemyIndex, amount);
    }

    function _healEnemy(address player, uint8 enemyIndex, uint8 amount) internal {
        EnemyData storage data = enemyData[player];
        uint16 newHealth = data.currentHealth[enemyIndex] + amount;
        if (newHealth > data.maxHealth[enemyIndex]) {
            data.currentHealth[enemyIndex] = data.maxHealth[enemyIndex];
        } else {
            data.currentHealth[enemyIndex] = newHealth;
        }
    }

    function setNewEnemyIntents(address player, uint8 floor) public onlyGameState {
        EnemyData storage data = enemyData[player];
        uint256 seed = uint256(keccak256(abi.encodePacked(block.timestamp, player)));
        
        // Store previous intents before creating new array
        uint16[] memory previousIntents = data.intents;
        data.intents = new uint16[](data.types.length);
        
        if (floor == 1) {
            if (data.currentHealth[0] > 0 && data.currentHealth[1] > 0) {
                // On first turn, enemy 1 attacks and enemy 2 blocks
                if (previousIntents.length == 0) {
                    data.intents[0] = 8; // Attack for 8 damage
                    data.intents[1] = INTENT_BLOCK_5;
                } else {
                    // After first turn, they swap roles each turn
                    bool wasFirstBlocking = previousIntents[0] == INTENT_BLOCK_5;
                    if (wasFirstBlocking) {
                        data.intents[0] = 8;
                        data.intents[1] = INTENT_BLOCK_5;
                    } else {
                        data.intents[0] = INTENT_BLOCK_5;
                        data.intents[1] = 7;
                    }
                }
            }
            // If only one enemy alive, they continuously attack (harder)
            else if (data.currentHealth[0] > 0) {
                data.intents[0] = 12;
            }
            else if (data.currentHealth[1] > 0) {
                data.intents[1] = 11;
            }
        }
        else if (floor == 2) {
            // First enemy alternates between attack and defend
            if (data.currentHealth[0] > 0) {
                // Check previous intent to alternate
                if (previousIntents.length == 0 || previousIntents[0] == INTENT_BLOCK_5) {
                    data.intents[0] = 7; // Fixed 7 damage - raw damage number (1-999 range)
                } else {
                    data.intents[0] = INTENT_BLOCK_5;
                }
            }
            
            // Second enemy heals all while first is alive, attacks when alone
            if (data.currentHealth[1] > 0) {
                if (data.currentHealth[0] > 0) {
                    data.intents[1] = INTENT_HEAL_ALL; // Using constant for special intent
                } else {
                    data.intents[1] = 9; // Attacks for 9 when alone
                }
            }
        }
        else if (floor == 3) {
            if (data.currentHealth[0] > 0) {
                if (data.buffs[0] == 0) {
                    data.intents[0] = INTENT_ATTACK_BUFF;
                } else {
                    data.intents[0] = INTENT_BLOCK_AND_ATTACK;
                }
            }
        }
        else if (floor == 4) {
            for (uint i = 0; i < data.types.length; i++) {
                if (data.currentHealth[i] > 0) {
                    if (data.types[i] == ENEMY_TYPE_A) {
                        data.intents[i] = uint16(8 + (seed % 5));
                    } else if (data.types[i] == ENEMY_TYPE_B) {
                        uint256 action = seed % 10;
                        if (action < 3) {
                            data.intents[i] = INTENT_HEAL;
                        } else if (action < 6) {
                            data.intents[i] = INTENT_BLOCK_5;
                        } else {
                            data.intents[i] = uint16(6 + (seed % 5));
                        }
                    }
                }
                seed = uint256(keccak256(abi.encodePacked(seed)));
            }
        }
        else {
            for (uint i = 0; i < data.types.length; i++) {
                if (data.currentHealth[i] > 0) {
                    uint8 enemyType = data.types[i];
                    
                    if (enemyType == ENEMY_TYPE_A) {
                        data.intents[i] = uint16(6 + (seed % 5));
                    } else if (enemyType == ENEMY_TYPE_B) {
                        uint256 action = seed % 3;
                        if (action == 0) {
                            data.intents[i] = INTENT_BLOCK_5;
                        } else if (action == 1) {
                            data.intents[i] = INTENT_BLOCK_AND_ATTACK;
                        } else {
                            data.intents[i] = uint16(4 + (seed % 5));
                        }
                    }
                }
                seed = uint256(keccak256(abi.encodePacked(seed)));
            }
        }
    }

    function setEnemyBlock(address player, uint8 enemyIndex, uint16 amount) external onlyGameState {
        EnemyData storage data = enemyData[player];
        require(enemyIndex < data.blockAmount.length, "Invalid enemy index");
        data.blockAmount[enemyIndex] = amount;
    }

    function setEnemyBuff(address player, uint8 enemyIndex, uint8 amount) external onlyGameState {
        EnemyData storage data = enemyData[player];
        require(enemyIndex < data.buffs.length, "Invalid enemy index");
        data.buffs[enemyIndex] = amount;
    }

    function processIntent(address player, uint8 enemyIndex, uint16 intent) external onlyGameState returns (uint8 damageToHero) {
        EnemyData storage data = enemyData[player];
        require(enemyIndex < data.types.length, "Invalid enemy index");
        
        if (intent == INTENT_BLOCK_5) {
            data.blockAmount[enemyIndex] = 5;
            return 0;
        } else if (intent == INTENT_BLOCK_AND_ATTACK) {
            data.blockAmount[enemyIndex] = 5;
            return 6;
        } else if (intent == INTENT_HEAL) {
            _healEnemy(player, enemyIndex, 5);
            return 0;
        } else if (intent == INTENT_ATTACK_BUFF) {
            require(enemyIndex < data.buffs.length, "Invalid enemy index for buff");
            data.buffs[enemyIndex] += 2;
            return 0;
        } else if (intent == INTENT_BLOCK_AND_HEAL) {
            data.blockAmount[enemyIndex] = 5;
            _healEnemy(player, enemyIndex, 5);
            return 0;
        } else if (intent == INTENT_HEAL_ALL) {
            for (uint i = 0; i < data.types.length; i++) {
                if (data.currentHealth[i] > 0) {
                    _healEnemy(player, uint8(i), 5);
                }
            }
            return 0;
        } else {
            require(enemyIndex < data.buffs.length, "Invalid enemy index for buff");
            return uint8(intent) + data.buffs[enemyIndex];
        }
    }

    function getEnemyData(address player) external view returns (
        uint8[] memory types,
        uint16[] memory maxHealth,
        uint16[] memory currentHealth,
        uint16[] memory intents,
        uint16[] memory blockAmount,
        uint8[] memory buffs
    ) {
        EnemyData storage data = enemyData[player];
        return (
            data.types,
            data.maxHealth,
            data.currentHealth,
            data.intents,
            data.blockAmount,
            data.buffs
        );
    }

    function clearEnemyData(address player) external onlyGameState {
        delete enemyData[player];
    }
} 