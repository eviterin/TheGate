// Constants matching the client-side configuration
const ENEMY_TYPE = {
  NONE: 0,
  TYPE_A: 1,
  TYPE_B: 2,
};

const INTENT_TYPES = {
  BLOCK_5: 1000,
};

// Base encounter configuration for all combat floors
const COMBAT_FLOOR_CONFIG = {
  enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
  enemyMaxHealth: [10, 12],
  baseIntents: {
    [ENEMY_TYPE.TYPE_A]: {
      damage: { min: 6, max: 10 }, // 6 + (seed % 5)
    },
    [ENEMY_TYPE.TYPE_B]: {
      damage: { min: 4, max: 8 }, // 4 + (seed % 5)
      blockChance: 0.33, // seed % 3 == 0
      blockAmount: 5,
    },
  },
};

// Chain-side encounter configurations
const encounters = [
  // Level 0 - The Gate (Whale Room)
  {
    level: 0,
    chainData: {
      enemyTypes: [],
      enemyMaxHealth: [],
      baseIntents: [], // No intents needed for whale room
    },
  },
  // Levels 1-10 all use the same combat configuration
  ...Array.from({ length: 10 }, (_, i) => ({
    level: i + 1,
    chainData: COMBAT_FLOOR_CONFIG,
  })),
];

// Helper function to get encounter data
function getEncounter(level) {
  return encounters.find(e => e.level === level) || encounters[0];
}

// Helper function to get only chain-relevant data for contract initialization
function getChainEncounterData(level) {
  const encounter = getEncounter(level);
  return encounter.chainData;
}

module.exports = {
  encounters,
  getEncounter,
  getChainEncounterData,
  ENEMY_TYPE,
  INTENT_TYPES,
}; 