export interface Position {
  x: number;
  y: number;
}

export interface BasePositions {
  HERO: {
    CENTER: Position;
    LEFT: Position;
    RIGHT: Position;
    BOTTOMCENTER: Position;
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
    BOTTOMCENTER: { x: 50, y: 95 },
  },
  ENEMY: {
    LEFT: { x: 30, y: 30 },
    CENTER: { x: 50, y: 30 },
    RIGHT: { x: 70, y: 30 },
    FAR_LEFT: { x: 20, y: 30 },
    FAR_RIGHT: { x: 80, y: 40 },
  }
};

export const encounters: Encounter[] = [
  {
    level: 0,
    name: 'The Gate',
    chainData: {
      enemyTypes: [],
      enemyMaxHealth: [],
      baseIntents: [],
    },
    clientData: {
      heroPosition: BASE_POSITIONS.HERO.BOTTOMCENTER,
      enemyPositions: [],
    }
  },
  {
    level: 1,
    name: 'Dunes',
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
      enemyPositions: [{x: 90, y: 80}, {x: 80, y: 70}],
    }
  },
  {
    level: 2,
    name: 'Cursed Hamlet',
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
      heroPosition: {x: 60, y: 85},
      enemyPositions: [{x: 20, y: 70}, {x: 80, y: 50}],
    }
  },
  {
    level: 3,
    name: 'Forsaken Outpost',
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
  {
    level: 4,
    name: 'Black Cathedral',
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
  {
    level: 5,
    name: 'Weeping Monastery',
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
  {
    level: 6,
    name: 'Ruined Courtyard',
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
  {
    level: 7,
    name: 'Blighted Tower',
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
  {
    level: 8,
    name: 'Blighted Spire Top',
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
  {
    level: 9,
    name: 'Abyssal Throne',
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
  {
    level: 10,
    name: 'The End of Days',
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

export function getEncounter(level: number): Encounter {
  return encounters.find(e => e.level === level) || encounters[0];
}

export function getChainEncounterData(level: number): ChainData {
  const encounter = getEncounter(level);
  return encounter.chainData;
}

export function getClientEncounterData(level: number): ClientData {
  const encounter = getEncounter(level);
  return encounter.clientData;
}

export function getFloorName(level: number): string {
  const encounter = getEncounter(level);
  return encounter.name;
} 