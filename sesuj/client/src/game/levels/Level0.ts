import { Level, LevelConfig } from '../Level';

const config: LevelConfig = {
  id: 0,
  backgroundImage: 'room_0.png'
};

export class Level0 extends Level {
  constructor() {
    super(config);
  }
} 