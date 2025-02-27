import encounterData from '../../../shared/encounters.json';

// Types for the JSON data
interface EncounterJson {
    constants: {
        ENEMY_TYPE: {
            NONE: 0;
            TYPE_A: 1;
            TYPE_B: 2;
        };
        INTENT_TYPES: {
            BLOCK_5: 1000;
            BLOCK_AND_ATTACK: 1001;
            HEAL: 1002;
            ATTACK_BUFF: 1003;
            BLOCK_AND_HEAL: 1004;
            HEAL_ALL: 1005;
        };
        ANIMATIONS: {
            ATTACK: string;
            BLOCK: string;
            BLOCK_AND_ATTACK: string;
        };
    };
    encounters: {
        level: number;
        name: string;
        chainData: ChainData;
    }[];
}

// Client-side types
export interface Position {
    x: number;
    y: number;
}

export interface ClientData {
    heroPosition: Position;
    heroScale?: number;
    heroInvert?: boolean;
    enemyPositions: Position[];
    enemyScales?: number[];
    enemyInverted?: boolean[];
    deadEnemyPositions?: Position[];
}

export interface ChainData {
    enemyTypes: number[];
    enemyMaxHealth: number[];
    baseIntents: {
        [key: string]: {
            damage?: { min: number; max: number };
            blockChance?: number;
            blockAmount?: number;
        };
    } | [];
}

export interface Encounter {
    level: number;
    name: string;
    chainData: ChainData;
    clientData: ClientData;
}

// Client-only constants
export const BASE_POSITIONS = {
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
} as const;

// Client-side position data
const positions: Record<number, ClientData> = {
    0: {
        heroPosition: BASE_POSITIONS.HERO.BOTTOMCENTER,
        heroScale: 1,
        heroInvert: false,
        enemyPositions: [],
        enemyScales: [],
        enemyInverted: []
    },
    1: {
        heroPosition: {x: 10, y: 70},
        heroScale: 1.7,
        heroInvert: false,
        enemyPositions: [{x: 65, y: 73}, {x: 85, y: 65}],
        enemyScales: [1.5, 1.7],
        enemyInverted: [false, false],
        deadEnemyPositions: [{x: 65, y: 75 + 40 * 1.5}, {x: 85, y: 65 + 40 * 1.7}]
    },
    2: {
        heroPosition: {x: 90, y: 70},
        heroScale: 1.7,
        heroInvert: true,
        enemyPositions: [{x: 35, y: 57}, {x: 15, y: 48}],
        enemyScales: [1.8, 1.8],
        enemyInverted: [false, false],
        deadEnemyPositions: [{x: 35, y: 57 + 40 * 1.8}, {x: 15, y: 48 + 40 * 1.8}]
    },
    3: {
        heroPosition: {x: 62, y: 75},
        heroScale: 1.8,
        heroInvert: true,
        enemyPositions: [{x: 28, y: 63}],
        enemyScales: [2.0],
        enemyInverted: [true],
        deadEnemyPositions: [{x: 28, y: 63 + 40 * 2.0}]
    },
    4: {
        heroPosition: {x: 40, y: 95},
        heroScale: 1,
        heroInvert: false,
        enemyPositions: [{x: 82, y: 70}, {x: 10, y: 35}],
        enemyScales: [1, 1],
        enemyInverted: [false, false],
        deadEnemyPositions: [{x: 82, y: 70 + 40}, {x: 10, y: 35 + 40}]
    },
    5: {
        heroPosition: BASE_POSITIONS.HERO.RIGHT,
        heroScale: 1,
        heroInvert: true,
        enemyPositions: [BASE_POSITIONS.ENEMY.FAR_LEFT, BASE_POSITIONS.ENEMY.LEFT],
        enemyScales: [1, 1],
        enemyInverted: [false, false],
        deadEnemyPositions: [{x: BASE_POSITIONS.ENEMY.FAR_LEFT.x, y: BASE_POSITIONS.ENEMY.FAR_LEFT.y + 40}, {x: BASE_POSITIONS.ENEMY.LEFT.x, y: BASE_POSITIONS.ENEMY.LEFT.y + 40}]
    },
    6: {
        heroPosition: BASE_POSITIONS.HERO.CENTER,
        heroScale: 1,
        heroInvert: false,
        enemyPositions: [BASE_POSITIONS.ENEMY.LEFT, BASE_POSITIONS.ENEMY.RIGHT],
        enemyScales: [1, 1],
        enemyInverted: [false, true],
        deadEnemyPositions: [{x: BASE_POSITIONS.ENEMY.LEFT.x, y: BASE_POSITIONS.ENEMY.LEFT.y + 40}, {x: BASE_POSITIONS.ENEMY.RIGHT.x, y: BASE_POSITIONS.ENEMY.RIGHT.y + 40}]
    },
    7: {
        heroPosition: BASE_POSITIONS.HERO.LEFT,
        heroScale: 1,
        heroInvert: false,
        enemyPositions: [BASE_POSITIONS.ENEMY.CENTER, BASE_POSITIONS.ENEMY.FAR_RIGHT],
        enemyScales: [1, 1],
        enemyInverted: [true, true],
        deadEnemyPositions: [{x: BASE_POSITIONS.ENEMY.CENTER.x, y: BASE_POSITIONS.ENEMY.CENTER.y + 40}, {x: BASE_POSITIONS.ENEMY.FAR_RIGHT.x, y: BASE_POSITIONS.ENEMY.FAR_RIGHT.y + 40}]
    },
    8: {
        heroPosition: {x: 80, y: 92},
        heroScale: 1,
        heroInvert: true,
        enemyPositions: [{x: 50, y: 79}, {x: 20, y: 90}],
        enemyScales: [1, 1],
        enemyInverted: [false, false],
        deadEnemyPositions: [{x: 50, y: 79 + 40}, {x: 20, y: 90 + 40}]
    },
    9: {
        heroPosition: {x: 50, y: 92},
        heroScale: 1,
        heroInvert: false,
        enemyPositions: [{x: 50, y: 75}],
        enemyScales: [1.3],
        enemyInverted: [true],
        deadEnemyPositions: [{x: 50, y: 75 + 40 * 1.3}]
    },
    10: {
        heroPosition: {x: 30, y: 80},
        heroScale: 1,
        heroInvert: false,
        enemyPositions: [{x: 70, y: 75}],
        enemyScales: [2.0],
        enemyInverted: [true],
        deadEnemyPositions: [{x: 70, y: 75 + 40 * 2.0}]
    }
} as const;

function getClientData(level: number): ClientData {
    return positions[level] || positions[0];
}

// Type assertion for imported JSON
const typedData = (encounterData as unknown) as EncounterJson;

// Export shared constants
export const { ENEMY_TYPE, INTENT_TYPES, ANIMATIONS } = typedData.constants;

// Add client data to encounters
export const encounters: Encounter[] = typedData.encounters.map((encounter) => ({
    ...encounter,
    clientData: getClientData(encounter.level)
}));

// Helper functions
export function getEncounter(level: number): Encounter {
    return encounters.find((e: Encounter) => e.level === level) || encounters[0];
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

// New helper for backgrounds
export function getBackgroundImage(level: number): string {
    return `/src/assets/arenas/room_${level}.png`;
} 