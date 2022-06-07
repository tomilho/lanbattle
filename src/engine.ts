import * as Matter from 'matter-js';
import type { Vector2, TankInput, Message } from './types';
import { nanoid } from 'nanoid';

// Tuned Engine Options:
// https://brm.io/matter-js/docs/classes/Engine.html
const EngineOptions = {
  gravity: {
    scale: 0,
    x: 0,
    y: 0,
  },
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
  balls: {[key:string] : Matter.Body};
  world: Matter.World;
  counter = 0;

  constructor() {
    this.engine = Matter.Engine.create(EngineOptions);
    this.tanks = {};
    this.balls = {};
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
          // Finds the Tank
          for(const clientID in this.tanks){
            const tank = this.tanks[clientID];
            if(tank.body === pair.bodyA || tank.body === pair.bodyB) {
              toRemoveTank = tank.body;
            }
          }
          // Finds the Ball
          for(const ballID in this.balls) {
            const ball = this.balls[ballID];
            if(ball === pair.bodyA || ball === pair.bodyB) {
              toRemoveBall = ball;
            }
          }
        }
      }
      // Removes Tank/Ball from the game
      if(toRemoveBall && toRemoveTank) {
        Matter.Composite.remove(this.world, toRemoveBall);
        Matter.Composite.remove(this.world, toRemoveTank);
      }

    });
  }

  getTanks() {
    return this.tanks;
  }

  getBalls() {
    return this.balls;
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
    const tank = new Tank({ x: Math.random()*700+50, y: Math.random()*500+50}, Object.keys(this.tanks).length);
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
      tank.processInput(this.world, this);
    }

    Matter.Engine.update(this.engine, 33.333);
  }
}

class Tank {
  private bodySize = 35;
  body: Matter.Body;
  shape: string;
  private newInput: TankInput;
  private lastInput: TankInput;

  constructor(position: Vector2, playerCount: number) {
    this.shape = '';
    const shape = this.getTankShape(position, playerCount);
    this.body = Matter.Body.create({
      parts: [shape, // Unique Shape 
              Matter.Bodies.circle(position.x, position.y, this.bodySize/3), // Turret p1
              Matter.Bodies.rectangle(position.x,position.y - this.bodySize/2, this.bodySize/3, this.bodySize/1.75)], // Turret p2
      label: 'tank',
      render: { lineWidth: 1}
    });
    this.newInput = { a: 0, b: 0, g: 0, fire: false };
    this.lastInput = { a:0, b:0, g:0, fire: false };
  }

  getTankShape(position: Vector2, playerCount: number): Matter.Body {
    switch(playerCount) {
      case 0:
        this.shape = 'square';
        return Matter.Bodies.rectangle(position.x, position.y, this.bodySize, this.bodySize);
      case 1:
        this.shape = 'triangle';
        return Matter.Bodies.polygon(position.x, position.y, 3, this.bodySize);
      case 2:
        this.shape = 'hexagon';
        return Matter.Bodies.polygon(position.x, position.y, 6, this.bodySize);
      case 3:
        this.shape = 'circle';
        return Matter.Bodies.circle(position.x, position.y, this.bodySize/2);
    }
    
    return Matter.Bodies.rectangle(position.x, position.y, this.bodySize, this.bodySize);
  }

  setInput(input: TankInput) {
    this.newInput = input;
  }

  processInput(world: Matter.World, engine: Engine) {
    if(this.newInput.fire) {
      const ball = Matter.Bodies.circle(350,350, 6, {
        label: 'ball', 
        restitution: 1,
        friction: 0,
        frictionAir: 0,
        frictionStatic: 0,
      });
      Matter.Body.setVelocity(ball, {x: 10, y: 10});
      Matter.Composite.add(world, ball);

      engine.balls[nanoid()] = ball;
    }

    let angle = null;
    // Beta Orientation - Tested in chrome and safari
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