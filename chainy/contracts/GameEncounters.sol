// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

import "./CardEffects.sol";

contract GameEncounters {
    using CardEffects for uint16;

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
    uint16 constant INTENT_VAMPIRIC_BITE = 1006;

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
            data.blockAmount[0] = 5;
            data.buffs = new uint8[](1);
        } else if (floor == 4) {
            data.types = [ENEMY_TYPE_A, ENEMY_TYPE_B];
            data.maxHealth = [25, 22];
            data.currentHealth = [18, 22];
            data.blockAmount = new uint16[](2);
            data.buffs = new uint8[](2);
        } else if (floor == 5) {
            data.types = [ENEMY_TYPE_A, ENEMY_TYPE_B];
            data.maxHealth = [38, 21];
            data.currentHealth = [17, 21];
            data.blockAmount = new uint16[](2);
            data.buffs = new uint8[](2);
        } else if (floor == 6) {
            data.types = [ENEMY_TYPE_B];
            data.maxHealth = [35];
            data.currentHealth = [35];
            data.blockAmount = new uint16[](1);
            data.buffs = new uint8[](1);
            data.buffs[0] += 4;
        } else if (floor == 7) {
            data.types = [ENEMY_TYPE_A];
            data.maxHealth = [20];
            data.currentHealth = [20];
            data.blockAmount = new uint16[](1);
            data.blockAmount[0] = 15;
            data.buffs = new uint8[](1);
        } else if (floor == 8) {
            data.types = [ENEMY_TYPE_A, 2, 3, 4, 5];
            data.maxHealth = [20, 4, 5, 4, 6];
            data.currentHealth = [20, 4, 5, 4, 6];
            data.blockAmount = new uint16[](5);
            data.buffs = new uint8[](5);
        } else if (floor == 9) {
            data.types = [ENEMY_TYPE_A, ENEMY_TYPE_B];
            data.maxHealth = [25, 25];
            data.currentHealth = [25, 25];
            data.blockAmount = new uint16[](2);
            data.buffs = new uint8[](2);
        } else if (floor == 10) {
            data.types = [ENEMY_TYPE_B, 2, 3];
            data.maxHealth = [55, 9, 9];
            data.currentHealth = [55, 0, 0];
            data.blockAmount = new uint16[](3);
            data.buffs = new uint8[](3);
        }
        
        setNewEnemyIntents(player, floor);
        return data;
    }

    function dealDamageToEnemy(address player, uint8 enemyIndex, uint8 damage) external onlyGameState returns (bool isDead) {
        EnemyData storage data = enemyData[player];
        (uint16 newHealth, uint16 newBlock, bool died) = CardEffects.dealDamageToEnemy(damage, data.blockAmount[enemyIndex], data.currentHealth[enemyIndex]);
        data.currentHealth[enemyIndex] = newHealth;
        data.blockAmount[enemyIndex] = newBlock;
        return died;
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
                    data.intents[0] = 6; // Attack for 6 damage
                    data.intents[1] = INTENT_BLOCK_5;
                } else {
                    // After first turn, they swap roles each turn
                    bool wasFirstBlocking = previousIntents[0] == INTENT_BLOCK_5;
                    if (wasFirstBlocking) {
                        data.intents[0] = 6;
                        data.intents[1] = INTENT_BLOCK_5;
                    } else {
                        data.intents[0] = INTENT_BLOCK_5;
                        data.intents[1] = 4;
                    }
                }
            }
            // If only one enemy alive, they continuously attack (harder)
            else if (data.currentHealth[0] > 0) {
                data.intents[0] = 12;
            }
            else if (data.currentHealth[1] > 0) {
                data.intents[1] = 8;
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
                        // If friend is dead (health 0) or at full health, attack for 2
                        if (i == 1 && (data.currentHealth[0] == 0 || data.currentHealth[0] == data.maxHealth[0])) {
                            data.intents[i] = 2;
                        } else {
                            data.intents[i] = INTENT_HEAL_ALL;
                        }
                    }
                }
                seed = uint256(keccak256(abi.encodePacked(seed)));
            }
        } else if (floor == 5) {
            if (data.currentHealth[0] > 0) {
                data.intents[0] = INTENT_BLOCK_AND_ATTACK;
            }
            if (data.currentHealth[1] > 0) {
                data.intents[1] = INTENT_VAMPIRIC_BITE;
            }
        } else if (floor == 6) {
            if (data.currentHealth[0] > 0) {
                data.intents[0] = INTENT_BLOCK_AND_ATTACK;
            }
        } else if (floor == 7) {
            if (data.currentHealth[0] > 0) {
                data.intents[0] = uint16(10 + (seed % 3));
            }
        } else if (floor == 8) {
            if (data.currentHealth[0] > 0) {
                if (previousIntents.length == 0) {
                    data.intents[0] = INTENT_BLOCK_5;
                } else if (data.currentHealth[1] == 0 && data.currentHealth[2] == 0 && data.currentHealth[3] == 0 && data.currentHealth[4] == 0) {
                    data.intents[0] = 15;
                } else {
                    data.intents[0] = INTENT_BLOCK_5;
                }
            }
            for(uint i = 1; i < 5; i++) {
                if (data.currentHealth[i] > 0) {
                    data.intents[i] = uint16(2 + (seed % 3));
                }
                seed = uint256(keccak256(abi.encodePacked(seed)));
            }
        } else if (floor == 9) {
            // Implement alternating behavior for both enemies in floor 9
            // When one enemy buffs, the other attacks, and vice versa
            if (data.currentHealth[0] > 0 && data.currentHealth[1] > 0) {
                // On first turn, enemy 1 buffs and enemy 2 attacks
                if (previousIntents.length == 0) {
                    data.intents[0] = INTENT_ATTACK_BUFF;
                    data.intents[1] = INTENT_BLOCK_AND_ATTACK;
                } else {
                    // Then they swap roles each turn
                    if (previousIntents[0] == INTENT_ATTACK_BUFF) {
                        data.intents[0] = INTENT_BLOCK_AND_ATTACK;
                        data.intents[1] = INTENT_ATTACK_BUFF;
                    } else {
                        data.intents[0] = INTENT_ATTACK_BUFF;
                        data.intents[1] = INTENT_BLOCK_AND_ATTACK;
                    }
                }
            } 
            // If only one enemy is alive, they do both
            else if (data.currentHealth[0] > 0) {
                if (previousIntents.length == 0 || previousIntents[0] == INTENT_BLOCK_AND_ATTACK) {
                    data.intents[0] = INTENT_ATTACK_BUFF;
                } else {
                    data.intents[0] = INTENT_BLOCK_AND_ATTACK;
                }
            }
            else if (data.currentHealth[1] > 0) {
                if (previousIntents.length == 0 || previousIntents[1] == INTENT_BLOCK_AND_ATTACK) {
                    data.intents[1] = INTENT_ATTACK_BUFF;
                } else {
                    data.intents[1] = INTENT_BLOCK_AND_ATTACK;
                }
            }
        } else if (floor == 10) {
            // Boss logic
            if (data.currentHealth[0] > 0) {
                if(previousIntents[0] > 0 && previousIntents[0] < 8) {
                    data.intents[0] = previousIntents[0] + 1;
                } else if(previousIntents[0] == 8) {
                    data.currentHealth[1] = 4;
                    data.currentHealth[2] = 4;
                    data.intents[0] = 0;
                }
                else {
                    data.intents[0] = 6;
                }
            }

            // Minion logic
            for (uint i = 1; i < 3; i++) {
                if (data.currentHealth[i] > 0) {
                    data.intents[i] = 9;
                }
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
        
        // Reset block at start of enemy's next turn
        data.blockAmount[enemyIndex] = 0;
        
        if (intent == INTENT_BLOCK_5) {
            data.blockAmount[enemyIndex] = 5;
            return 0;
        } else if (intent == INTENT_BLOCK_AND_ATTACK) {
            data.blockAmount[enemyIndex] = 5;
            require(enemyIndex < data.buffs.length, "Invalid enemy index for buff");
            return 6 + data.buffs[enemyIndex];
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
        } else if (intent == INTENT_VAMPIRIC_BITE) {
            // Vampiric bite deals 5 damage and heals for the same amount
            _healEnemy(player, enemyIndex, 5);
            return 5;
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

    function removeAllEnemyBlock(address player) external onlyGameState {
        EnemyData storage data = enemyData[player];
        for (uint8 i = 0; i < data.types.length; i++) {
            data.blockAmount[i] = 0;
        }
    }
} 