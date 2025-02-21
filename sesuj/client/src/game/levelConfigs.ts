import { encounters, Position, Encounter } from './encounters';

export interface LevelConfig {
  level: number;
  name: string;
  heroPosition: Position;
  enemyPositions: Position[];
}

// Convert encounter data to level configs
export const levelConfigs: LevelConfig[] = encounters.map((encounter: Encounter) => ({
  level: encounter.level,
  name: encounter.name,
  heroPosition: encounter.clientData.heroPosition,
  enemyPositions: encounter.clientData.enemyPositions,
}));

// Utility function to get level configuration
export const getLevelConfig = (level: number): LevelConfig => {
  return levelConfigs[level] || levelConfigs[0];
};

// Utility function to convert percentage position to pixel position
export const getPixelPosition = (
  position: Position,
  containerWidth: number,
  containerHeight: number
): { x: number; y: number } => {
  return {
    x: (position.x / 100) * containerWidth,
    y: (position.y / 100) * containerHeight,
  };
}; 