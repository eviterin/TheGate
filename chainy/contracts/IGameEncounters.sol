// SPDX-License-Identifier: UNLICENSED
pragma solidity ^0.8.28;

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
    function setGameStateContract(address gameStateContract) external;
    function removeAllEnemyBlock(address player) external;
} 