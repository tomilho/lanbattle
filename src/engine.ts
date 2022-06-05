import * as Matter from 'matter-js';
import { Vector2, TankInput } from './types';

const EngineOptions = {
  gravity: {
    scale: 0,
    x: 0,
    y: 0,
  }
}

const Walls = {
  0: []
}

/**
 * Proxy for Matter.js engine.
 * 
 * Provides methods necessary to 
 * run the game
 */
export class Engine {
  
  engine: Matter.Engine;
  tanks: any;
  world: Matter.World

  constructor() {
    this.engine = Matter.Engine.create(EngineOptions);
    this.tanks = {};
    this.world = this.engine.world;
    this.loadStaticWalls();
    this.handleCollision();
    
  }

  private handleCollision() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      for (const pair of event.pairs) {
        if(!pair.activeContacts) continue;
        pair.bodyA.label
      }
    })
  }

  getBodies() {
    return this.world.bodies.filter(body => body.label !== 'wall');
  }

  loadStaticWalls() {
    // Single Map
    for (const wall of Walls[0]) {
      Matter.Composite.add(this.world, wall);
    }
  }

  addTank(clientID: string) {
    const tank = new Tank({ x: 0, y: 0 });
    Matter.Composite.add(this.world, tank.body);
  }

  deleteTank(clientID: string) {
    const tank = this.tanks[clientID];
    if (!tank) { return; }
    Matter.Composite.remove(this.world, tank);
  }

  update() {
    for(const tankID in this.tanks) {
      const tank = this.tanks[tankID];
      tank.processInput();
    }
    Matter.Engine.update(this.engine, 33.333);
  }
}

class Tank {
  private static parts = [
    Matter.Bodies.rectangle(0, 0, 100, 100),
    //TODO: Turret 
  ]
  body: Matter.Body;
  private newInput: TankInput;
  private lastInput: TankInput;

  constructor(position: Vector2) {
    this.body = Matter.Body.create({
      parts: Tank.parts,
      label: 'tank',
    });
    this.newInput = { a: 0, b: 0, g: 0, fire: false };
    this.lastInput = { a:0, b:0, g:0, fire: false };
    Matter.Body.setPosition(this.body, position);
  }

  setInput(input: TankInput) {
    this.newInput = input;
  }

  processInput(world: Matter.World) {
    if(this.newInput.fire) {
      const ball = Matter.Bodies.circle(300,300, 5);
      Matter.Composite.add(world, ball);     
    }
    // Beta Orientation - Tested in chrome
    if((this.lastInput.b > 0 && this.newInput.b < 0) || (Math.abs(this.lastInput.b) < Math.abs(this.newInput.b))) {
      // Rotate Left
      Matter.Body.rotate(this.body, (this.newInput.b - this.lastInput.b)* (Math.PI/180));
    } else if(this.lastInput.b < 0 && this.newInput.b > 0 || (Math.abs(this.lastInput.b) > Math.abs(this.newInput.b))) {
      // Rotate Right
      Matter.Body.rotate(this.body, (this.newInput.b - this.lastInput.b)*(Math.PI/180));
    }

    this.lastInput = this.newInput;

  }
}