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
            BLOCK_AND_ATTACK: number;
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
    enemyPositions: Position[];
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
        enemyPositions: []
    },
    1: {
        heroPosition: BASE_POSITIONS.HERO.LEFT,
        enemyPositions: [{x: 90, y: 80}, {x: 80, y: 70}]
    },
    2: {
        heroPosition: {x: 60, y: 85},
        enemyPositions: [{x: 20, y: 70}, {x: 80, y: 50}]
    },
    3: {
        heroPosition: {x: 60, y: 85},
        enemyPositions: [{x: 22, y: 68}]
    },
    4: {
        heroPosition: {x: 40, y: 95},
        enemyPositions: [{x: 82, y: 70}, {x: 10, y: 35}]
    },
    5: {
        heroPosition: BASE_POSITIONS.HERO.RIGHT,
        enemyPositions: [BASE_POSITIONS.ENEMY.FAR_LEFT, BASE_POSITIONS.ENEMY.LEFT]
    },
    6: {
        heroPosition: BASE_POSITIONS.HERO.CENTER,
        enemyPositions: [BASE_POSITIONS.ENEMY.LEFT, BASE_POSITIONS.ENEMY.RIGHT]
    },
    7: {
        heroPosition: BASE_POSITIONS.HERO.LEFT,
        enemyPositions: [BASE_POSITIONS.ENEMY.CENTER, BASE_POSITIONS.ENEMY.FAR_RIGHT]
    },
    8: {
        heroPosition: BASE_POSITIONS.HERO.RIGHT,
        enemyPositions: [BASE_POSITIONS.ENEMY.FAR_LEFT, BASE_POSITIONS.ENEMY.CENTER]
    },
    9: {
        heroPosition: BASE_POSITIONS.HERO.CENTER,
        enemyPositions: [BASE_POSITIONS.ENEMY.LEFT, BASE_POSITIONS.ENEMY.RIGHT]
    },
    10: {
        heroPosition: BASE_POSITIONS.HERO.CENTER,
        enemyPositions: [BASE_POSITIONS.ENEMY.LEFT, BASE_POSITIONS.ENEMY.RIGHT]
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