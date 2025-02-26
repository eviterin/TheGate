import { Resource, ResourceConfig } from '../Resource';

interface HealthConfig extends ResourceConfig {
  block: number;
}

const config: HealthConfig = {
  id: 'health',
  name: 'Health',
  current: 100,
  max: 100,
  color: '#ff4444',
  block: 0
};

export class Health extends Resource {
  private block: number;

  constructor(currentHealth: number = 100, maxHealth: number = currentHealth, block: number = 0) {
    super({ ...config, current: currentHealth, max: maxHealth });
    this.block = block;
  }

  getBlock(): number {
    return this.block;
  }

  setBlock(value: number): void {
    this.block = value;
  }
} 