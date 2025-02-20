import { Resource, ResourceConfig } from '../Resource';

const config: ResourceConfig = {
  id: 'faith',
  name: 'Faith',
  current: 3,
  max: 3,
  color: '#4a90e2'
};

export class Faith extends Resource {
  constructor(currentMana: number = 3, maxMana: number = currentMana) {
    super({ ...config, current: currentMana, max: maxMana });
  }
} 