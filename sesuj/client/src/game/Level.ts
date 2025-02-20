export interface LevelConfig {
  id: number;
  backgroundImage: string;
  // Add more level-specific config as needed
}

export class Level {
  id: number;
  backgroundImage: string;

  constructor(config: LevelConfig) {
    this.id = config.id;
    this.backgroundImage = config.backgroundImage;
  }

  // Add methods that all levels will need
  getBackgroundPath(): string {
    return `/src/assets/arenas/${this.backgroundImage}`;
  }
} 