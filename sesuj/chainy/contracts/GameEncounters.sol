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

    function healEnemy(address player, uint8 enemyIndex, uint8 amount) external onlyGameState {
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
        data.intents = new uint16[](data.types.length);
        
        if (floor == 1) {
            for (uint i = 0; i < data.types.length; i++) {
                if (data.currentHealth[i] > 0) {
                    if (data.types[i] == ENEMY_TYPE_A) {
                        data.intents[i] = uint16(6 + (seed % 3));
                    } else if (data.types[i] == ENEMY_TYPE_B) {
                        if (data.buffs[i] == 0) {
                            data.intents[i] = INTENT_ATTACK_BUFF;
                        } else {
                            data.intents[i] = uint16(8 + (seed % 3));
                        }
                    }
                }
                seed = uint256(keccak256(abi.encodePacked(seed)));
            }
        }
        else if (floor == 2) {
            uint256 action = seed % 10;
            uint16 sharedIntent;
            
            if (action < 4) {
                sharedIntent = INTENT_BLOCK_5;
            } else if (action < 6) {
                sharedIntent = INTENT_HEAL;
            } else {
                sharedIntent = uint16(5 + (seed % 3));
            }
            
            for (uint i = 0; i < data.types.length; i++) {
                if (data.currentHealth[i] > 0) {
                    data.intents[i] = sharedIntent;
                }
            }
        }
        else if (floor == 3) {
            if (data.currentHealth[0] > 0) {
                if (data.buffs[0] == 0) {
                    data.intents[0] = INTENT_ATTACK_BUFF;
                } else {
                    data.intents[0] = uint16(8 + (seed % 5) + data.buffs[0]);
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
                            data.intents[i] = INTENT_ATTACK_BUFF;
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