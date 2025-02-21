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

export const encounters: Encounter[];
export const ENEMY_TYPE: EnemyType;
export const INTENT_TYPES: IntentTypes;
export const BASE_POSITIONS: BasePositions;

export function getEncounter(level: number): Encounter;
export function getChainEncounterData(level: number): ChainData;
export function getClientEncounterData(level: number): ClientData; 