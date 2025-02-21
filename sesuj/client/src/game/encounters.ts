import { FLOOR_NAMES } from '../components/InfoBar';

export interface Position {
  x: number;
  y: number;
}

export interface BasePositions {
  HERO: {
    CENTER: Position;
    LEFT: Position;
    RIGHT: Position;
  };
  ENEMY: {
    LEFT: Position;
    CENTER: Position;
    RIGHT: Position;
    FAR_LEFT: Position;
    FAR_RIGHT: Position;
  };
}

export interface EnemyType {
  NONE: 0;
  TYPE_A: 1;
  TYPE_B: 2;
}

export interface IntentTypes {
  BLOCK_5: 1000;
}

export interface DamageRange {
  min: number;
  max: number;
}

export interface EnemyIntent {
  damage?: DamageRange;
  blockChance?: number;
  blockAmount?: number;
}

export interface ChainData {
  enemyTypes: number[];
  enemyMaxHealth: number[];
  baseIntents: {
    [key: number]: EnemyIntent;
  } | [];
}

export interface ClientData {
  heroPosition: Position;
  enemyPositions: Position[];
}

export interface Encounter {
  level: number;
  name: string;
  chainData: ChainData;
  clientData: ClientData;
}

export const ENEMY_TYPE: EnemyType = {
  NONE: 0,
  TYPE_A: 1,
  TYPE_B: 2,
};

export const INTENT_TYPES: IntentTypes = {
  BLOCK_5: 1000,
};

// Base positions that will be used client-side
export const BASE_POSITIONS: BasePositions = {
  HERO: {
    CENTER: { x: 50, y: 80 },
    LEFT: { x: 20, y: 80 },
    RIGHT: { x: 80, y: 80 },
  },
  ENEMY: {
    LEFT: { x: 30, y: 30 },
    CENTER: { x: 50, y: 30 },
    RIGHT: { x: 70, y: 30 },
    FAR_LEFT: { x: 20, y: 30 },
    FAR_RIGHT: { x: 80, y: 40 },
  }
};

// Encounter configurations combining both chain and client data
export const encounters: Encounter[] = [
  // Level 0 - The Gate (Whale Room)
  {
    level: 0,
    name: FLOOR_NAMES[0],
    chainData: {
      enemyTypes: [],
      enemyMaxHealth: [],
      baseIntents: [], // No intents needed for whale room
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.CENTER,
      enemyPositions: [],
    }
  },
  // Level 1 - Cursed Hamlet
  {
    level: 1,
    name: FLOOR_NAMES[1],
    chainData: {
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
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.LEFT,
      enemyPositions: [BASE_POSITIONS.ENEMY.RIGHT, BASE_POSITIONS.ENEMY.FAR_RIGHT],
    }
  },
  // Level 2 - Barren Dunes
  {
    level: 2,
    name: FLOOR_NAMES[2],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.RIGHT,
      enemyPositions: [BASE_POSITIONS.ENEMY.FAR_LEFT, BASE_POSITIONS.ENEMY.LEFT],
    }
  },
  // Level 3 - Forsaken Outpost
  {
    level: 3,
    name: FLOOR_NAMES[3],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.CENTER,
      enemyPositions: [BASE_POSITIONS.ENEMY.LEFT, BASE_POSITIONS.ENEMY.RIGHT],
    }
  },
  // Level 4 - Black Cathedral
  {
    level: 4,
    name: FLOOR_NAMES[4],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.LEFT,
      enemyPositions: [BASE_POSITIONS.ENEMY.RIGHT, BASE_POSITIONS.ENEMY.FAR_RIGHT],
    }
  },
  // Level 5 - Weeping Monastery
  {
    level: 5,
    name: FLOOR_NAMES[5],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.RIGHT,
      enemyPositions: [BASE_POSITIONS.ENEMY.FAR_LEFT, BASE_POSITIONS.ENEMY.LEFT],
    }
  },
  // Level 6 - Ruined Courtyard
  {
    level: 6,
    name: FLOOR_NAMES[6],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.CENTER,
      enemyPositions: [BASE_POSITIONS.ENEMY.LEFT, BASE_POSITIONS.ENEMY.RIGHT],
    }
  },
  // Level 7 - Blighted Tower
  {
    level: 7,
    name: FLOOR_NAMES[7],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.LEFT,
      enemyPositions: [BASE_POSITIONS.ENEMY.CENTER, BASE_POSITIONS.ENEMY.FAR_RIGHT],
    }
  },
  // Level 8 - Blighted Spire Top
  {
    level: 8,
    name: FLOOR_NAMES[8],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.RIGHT,
      enemyPositions: [BASE_POSITIONS.ENEMY.FAR_LEFT, BASE_POSITIONS.ENEMY.CENTER],
    }
  },
  // Level 9 - Abyssal Throne
  {
    level: 9,
    name: FLOOR_NAMES[9],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.CENTER,
      enemyPositions: [BASE_POSITIONS.ENEMY.LEFT, BASE_POSITIONS.ENEMY.RIGHT],
    }
  },
  // Level 10 - The End of Days
  {
    level: 10,
    name: FLOOR_NAMES[10],
    chainData: {
      enemyTypes: [ENEMY_TYPE.TYPE_A, ENEMY_TYPE.TYPE_B],
      enemyMaxHealth: [10, 12],
      baseIntents: {
        [ENEMY_TYPE.TYPE_A]: {
          damage: { min: 6, max: 10 },
        },
        [ENEMY_TYPE.TYPE_B]: {
          damage: { min: 4, max: 8 },
          blockChance: 0.33,
          blockAmount: 5,
        },
      },
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.CENTER,
      enemyPositions: [BASE_POSITIONS.ENEMY.LEFT, BASE_POSITIONS.ENEMY.RIGHT],
    }
  },
];

// Helper function to get encounter data
export function getEncounter(level: number): Encounter {
  return encounters.find(e => e.level === level) || encounters[0];
}

// Helper function to get only chain-relevant data for contract initialization
export function getChainEncounterData(level: number): ChainData {
  const encounter = getEncounter(level);
  return encounter.chainData;
}

// Helper function to get only client-side data
export function getClientEncounterData(level: number): ClientData {
  const encounter = getEncounter(level);
  return encounter.clientData;
} 