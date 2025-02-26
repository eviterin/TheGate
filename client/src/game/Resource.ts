export interface ResourceConfig {
  id: string;
  name: string;
  current: number;
  max: number;
  color: string;
}

export class Resource {
  id: string;
  name: string;
  current: number;
  max: number;
  color: string;

  constructor(config: ResourceConfig) {
    this.id = config.id;
    this.name = config.name;
    this.current = config.current;
    this.max = config.max;
    this.color = config.color;
  }

  add(amount: number): void {
    this.current = Math.min(this.current + amount, this.max);
  }

  remove(amount: number): void {
    this.current = Math.max(this.current - amount, 0);
  }

  setMax(newMax: number): void {
    this.max = newMax;
    this.current = Math.min(this.current, this.max);
  }

  getPercentage(): number {
    return (this.current / this.max) * 100;
  }
} 