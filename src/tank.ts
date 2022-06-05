import { Game, Vector2, TankInput } from './types';
import * as Matter from 'matter-js';

export class Tank {
  input: TankInput;
  position: Vector2;
  azimuth: number;
  body: Matter.Body;

  constructor() {
    this.input = {a: 0, b: 0, g: 0, fire: false};
    this.position = {x: 0, y: 0};
    this.azimuth = 0;
    this.body = Matter.Bodies.rectangle(100, 200, 50, 50);
    
  
  }

  
}