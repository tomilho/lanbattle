import { Game, Vector2 } from './types';

export class Tank implements Game.Tank {
  input: any;
  position: Vector2;
  azimuth: number;

  constructor() {
    this.position = {x: 0, y: 0};
    this.azimuth = 0;
  }
}