import * as Matter from 'matter-js';
import type { Vector2, TankInput, Message } from './types';
import { nanoid } from 'nanoid';

const EngineOptions = {
  gravity: {
    scale: 0,
    x: 0,
    y: 0,
  }
}

/**
 * Proxy for Matter.js engine.
 * 
 * Provides methods necessary to 
 * run the game
 */
export class Engine {
  
  engine: Matter.Engine;
  tanks: {[key:string] : Tank};
  world: Matter.World;

  constructor() {
    this.engine = Matter.Engine.create(EngineOptions);
    this.tanks = {};
    this.world = this.engine.world;
    this.loadStaticWalls();
    this.handleCollision();
    
  }

  private handleCollision() {
    Matter.Events.on(this.engine, 'collisionStart', (event) => {
      let toRemoveTank = undefined;
      let toRemoveBall = undefined;

      for (const pair of event.pairs) {
        if(!pair.activeContacts) continue;
        if(pair.bodyA.label === 'ball' && pair.bodyB.label === 'tank' ||
           pair.bodyA.label === 'tank' && pair.bodyB.label === 'tank') {
            console.log('test');
          for(const clientID in this.tanks){
            const tank = this.tanks[clientID];
            if(tank.body === pair.bodyA || tank.body === pair.bodyB) {
              toRemoveTank = tank.body;
            }
            tank.balls.forEach(ball => {
              if(ball === pair.bodyA || ball === pair.bodyB) {
                toRemoveBall = ball;
              }
            });
            }
        }
      }
      // Removes Tank/Ball from the game
      if(toRemoveBall && toRemoveTank) {
        Matter.Composite.remove(this.world, toRemoveBall);
        Matter.Composite.remove(this.world, toRemoveTank);
      }

    })
  }

  getTanks() {
    return this.tanks;
  }
  
  loadStaticWalls() {
    // Single Map
    const style = { isStatic: true };
    Matter.Composite.add(this.world, [
      Matter.Bodies.rectangle(400, 0, 800, 50, style),
      Matter.Bodies.rectangle(400, 600, 800, 50, style),
      Matter.Bodies.rectangle(800, 300, 50, 600, style),
      Matter.Bodies.rectangle(0, 300, 50, 600, style)  
    ])
    
  }

  addTank(clientID: string) {
    const tank = new Tank({ x: 0, y: 0 });
    this.tanks[clientID] = tank;
    Matter.Composite.add(this.world, tank.body);
  }

  deleteTank(clientID: string) {
    const tank = this.tanks[clientID];
    if (!tank) { return; }
    Matter.Composite.remove(this.world, tank.body);
  }

  update() {
    for(const tankID in this.tanks) {
      const tank = this.tanks[tankID];
      tank.processInput(this.world);
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
  balls: Matter.Body[];
  private newInput: TankInput;
  private lastInput: TankInput;

  constructor(position: Vector2) {
    this.body = Matter.Body.create({
      parts: Tank.parts,
      label: 'tank',
    });
    this.balls = [];
    this.newInput = { a: 0, b: 0, g: 0, fire: false };
    this.lastInput = { a:0, b:0, g:0, fire: false };
    Matter.Body.setPosition(this.body, position);
  }

  setInput(input: TankInput) {
    this.newInput = input;
  }

  processInput(world: Matter.World) {
    if(this.newInput.fire) {
      const ball = Matter.Bodies.circle(300,300, 5, {label: 'ball'});
      this.balls.push(ball);
      Matter.Composite.add(world, ball);     
    }
    let angle = null;
    // Beta Orientation - Tested in chrome
    if((this.lastInput.g > 0 && this.newInput.g < 0) || (Math.abs(this.lastInput.g) < Math.abs(this.newInput.g))) {
      // Rotate Left
      angle = (this.newInput.g - this.lastInput.g)* (Math.PI/180);
    } else if(this.lastInput.g < 0 && this.newInput.g > 0 || (Math.abs(this.lastInput.g) > Math.abs(this.newInput.g))) {
      // Rotate Right
      angle = ((this.newInput.g - this.lastInput.g)*(Math.PI/180));
    }

    if(angle) {
      Matter.Body.rotate(this.body, Number((angle / 5)));
    }
    this.lastInput = this.newInput;

  }
}